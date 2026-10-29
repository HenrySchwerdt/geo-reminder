/**
 * Background tasks. Imported first from the root layout so they are defined at module scope before any
 * navigation runs — the OS can launch the app headless for a region event or a location batch.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Background wake-ups also update widgets and watches.
import '@/features/surfaces/register';

import { dispatch, GEOFENCE_TASK, LOCATION_TASK } from './runner';
import { logLocation } from './store';

type GeofenceData = { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
type LocationData = { locations: Location.LocationObject[] };

TaskManager.defineTask<GeofenceData>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data?.region?.identifier) return;
  const event = data.eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit';
  logLocation(`Region ${event}: ${data.region.identifier.replace(':', ' · ')}`);
  await dispatch({ type: 'region', regionId: data.region.identifier, event, timestamp: Date.now() });
});

TaskManager.defineTask<LocationData>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  for (const l of data.locations) {
    await dispatch({
      type: 'fix',
      fix: {
        lat: l.coords.latitude,
        lng: l.coords.longitude,
        accuracy: l.coords.accuracy ?? 100,
        speed: l.coords.speed ?? undefined,
        timestamp: l.timestamp,
      },
    });
  }
});
