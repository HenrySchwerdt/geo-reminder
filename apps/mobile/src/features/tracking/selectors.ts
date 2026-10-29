/** Pure derivations from the ledger, shared by screens, notifications and exports. */
import { effectiveEvents, summarize, type TimeEvent } from '@worktime/core';

export function dayBounds(ms: number, offsetDays = 0) {
  const d = new Date(ms);
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays).getTime(),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays + 1).getTime(),
  };
}

/** Monday 00:00 of the week containing `ms`. */
export function weekStart(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

export function daySummary(ledger: TimeEvent[], ms: number, now: number, offsetDays = 0) {
  const { start, end } = dayBounds(ms, offsetDays);
  return { start, ...summarize(effectiveEvents(ledger), start, end, now) };
}

/** Start of the first day with any record: targets before it don't count against the balance. */
export function trackingSince(ledger: TimeEvent[]): number | undefined {
  const first = effectiveEvents(ledger)[0];
  return first ? dayBounds(first.at).start : undefined;
}

export interface WeekDay {
  label: string;
  start: number;
  hours: number;
  today: boolean;
  isWorkday: boolean;
  firstIn?: number;
  lastOut?: number;
}

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The week containing `now`: per-day hours plus worked total and balance against the daily target. */
export function weekSummary(ledger: TimeEvent[], now: number, workdays: number[], dailyTargetMs: number) {
  const start = weekStart(now);
  const todayStart = dayBounds(now).start;
  const since = trackingSince(ledger) ?? todayStart;
  const days: WeekDay[] = LABELS.map((label, i) => {
    const d = daySummary(ledger, start, now, i);
    return {
      label,
      start: d.start,
      hours: d.workedMs / 3_600_000,
      today: d.start === todayStart,
      isWorkday: workdays.includes(i + 1),
      firstIn: d.firstIn,
      lastOut: d.lastOut,
    };
  });
  const counted = days.filter((d) => d.start >= since && d.start < todayStart);
  const worked = days.reduce((t, d) => t + d.hours * 3_600_000, 0);
  const balance = counted.reduce((t, d) => t + d.hours * 3_600_000 - (d.isWorkday ? dailyTargetMs : 0), 0);
  return { days, worked, balance };
}
