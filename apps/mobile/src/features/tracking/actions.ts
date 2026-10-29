/**
 * Clock in / break / clock out and corrections. Every action appends events; invalid transitions are
 * ignored. Session changes are forwarded to the geofence engine so it stops asking redundant questions.
 */
import { type EventSource, type TimeEvent } from '@worktime/core';

import { newId } from '@/shared/lib/id';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { currentState as stateOf } from './selectors';
import { getLedger, useTracking } from './store';

/** Appends events stamped with the zone they were recorded in (unless they carry one, like corrections). */
const append = (events: Omit<TimeEvent, 'id' | 'recordedAt'>[]) => {
  const tz = deviceTimeZone();
  useTracking.getState().append(events.map((e) => ({ tz, ...e, id: newId(), recordedAt: Date.now() })));
  void publishSurfaces();
};

/** Widgets, Live Activity and watches show every change (loaded lazily: the hub imports these actions). */
async function publishSurfaces() {
  const { publishSurfaces: publish } = await import('@/features/surfaces');
  await publish();
}

const currentState = () => stateOf(getLedger(), Date.now());

async function notifyEngine(clockedIn: boolean, workplaceId?: string) {
  const { dispatch } = await import('@/features/geofencing/runner');
  await dispatch({ type: 'session', clockedIn, workplaceId, now: Date.now() });
}

export function clockIn(at = Date.now(), source: EventSource = 'app', workplaceId?: string) {
  if (currentState().state !== 'off') return;
  append([{ type: 'clockIn', at: Math.min(at, Date.now()), source, workplaceId }]);
  void notifyEngine(true, workplaceId);
}

export function startBreak(source: EventSource = 'app', at = Date.now()) {
  const s = currentState();
  if (s.state !== 'working') return;
  append([{ type: 'breakStart', at: Math.max(s.since ?? at, Math.min(at, Date.now())), source }]);
}

export function endBreak(source: EventSource = 'app', at = Date.now()) {
  const s = currentState();
  if (s.state !== 'break') return;
  append([{ type: 'breakEnd', at: Math.max(s.since ?? at, Math.min(at, Date.now())), source }]);
}

export function clockOut(at = Date.now(), source: EventSource = 'app') {
  const s = currentState();
  if (s.state === 'off') return;
  const when = Math.max(s.since ?? at, Math.min(at, Date.now()));
  append([...(s.state === 'break' ? [{ type: 'breakEnd' as const, at: when, source }] : []), { type: 'clockOut', at: when, source }]);
  void notifyEngine(false);
}

/** Correct an event: appends a new version that supersedes it. */
export function editEvent(target: TimeEvent, patch: Partial<Pick<TimeEvent, 'at' | 'workplaceId'>>) {
  append([{ type: target.type, at: patch.at ?? target.at, workplaceId: patch.workplaceId ?? target.workplaceId, source: 'manual', supersedes: target.id, ...(target.tz && { tz: target.tz }) }]);
}

/** Delete an event: appends a tombstone. */
export function deleteEvent(target: TimeEvent) {
  append([{ type: target.type, at: target.at, workplaceId: target.workplaceId, source: 'manual', supersedes: target.id, voids: true, ...(target.tz && { tz: target.tz }) }]);
}

/** Add a complete past session (missed day / forgotten clock-in), optionally with one break. */
export function addSession(input: { start: number; end: number; workplaceId?: string; breakStart?: number; breakEnd?: number }) {
  const events: Omit<TimeEvent, 'id' | 'recordedAt'>[] = [{ type: 'clockIn', at: input.start, workplaceId: input.workplaceId, source: 'manual' }];
  if (input.breakStart !== undefined && input.breakEnd !== undefined) {
    events.push({ type: 'breakStart', at: input.breakStart, source: 'manual' }, { type: 'breakEnd', at: input.breakEnd, source: 'manual' });
  }
  events.push({ type: 'clockOut', at: input.end, source: 'manual' });
  append(events);
}
