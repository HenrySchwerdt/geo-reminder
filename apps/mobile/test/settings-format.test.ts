import { DEFAULT_BREAK_RULE_SETTINGS } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { resolveScheme } from '@/features/settings/appearance';
import { addRule, describeReminders, describeWorkdays, formatMinutes, hhmmFromMinutes, isGermanLaw, MAX_BREAK_RULES, minutesFromHhmm, parseWeeklyHours, removeRule, setDayMode, updateRule } from '@/features/settings/format';

describe('appearance', () => {
  it('follows the system only when asked to', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});

describe('working hours', () => {
  it('parses typed weekly hours within 1–80', () => {
    expect(parseWeeklyHours('37,5')).toBe(37.5);
    expect(parseWeeklyHours(' 40 ')).toBe(40);
    expect(parseWeeklyHours('0')).toBeUndefined();
    expect(parseWeeklyHours('81')).toBeUndefined();
    expect(parseWeeklyHours('abc')).toBeUndefined();
    expect(parseWeeklyHours('')).toBeUndefined();
  });

  it('never turns the last working day off', () => {
    const one = ['office', 'off', 'off', 'off', 'off', 'off', 'off'] as const;
    expect(setDayMode([...one], 0, 'off')).toEqual(one);
    expect(setDayMode([...one], 1, 'home')[1]).toBe('home');
  });

  it('describes workdays', () => {
    expect(describeWorkdays([1, 2, 3, 4, 5])).toBe('Mon–Fri');
    expect(describeWorkdays([1, 3, 5])).toBe('Mon, Wed, Fri');
    expect(describeWorkdays([])).toBe('No days');
  });
});

describe('time formats', () => {
  it('converts between HH:MM and minutes', () => {
    expect(minutesFromHhmm('08:30')).toBe(510);
    expect(hhmmFromMinutes(510)).toBe('08:30');
    expect(hhmmFromMinutes(0)).toBe('00:00');
  });

  it('formats minutes', () => {
    expect(formatMinutes(510)).toBe('8 h 30 m');
    expect(formatMinutes(45)).toBe('45 m');
    expect(formatMinutes(360)).toBe('6 h');
    expect(formatMinutes(0)).toBe('0 m');
  });
});

describe('break rules', () => {
  it('edits, removes and adds up to the maximum', () => {
    let rules = updateRule(DEFAULT_BREAK_RULE_SETTINGS, 0, { minBreakMinutes: 20 });
    expect(rules[0]).toEqual({ afterMinutes: 360, minBreakMinutes: 20 });
    expect(DEFAULT_BREAK_RULE_SETTINGS[0]!.minBreakMinutes).toBe(30);
    expect(isGermanLaw(rules)).toBe(false);
    rules = removeRule(rules, 0);
    expect(rules).toHaveLength(1);
    for (let i = 0; i < 6; i++) rules = addRule(rules);
    expect(rules).toHaveLength(MAX_BREAK_RULES);
    expect(isGermanLaw(DEFAULT_BREAK_RULE_SETTINGS)).toBe(true);
  });

  it('adds a rule after the last one, within the schema limits', () => {
    expect(addRule([])).toEqual([{ afterMinutes: 420, minBreakMinutes: 30 }]);
    expect(addRule([{ afterMinutes: 15 * 60, minBreakMinutes: 235 }])[1]).toEqual({ afterMinutes: 960, minBreakMinutes: 240 });
  });
});

describe('reminder summary', () => {
  it('lists what is on', () => {
    const base = { start: { enabled: true, at: '09:00' }, stop: { enabled: false, afterMinutes: 510, latest: '18:00' }, missingCheckOut: true };
    expect(describeReminders(base)).toBe('start 09:00 · check-out');
    expect(describeReminders({ ...base, start: { enabled: false, at: '09:00' }, missingCheckOut: false })).toBe('Off');
  });
});
