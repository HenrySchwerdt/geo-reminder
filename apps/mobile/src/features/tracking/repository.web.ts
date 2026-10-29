/** Web preview only: the event log in localStorage. */
import { TimeEventSchema, type TimeEvent } from '@worktime/core';
import { z } from 'zod';

const KEY = 'worktime.events';

export function loadAll(): TimeEvent[] {
  const parsed = z.array(TimeEventSchema).safeParse(JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]'));
  return parsed.success ? parsed.data.sort((a, b) => a.at - b.at) : [];
}

export function insert(events: TimeEvent[]) {
  const ids = new Set(loadAll().map((e) => e.id));
  globalThis.localStorage?.setItem(KEY, JSON.stringify([...loadAll(), ...events.filter((e) => !ids.has(e.id))]));
}

export function deleteAll() {
  globalThis.localStorage?.removeItem(KEY);
}
