/**
 * Pure balance maths shared by the calendar, day details and the correction impact preview. Days are keys;
 * a session counts towards the day it started on, in the zone it was recorded in (`tz` for older events).
 */
import {
  addDays,
  buildSessions,
  countedEvents,
  dateKeyOf,
  effectiveEvents,
  findIncomplete,
  incompleteDays,
  isoWeekdayOf,
  MAX_OPEN_SESSION_MS,
  sessionDay,
  summarizeDay,
  type DateKey,
  type TimeEvent,
} from '@worktime/core';

/** What a day is expected to produce: `dailyMs` on each ISO weekday in `workdays`, otherwise nothing. */
export interface Targets {
  workdays: number[];
  dailyMs: number;
}

export const targetFor = (day: DateKey, t: Targets) => (t.workdays.includes(isoWeekdayOf(day)) ? t.dailyMs : 0);

// Incomplete sessions are a domain rule shared with widgets and watches; re-exported for the app's features.
export { countedEvents, findIncomplete, incompleteDays, MAX_OPEN_SESSION_MS };

/**
 * Worked time minus target for one day (from `countedEvents`), or undefined when the day is not counted:
 * incomplete, not over yet, or a session of it is still running (a night shift into today).
 */
export function dayBalanceOf(counted: TimeEvent[], day: DateKey, now: number, t: Targets, skip: Set<DateKey>, tz: string): number | undefined {
  if (day >= dateKeyOf(now, tz) || skip.has(day)) return undefined;
  const summary = summarizeDay(counted, day, now, tz);
  return summary.state === 'off' ? summary.workedMs - targetFor(day, t) : undefined;
}

/** The first day with a session, or undefined for an empty ledger. */
export const firstDay = (effective: TimeEvent[], now: number, tz: string): DateKey | undefined => {
  const first = buildSessions(effective, now)[0];
  return first && sessionDay(first, tz);
};

/** Sum of day balances from the first recorded day up to yesterday. */
export function totalBalance(ledger: TimeEvent[], now: number, t: Targets, tz: string): number {
  const effective = effectiveEvents(ledger);
  const first = firstDay(effective, now, tz);
  if (!first) return 0;
  const skip = incompleteDays(effective, now, tz);
  const today = dateKeyOf(now, tz);
  // One pass over the sessions instead of summarising every day separately.
  const worked = new Map<DateKey, number>();
  const running = new Set<DateKey>();
  for (const s of buildSessions(countedEvents(effective, now, tz), now)) {
    const day = sessionDay(s, tz);
    worked.set(day, (worked.get(day) ?? 0) + s.workedMs);
    if (s.end === undefined) running.add(day);
  }
  let total = 0;
  for (let day = first; day < today; day = addDays(day, 1)) {
    if (!skip.has(day) && !running.has(day)) total += (worked.get(day) ?? 0) - targetFor(day, t);
  }
  return total;
}
