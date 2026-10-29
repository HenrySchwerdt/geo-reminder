/**
 * Pure planner for the time-based reminders (docs/product/user-flows.md, Flow 4). Given the settings, the
 * ledger and the clock it returns every notification that should be pending; scheduling replaces the old
 * set with it. All calendar maths names its zone: the phone's for "today" and the next days, the session's
 * own for a running session.
 */
import {
  addDays,
  dateKeyOf,
  effectiveEvents,
  formatDuration,
  isoWeekdayOf,
  runningSession,
  sessionDay,
  sessionZone,
  wallTime,
  type DateKey,
  type DayMode,
  type Settings,
  type TimeEvent,
} from '@worktime/core';

import { findIncomplete } from '@/features/history/balance';

/** Identifier prefix of every notification planned here; rescheduling cancels exactly these. */
export const ID_PREFIX = 'time.';
/** How many days ahead the start reminder is planned. */
export const HORIZON_DAYS = 7;
const MISSING_AT_MINUTES = 8 * 60;

export type ReminderKind = 'start' | 'stop' | 'missing';

export interface PlannedReminder {
  /** Stable, so scheduling it again replaces it. */
  id: string;
  kind: ReminderKind;
  /** Epoch ms when it should fire. */
  at: number;
  /** The work day it is about. */
  day: DateKey;
  title: string;
  body: string;
}

export interface PlanInput {
  settings: Pick<Settings, 'pattern' | 'reminders'>;
  ledger: TimeEvent[];
  now: number;
  /** Where the phone is. */
  tz: string;
  /** Whether location access is "always": without it the arrival and departure reminders can't fire. */
  backgroundLocation: boolean;
}

/** "08:30" to minutes since midnight. */
export const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Days that get time-based reminders: home days, and every working day when location can't tell. */
export const wantsTimeReminders = (mode: DayMode, backgroundLocation: boolean) => mode === 'home' || (!backgroundLocation && mode !== 'off');

const modeOf = (pattern: DayMode[], day: DateKey) => pattern[isoWeekdayOf(day) - 1] ?? 'off';

export function planReminders({ settings, ledger, now, tz, backgroundLocation }: PlanInput): PlannedReminder[] {
  const { pattern, reminders } = settings;
  const effective = effectiveEvents(ledger);
  const plan: PlannedReminder[] = [];

  if (reminders.start.enabled) {
    const started = new Set(effective.filter((e) => e.type === 'clockIn').map((e) => dateKeyOf(e.at, e.tz ?? tz)));
    const today = dateKeyOf(now, tz);
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const day = addDays(today, i);
      if (!wantsTimeReminders(modeOf(pattern, day), backgroundLocation) || started.has(day)) continue;
      const at = wallTime(day, minutesOf(reminders.start.at), tz);
      if (at > now) plan.push({ id: `${ID_PREFIX}start.${day}`, kind: 'start', at, day, title: 'Start work?', body: 'Time to clock in, or tell me you are not working today.' });
    }
  }

  const running = runningSession(effective, now);
  if (running && reminders.stop.enabled) {
    const day = sessionDay(running, tz);
    if (wantsTimeReminders(modeOf(pattern, day), backgroundLocation)) {
      const afterWork = running.start + reminders.stop.afterMinutes * 60_000 + running.breakMs;
      const latest = wallTime(day, minutesOf(reminders.stop.latest), sessionZone(running, tz));
      const at = Math.min(afterWork, latest);
      if (at > now) {
        const workedMs = at - running.start - running.breakMs;
        plan.push({ id: `${ID_PREFIX}stop`, kind: 'stop', at, day, title: 'Stop work?', body: `You have worked ${formatDuration(workedMs, true)}. Clock out now, or keep going.` });
      }
    }
  }

  if (reminders.missingCheckOut) {
    const [oldest, ...others] = findIncomplete(effective, now, tz).sort((a, b) => a.start - b.start);
    if (oldest) {
      // The next 08:00 where the phone is: this morning's if it is still ahead, else tomorrow's.
      const today = dateKeyOf(now, tz);
      const morning = wallTime(today, MISSING_AT_MINUTES, tz);
      plan.push({
        id: `${ID_PREFIX}missing`,
        kind: 'missing',
        at: morning > now ? morning : wallTime(addDays(today, 1), MISSING_AT_MINUTES, tz),
        day: sessionDay(oldest, tz),
        title: 'Missing check-out',
        body: others.length ? `${others.length + 1} days have no check-out. Tap to fix the oldest.` : 'You did not clock out. Tap to add the end of the day.',
      });
    }
  }

  return plan.sort((a, b) => a.at - b.at);
}
