/** Month grid model for the Calendar tab. */
import { effectiveEvents, summarize, type TimeEvent } from '@worktime/core';

import { dayBounds } from '@/features/tracking/selectors';
import { countedEvents, dayBalanceOf, incompleteDayStarts, targetFor, type Targets } from './balance';
import { toDateKey } from './dates';

export type CellState = 'default' | 'today' | 'selected' | 'missing' | 'off' | 'future';

export interface Cell {
  key: string;
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

export function buildMonth(ledger: TimeEvent[], monthStart: number, now: number, targets: Targets, selectedKey?: string): MonthModel {
  const effective = effectiveEvents(ledger);
  const skip = incompleteDayStarts(effective, now);
  const counted = countedEvents(effective, now);
  const todayStart = dayBounds(now).start;
  // Targets only count from the first recorded day — a new user doesn't start the month in deficit.
  const trackingStart = effective[0] ? dayBounds(effective[0].at).start : todayStart;
  const first = new Date(monthStart);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  const cells: (Cell | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null);
  let workedMs = 0;
  let balanceMs = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const start = new Date(first.getFullYear(), first.getMonth(), d).getTime();
    const key = toDateKey(start);
    const summary = summarize(counted, start, dayBounds(start).end, now);
    const incomplete = skip.has(start);
    const hasData = summary.segments.length > 0;

    let state: CellState = 'default';
    if (start === todayStart) state = 'today';
    else if (start > todayStart) state = 'future';
    else if (incomplete) state = 'missing';
    else if (key === selectedKey) state = 'selected';
    else if (!hasData && targetFor(start, targets) === 0) state = 'off';

    if (start <= todayStart && !incomplete) workedMs += summary.workedMs;
    if (start >= trackingStart) balanceMs += dayBalanceOf(counted, start, now, targets, skip) ?? 0;
    cells.push({ key, day: d, state, hours: hasData && state !== 'missing' ? summary.workedMs / 3_600_000 : undefined });
  }
  while (cells.length % 7) cells.push(null);
  return { weeks: Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7)), workedMs, balanceMs };
}
