/**
 * Pure model of the clock-in / clock-out sheets: which times are on offer, whether a chosen time is allowed,
 * and the day summary shown before clocking out. Instants are epoch ms; every wall-clock text names its zone.
 */
import {
  buildSessions,
  clockTime,
  dayRange,
  effectiveEvents,
  requiredBreak,
  runningSession,
  sessionDay,
  sessionZone,
  summarizeDay,
  type BreakRule,
  type Segment,
  type Session,
  type TimeEvent,
} from '@worktime/core';

import { targetFor, type Targets } from '@/features/history/balance';

/** The tiles of a time picker: the suggested time (arrival / departure), now, or any other time. */
export type TimeChoice = 'suggested' | 'now' | 'other';

/** Why a time can't be used: it lies ahead, or before something it must follow. `label` finishes "before …". */
export type TimeIssue = { kind: 'future' } | { kind: 'before'; limit: number; label: string };

export interface TimeBound {
  at: number;
  label: string;
}

/** A route parameter holding an epoch-ms time: the time itself when it is usable, else undefined. */
export function parseTimeParam(value: string | string[] | undefined, now: number): number | undefined {
  const ms = Number(Array.isArray(value) ? value[0] : value);
  // A little tolerance for a clock that runs slightly behind the one that produced the suggestion.
  return Number.isFinite(ms) && ms > 0 && ms <= now + 60_000 ? Math.min(ms, now) : undefined;
}

/** The first problem with `at`, or undefined when it is allowed. */
export function checkTime(at: number, now: number, notBefore?: TimeBound): TimeIssue | undefined {
  if (at > now) return { kind: 'future' };
  if (notBefore && at < notBefore.at) return { kind: 'before', limit: notBefore.at, label: notBefore.label };
  return undefined;
}

export const issueText = (issue: TimeIssue, tz: string) =>
  issue.kind === 'future' ? "That time hasn't happened yet." : `That time is before ${issue.label} (${clockTime(issue.limit, tz)}).`;

/** A new session may not start before the previous one has ended. */
export function clockInBound(ledger: TimeEvent[], now: number): TimeBound | undefined {
  const ends = buildSessions(effectiveEvents(ledger), now).flatMap((s) => (s.end !== undefined && s.end <= now ? [s.end] : []));
  return ends.length ? { at: Math.max(...ends), label: 'the end of your previous session' } : undefined;
}

/** A check-out may not precede the session's last change (a clock-in or break edge): the log stays in order. */
export function clockOutBound(session: Session): TimeBound {
  const last = session.breaks.reduce((t, b) => Math.max(t, b.start, b.end ?? 0), session.start);
  return { at: last, label: last === session.start ? 'the session start' : 'your last break change' };
}

export interface ClockOutPreview {
  day: string;
  /** Start of the work day in the session's zone, where the ribbon begins. */
  dayStart: number;
  zone: string;
  workedMs: number;
  breakMs: number;
  /** Worked minus target for the day (the whole day, not just this session). */
  overtimeMs: number;
  targetMs: number;
  /** How much of the legally required break is still missing; 0 when the rule is met. */
  breakShortMs: number;
  requiredBreakMs: number;
  segments: Segment[];
}

/** The running session's day as it would stand if the user clocked out at `at` (an open break ends there too). */
export function clockOutPreview(ledger: TimeEvent[], at: number, now: number, targets: Targets, rules: BreakRule[], tz: string): ClockOutPreview | undefined {
  const effective = effectiveEvents(ledger);
  const running = runningSession(effective, now);
  if (!running) return undefined;
  const when = Math.max(at, clockOutBound(running).at);
  const zone = sessionZone(running, tz);
  const day = sessionDay(running, tz);
  const closing = (type: TimeEvent['type'], id: string): TimeEvent => ({ id, type, at: when, source: 'app', tz: running.tz });
  const events = [...effective, ...(running.breaks.some((b) => b.end === undefined) ? [closing('breakEnd', 'preview-break')] : []), closing('clockOut', 'preview-out')];
  const summary = summarizeDay(events, day, when, tz);
  const targetMs = targetFor(day, targets);
  const requiredBreakMs = requiredBreak(summary.workedMs, rules);
  return {
    day,
    dayStart: dayRange(day, zone).start,
    zone,
    workedMs: summary.workedMs,
    breakMs: summary.breakMs,
    overtimeMs: summary.workedMs - targetMs,
    targetMs,
    breakShortMs: Math.max(0, requiredBreakMs - summary.breakMs),
    requiredBreakMs,
    segments: summary.segments,
  };
}
