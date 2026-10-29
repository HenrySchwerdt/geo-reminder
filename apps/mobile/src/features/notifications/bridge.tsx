import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { handleResponse } from './index';

/** Records answers to reminder notifications: live responses and the one that cold-started the app. */
export function NotificationBridge() {
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handleResponse(r));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (lastResponse) void handleResponse(lastResponse).then(() => Notifications.clearLastNotificationResponse());
  }, [lastResponse]);
  return null;
}
