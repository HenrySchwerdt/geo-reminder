import type { WatchBridgeApi } from './WatchBridge.types';

/** Android / web: there is no Apple Watch, everything is a no-op. */
const WatchBridge: WatchBridgeApi = {
  isSupported: false,
  isPaired: false,
  isWatchAppInstalled: false,
  publishSnapshot: () => {},
  drainCommands: () => [],
  addCommandListener: () => ({ remove: () => {} }),
};

export default WatchBridge;
