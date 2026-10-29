import { resync } from '@/features/geofencing/runner';
import { useGeofence } from '@/features/geofencing/store';
import { useSettings } from '@/features/settings/store';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { clearAllNotifications } from './notifications';

/** Erase everything Worktime stores and return the app to its first-launch state. Irreversible. */
export async function deleteAllData(): Promise<void> {
  useTracking.getState().clear();
  useWorkplaces.getState().replaceAll([]);
  useGeofence.getState().reset();
  useSettings.getState().reset(); // defaults, including onboarded = false
  await resync(); // no workplaces left: stops geofencing and location updates
  await clearAllNotifications();
}
