/** Month grid model for the Calendar tab. */
import { addDays, dateKeyOf, daysInMonth, effectiveEvents, isoWeekdayOf, summarizeDay, type DateKey, type TimeEvent } from '@worktime/core';

import { countedEvents, dayBalanceOf, firstDay, incompleteDays, targetFor, type Targets } from './balance';

export type CellState = 'default' | 'today' | 'selected' | 'missing' | 'off' | 'future';

export interface Cell {
  key: DateKey;
  day: number;
  state: CellState;
  /** Worked hours; undefined when nothing was recorded. */
  hours?: number;
}

export interface MonthModel {
  /** Mon-first weeks; null pads the days outside the month. */
  weeks: (Cell | null)[][];
  workedMs: number;
  balanceMs: number;
}

/** `month` is the first day of the month; `tz` is where the phone is (it decides "today"). */
export function buildMonth(ledger: TimeEvent[], month: DateKey, now: number, targets: Targets, tz: string, selectedKey?: DateKey): MonthModel {
  const effective = effectiveEvents(ledger);
  const skip = incompleteDays(effective, now, tz);
  const counted = countedEvents(effective, now, tz);
  const today = dateKeyOf(now, tz);
  // Targets only count from the first recorded day — a new user doesn't start the month in deficit.
  const trackingStart = firstDay(effective, now, tz) ?? today;

  const cells: (Cell | null)[] = Array.from({ length: isoWeekdayOf(month) - 1 }, () => null);
  let workedMs = 0;
  let balanceMs = 0;

  for (let d = 1; d <= daysInMonth(month); d++) {
    const key = addDays(month, d - 1);
    const summary = summarizeDay(counted, key, now, tz);
    const incomplete = skip.has(key);
    const hasData = summary.sessions.length > 0;

    let state: CellState = 'default';
    if (key === today) state = 'today';
    else if (key > today) state = 'future';
    else if (incomplete) state = 'missing';
    else if (key === selectedKey) state = 'selected';
    else if (!hasData && targetFor(key, targets) === 0) state = 'off';

    if (key <= today && !incomplete) workedMs += summary.workedMs;
    if (key >= trackingStart) balanceMs += dayBalanceOf(counted, key, now, targets, skip, tz) ?? 0;
    cells.push({ key, day: d, state, hours: hasData && state !== 'missing' ? summary.workedMs / 3_600_000 : undefined });
  }
  while (cells.length % 7) cells.push(null);
  return { weeks: Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7)), workedMs, balanceMs };
}
