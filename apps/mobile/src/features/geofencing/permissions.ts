import * as Location from 'expo-location';

export type LocationAccess = 'always' | 'whenInUse' | 'denied' | 'undetermined';

export async function locationAccess(): Promise<LocationAccess> {
  const bg = await Location.getBackgroundPermissionsAsync();
  if (bg.granted) return 'always';
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.granted) return 'whenInUse';
  return fg.canAskAgain ? 'undetermined' : 'denied';
}

/** Initial onboarding asks only for foreground access; background access follows a saved workplace. */
export async function requestForegroundLocation(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  return fg.granted ? 'whenInUse' : fg.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Two steps on both platforms: "While using" first, then the upgrade to "Always" / "Allow all the time"
 * (Android opens the settings page for the second step).
 */
export async function requestAlwaysLocation(): Promise<LocationAccess> {
  const foreground = await requestForegroundLocation();
  if (foreground !== 'whenInUse') return foreground;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'always' : 'whenInUse';
}
