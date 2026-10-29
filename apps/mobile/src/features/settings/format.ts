/** Pure helpers behind the settings screens: wording, validation and list edits. */
import { DEFAULT_BREAK_RULE_SETTINGS, type BreakRuleSetting, type DayMode, type Settings } from '@worktime/core';

export const MAX_BREAK_RULES = 4;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const DAY_MODES: { value: DayMode; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'off', label: 'Off' },
];

export const minutesFromHhmm = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export const hhmmFromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "8 h 30 m", "45 m", "6 h". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : '', m || !h ? `${m} m` : ''].filter(Boolean).join(' ');
}

/** Weekly hours as typed: "37.5", "37,5" or "38". Undefined when it isn't a number between 1 and 80. */
export function parseWeeklyHours(text: string): number | undefined {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 80 ? n : undefined;
}

/** "37.5 h" / "40 h". */
export const formatHours = (h: number) => `${Number(h.toFixed(2))} h`;

/** Change one weekday's mode; refuses to turn the last working day off (the daily target needs one). */
export function setDayMode(pattern: DayMode[], index: number, mode: DayMode): DayMode[] {
  const next = pattern.map((m, i) => (i === index ? mode : m));
  return next.every((m) => m === 'off') ? pattern : next;
}

/** "Mon–Fri", "Mon, Wed, Fri", "No days". */
export function describeWorkdays(workdays: number[]): string {
  const short = WEEKDAYS.map((d) => d.slice(0, 3));
  const days = [...workdays].sort((a, b) => a - b);
  if (days.length === 0) return 'No days';
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1]! + 1);
  return days.length > 2 && consecutive ? `${short[days[0]! - 1]}–${short[days.at(-1)! - 1]}` : days.map((d) => short[d - 1]).join(', ');
}

export const updateRule = (rules: BreakRuleSetting[], index: number, patch: Partial<BreakRuleSetting>) => rules.map((r, i) => (i === index ? { ...r, ...patch } : r));

export const removeRule = (rules: BreakRuleSetting[], index: number) => rules.filter((_, i) => i !== index);

/** Appends a rule that follows the last one (e.g. after 9 h → another 3 h later), up to the maximum. */
export function addRule(rules: BreakRuleSetting[]): BreakRuleSetting[] {
  if (rules.length >= MAX_BREAK_RULES) return rules;
  const last = rules.at(-1);
  return [...rules, { afterMinutes: Math.min(16 * 60, (last?.afterMinutes ?? 4 * 60) + 3 * 60), minBreakMinutes: Math.min(240, (last?.minBreakMinutes ?? 15) + 15) }];
}

export const isGermanLaw = (rules: BreakRuleSetting[]) => JSON.stringify(rules) === JSON.stringify(DEFAULT_BREAK_RULE_SETTINGS);

/** One-line summary of the reminders for the settings list. */
export function describeReminders(r: Settings['reminders']): string {
  const on = [r.start.enabled && `start ${r.start.at}`, r.stop.enabled && 'stop', r.missingCheckOut && 'check-out'].filter(Boolean);
  return on.length ? on.join(' · ') : 'Off';
}
