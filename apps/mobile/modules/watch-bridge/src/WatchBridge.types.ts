export interface WatchBridgeApi {
  /** True only on iOS builds that include the native module (not Expo Go, Android or web). */
  readonly isSupported: boolean;
  /** An Apple Watch is paired with this iPhone. */
  readonly isPaired: boolean;
  /** The Worktime watch app is installed on the paired watch. */
  readonly isWatchAppInstalled: boolean;
  /** Push a `SurfaceSnapshot` (JSON string) to the watch; the latest one wins. Never throws. */
  publishSnapshot(json: string): void;
  /** Take the commands (JSON strings, arrival order) the watch has sent since the last drain. */
  drainCommands(): string[];
  /** Called when a command arrived while JS is running; call `drainCommands()` in response. */
  addCommandListener(listener: () => void): { remove(): void };
}
