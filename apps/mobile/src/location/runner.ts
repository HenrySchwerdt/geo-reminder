/**
 * Glue between the pure geofence engine (@worktime/core) and the OS:
 * persists engine state, applies its effects through expo-location / expo-notifications.
 */
import {
  osRegions,
  planSampling,
  step,
  type Effect,
  type EngineConfig,
  type EngineInput,
  type OsRegion,
  type SamplingPlan,
} from '@worktime/core';
import * as Location from 'expo-location';

import { getEngineState, getWorkplaces, logLocation, saveEngineState } from '@/data/store';
import { cancelReminder, showReminder } from '@/notifications';

export const GEOFENCE_TASK = 'worktime-geofence';
export const LOCATION_TASK = 'worktime-location';

const config = (): EngineConfig => ({
  workplaces: getWorkplaces(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

// Background tasks can fire concurrently; decisions must be applied in order.
let queue: Promise<void> = Promise.resolve();

export function dispatch(input: EngineInput): Promise<void> {
  queue = queue.then(() => run(input)).catch((e) => logLocation(`Error: ${String(e)}`));
  return queue;
}

async function run(input: EngineInput) {
  const { state, effects } = step(getEngineState(), input, config());
  saveEngineState(state);
  for (const e of effects) await apply(e);
}

/** Re-apply regions and sampling from scratch (after editing workplaces, granting permissions, app start). */
export function resync(): Promise<void> {
  queue = queue.then(async () => {
    const cfg = config();
    const state = getEngineState();
    const now = Date.now();
    const plan = planSampling(state, cfg, now);
    saveEngineState({ ...state, plan });
    await applyRegions(osRegions(state, cfg, now));
    await applySampling(plan);
  });
  return queue;
}

async function apply(e: Effect) {
  switch (e.type) {
    case 'regions':
      return applyRegions(e.regions);
    case 'sampling':
      return applySampling(e.plan);
    case 'notify': {
      const wp = getWorkplaces().find((w) => w.id === e.workplaceId);
      logLocation(`${e.kind === 'arrival' ? 'Asked to clock in' : 'Asked to clock out'} · ${wp?.name ?? ''}`);
      return showReminder(e.kind, e.workplaceId, wp?.name ?? 'your workplace', e.suggestedAt);
    }
    case 'cancelNotification':
      return cancelReminder(e.kind, e.workplaceId);
  }
}

async function hasBackgroundPermission() {
  const p = await Location.getBackgroundPermissionsAsync();
  return p.granted;
}

async function applyRegions(regions: OsRegion[]) {
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (!regions.length || !(await hasBackgroundPermission())) {
    if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    return;
  }
  await Location.startGeofencingAsync(
    GEOFENCE_TASK,
    regions.map((r) => ({ identifier: r.id, latitude: r.lat, longitude: r.lng, radius: r.radius, notifyOnEnter: true, notifyOnExit: true })),
  );
  logLocation(`Monitoring ${regions.length} regions`);
}

const ACCURACY: Record<SamplingPlan['accuracy'], Location.Accuracy> = {
  low: Location.Accuracy.Low,
  balanced: Location.Accuracy.Balanced,
  high: Location.Accuracy.High,
};

async function applySampling(plan: SamplingPlan) {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (plan.mode === 'off' || !(await hasBackgroundPermission())) {
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    logLocation(`Location off · ${plan.reason}`);
    return;
  }
  // Restarting with new options replaces the running request.
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: ACCURACY[plan.accuracy],
    timeInterval: plan.intervalMs, // Android
    distanceInterval: plan.distanceIntervalM,
    deferredUpdatesInterval: plan.intervalMs, // iOS batches updates to this interval
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'Checking your arrival',
      notificationBody: plan.reason,
      notificationColor: '#1E6B4F',
      killServiceOnDestroy: false,
    },
  });
  logLocation(`${plan.mode === 'fine' ? 'GPS' : 'Low-power checks'} every ${Math.round(plan.intervalMs / 1000)} s · ${plan.reason}`);
}
