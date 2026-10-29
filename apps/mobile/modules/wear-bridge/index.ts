import { Platform, requireNativeModule, type EventSubscription } from 'expo';

/**
 * Bridge to the Wear OS app over the Wearable Data Layer (see `docs/technical/surfaces.md`). Android only:
 * everywhere else, and when the native module is missing (Expo Go), every call is a no-op.
 */
interface WearBridgeNative {
  publishSnapshot(json: string): Promise<void>;
  /** JSON strings of `SurfaceCommand`s received from the watch since the last call. */
  drainCommands(): string[];
  addListener(event: 'onCommand', listener: () => void): EventSubscription;
}

function load(): WearBridgeNative | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    return requireNativeModule<WearBridgeNative>('WearBridge');
  } catch {
    return undefined;
  }
}

const native = load();

export async function publishSnapshot(json: string): Promise<void> {
  await native?.publishSnapshot(json);
}

export function drainCommands(): string[] {
  return native?.drainCommands() ?? [];
}

/** Called when a command arrives while the app is running; drain to read it. */
export function addCommandListener(listener: () => void): { remove: () => void } {
  return native?.addListener('onCommand', listener) ?? { remove: () => {} };
}
