/**
 * Reminder notifications with actions. Arrival and departure reminders are questions with the detected time
 * as the default answer ("Clock in at 08:44"). Action titles carry that time, so the category is re-registered
 * right before each reminder is shown.
 */
import * as Notifications from 'expo-notifications';

import { handleTimeResponse } from '@/features/reminders/respond';
import { clockIn, clockOut } from '@/features/tracking/actions';

export type ReminderKind = 'arrival' | 'departure';

const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const identifier = (kind: ReminderKind, workplaceId: string) => `${kind}.${workplaceId}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Actions open the app so the answer is recorded reliably on both platforms; handling them fully in the
// background needs a native notification extension (milestone 4, see docs/technical/architecture.md).
const open = { opensAppToForeground: true, isAuthenticationRequired: false, isDestructive: false };

async function registerCategory(kind: ReminderKind, suggestedAt: number) {
  if (kind === 'arrival') {
    await Notifications.setNotificationCategoryAsync('arrival', [
      { identifier: 'clockInSuggested', buttonTitle: `Clock in at ${fmt(suggestedAt)}`, options: open },
      { identifier: 'clockInNow', buttonTitle: 'Clock in now', options: open },
      { identifier: 'notToday', buttonTitle: 'Not working today', options: { ...open, opensAppToForeground: false, isDestructive: true } },
    ]);
  } else {
    await Notifications.setNotificationCategoryAsync('departure', [
      { identifier: 'clockOutSuggested', buttonTitle: `Clock out at ${fmt(suggestedAt)}`, options: open },
      { identifier: 'clockOutNow', buttonTitle: 'Clock out now', options: open },
      { identifier: 'stillWorking', buttonTitle: 'Still working', options: { ...open, opensAppToForeground: false } },
    ]);
  }
}

export async function showReminder(kind: ReminderKind, workplaceId: string, place: string, suggestedAt: number) {
  await registerCategory(kind, suggestedAt);
  await Notifications.scheduleNotificationAsync({
    identifier: identifier(kind, workplaceId),
    content: {
      title: kind === 'arrival' ? `Arrived at ${place}` : `Left ${place}?`,
      body: kind === 'arrival' ? `Clock in now? You arrived at ${fmt(suggestedAt)}.` : `Clock out? You left at ${fmt(suggestedAt)}.`,
      categoryIdentifier: kind,
      interruptionLevel: 'timeSensitive',
      data: { kind, workplaceId, suggestedAt },
    },
    trigger: null,
  });
}

export async function cancelReminder(kind: ReminderKind, workplaceId: string) {
  await Notifications.dismissNotificationAsync(identifier(kind, workplaceId)).catch(() => undefined);
}

/** Handle a tapped action. Returns true when it was one of ours. */
export async function handleResponse(response: Notifications.NotificationResponse): Promise<boolean> {
  if (await handleTimeResponse(response)) return true;
  const data = response.notification.request.content.data as { kind?: ReminderKind; workplaceId?: string; suggestedAt?: number };
  if (!data?.kind || !data.workplaceId) return false;
  const { dispatch } = await import('@/features/geofencing/runner');
  const now = Date.now();
  switch (response.actionIdentifier) {
    case 'clockInSuggested':
      clockIn(data.suggestedAt ?? now, 'notification', data.workplaceId);
      break;
    case 'clockInNow':
      clockIn(now, 'notification', data.workplaceId);
      break;
    case 'clockOutSuggested':
      clockOut(data.suggestedAt ?? now, 'notification');
      break;
    case 'clockOutNow':
      clockOut(now, 'notification');
      break;
    case 'notToday':
      await dispatch({ type: 'answered', kind: 'arrival', workplaceId: data.workplaceId, now });
      break;
    case 'stillWorking':
      await dispatch({ type: 'answered', kind: 'departure', workplaceId: data.workplaceId, now });
      break;
    default:
      return true; // plain tap: the app opens on Today
  }
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
  return true;
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}
