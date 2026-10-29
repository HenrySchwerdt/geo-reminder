/** Answers to the time-based reminders: clock in / out from the actions, a tap on "missing check-out" opens that day. */
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { clockIn, clockOut } from '@/features/tracking/actions';
import type { ReminderKind } from './plan';

interface TimeData {
  time?: ReminderKind;
  day?: string;
}

/** Handle a response to one of our reminders. Returns false when the notification isn't one of them. */
export async function handleTimeResponse(response: Notifications.NotificationResponse): Promise<boolean> {
  const data = response.notification.request.content.data as TimeData | undefined;
  if (!data?.time) return false;
  switch (response.actionIdentifier) {
    case 'timeClockIn':
      clockIn(Date.now(), 'notification');
      break;
    case 'timeClockOut':
      clockOut(Date.now(), 'notification');
      break;
    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      if (data.time === 'missing' && data.day) router.push(`/day/${data.day}` as Href);
      break;
    // "Not working today" and "Still working" only dismiss.
  }
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  return true;
}
