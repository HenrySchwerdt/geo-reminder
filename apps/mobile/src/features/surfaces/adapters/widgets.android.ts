/**
 * Android: home screen widgets (Glance) and the ongoing notification through `expo-widgets`.
 *
 * Taps, by app state (broadcast receivers run inside the app's process, so "killed" means no JS):
 *  - JS running (foreground, or background with the process alive): every button emits an interaction event and
 *    becomes a command at once.
 *  - Notification buttons also record the tap in the notification's own props, so if the process was dead the
 *    tap is read back from the active notification and applied on the next launch (see `drainNotificationTaps`).
 *  - Widget buttons have no such record: when the process was dead the tap is dropped by expo-widgets and the
 *    widget stays as it was. The geofencing background service keeps the process alive during a session in
 *    practice, but this must be checked on devices with aggressive battery managers.
 */
import type { SurfaceSnapshot } from '@worktime/core';
import type * as ExpoWidgets from 'expo-widgets';

import { getSettings } from '@/features/settings/store';
import { publishSurfaces, registerSurface } from '../index';
import { applyCommands, commandFromEvent } from '../widgets/bridge';
import { ANDROID_MEDIUM_WIDGET, ANDROID_SMALL_WIDGET, NOTIFICATION_ID, NOTIFICATION_LAYOUT, pendingCommands, toView, type WorktimeView } from '../widgets/model';

type Lib = typeof ExpoWidgets;
interface Native {
  lib: Lib;
  small: ExpoWidgets.Widget<WorktimeView>;
  medium: ExpoWidgets.Widget<WorktimeView>;
  notification: ExpoWidgets.CustomNotificationFactory<WorktimeView>;
}

/** Undefined where the native module is missing (Expo Go). */
function load(): Native | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily: the native module is missing in Expo Go
    const lib: Lib = require('expo-widgets');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const layouts: typeof import('../widgets/android-layouts') = require('../widgets/android-layouts');
    return {
      lib,
      small: lib.createWidget<WorktimeView>(ANDROID_SMALL_WIDGET, layouts.WorktimeSmallWidget),
      medium: lib.createWidget<WorktimeView>(ANDROID_MEDIUM_WIDGET, layouts.WorktimeMediumWidget),
      notification: lib.createCustomNotification<WorktimeView>(NOTIFICATION_LAYOUT, layouts.WorktimeNotification),
    };
  } catch (e) {
    console.warn('[surfaces] widgets unavailable', e);
    return undefined;
  }
}

const native = load();

/** Taps recorded by the notification's buttons, applied oldest first. Returns how many were new. */
async function drainNotificationTaps(n: Native): Promise<number> {
  try {
    const active = await n.notification.getActive();
    const props = await Promise.all(active.map((a) => a.getProps().catch(() => undefined)));
    return applyCommands(props.flatMap((p) => pendingCommands(p, 'liveActivity')));
  } catch {
    return 0;
  }
}

/** Post, update or remove the ongoing notification of a running session. */
async function syncNotification(n: Native, snapshot: SurfaceSnapshot, view: WorktimeView) {
  const enabled = getSettings().liveActivity;
  const active = (await n.notification.getActive()).find((a) => a.id === NOTIFICATION_ID);
  if (!enabled || snapshot.state === 'off') {
    await active?.cancel().catch(() => undefined);
    return;
  }
  const options = { ongoing: true, alertOnlyOnce: true, title: view.workplace ? `${view.title} · ${view.workplace}` : view.title, text: view.sinceText ? `since ${view.sinceText}` : undefined };
  if (active) {
    try {
      await active.update(view, options);
      return;
    } catch {
      // dismissed in the meantime: post it again
    }
  }
  await n.notification.post(view, { id: NOTIFICATION_ID, ...options });
}

if (native) {
  const n = native;
  registerSurface({
    name: 'widgets',
    publish: async (snapshot) => {
      if ((await drainNotificationTaps(n)) > 0) {
        await publishSurfaces();
        return;
      }
      const view = toView(snapshot);
      n.small.updateSnapshot(view);
      n.medium.updateSnapshot(view);
      await syncNotification(n, snapshot, view).catch((e) => console.warn('[surfaces] notification not updated', e));
    },
  });

  n.lib.addUserInteractionListener((event) => {
    void (async () => {
      if (event.notificationId && (await drainNotificationTaps(n)) > 0) return void (await publishSurfaces());
      const command = commandFromEvent(event, event.notificationId ? 'liveActivity' : 'widget');
      if (command) applyCommands([command]);
      await publishSurfaces();
    })();
  });
}
