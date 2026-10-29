/**
 * Pure planning of corrections. Nothing here touches a store: given the ledger and a draft it returns the
 * events to append (superseding / voiding what changes — the log is never mutated), the problems that block
 * saving, and the impact on worked time and balance computed on a hypothetical ledger.
 */
import {
  buildSessions,
  effectiveEvents,
  requiredBreak,
  summarize,
  type EventType,
  type Session,
  type TimeEvent,
} from '@worktime/core';

import { dayBounds } from '@/features/tracking/selectors';
import { countedEvents, incompleteDayStarts, targetFor, totalBalance, type Targets } from './balance';
import { formatTime } from './dates';

const MIN = 60_000;

export interface BreakDraft {
  start: number;
  end?: number;
  /** Index of the break in the stored session; absent for breaks added in the editor. */
  origin?: number;
}

export interface SessionDraft {
  start: number;
  /** Undefined only while the session is still running. */
  end?: number;
  workplaceId?: string;
  breaks: BreakDraft[];
}

export interface PlanEnv {
  now: number;
  newId: () => string;
  targets: Targets;
}

export interface Fix {
  label: string;
  patch: Partial<Pick<SessionDraft, 'start' | 'end'>>;
}

export interface Issue {
  kind: 'range' | 'break' | 'future' | 'overlap';
  message: string;
  /** Ways to resolve an overlap by adjusting the draft. */
  fixes?: Fix[];
  /** The overlapping window, for the conflict illustration. */
  conflict?: { other: Session; from: number; to: number };
}

export interface Impact {
  workedBefore: number;
  workedAfter: number;
  breakBefore: number;
  breakAfter: number;
  dayBalanceBefore: number;
  dayBalanceAfter: number;
  totalBefore: number;
  totalAfter: number;
  /** False when the day is today: the running balance only counts finished days. */
  countsTowardsTotal: boolean;
  /** Break that rules require for the new worked time, when the new breaks fall short of it. */
  breakShortfallMs: number;
}

export interface Plan {
  /** Complete events, ready to append. Empty when nothing changed. */
  events: TimeEvent[];
  issues: Issue[];
  impact: Impact;
  /** Start of the day the session belongs to. */
  day: number;
}

// ───────────────────────────── drafts ─────────────────────────────

export function draftFromSession(s: Session): SessionDraft {
  return {
    start: s.start,
    end: s.end,
    workplaceId: s.workplaceId,
    breaks: s.breaks.map((b, origin) => ({ start: b.start, end: b.end, origin })),
  };
}

/** A sensible lunch break of up to `ms` in the middle of [start, end]. */
export function defaultBreak(start: number, end: number, ms = 30 * MIN): BreakDraft {
  const length = Math.min(ms, Math.floor((end - start) / 2 / MIN) * MIN);
  const from = Math.round((start + (end - start) / 2 - length / 2) / MIN) * MIN;
  return { start: from, end: from + length };
}

/** Draft for a day that has nothing yet: the usual start, the day's target plus the legally required break. */
export function draftForNewDay(dayStart: number, t: Targets): SessionDraft {
  const target = targetFor(dayStart, t) || t.dailyMs;
  const start = new Date(dayStart).setHours(9, 0, 0, 0);
  const brk = requiredBreak(target);
  const end = start + target + brk;
  return { start, end, breaks: brk ? [defaultBreak(start, end, brk)] : [] };
}

/**
 * Completion proposed for a session that never got a check-out: the target length from its start, with the
 * required break. Capped so it stays inside the start's day and never lies in the future.
 */
export function suggestCompletion(s: Session, now: number, t: Targets): SessionDraft {
  const target = targetFor(dayBounds(s.start).start, t) || t.dailyMs;
  const brk = s.breaks.length ? 0 : requiredBreak(target);
  const latest = Math.min(dayBounds(s.start).end - MIN, now);
  const end = Math.max(s.start + MIN, Math.min(s.start + target + brk, latest));
  const draft = draftFromSession(s);
  draft.end = Math.round(end / MIN) * MIN;
  if (brk && draft.end - s.start > 2 * brk) draft.breaks.push(defaultBreak(s.start, draft.end, brk));
  return draft;
}

// ───────────────────────────── validation ─────────────────────────────

/** Problems that make a draft unsavable. `others` are all stored sessions except the one being edited. */
export function validateDraft(draft: SessionDraft, others: Session[], now: number, wasOpen: boolean): Issue[] {
  const issues: Issue[] = [];
  const { start, end } = draft;

  if (end === undefined && !wasOpen) issues.push({ kind: 'range', message: 'Set an end time.' });
  if (end !== undefined && end <= start) issues.push({ kind: 'range', message: 'The end is before the start.' });
  if (start > now || (end !== undefined && end > now)) issues.push({ kind: 'future', message: "Times can't be in the future." });

  const stop = end ?? now;
  const breaks = [...draft.breaks].sort((a, b) => a.start - b.start);
  breaks.forEach((b, i) => {
    const bEnd = b.end ?? stop;
    if (bEnd <= b.start) issues.push({ kind: 'break', message: `Break ${i + 1} ends before it starts.` });
    else if (b.start < start || bEnd > stop) issues.push({ kind: 'break', message: `Break ${i + 1} is outside the session.` });
    const prev = breaks[i - 1];
    if (prev && b.start < (prev.end ?? stop)) issues.push({ kind: 'break', message: `Breaks ${i} and ${i + 1} overlap.` });
  });

  if (end !== undefined && end > start) {
    for (const other of others) {
      const otherEnd = other.end ?? now;
      const from = Math.max(start, other.start);
      const to = Math.min(end, otherEnd);
      if (to <= from) continue;
      const fixes: Fix[] = [];
      if (other.start > start) fixes.push({ label: `End this session at ${formatTime(other.start)}`, patch: { end: other.start } });
      if (otherEnd < end && otherEnd > start) fixes.push({ label: `Start this session at ${formatTime(otherEnd)}`, patch: { start: otherEnd } });
      issues.push({
        kind: 'overlap',
        message: `${formatTime(from)}–${formatTime(to)} is counted twice. Adjust this session or the other one.`,
        fixes,
        conflict: { other, from, to },
      });
    }
  }
  return issues;
}

// ───────────────────────────── impact ─────────────────────────────

/** Figures of one day as the app counts them: a day with a missing check-out counts for nothing until fixed. */
const dayFigures = (events: TimeEvent[], day: number, now: number, t: Targets) => {
  const effective = effectiveEvents(events);
  const s = summarize(countedEvents(effective, now), day, dayBounds(day).end, now);
  const counted = !incompleteDayStarts(effective, now).has(day);
  return { worked: s.workedMs, breaks: s.breakMs, balance: counted ? s.workedMs - targetFor(day, t) : 0 };
};

export function impactOf(before: TimeEvent[], after: TimeEvent[], day: number, env: PlanEnv): Impact {
  const b = dayFigures(before, day, env.now, env.targets);
  const a = dayFigures(after, day, env.now, env.targets);
  const counts = dayBounds(day).end <= env.now;
  return {
    workedBefore: b.worked,
    workedAfter: a.worked,
    breakBefore: b.breaks,
    breakAfter: a.breaks,
    dayBalanceBefore: b.balance,
    dayBalanceAfter: a.balance,
    totalBefore: counts ? totalBalance(before, env.now, env.targets) : 0,
    totalAfter: counts ? totalBalance(after, env.now, env.targets) : 0,
    countsTowardsTotal: counts,
    breakShortfallMs: Math.max(0, requiredBreak(a.worked) - a.breaks),
  };
}

// ───────────────────────────── planning ─────────────────────────────

type EventExtras = Partial<Pick<TimeEvent, 'workplaceId' | 'supersedes' | 'voids'>>;

function eventFactory(env: PlanEnv) {
  const fresh = (type: EventType, at: number, extras: EventExtras = {}): TimeEvent => {
    const e: TimeEvent = { id: env.newId(), type, at, source: 'manual', recordedAt: env.now };
    if (extras.workplaceId !== undefined) e.workplaceId = extras.workplaceId;
    if (extras.supersedes !== undefined) e.supersedes = extras.supersedes;
    if (extras.voids) e.voids = true;
    return e;
  };
  /** A new version of `target` with other values. */
  const supersede = (target: TimeEvent, at: number, workplaceId = target.workplaceId) =>
    fresh(target.type, at, { workplaceId, supersedes: target.id });
  /** A tombstone that removes `target`. */
  const void_ = (target: TimeEvent) => fresh(target.type, target.at, { workplaceId: target.workplaceId, supersedes: target.id, voids: true });
  return { fresh, supersede, void_ };
}

const sessionOf = (ledger: TimeEvent[], id: string, now: number) => {
  const effective = effectiveEvents(ledger);
  const sessions = buildSessions(effective, now);
  const session = sessions.find((s) => s.id === id);
  return { effective, sessions, session };
};

/** Events making up a session, split by role. Break ends pair with break starts by position. */
function partsOf(session: Session, effective: TimeEvent[]) {
  const byId = new Map(effective.map((e) => [e.id, e]));
  const own = session.eventIds.flatMap((id) => byId.get(id) ?? []);
  return {
    clockIn: own.find((e) => e.type === 'clockIn'),
    clockOut: own.find((e) => e.type === 'clockOut'),
    breakStarts: own.filter((e) => e.type === 'breakStart'),
    breakEnds: own.filter((e) => e.type === 'breakEnd'),
  };
}

const finish = (ledger: TimeEvent[], events: TimeEvent[], issues: Issue[], day: number, env: PlanEnv): Plan => ({
  events,
  issues,
  day,
  impact: impactOf(ledger, [...ledger, ...events], day, env),
});

/** Plan the correction of an existing session. Undefined when the session id is not in the ledger. */
export function planSessionEdit(ledger: TimeEvent[], sessionId: string, draft: SessionDraft, env: PlanEnv): Plan | undefined {
  const { effective, sessions, session } = sessionOf(ledger, sessionId, env.now);
  if (!session) return undefined;
  const { clockIn, clockOut, breakStarts, breakEnds } = partsOf(session, effective);
  if (!clockIn) return undefined;
  const { fresh, supersede, void_ } = eventFactory(env);
  const events: TimeEvent[] = [];

  if (draft.start !== clockIn.at || draft.workplaceId !== clockIn.workplaceId) {
    events.push(supersede(clockIn, draft.start, draft.workplaceId));
  }

  if (draft.end !== undefined) {
    if (clockOut) {
      if (draft.end !== clockOut.at) events.push(supersede(clockOut, draft.end));
    } else if (draft.end !== session.end) {
      events.push(fresh('clockOut', draft.end));
    }
  } else if (clockOut) {
    events.push(void_(clockOut));
  }

  session.breaks.forEach((stored, i) => {
    const edited = draft.breaks.find((b) => b.origin === i);
    const startEvent = breakStarts[i];
    const endEvent = breakEnds[i];
    if (!edited) {
      if (startEvent) events.push(void_(startEvent));
      if (endEvent) events.push(void_(endEvent));
      return;
    }
    if (startEvent && edited.start !== startEvent.at) events.push(supersede(startEvent, edited.start));
    if (edited.end === undefined) {
      if (endEvent) events.push(void_(endEvent));
    } else if (endEvent) {
      if (edited.end !== endEvent.at) events.push(supersede(endEvent, edited.end));
    } else if (edited.end !== stored.end) {
      events.push(fresh('breakEnd', edited.end));
    }
  });
  for (const b of draft.breaks.filter((x) => x.origin === undefined)) {
    events.push(fresh('breakStart', b.start));
    if (b.end !== undefined) events.push(fresh('breakEnd', b.end));
  }

  const others = sessions.filter((s) => s.id !== session.id);
  const issues = validateDraft(draft, others, env.now, session.end === undefined);
  return finish(ledger, issues.length ? [] : events, issues, dayBounds(session.start).start, env);
}

/** Plan a complete session added by hand (a missed day or a forgotten check-in). */
export function planNewSession(ledger: TimeEvent[], draft: SessionDraft, env: PlanEnv): Plan {
  const { fresh } = eventFactory(env);
  const events: TimeEvent[] = [fresh('clockIn', draft.start, { workplaceId: draft.workplaceId })];
  for (const b of [...draft.breaks].sort((x, y) => x.start - y.start)) {
    events.push(fresh('breakStart', b.start));
    if (b.end !== undefined) events.push(fresh('breakEnd', b.end));
  }
  if (draft.end !== undefined) events.push(fresh('clockOut', draft.end));

  const sessions = buildSessions(effectiveEvents(ledger), env.now);
  const issues = validateDraft(draft, sessions, env.now, false);
  return finish(ledger, issues.length ? [] : events, issues, dayBounds(draft.start).start, env);
}

/** Plan the removal of a whole session: a tombstone for each of its events. */
export function planDeleteSession(ledger: TimeEvent[], sessionId: string, env: PlanEnv): (Plan & { removedMs: number }) | undefined {
  const { effective, session } = sessionOf(ledger, sessionId, env.now);
  if (!session) return undefined;
  const { void_ } = eventFactory(env);
  const byId = new Map(effective.map((e) => [e.id, e]));
  const events = session.eventIds.flatMap((id) => byId.get(id) ?? []).map(void_);
  return { ...finish(ledger, events, [], dayBounds(session.start).start, env), removedMs: session.workedMs };
}

/**
 * Plan the reversal of previously appended events — still append-only: edits are restored by a newer version
 * of the original values, additions and deletions by a tombstone / re-creation.
 */
export function planUndo(ledger: TimeEvent[], appended: TimeEvent[], env: Pick<PlanEnv, 'now' | 'newId'>): TimeEvent[] {
  const byId = new Map(ledger.map((e) => [e.id, e]));
  return appended.flatMap((e): TimeEvent[] => {
    const previous = e.supersedes ? byId.get(e.supersedes) : undefined;
    const base = { id: env.newId(), source: 'manual', recordedAt: env.now } as const;
    if (previous) {
      const restored: TimeEvent = { ...base, type: previous.type, at: previous.at, supersedes: e.id };
      if (previous.workplaceId !== undefined) restored.workplaceId = previous.workplaceId;
      return [restored];
    }
    return [{ ...base, type: e.type, at: e.at, supersedes: e.id, voids: true, ...(e.workplaceId !== undefined && { workplaceId: e.workplaceId }) }];
  });
}
