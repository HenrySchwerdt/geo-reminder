/**
 * The contract between the app and its other surfaces: widgets, Live Activity / ongoing notification, Apple Watch
 * and Wear OS. The app publishes a `SurfaceSnapshot` after every change; surfaces render it without any logic of
 * their own (timers count from `workedAnchor`). Taps on a surface come back as `SurfaceCommand`s, which the app
 * turns into events — the watch and widgets never write history themselves.
 *
 * Both shapes are plain JSON, versioned, and mirrored by hand in Swift (watch) and Kotlin (Wear OS):
 * keep `docs/technical/surfaces.md` in sync when changing them.
 */
import { z } from 'zod';

import type { BreakRuleSetting, Settings, TimeEvent, Workplace } from './schema';
import { addDays, dateKeyOf, isoWeekdayOf } from './time/zone';
import { buildSessions, effectiveEvents, runningSession, sessionDay, sessionZone } from './time/ledger';
import { countedEvents, incompleteDays } from './time/complete';
import { expectedEnd, summarizeDay, type BreakRule } from './time/day';

export const SurfaceSnapshotSchema = z.object({
  version: z.literal(1),
  state: z.enum(['off', 'working', 'break']),
  /** The work day shown (`YYYY-MM-DD`): the running session's day, else today. */
  day: z.string(),
  /** Worked / break time of that day as of `updatedAt`. */
  workedMs: z.number(),
  breakMs: z.number(),
  /**
   * While working: the instant from which a running timer shows the day's worked time (`updatedAt - workedMs`),
   * so `Text(timerInterval: workedAnchor...)` / a chronometer counts correctly without updates. Absent otherwise.
   */
  workedAnchor: z.number().optional(),
  /** Start of the current state (clock-in, break start); absent when off. */
  since: z.number().optional(),
  /** Clock-in of the running session. */
  sessionStart: z.number().optional(),
  targetMs: z.number(),
  /** When the day's target is reached, including required breaks; absent when off. */
  expectedEnd: z.number().optional(),
  workplaceName: z.string().optional(),
  weekWorkedMs: z.number(),
  weekTargetMs: z.number(),
  /** Balance of finished days this week. */
  weekBalanceMs: z.number(),
  /** Zone the times above are meant to be shown in (the running session's, else the phone's). */
  tz: z.string(),
  updatedAt: z.number(),
});
export type SurfaceSnapshot = z.infer<typeof SurfaceSnapshotSchema>;

export const SurfaceActionSchema = z.enum(['clockIn', 'startBreak', 'endBreak', 'clockOut']);
export type SurfaceAction = z.infer<typeof SurfaceActionSchema>;

export const SurfaceCommandSchema = z.object({
  /** Unique per tap; the app ignores ids it has already applied (commands may be delivered twice). */
  id: z.string().min(1),
  action: SurfaceActionSchema,
  /** When the user tapped (epoch ms). Queued commands from an offline watch keep their original time. */
  at: z.number().int().nonnegative(),
  source: z.enum(['watch', 'widget', 'liveActivity']),
  /** Zone the tap happened in, if the surface knows it. */
  tz: z.string().optional(),
});
export type SurfaceCommand = z.infer<typeof SurfaceCommandSchema>;

export const breakRulesOf = (rules: BreakRuleSetting[]): BreakRule[] =>
  rules.map((r) => ({ afterMs: r.afterMinutes * 60_000, minBreakMs: r.minBreakMinutes * 60_000 }));

/** Daily target: weekly hours spread over the workdays. */
export const dailyTarget = (s: Pick<Settings, 'weeklyHours' | 'workdays'>) => (s.weeklyHours / Math.max(1, s.workdays.length)) * 3_600_000;

export interface SnapshotInput {
  ledger: TimeEvent[];
  settings: Pick<Settings, 'weeklyHours' | 'workdays' | 'breakRules'>;
  workplaces: Workplace[];
  now: number;
  /** Where the phone is. */
  tz: string;
}

export function buildSnapshot({ ledger, settings, workplaces, now, tz }: SnapshotInput): SurfaceSnapshot {
  const effective = effectiveEvents(ledger);
  const running = runningSession(effective, now);
  const day = running ? sessionDay(running, tz) : dateKeyOf(now, tz);
  const summary = summarizeDay(effective, day, now, tz);
  const targetMs = summary.sessions.length || settings.workdays.includes(isoWeekdayOf(day)) ? dailyTarget(settings) : 0;
  const end = expectedEnd(summary, dailyTarget(settings), now, breakRulesOf(settings.breakRules));

  // This week (Mon–Sun of today), balance over finished days only; days without a check-out count for nothing.
  const today = dateKeyOf(now, tz);
  const counted = countedEvents(effective, now, tz);
  const incomplete = incompleteDays(effective, now, tz);
  const monday = addDays(today, 1 - isoWeekdayOf(today));
  const firstDay = buildSessions(effective, now)[0];
  const since = firstDay ? sessionDay(firstDay, tz) : today;
  let weekWorkedMs = 0;
  let weekBalanceMs = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const s = d === day ? summary : summarizeDay(counted, d, now, tz);
    weekWorkedMs += s.workedMs;
    if (d >= since && d < today && s.state === 'off' && !incomplete.has(d)) {
      weekBalanceMs += s.workedMs - (settings.workdays.includes(i + 1) ? dailyTarget(settings) : 0);
    }
  }

  return {
    version: 1,
    state: summary.state,
    day,
    workedMs: summary.workedMs,
    breakMs: summary.breakMs,
    workedAnchor: summary.state === 'working' ? now - summary.workedMs : undefined,
    since: summary.since,
    sessionStart: running?.start,
    targetMs,
    expectedEnd: end,
    workplaceName: workplaces.find((w) => w.id === (running?.workplaceId ?? summary.workplaceId))?.name,
    weekWorkedMs,
    weekTargetMs: settings.weeklyHours * 3_600_000,
    weekBalanceMs,
    tz: running ? sessionZone(running, tz) : tz,
    updatedAt: now,
  };
}
