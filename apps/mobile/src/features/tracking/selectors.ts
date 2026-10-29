/**
 * Pure derivations from the ledger, shared by screens, notifications and exports. `tz` is the zone the phone
 * is in: it decides what "today" and "this week" are, and is the fallback for events recorded without a zone.
 */
import {
  addDays,
  buildSessions,
  countedEvents,
  dateKeyOf,
  effectiveEvents,
  incompleteDays,
  isoWeekdayOf,
  runningSession,
  sessionDay,
  summarizeDay,
  type DateKey,
  type TimeEvent,
} from '@worktime/core';

/** Monday of the week containing `day`. */
export const weekStart = (day: DateKey) => addDays(day, 1 - isoWeekdayOf(day));

/** One work day: the sessions that started on it, wherever they were recorded. */
export function daySummary(ledger: TimeEvent[], day: DateKey, now: number, tz: string) {
  return { day, ...summarizeDay(effectiveEvents(ledger), day, now, tz) };
}

/** Whether the user is working, on a break or off — independent of which day the running session belongs to. */
export function currentState(ledger: TimeEvent[], now: number) {
  const running = runningSession(effectiveEvents(ledger), now);
  const openBreak = running?.breaks.find((b) => b.end === undefined);
  return {
    state: running ? (openBreak ? 'break' : 'working') : ('off' as 'off' | 'working' | 'break'),
    since: running ? (openBreak?.start ?? running.breaks.at(-1)?.end ?? running.start) : undefined,
    session: running,
  };
}

/** The work day the Today screen shows: the running session's day (a night shift keeps its start day), else today. */
export function currentDay(ledger: TimeEvent[], now: number, tz: string): DateKey {
  const running = runningSession(effectiveEvents(ledger), now);
  return running ? sessionDay(running, tz) : dateKeyOf(now, tz);
}

/** The first day with any record: targets before it don't count against the balance. */
export function trackingSince(ledger: TimeEvent[], now: number, tz: string): DateKey | undefined {
  const first = buildSessions(effectiveEvents(ledger), now)[0];
  return first ? sessionDay(first, tz) : undefined;
}

export interface WeekDay {
  label: string;
  day: DateKey;
  hours: number;
  workedMs: number;
  today: boolean;
  isWorkday: boolean;
  firstIn?: number;
  lastOut?: number;
  /** Zone of the day's first session, for showing its times. */
  tz?: string;
  /** A session of this day is still running (a night shift into today): not counted in the balance yet. */
  running: boolean;
  /** A session of this day has no check-out: the day counts for nothing until it is fixed. */
  incomplete: boolean;
}

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The week containing `now`: per-day hours plus worked total and balance against the daily target. Sessions
 * without a check-out count for nothing until fixed, as in the calendar.
 */
export function weekSummary(ledger: TimeEvent[], now: number, workdays: number[], dailyTargetMs: number, tz: string) {
  const today = dateKeyOf(now, tz);
  const start = weekStart(today);
  const since = trackingSince(ledger, now, tz) ?? today;
  const effective = effectiveEvents(ledger);
  const counted = countedEvents(effective, now, tz);
  const incomplete = incompleteDays(effective, now, tz);
  const days: WeekDay[] = LABELS.map((label, i) => {
    const day = addDays(start, i);
    const d = summarizeDay(counted, day, now, tz);
    return {
      label,
      day,
      hours: d.workedMs / 3_600_000,
      workedMs: d.workedMs,
      today: day === today,
      isWorkday: workdays.includes(i + 1),
      firstIn: d.firstIn,
      lastOut: d.lastOut,
      tz: d.sessions[0]?.tz,
      running: d.state !== 'off',
      incomplete: incomplete.has(day),
    };
  });
  const finished = days.filter((d) => d.day >= since && d.day < today && !d.running && !d.incomplete);
  const worked = days.reduce((t, d) => t + d.workedMs, 0);
  const balance = finished.reduce((t, d) => t + d.workedMs - (d.isWorkday ? dailyTargetMs : 0), 0);
  return { days, worked, balance };
}
