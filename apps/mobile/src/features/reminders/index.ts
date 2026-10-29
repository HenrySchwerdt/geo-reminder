/**
 * Time-based reminders as a surface adapter: after every event and settings change the plan is recomputed
 * and the pending `time.*` notifications are replaced by it. Needs no location, so it covers home-office days
 * and phones where background location is off.
 */
import * as Notifications from 'expo-notifications';

import { locationAccess } from '@/features/geofencing/permissions';
import { getSettings } from '@/features/settings/store';
import { registerSurface } from '@/features/surfaces';
import { getLedger } from '@/features/tracking/store';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { ID_PREFIX, planReminders, type PlannedReminder, type ReminderKind } from './plan';

/** Notification category per reminder kind; the missing check-out reminder has no actions (a tap opens the day). */
const CATEGORY: Record<ReminderKind, string | undefined> = { start: 'timeStart', stop: 'timeStop', missing: undefined };

const background = { opensAppToForeground: false, isAuthenticationRequired: false, isDestructive: false };
const foreground = { ...background, opensAppToForeground: true };

async function registerCategories() {
  await Promise.all([
    Notifications.setNotificationCategoryAsync('timeStart', [
      { identifier: 'timeClockIn', buttonTitle: 'Clock in now', options: foreground },
      { identifier: 'timeSkip', buttonTitle: 'Not working today', options: background },
    ]),
    Notifications.setNotificationCategoryAsync('timeStop', [
      { identifier: 'timeClockOut', buttonTitle: 'Clock out now', options: foreground },
      { identifier: 'timeKeepGoing', buttonTitle: 'Still working', options: background },
    ]),
  ]);
}

async function cancelPlanned() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(pending.filter((n) => n.identifier.startsWith(ID_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const schedule = (r: PlannedReminder) =>
  Notifications.scheduleNotificationAsync({
    identifier: r.id,
    content: {
      title: r.title,
      body: r.body,
      categoryIdentifier: CATEGORY[r.kind],
      interruptionLevel: 'timeSensitive',
      data: { time: r.kind, day: r.day },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
  });

let queue: Promise<void> = Promise.resolve();

/** Recompute the plan and replace the pending time-based reminders. Calls are serialised; never throws. */
export function replanReminders(now = Date.now()): Promise<void> {
  queue = queue.then(async () => {
    try {
      const access = await locationAccess();
      const plan = planReminders({ settings: getSettings(), ledger: getLedger(), now, tz: deviceTimeZone(), backgroundLocation: access === 'always' });
      await cancelPlanned();
      await registerCategories();
      for (const r of plan) await schedule(r);
    } catch (e) {
      console.warn('[reminders] could not schedule', e);
    }
  });
  return queue;
}

registerSurface({ name: 'reminders', publish: () => replanReminders() });
