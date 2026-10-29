import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';

import { currentState } from '@/features/tracking/selectors';
import { getLedger } from '@/features/tracking/store';
import { handleResponse } from './index';

/** Taps already turned into a sheet (a response is reported both live and as the "last response"). */
const opened = new Set<string>();

/**
 * A plain tap on an arrival / departure reminder (not one of its action buttons) opens the clock-in / clock-out
 * sheet with the detected time offered. A reminder that was answered in the meantime opens nothing.
 */
function openSheet(response: Notifications.NotificationResponse) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const { identifier, content } = response.notification.request;
  const data = content.data as { kind?: 'arrival' | 'departure'; workplaceId?: string; suggestedAt?: number };
  if (!data?.kind || !data.workplaceId) return;
  const id = `${identifier}:${response.notification.date}`;
  if (opened.has(id)) return;
  opened.add(id);
  const off = currentState(getLedger(), Date.now()).state === 'off';
  if ((data.kind === 'arrival') !== off) return;
  router.push({
    pathname: data.kind === 'arrival' ? '/clock/in' : '/clock/out',
    params: { workplaceId: data.workplaceId, ...(data.suggestedAt !== undefined && { suggestedAt: String(data.suggestedAt) }) },
  });
}

/** Records answers to reminder notifications: live responses and the one that cold-started the app. */
export function NotificationBridge() {
  const lastResponse = Notifications.useLastNotificationResponse();
  // Routing works once the root navigator exists; a cold-start tap arrives before that.
  const ready = Boolean(useRootNavigationState()?.key);
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      void handleResponse(r);
      if (readyRef.current) openSheet(r);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (lastResponse && ready) {
      openSheet(lastResponse);
      void handleResponse(lastResponse).then(() => Notifications.clearLastNotificationResponse());
    }
  }, [lastResponse, ready]);
  return null;
}
