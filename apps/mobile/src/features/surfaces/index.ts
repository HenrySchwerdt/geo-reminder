/**
 * Hub between the app and its other surfaces (widgets, Live Activity / ongoing notification, Apple Watch,
 * Wear OS). Platform adapters register themselves in `register.ts`; the app publishes one snapshot to all of
 * them after every change, and every surface sends taps back through `runSurfaceCommand`.
 * The contract (`SurfaceSnapshot`, `SurfaceCommand`) lives in @worktime/core.
 */
import { buildSnapshot, SurfaceCommandSchema, type SurfaceCommand, type SurfaceSnapshot } from '@worktime/core';

import { getSettings } from '@/features/settings/store';
import { clockIn, clockOut, endBreak, startBreak } from '@/features/tracking/actions';
import { getLedger } from '@/features/tracking/store';
import { getWorkplaces } from '@/features/workplaces/store';
import { kv } from '@/shared/lib/kv';
import { deviceTimeZone } from '@/shared/lib/time-zone';

export interface SurfaceAdapter {
  /** For logs. */
  name: string;
  /** Show the new state. Must not throw for a surface that isn't available (no watch paired, widget not added). */
  publish: (snapshot: SurfaceSnapshot) => void | Promise<void>;
}

const adapters: SurfaceAdapter[] = [];

export function registerSurface(adapter: SurfaceAdapter) {
  if (!adapters.some((a) => a.name === adapter.name)) adapters.push(adapter);
}

export function currentSnapshot(now = Date.now()): SurfaceSnapshot {
  return buildSnapshot({ ledger: getLedger(), settings: getSettings(), workplaces: getWorkplaces(), now, tz: deviceTimeZone() });
}

let last: SurfaceSnapshot | undefined;

/** Send the current state to every surface. Cheap to call; called after every event and settings change. */
export async function publishSurfaces(now = Date.now()) {
  const snapshot = currentSnapshot(now);
  last = snapshot;
  await Promise.all(
    adapters.map(async (a) => {
      try {
        await a.publish(snapshot);
      } catch (e) {
        console.warn(`[surfaces] ${a.name} failed`, e);
      }
    }),
  );
}

export const lastPublished = () => last;

// Commands can arrive twice (a watch retries, a widget intent is replayed): remember what was applied.
const APPLIED_KEY = 'surfaces.applied';
const MAX_APPLIED = 200;

function applied(): string[] {
  try {
    return JSON.parse(kv.getItem(APPLIED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Apply a tap from a surface. Unknown or invalid payloads are ignored (returns false); duplicates are ignored.
 * Invalid transitions (clock out while off) are no-ops, as in the app.
 */
export function runSurfaceCommand(input: unknown): boolean {
  const parsed = SurfaceCommandSchema.safeParse(input);
  if (!parsed.success) return false;
  const cmd: SurfaceCommand = parsed.data;
  const done = applied();
  if (done.includes(cmd.id)) return false;
  kv.setItem(APPLIED_KEY, JSON.stringify([...done, cmd.id].slice(-MAX_APPLIED)));
  const at = Math.min(cmd.at, Date.now());
  switch (cmd.action) {
    case 'clockIn':
      clockIn(at, cmd.source);
      break;
    case 'startBreak':
      startBreak(cmd.source, at);
      break;
    case 'endBreak':
      endBreak(cmd.source, at);
      break;
    case 'clockOut':
      clockOut(at, cmd.source);
      break;
  }
  return true;
}
