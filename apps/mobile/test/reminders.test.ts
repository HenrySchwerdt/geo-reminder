import { DEFAULT_TIME_REMINDERS, wallTime, type DayMode, type TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { planReminders, type PlanInput } from '@/features/reminders/plan';

const TZ = 'Europe/Berlin';
// 2025-10-13 is a Monday.
const at = (day: string, h: number, mi = 0, tz = TZ) => wallTime(day, h * 60 + mi, tz);
const ev = (id: string, type: TimeEvent['type'], ms: number, tz = TZ): TimeEvent => ({ id, type, at: ms, source: 'app', tz });

const HOME_WED_FRI: DayMode[] = ['office', 'office', 'home', 'office', 'home', 'off', 'off'];
const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  settings: { pattern: HOME_WED_FRI, reminders: DEFAULT_TIME_REMINDERS },
  ledger: [],
  now: at('2025-10-13', 7),
  tz: TZ,
  backgroundLocation: true,
  ...over,
});

describe('start reminder', () => {
  it('is planned on home days in the next 7 days, at the configured wall time', () => {
    const plan = planReminders(base());
    expect(plan.map((p) => p.id)).toEqual(['time.start.2025-10-15', 'time.start.2025-10-17']);
    expect(plan.map((p) => p.at)).toEqual([at('2025-10-15', 9), at('2025-10-17', 9)]);
  });

  it('covers every working day when background location is unavailable, but never days off', () => {
    const plan = planReminders(base({ backgroundLocation: false }));
    expect(plan.map((p) => p.day)).toEqual(['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17']);
  });

  it('skips passed times and days that already have a session', () => {
    const now = at('2025-10-15', 9, 30);
    expect(planReminders(base({ now })).map((p) => p.day)).toEqual(['2025-10-17']);
    const ledger = [ev('a', 'clockIn', at('2025-10-17', 8)), ev('b', 'clockOut', at('2025-10-17', 9))];
    expect(planReminders(base({ now: at('2025-10-14', 12), ledger })).map((p) => p.day)).toEqual(['2025-10-15']);
  });

  it('follows the phone zone and the DST change', () => {
    const settings = { pattern: ['home', 'home', 'home', 'home', 'home', 'home', 'home'] as DayMode[], reminders: DEFAULT_TIME_REMINDERS };
    const plan = planReminders(base({ settings, now: at('2026-03-27', 12), tz: 'America/New_York' }));
    expect(plan.map((p) => p.at)).toEqual(plan.map((p) => at(p.day, 9, 0, 'America/New_York')));
    const berlin = planReminders(base({ settings, now: at('2026-03-27', 12) }));
    const gaps = berlin.slice(1).map((p, i) => p.at - berlin[i]!.at);
    expect(gaps).toContain(23 * 3_600_000); // the 23 h day of the spring jump
  });

  it('is off when disabled', () => {
    const reminders = { ...DEFAULT_TIME_REMINDERS, start: { enabled: false, at: '09:00' } };
    expect(planReminders(base({ settings: { pattern: HOME_WED_FRI, reminders } }))).toEqual([]);
  });
});

describe('stop reminder', () => {
  const wednesday = '2025-10-15';
  const running = (h: number, mi = 0) => [ev('a', 'clockIn', at(wednesday, h, mi))];

  it('comes after the configured work time', () => {
    const plan = planReminders(base({ ledger: running(8), now: at(wednesday, 10) }));
    const stop = plan.find((p) => p.kind === 'stop')!;
    expect(stop.id).toBe('time.stop');
    expect(stop.at).toBe(at(wednesday, 16, 30));
  });

  it('adds the break already taken', () => {
    const ledger = [...running(8), ev('b', 'breakStart', at(wednesday, 12)), ev('c', 'breakEnd', at(wednesday, 12, 45))];
    const stop = planReminders(base({ ledger, now: at(wednesday, 13) })).find((p) => p.kind === 'stop')!;
    expect(stop.at).toBe(at(wednesday, 17, 15));
  });

  it('is capped by the latest time', () => {
    const stop = planReminders(base({ ledger: running(10), now: at(wednesday, 11) })).find((p) => p.kind === 'stop')!;
    expect(stop.at).toBe(at(wednesday, 18));
  });

  it('is skipped when that time has passed, on office days with location, and when disabled', () => {
    expect(planReminders(base({ ledger: running(8), now: at(wednesday, 18, 30) })).some((p) => p.kind === 'stop')).toBe(false);
    const tuesday = [ev('a', 'clockIn', at('2025-10-14', 8))];
    expect(planReminders(base({ ledger: tuesday, now: at('2025-10-14', 10) })).some((p) => p.kind === 'stop')).toBe(false);
    expect(planReminders(base({ ledger: tuesday, now: at('2025-10-14', 10), backgroundLocation: false })).some((p) => p.kind === 'stop')).toBe(true);
    const reminders = { ...DEFAULT_TIME_REMINDERS, stop: { ...DEFAULT_TIME_REMINDERS.stop, enabled: false } };
    expect(planReminders(base({ ledger: running(8), now: at(wednesday, 10), settings: { pattern: HOME_WED_FRI, reminders } })).some((p) => p.kind === 'stop')).toBe(false);
  });

  it('uses the zone of the session for the latest time', () => {
    const ledger = [ev('a', 'clockIn', at(wednesday, 10, 0, 'Asia/Tokyo'), 'Asia/Tokyo')];
    const stop = planReminders(base({ ledger, now: at(wednesday, 11, 0, 'Asia/Tokyo'), tz: 'Asia/Tokyo' })).find((p) => p.kind === 'stop')!;
    expect(stop.at).toBe(at(wednesday, 18, 0, 'Asia/Tokyo'));
  });
});

describe('missing check-out reminder', () => {
  const ledger = [ev('a', 'clockIn', at('2025-10-13', 8, 55))];

  it('is planned for the next 08:00 and links to the day', () => {
    const early = planReminders(base({ ledger, now: at('2025-10-14', 6) })).find((p) => p.kind === 'missing')!;
    expect(early).toMatchObject({ id: 'time.missing', day: '2025-10-13', at: at('2025-10-14', 8) });
    const late = planReminders(base({ ledger, now: at('2025-10-14', 14) })).find((p) => p.kind === 'missing')!;
    expect(late.at).toBe(at('2025-10-15', 8));
  });

  it('is not planned for the running session of today, or when disabled', () => {
    expect(planReminders(base({ ledger, now: at('2025-10-13', 12) })).some((p) => p.kind === 'missing')).toBe(false);
    const reminders = { ...DEFAULT_TIME_REMINDERS, missingCheckOut: false };
    expect(planReminders(base({ ledger, now: at('2025-10-15', 12), settings: { pattern: HOME_WED_FRI, reminders } })).some((p) => p.kind === 'missing')).toBe(false);
  });

  it('links to the oldest of several and says how many', () => {
    const several = [ev('x', 'clockIn', at('2025-10-10', 9)), ...ledger, ev('c', 'clockIn', at('2025-10-14', 9))];
    const missing = planReminders(base({ ledger: several, now: at('2025-10-16', 12) })).find((p) => p.kind === 'missing')!;
    expect(missing.body).toContain('3 days');
    expect(missing.day).toBe('2025-10-10');
  });
});
