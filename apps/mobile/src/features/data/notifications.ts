import * as Notifications from 'expo-notifications';

/** Remove every delivered and pending reminder. */
export async function clearAllNotifications(): Promise<void> {
  await Promise.all([Notifications.dismissAllNotificationsAsync(), Notifications.cancelAllScheduledNotificationsAsync()]);
}
