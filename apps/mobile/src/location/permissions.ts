import * as Location from 'expo-location';

export type LocationAccess = 'always' | 'whenInUse' | 'denied' | 'undetermined';

export async function locationAccess(): Promise<LocationAccess> {
  const bg = await Location.getBackgroundPermissionsAsync();
  if (bg.granted) return 'always';
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.granted) return 'whenInUse';
  return fg.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Two steps on both platforms: "While using" first, then the upgrade to "Always" / "Allow all the time"
 * (Android opens the settings page for the second step).
 */
export async function requestAlwaysLocation(): Promise<LocationAccess> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return fg.canAskAgain ? 'undetermined' : 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'always' : 'whenInUse';
}
