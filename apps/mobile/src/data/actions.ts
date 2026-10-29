/** Clock in / break / clock out. Every action is an appended event; invalid transitions are ignored. */
import type { EventSource } from '@worktime/core';

import { appendEvent, daySummary } from './store';

function state(now = Date.now()) {
  return daySummary(now, now).state;
}

async function notifyEngine(clockedIn: boolean, workplaceId?: string) {
  const { dispatch } = await import('@/location/runner');
  await dispatch({ type: 'session', clockedIn, workplaceId, now: Date.now() });
}

export function clockIn(at = Date.now(), source: EventSource = 'app', workplaceId?: string) {
  if (state() !== 'off') return;
  appendEvent({ type: 'clockIn', at: Math.min(at, Date.now()), source, workplaceId });
  void notifyEngine(true, workplaceId);
}

export function startBreak(source: EventSource = 'app') {
  if (state() !== 'working') return;
  appendEvent({ type: 'breakStart', at: Date.now(), source });
}

export function endBreak(source: EventSource = 'app') {
  if (state() !== 'break') return;
  appendEvent({ type: 'breakEnd', at: Date.now(), source });
}

export function clockOut(at = Date.now(), source: EventSource = 'app') {
  const s = daySummary(Date.now(), Date.now());
  if (s.state === 'off') return;
  if (s.state === 'break') appendEvent({ type: 'breakEnd', at: Math.max(s.since ?? at, Math.min(at, Date.now())), source });
  appendEvent({ type: 'clockOut', at: Math.max(s.since ?? at, Math.min(at, Date.now())), source });
  void notifyEngine(false);
}
