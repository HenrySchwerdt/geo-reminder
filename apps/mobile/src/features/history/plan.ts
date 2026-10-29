/**
 * Pure planning of corrections. Nothing here touches a store: given the ledger and a draft it returns the
 * events to append (superseding / voiding what changes — the log is never mutated), the problems that block
 * saving, and the impact on worked time and balance computed on a hypothetical ledger.
 */
import {
  buildSessions,
  dateKeyOf,
  dayRange,
  effectiveEvents,
  requiredBreak,
  sessionDay,
  sessionZone,
  summarizeDay,
  wallTime,
  type DateKey,
  type EventType,
  type Session,
  type TimeEvent,
} from '@worktime/core';

import { countedEvents, incompleteDays, targetFor, totalBalance, type Targets } from './balance';
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
  /** Where the phone is: decides "today", and the zone of sessions added by hand. */
  tz: string;
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
  /** The work day the session belongs to. */
  day: DateKey;
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
export function draftForNewDay(day: DateKey, t: Targets, tz: string): SessionDraft {
  const target = targetFor(day, t) || t.dailyMs;
  const start = wallTime(day, 9 * 60, tz);
  const brk = requiredBreak(target);
  const end = start + target + brk;
  return { start, end, breaks: brk ? [defaultBreak(start, end, brk)] : [] };
}

/**
 * Completion proposed for a session that never got a check-out: the target length from its start, with the
 * required break. Capped so it stays inside the start's day and never lies in the future.
 */
export function suggestCompletion(s: Session, now: number, t: Targets, tz: string): SessionDraft {
  const day = sessionDay(s, tz);
  const target = targetFor(day, t) || t.dailyMs;
  const brk = s.breaks.length ? 0 : requiredBreak(target);
  const latest = Math.min(dayRange(day, sessionZone(s, tz)).end - MIN, now);
  const end = Math.max(s.start + MIN, Math.min(s.start + target + brk, latest));
  const draft = draftFromSession(s);
  draft.end = Math.round(end / MIN) * MIN;
  if (brk && draft.end - s.start > 2 * brk) draft.breaks.push(defaultBreak(s.start, draft.end, brk));
  return draft;
}

// ───────────────────────────── validation ─────────────────────────────

/**
 * Problems that make a draft unsavable. `others` are all stored sessions except the one being edited;
 * `tz` is the zone the session's times are shown in.
 */
export function validateDraft(draft: SessionDraft, others: Session[], now: number, wasOpen: boolean, tz: string): Issue[] {
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
      if (other.start > start) fixes.push({ label: `End this session at ${formatTime(other.start, tz)}`, patch: { end: other.start } });
      if (otherEnd < end && otherEnd > start) fixes.push({ label: `Start this session at ${formatTime(otherEnd, tz)}`, patch: { start: otherEnd } });
      issues.push({
        kind: 'overlap',
        message: `${formatTime(from, tz)}–${formatTime(to, tz)} is counted twice. Adjust this session or the other one.`,
        fixes,
        conflict: { other, from, to },
      });
    }
  }
  return issues;
}

// ───────────────────────────── impact ─────────────────────────────

/** Figures of one day as the app counts them: a day with a missing check-out counts for nothing until fixed. */
const dayFigures = (events: TimeEvent[], day: DateKey, now: number, t: Targets, tz: string) => {
  const effective = effectiveEvents(events);
  const s = summarizeDay(countedEvents(effective, now, tz), day, now, tz);
  const counted = !incompleteDays(effective, now, tz).has(day);
  return { worked: s.workedMs, breaks: s.breakMs, balance: counted ? s.workedMs - targetFor(day, t) : 0 };
};

export function impactOf(before: TimeEvent[], after: TimeEvent[], day: DateKey, env: PlanEnv): Impact {
  const b = dayFigures(before, day, env.now, env.targets, env.tz);
  const a = dayFigures(after, day, env.now, env.targets, env.tz);
  const counts = day < dateKeyOf(env.now, env.tz);
  return {
    workedBefore: b.worked,
    workedAfter: a.worked,
    breakBefore: b.breaks,
    breakAfter: a.breaks,
    dayBalanceBefore: b.balance,
    dayBalanceAfter: a.balance,
    totalBefore: counts ? totalBalance(before, env.now, env.targets, env.tz) : 0,
    totalAfter: counts ? totalBalance(after, env.now, env.targets, env.tz) : 0,
    countsTowardsTotal: counts,
    breakShortfallMs: Math.max(0, requiredBreak(a.worked) - a.breaks),
  };
}

// ───────────────────────────── planning ─────────────────────────────

type EventExtras = Partial<Pick<TimeEvent, 'workplaceId' | 'supersedes' | 'voids' | 'tz'>>;

/** Event constructors; new events are recorded in `zone`, the zone of the session they belong to. */
function eventFactory(env: PlanEnv, zone: string) {
  const fresh = (type: EventType, at: number, extras: EventExtras = {}): TimeEvent => {
    const e: TimeEvent = { id: env.newId(), type, at, source: 'manual', recordedAt: env.now, tz: extras.tz ?? zone };
    if (extras.workplaceId !== undefined) e.workplaceId = extras.workplaceId;
    if (extras.supersedes !== undefined) e.supersedes = extras.supersedes;
    if (extras.voids) e.voids = true;
    return e;
  };
  /** A new version of `target` with other values. */
  const supersede = (target: TimeEvent, at: number, workplaceId = target.workplaceId) =>
    fresh(target.type, at, { workplaceId, supersedes: target.id, tz: target.tz });
  /** A tombstone that removes `target`. */
  const void_ = (target: TimeEvent) => fresh(target.type, target.at, { workplaceId: target.workplaceId, supersedes: target.id, voids: true, tz: target.tz });
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

const finish = (ledger: TimeEvent[], events: TimeEvent[], issues: Issue[], day: DateKey, env: PlanEnv): Plan => ({
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
  const zone = sessionZone(session, env.tz);
  const { fresh, supersede, void_ } = eventFactory(env, zone);
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
  const issues = validateDraft(draft, others, env.now, session.end === undefined, zone);
  return finish(ledger, issues.length ? [] : events, issues, sessionDay(session, env.tz), env);
}

/** Plan a complete session added by hand (a missed day or a forgotten check-in). */
export function planNewSession(ledger: TimeEvent[], draft: SessionDraft, env: PlanEnv): Plan {
  const { fresh } = eventFactory(env, env.tz);
  const events: TimeEvent[] = [fresh('clockIn', draft.start, { workplaceId: draft.workplaceId })];
  for (const b of [...draft.breaks].sort((x, y) => x.start - y.start)) {
    events.push(fresh('breakStart', b.start));
    if (b.end !== undefined) events.push(fresh('breakEnd', b.end));
  }
  if (draft.end !== undefined) events.push(fresh('clockOut', draft.end));

  const sessions = buildSessions(effectiveEvents(ledger), env.now);
  const issues = validateDraft(draft, sessions, env.now, false, env.tz);
  return finish(ledger, issues.length ? [] : events, issues, dateKeyOf(draft.start, env.tz), env);
}

/** Plan the removal of a whole session: a tombstone for each of its events. */
export function planDeleteSession(ledger: TimeEvent[], sessionId: string, env: PlanEnv): (Plan & { removedMs: number }) | undefined {
  const { effective, session } = sessionOf(ledger, sessionId, env.now);
  if (!session) return undefined;
  const { void_ } = eventFactory(env, sessionZone(session, env.tz));
  const byId = new Map(effective.map((e) => [e.id, e]));
  const events = session.eventIds.flatMap((id) => byId.get(id) ?? []).map(void_);
  return { ...finish(ledger, events, [], sessionDay(session, env.tz), env), removedMs: session.workedMs };
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
      if (previous.tz !== undefined) restored.tz = previous.tz;
      return [restored];
    }
    return [
      {
        ...base,
        type: e.type,
        at: e.at,
        supersedes: e.id,
        voids: true,
        ...(e.workplaceId !== undefined && { workplaceId: e.workplaceId }),
        ...(e.tz !== undefined && { tz: e.tz }),
      },
    ];
  });
}
