/**
 * Time tracking math: an append-only list of events → the state of a day.
 * Durations are computed from instants (ms since epoch), never from wall-clock subtraction, so DST is safe.
 */

import type { TimeEvent } from '../schema';

export type WorkState = 'off' | 'working' | 'break';

export interface Segment {
  from: number;
  to: number;
  kind: 'work' | 'break';
  workplaceId?: string;
}

export interface DaySummary {
  state: WorkState;
  /** Start of the current state (clock-in or break start). */
  since?: number;
  workplaceId?: string;
  workedMs: number;
  breakMs: number;
  segments: Segment[];
  firstIn?: number;
  lastOut?: number;
}

/** Fold events (any order) into segments between `from` and `to`, evaluating open segments at `now`. */
export function summarize(events: TimeEvent[], from: number, to: number, now: number): DaySummary {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const segments: Segment[] = [];
  let state: WorkState = 'off';
  let since: number | undefined;
  let workplaceId: string | undefined;
  let firstIn: number | undefined;
  let lastOut: number | undefined;

  const close = (end: number) => {
    if (since === undefined || state === 'off') return;
    const a = Math.max(since, from);
    const b = Math.min(end, to);
    if (b > a) segments.push({ from: a, to: b, kind: state === 'break' ? 'break' : 'work', workplaceId });
  };

  for (const e of sorted) {
    if (e.at > Math.max(now, to)) break;
    switch (e.type) {
      case 'clockIn':
        if (state !== 'off') close(e.at);
        state = 'working';
        since = e.at;
        workplaceId = e.workplaceId;
        if (e.at >= from && e.at < to && firstIn === undefined) firstIn = e.at;
        break;
      case 'breakStart':
        if (state !== 'working') break;
        close(e.at);
        state = 'break';
        since = e.at;
        break;
      case 'breakEnd':
        if (state !== 'break') break;
        close(e.at);
        state = 'working';
        since = e.at;
        break;
      case 'clockOut':
        if (state === 'off') break;
        close(e.at);
        state = 'off';
        since = e.at;
        if (e.at >= from && e.at < to) lastOut = e.at;
        break;
    }
  }
  if (state !== 'off') close(Math.min(now, to));

  const sum = (k: Segment['kind']) => segments.filter((s) => s.kind === k).reduce((t, s) => t + s.to - s.from, 0);
  return {
    state,
    since: state === 'off' ? undefined : since,
    workplaceId: state === 'off' ? undefined : workplaceId,
    workedMs: sum('work'),
    breakMs: sum('break'),
    segments,
    firstIn,
    lastOut,
  };
}

export interface BreakRule {
  /** After this much work… */
  afterMs: number;
  /** …at least this much break is required. */
  minBreakMs: number;
}

/** German ArbZG defaults: 30 min after 6 h, 45 min after 9 h. */
export const DEFAULT_BREAK_RULES: BreakRule[] = [
  { afterMs: 6 * 3_600_000, minBreakMs: 30 * 60_000 },
  { afterMs: 9 * 3_600_000, minBreakMs: 45 * 60_000 },
];

/** Required break for a given amount of work. */
export function requiredBreak(workMs: number, rules: BreakRule[] = DEFAULT_BREAK_RULES): number {
  return rules.filter((r) => workMs > r.afterMs).reduce((m, r) => Math.max(m, r.minBreakMs), 0);
}

/**
 * When the day's target will be reached if the user keeps working now,
 * including any break the rules still require. Undefined when not working.
 */
export function expectedEnd(day: DaySummary, targetMs: number, now: number, rules = DEFAULT_BREAK_RULES): number | undefined {
  if (day.state === 'off') return undefined;
  const remainingWork = Math.max(0, targetMs - day.workedMs);
  const breakStillNeeded = Math.max(0, requiredBreak(targetMs, rules) - day.breakMs);
  if (day.state === 'break') {
    // The break in progress counts; the rest of the work follows it.
    return now + remainingWork + Math.max(0, breakStillNeeded);
  }
  return now + remainingWork + breakStillNeeded;
}

/** "5:50" style duration (hours:minutes), or "5h 50m" with `long`. */
export function formatDuration(ms: number, long = false): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (long) return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Signed balance like "+6h 20m" / "−0h 15m". */
export function formatBalance(ms: number): string {
  const sign = ms < 0 ? '−' : '+';
  return sign + formatDuration(Math.abs(ms), true);
}
