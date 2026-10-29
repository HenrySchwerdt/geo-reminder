/** Local-calendar helpers. Dates travel through routes as `YYYY-MM-DD` keys and through state as epoch ms. */

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Local midnight of a `YYYY-MM-DD` key, or undefined when the key is malformed or not a real date. */
export function parseDateKey(key: string | undefined): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date.getTime() : undefined;
}

/** 24-hour "08:52", independent of the device locale so lists, pickers and previews line up. */
export const formatTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "Tue, 14 October" */
export const formatDayLong = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'long' });

/** "Tue, 14 Oct" */
export const formatDayShort = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

/** "15 Oct, 09:02" */
export const formatStamp = (ms: number) => `${new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${formatTime(ms)}`;

/** Same calendar day as `base`, at the given wall-clock time (seconds cleared). */
export function setTimeOfDay(base: number, hours: number, minutes: number) {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/** Keep the wall-clock time of `ms` but move it onto the calendar day starting at `dayStart`. */
export function moveToDay(ms: number, dayStart: number) {
  const t = new Date(ms);
  const d = new Date(dayStart);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

/** First day of the month containing `ms`, offset by whole months. */
export const monthStart = (ms: number, offset = 0) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime();
};

/** ISO weekday: 1 (Mon) … 7 (Sun). */
export const isoWeekday = (ms: number) => ((new Date(ms).getDay() + 6) % 7) + 1;
