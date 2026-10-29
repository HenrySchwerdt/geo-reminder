/**
 * iOS: home / lock screen widget and Live Activity (Dynamic Island) through `expo-widgets`.
 *
 * Taps, by app state:
 *  - Live Activity buttons run an App Intent inside the app's process (iOS starts the app in the background if it
 *    is not running) and emit an interaction event. With JS alive (foreground, or suspended and woken) the event
 *    becomes a command at once. If the system had killed the app, the process starts without JS listening yet:
 *    that tap is lost and the activity keeps its old state until the next publish.
 *  - Widget buttons record the tap (id, action, time) in the widget's own props in the shared App Group; the
 *    widget shows it as queued. The app drains these taps whenever it publishes (launch, foreground, event) and
 *    on the interaction event, so a tap is never lost, only applied when the app next runs.
 */
import type { SurfaceCommand, SurfaceSnapshot } from '@worktime/core';
import type * as ExpoWidgets from 'expo-widgets';

import { getSettings } from '@/features/settings/store';
import { kv } from '@/shared/lib/kv';
import { publishSurfaces, registerSurface } from '../index';
import { applyCommands, commandFromEvent } from '../widgets/bridge';
import { DISMISS_AFTER_MS, LIVE_ACTIVITY_NAME, pendingCommands, staleDateFor, toActivityView, toView, WIDGET_NAME, type WorktimeView } from '../widgets/model';

type Lib = typeof ExpoWidgets;
interface Native {
  lib: Lib;
  widget: ExpoWidgets.Widget<WorktimeView>;
  activities: ExpoWidgets.LiveActivityFactory<WorktimeView>;
}

/** Undefined where the native module is missing (Expo Go, simulators without the extension). */
function load(): Native | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily: the native module is missing in Expo Go
    const lib: Lib = require('expo-widgets');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const layouts: typeof import('../widgets/ios-layouts') = require('../widgets/ios-layouts');
    return {
      lib,
      widget: lib.createWidget<WorktimeView>(WIDGET_NAME, layouts.WorktimeWidget),
      activities: lib.createLiveActivity<WorktimeView>(LIVE_ACTIVITY_NAME, layouts.WorktimeActivity),
    };
  } catch (e) {
    console.warn('[surfaces] widgets unavailable', e);
    return undefined;
  }
}

const native = load();

const ACTIVITY_KEY = 'surfaces.liveActivity';
const readActivity = (): { id: string; startedAt: number } | undefined => {
  try {
    return JSON.parse(kv.getItem(ACTIVITY_KEY) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
};

/** Taps the widget recorded while the app wasn't running, applied oldest first. Returns how many were new. */
async function drainWidgetTaps(n: Native): Promise<number> {
  try {
    const timeline = await n.widget.getTimeline();
    return applyCommands(timeline.flatMap((entry) => pendingCommands(entry.props, 'widget')));
  } catch {
    return 0; // no timeline stored yet
  }
}

/** Start, update or end the Live Activity to match the session. Starting only works while the app is in the foreground. */
async function syncActivity(n: Native, snapshot: SurfaceSnapshot) {
  const instances = n.activities.getInstances();
  const stored = readActivity();
  const enabled = getSettings().liveActivity;
  const now = Date.now();

  if (!enabled || snapshot.state === 'off') {
    const finalView = enabled ? toActivityView(snapshot, stored?.startedAt ?? now) : undefined;
    const dismiss = enabled ? n.lib.after(new Date(now + DISMISS_AFTER_MS)) : 'immediate';
    await Promise.all(instances.map((i) => i.end(dismiss, finalView).catch(() => undefined)));
    kv.removeItem(ACTIVITY_KEY);
    return;
  }

  const [current, ...extra] = instances;
  await Promise.all(extra.map((i) => i.end('immediate').catch(() => undefined)));
  if (current) {
    // Re-attached after a restart: the system's 8 h limit counts from when the activity started.
    const startedAt = stored?.id === current.getId() ? stored.startedAt : now;
    if (stored?.id !== current.getId()) kv.setItem(ACTIVITY_KEY, JSON.stringify({ id: current.getId(), startedAt }));
    await current.update(toActivityView(snapshot, startedAt), staleDateFor(startedAt));
    return;
  }
  try {
    const started = n.activities.start(toActivityView(snapshot, now), 'worktime://', staleDateFor(now));
    kv.setItem(ACTIVITY_KEY, JSON.stringify({ id: started.getId(), startedAt: now }));
  } catch (e) {
    // Not in the foreground, or Live Activities are turned off for the app: the next foreground publish retries.
    console.warn('[surfaces] live activity not started', e);
  }
}

if (native) {
  const n = native;
  registerSurface({
    name: 'widgets',
    publish: async (snapshot) => {
      if ((await drainWidgetTaps(n)) > 0) {
        // Newly applied taps changed the ledger after this snapshot was built.
        await publishSurfaces();
        return;
      }
      n.widget.updateSnapshot(toView(snapshot));
      await syncActivity(n, snapshot);
    },
  });

  n.lib.addUserInteractionListener((event) => {
    if (event.source === WIDGET_NAME) {
      void drainWidgetTaps(n).then(async (applied) => { if (applied > 0) await publishSurfaces(); });
      return;
    }
    // Live Activity: the source is the activity id, the target the button (= action name).
    const command: SurfaceCommand | undefined = commandFromEvent(event, 'liveActivity');
    if (command) applyCommands([command]);
    void publishSurfaces();
  });
}
