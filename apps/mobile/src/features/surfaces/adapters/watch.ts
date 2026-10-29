/**
 * Apple Watch adapter (iOS). Publishes every snapshot to the watch through the local `watch-bridge` module
 * (WatchConnectivity application context) and applies the commands the watch sent, oldest tap first.
 * The native side queues commands persistently, also while the app is not running; JS drains that queue on
 * start, whenever the app becomes active and when the module reports a new command.
 * A no-op in Expo Go and without a paired watch. See docs/technical/surfaces.md.
 */
import { AppState } from 'react-native';

import WatchBridge from '../../../../modules/watch-bridge';
import { registerSurface, runSurfaceCommand } from '../index';
import { applyQueuedCommands } from './watch-commands';

function drainCommands() {
  try {
    applyQueuedCommands(WatchBridge.drainCommands(), runSurfaceCommand);
  } catch (e) {
    console.warn('[surfaces] draining watch commands failed', e);
  }
}

registerSurface({
  name: 'watch',
  publish: (snapshot) => {
    if (WatchBridge.isSupported) WatchBridge.publishSnapshot(JSON.stringify(snapshot));
  },
});

if (WatchBridge.isSupported) {
  // After the imports have settled (the hub and the stores are loaded by then).
  void Promise.resolve().then(drainCommands);
  AppState.addEventListener('change', (state) => state === 'active' && drainCommands());
  WatchBridge.addCommandListener(drainCommands);
}
