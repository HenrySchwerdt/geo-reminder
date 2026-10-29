/**
 * Calendar helpers for the UI. Days travel through routes and state as `YYYY-MM-DD` keys, instants as epoch
 * ms; every conversion names its zone, so nothing silently follows the phone when it changes zone.
 */
import { clockTime, dateKeyOf, minutesOfDay, parseKey, wallTime, zoneCity, type DateKey } from '@worktime/core';

import { deviceTimeZone } from '@/shared/lib/time-zone';

export type { DateKey };

/** The calendar day an instant falls on, in `tz` (default: where the phone is). */
export const toDateKey = (ms: number, tz = deviceTimeZone()) => dateKeyOf(ms, tz);

/** The key itself when it is a real date, else undefined. */
export const parseDateKey = (key: string | undefined): DateKey | undefined => (parseKey(key) ? key : undefined);

/** 24-hour "08:52" in `tz`, independent of the device locale so lists, pickers and previews line up. */
export const formatTime = (ms: number, tz = deviceTimeZone()) => clockTime(ms, tz);

/** "Berlin time" when `tz` is not the zone the phone is in, so times recorded elsewhere aren't misread. */
export const zoneNote = (tz: string | undefined) => (tz && tz !== deviceTimeZone() ? `${zoneCity(tz)} time` : undefined);

/** Format a calendar day without any zone shifting it (noon UTC is on the same date everywhere it's shown as UTC). */
const formatKey = (key: DateKey, options: Intl.DateTimeFormatOptions) => {
  const p = parseKey(key)!;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12)).toLocaleDateString([], { ...options, timeZone: 'UTC' });
};

/** "Tue, 14 October" */
export const formatDayLong = (key: DateKey) => formatKey(key, { weekday: 'short', day: 'numeric', month: 'long' });

/** "Tue, 14 Oct" */
export const formatDayShort = (key: DateKey) => formatKey(key, { weekday: 'short', day: 'numeric', month: 'short' });

/** "Tuesday, 14 October" */
export const formatDayFull = (key: DateKey) => formatKey(key, { weekday: 'long', day: 'numeric', month: 'long' });

/** "October 2025" */
export const formatMonth = (key: DateKey) => formatKey(key, { month: 'long', year: 'numeric' });

/** "15 Oct, 09:02" — when a change was made, where the phone is now. */
export const formatStamp = (ms: number) => `${formatKey(toDateKey(ms), { day: 'numeric', month: 'short' })}, ${formatTime(ms)}`;

/** Same calendar day as `base` in `tz`, at the given wall-clock time there (seconds cleared). */
export const setTimeOfDay = (base: number, hours: number, minutes: number, tz: string) => wallTime(dateKeyOf(base, tz), hours * 60 + minutes, tz);

/** Keep the wall-clock time of `ms` in `tz` but move it onto `day`. */
export const moveToDay = (ms: number, day: DateKey, tz: string) => wallTime(day, minutesOfDay(ms, tz), tz);
