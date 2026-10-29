/** Pure balance maths shared by the calendar, day details and the correction impact preview. */
import { buildSessions, effectiveEvents, summarize, type Session, type TimeEvent } from '@worktime/core';

import { dayBounds } from '@/features/tracking/selectors';
import { isoWeekday } from './dates';

/** What a day is expected to produce: `dailyMs` on each ISO weekday in `workdays`, otherwise nothing. */
export interface Targets {
  workdays: number[];
  dailyMs: number;
}

export const targetFor = (dayStart: number, t: Targets) => (t.workdays.includes(isoWeekday(dayStart)) ? t.dailyMs : 0);

/**
 * Sessions from a past day that never got a check-out. They stay out of the balance until fixed
 * ("incomplete days don't count"). The session still running today is not incomplete.
 */
export function findIncomplete(effective: TimeEvent[], now: number): Session[] {
  const todayStart = dayBounds(now).start;
  const clockOuts = new Set(effective.filter((e) => e.type === 'clockOut').map((e) => e.id));
  return buildSessions(effective, now).filter((s) => s.start < todayStart && !s.eventIds.some((id) => clockOuts.has(id)));
}

/** Start-of-day timestamps (local) of days that contain an incomplete session. */
export const incompleteDayStarts = (effective: TimeEvent[], now: number) =>
  new Set(findIncomplete(effective, now).map((s) => dayBounds(s.start).start));

/** Worked time minus target for one day, or undefined when the day is not counted (incomplete or not over yet). */
export function dayBalanceOf(effective: TimeEvent[], dayStart: number, now: number, t: Targets, skip: Set<number>): number | undefined {
  const { end } = dayBounds(dayStart);
  if (end > now || skip.has(dayStart)) return undefined;
  return summarize(effective, dayStart, end, now).workedMs - targetFor(dayStart, t);
}

/** Sum of day balances from the first recorded day up to yesterday. */
export function totalBalance(ledger: TimeEvent[], now: number, t: Targets): number {
  const effective = effectiveEvents(ledger);
  const first = effective[0];
  if (!first) return 0;
  const skip = incompleteDayStarts(effective, now);
  const todayStart = dayBounds(now).start;
  let total = 0;
  for (let day = dayBounds(first.at).start; day < todayStart; day = dayBounds(day, 1).start) {
    total += dayBalanceOf(effective, day, now, t, skip) ?? 0;
  }
  return total;
}
