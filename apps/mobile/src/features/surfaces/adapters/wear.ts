/**
 * Wear OS adapter: pushes every snapshot to the watch over the Wearable Data Layer and applies the commands the
 * watch sent (live via `onCommand`, queued ones when the app starts or returns to the foreground).
 * Android only; the bridge is a no-op elsewhere.
 */
import { AppState, Platform } from 'react-native';

import { addCommandListener, drainCommands, publishSnapshot } from '../../../../modules/wear-bridge';
import { registerSurface, runSurfaceCommand } from '../index';
import { applyCommands } from './wear-commands';

function applyQueuedCommands() {
  try {
    applyCommands(drainCommands(), runSurfaceCommand);
  } catch (e) {
    console.warn('[surfaces] wear drain failed', e);
  }
}

if (Platform.OS === 'android') {
  registerSurface({ name: 'wear', publish: (snapshot) => publishSnapshot(JSON.stringify(snapshot)) });
  applyQueuedCommands();
  addCommandListener(applyQueuedCommands);
  AppState.addEventListener('change', (state) => state === 'active' && applyQueuedCommands());
}
