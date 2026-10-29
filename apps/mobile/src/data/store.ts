/**
 * Local-first data access (see db.ts): the append-only event log and small JSON documents.
 * A tiny subscription mechanism lets screens re-render on change.
 */
import { initialState, summarize, type EngineState, type PrecisionProfile, type TimeEvent, type Workplace } from '@worktime/core';
import { useSyncExternalStore } from 'react';

import { firstEventAt, insertEvent, kvGet, kvSet, queryEvents } from './db';

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------

let version = 0;
const listeners = new Set<() => void>();
export function emitChange() {
  version++;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** Re-render when anything in the store changes; returns a version number for memo dependencies. */
export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const eventsBetween = (from: number, to: number) => queryEvents(from, to);

/** Start of the first day with any record: targets before it don't count against the balance. */
export function trackingSince(): number | undefined {
  const first = firstEventAt();
  return first === undefined ? undefined : dayBounds(first).start;
}

export function appendEvent(e: Omit<TimeEvent, 'id'>): TimeEvent {
  const event = { ...e, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` };
  insertEvent(event);
  emitChange();
  return event;
}

// ---------------------------------------------------------------------------
// Calendar helpers (local time)
// ---------------------------------------------------------------------------

export function dayBounds(ms: number, offsetDays = 0) {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays + 1).getTime();
  return { start, end };
}

export function daySummary(ms: number, now: number, offsetDays = 0) {
  const { start, end } = dayBounds(ms, offsetDays);
  return { start, ...summarize(eventsBetween(start, end), start, end, now) };
}

/** Monday 00:00 of the week containing `ms`. */
export function weekStart(ms: number) {
  const d = new Date(ms);
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime();
}

// ---------------------------------------------------------------------------
// Documents: settings, workplaces, engine state, location log
// ---------------------------------------------------------------------------

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = kvGet(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  kvSet(key, JSON.stringify(value));
  emitChange();
}

export interface Settings {
  weeklyHours: number;
  workdays: number[]; // ISO weekdays
  profile: PrecisionProfile;
}
const DEFAULT_SETTINGS: Settings = { weeklyHours: 40, workdays: [1, 2, 3, 4, 5], profile: 'balanced' };

export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>('settings', {}) });
export const saveSettings = (s: Partial<Settings>) => writeJson('settings', { ...getSettings(), ...s });
export const dailyTargetMs = (s = getSettings()) => (s.weeklyHours / Math.max(1, s.workdays.length)) * 3_600_000;

export const getWorkplaces = () => readJson<Workplace[]>('workplaces', []);
export const saveWorkplaces = (w: Workplace[]) => writeJson('workplaces', w);

export const getEngineState = () => readJson<EngineState>('engine.state', initialState(getSettings().profile));
export const saveEngineState = (s: EngineState) => writeJson('engine.state', s);

export interface LogEntry {
  at: number;
  text: string;
}
export const getLocationLog = () => readJson<LogEntry[]>('engine.log', []);
export function logLocation(text: string, at = Date.now()) {
  writeJson('engine.log', [{ at, text }, ...getLocationLog()].slice(0, 60));
}
