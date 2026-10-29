import { requireOptionalNativeModule, type NativeModule } from 'expo';

import type { WatchBridgeApi } from './WatchBridge.types';

declare class WatchBridgeNative extends NativeModule<{ onCommand: () => void }> {
  isPaired: boolean;
  isWatchAppInstalled: boolean;
  publishSnapshot(json: string): void;
  drainCommands(): string[];
}

// Null in Expo Go and in builds without the module: behave like "no watch".
const native = requireOptionalNativeModule<WatchBridgeNative>('WatchBridge');

const WatchBridge: WatchBridgeApi = {
  isSupported: native != null,
  get isPaired() {
    return native?.isPaired ?? false;
  },
  get isWatchAppInstalled() {
    return native?.isWatchAppInstalled ?? false;
  },
  publishSnapshot(json) {
    try {
      native?.publishSnapshot(json);
    } catch (e) {
      console.warn('[watch-bridge] publishSnapshot failed', e);
    }
  },
  drainCommands() {
    try {
      return native?.drainCommands() ?? [];
    } catch (e) {
      console.warn('[watch-bridge] drainCommands failed', e);
      return [];
    }
  },
  addCommandListener(listener) {
    if (!native) return { remove: () => {} };
    return native.addListener('onCommand', listener);
  },
};

export default WatchBridge;
