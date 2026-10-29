/** Web preview only (not a shipping target): events and documents in localStorage. */
import type { TimeEvent } from '@worktime/core';

const KEY = 'worktime.events';
const read = (): TimeEvent[] => JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]');

export function queryEvents(from: number, to: number): TimeEvent[] {
  const all = read().sort((a, b) => a.at - b.at);
  const lastIn = all.filter((e) => e.at < from && e.type === 'clockIn').pop()?.at ?? 0;
  return all.filter((e) => e.at >= lastIn && e.at < to);
}

export function insertEvent(e: TimeEvent) {
  globalThis.localStorage?.setItem(KEY, JSON.stringify([...read(), e]));
}

export const firstEventAt = () => read().reduce<number | undefined>((m, e) => (m === undefined || e.at < m ? e.at : m), undefined);

export const kvGet = (key: string) => globalThis.localStorage?.getItem(key) ?? null;
export const kvSet = (key: string, value: string) => globalThis.localStorage?.setItem(key, value);
