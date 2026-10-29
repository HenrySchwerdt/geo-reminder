/**
 * Calendar maths in an explicit IANA time zone. Days are identified by `YYYY-MM-DD` keys, instants by epoch
 * milliseconds; nothing here reads the device's local time, so results don't change when the phone travels.
 */

/** A calendar day, `YYYY-MM-DD`. Compares correctly as a string. */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Wall-clock fields of an instant in `timeZone`. */
export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(new Date(ms));
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The calendar day an instant falls on in `timeZone`. */
export function dateKeyOf(ms: number, timeZone: string): DateKey {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Year, month (1–12) and day of a key, or undefined when it isn't a real date. */
export function parseKey(key: string | undefined): { year: number; month: number; day: number } | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!m) return undefined;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? { year, month, day } : undefined;
}

const keyFromUtc = (d: Date): DateKey => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const utcNoon = (key: DateKey) => {
  const p = parseKey(key);
  if (!p) throw new RangeError(`Invalid date key: ${key}`);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
};

export function addDays(key: DateKey, days: number): DateKey {
  const d = utcNoon(key);
  d.setUTCDate(d.getUTCDate() + days);
  return keyFromUtc(d);
}

/** First day of the month containing `key`, moved by whole months. */
export function addMonths(key: DateKey, months: number): DateKey {
  const d = utcNoon(key);
  return keyFromUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 12)));
}

export function daysInMonth(key: DateKey): number {
  const d = utcNoon(key);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** ISO weekday of a calendar day: 1 (Mon) … 7 (Sun). */
export const isoWeekdayOf = (key: DateKey) => ((utcNoon(key).getUTCDay() + 6) % 7) + 1;

/** Offset of `timeZone` from UTC at an instant, in ms (Berlin in summer: +2 h). */
export function zoneOffset(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant at which the clocks in `timeZone` show `minutes` after midnight on `key`.
 * Times skipped by a DST jump resolve to the same wall time with the earlier offset (02:30 → 03:30);
 * repeated times resolve to their first occurrence.
 */
export function wallTime(key: DateKey, minutes: number, timeZone: string): number {
  const p = parseKey(key);
  if (!p) throw new RangeError(`Invalid date key: ${key}`);
  const local = Date.UTC(p.year, p.month - 1, p.day, 0, minutes);
  const before = local - zoneOffset(local - 86_400_000, timeZone);
  const after = local - zoneOffset(local + 86_400_000, timeZone);
  const fits = (ms: number) => ms + zoneOffset(ms, timeZone) === local;
  if (fits(Math.min(before, after))) return Math.min(before, after);
  if (fits(Math.max(before, after))) return Math.max(before, after);
  return before;
}

/** Start and end (exclusive) of a calendar day in `timeZone`: 23 or 25 hours long on DST days. */
export const dayRange = (key: DateKey, timeZone: string) => ({ start: wallTime(key, 0, timeZone), end: wallTime(addDays(key, 1), 0, timeZone) });

/** Minutes since midnight shown by the clocks in `timeZone`. */
export function minutesOfDay(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  return p.hour * 60 + p.minute;
}

/** `08:52` in `timeZone`, independent of the device locale. */
export function clockTime(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Human name of a zone: "Europe/Berlin" → "Berlin", "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export const zoneCity = (timeZone: string) => (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
