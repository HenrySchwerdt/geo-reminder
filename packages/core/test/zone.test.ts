import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  buildSessions,
  clockTime,
  dateKeyOf,
  dayRange,
  initialState,
  isoWeekdayOf,
  parseKey,
  sessionDay,
  step,
  summarizeDay,
  toCsv,
  wallTime,
  zoneCity,
  type TimeEvent,
  type Workplace,
} from '../src';

const BERLIN = 'Europe/Berlin';
const NY = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
const H = 3_600_000;

const ev = (id: string, type: TimeEvent['type'], at: number, tz?: string): TimeEvent => ({ id, type, at, source: 'app', ...(tz && { tz }) });

describe('calendar maths in a zone', () => {
  it('converts wall times and keys both ways', () => {
    const at = wallTime('2025-10-13', 8 * 60, BERLIN);
    expect(new Date(at).toISOString()).toBe('2025-10-13T06:00:00.000Z');
    expect(clockTime(at, BERLIN)).toBe('08:00');
    expect(clockTime(at, NY)).toBe('02:00');
    expect(dateKeyOf(wallTime('2025-10-13', 23 * 60, BERLIN), TOKYO)).toBe('2025-10-14');
  });

  it('has 23 and 25 hour days at the DST switches', () => {
    const spring = dayRange('2025-03-30', BERLIN);
    const autumn = dayRange('2025-10-26', BERLIN);
    expect((spring.end - spring.start) / H).toBe(23);
    expect((autumn.end - autumn.start) / H).toBe(25);
    // 02:30 doesn't exist on the spring day; it resolves to 03:30
    expect(clockTime(wallTime('2025-03-30', 150, BERLIN), BERLIN)).toBe('03:30');
    // 02:30 happens twice in autumn; the first one (still summer time) is used
    expect(new Date(wallTime('2025-10-26', 150, BERLIN)).toISOString()).toBe('2025-10-26T00:30:00.000Z');
  });

  it('does key arithmetic without a zone', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-01');
    expect(isoWeekdayOf('2025-10-13')).toBe(1);
    expect(isoWeekdayOf('2025-10-19')).toBe(7);
    expect(parseKey('2025-02-30')).toBeUndefined();
    expect(zoneCity('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});

describe('work days across zones', () => {
  // Monday in Berlin 08:00–17:00 with a 30 min break, then a flight to New York.
  const monday: TimeEvent[] = [
    ev('a', 'clockIn', wallTime('2025-10-13', 8 * 60, BERLIN), BERLIN),
    ev('b', 'breakStart', wallTime('2025-10-13', 12 * 60, BERLIN), BERLIN),
    ev('c', 'breakEnd', wallTime('2025-10-13', 12 * 60 + 30, BERLIN), BERLIN),
    ev('d', 'clockOut', wallTime('2025-10-13', 17 * 60, BERLIN), BERLIN),
  ];
  const later = wallTime('2025-10-15', 12 * 60, NY);

  it('keeps a past day where it was recorded after travelling', () => {
    const day = summarizeDay(monday, '2025-10-13', later, NY);
    expect(day.workedMs).toBe(8.5 * H);
    expect(day.breakMs).toBe(0.5 * H);
    expect(clockTime(day.firstIn!, day.sessions[0].tz!)).toBe('08:00');
    expect(summarizeDay(monday, '2025-10-12', later, NY).workedMs).toBe(0);
  });

  it('counts a night shift fully towards the day it started', () => {
    const night = [ev('n1', 'clockIn', wallTime('2025-10-13', 22 * 60, BERLIN), BERLIN), ev('n2', 'clockOut', wallTime('2025-10-14', 6 * 60, BERLIN), BERLIN)];
    expect(summarizeDay(night, '2025-10-13', later, BERLIN).workedMs).toBe(8 * H);
    expect(summarizeDay(night, '2025-10-14', later, BERLIN).workedMs).toBe(0);
  });

  it('counts real time across the autumn DST switch', () => {
    const night = [ev('n1', 'clockIn', wallTime('2025-10-25', 22 * 60, BERLIN), BERLIN), ev('n2', 'clockOut', wallTime('2025-10-26', 6 * 60, BERLIN), BERLIN)];
    expect(summarizeDay(night, '2025-10-25', later, BERLIN).workedMs).toBe(9 * H);
  });

  it('places a session started abroad on the local day there', () => {
    // Clocked in at 20:00 in New York — already Tuesday in Berlin.
    const trip = [ev('t1', 'clockIn', wallTime('2025-10-13', 20 * 60, NY), NY), ev('t2', 'clockOut', wallTime('2025-10-13', 22 * 60, NY), NY)];
    const [s] = buildSessions(trip, later);
    expect(sessionDay(s, BERLIN)).toBe('2025-10-13');
    expect(summarizeDay(trip, '2025-10-13', later, BERLIN).workedMs).toBe(2 * H);
  });

  it('falls back to the given zone for events without one', () => {
    const legacy = [ev('l1', 'clockIn', Date.UTC(2025, 9, 13, 23)), ev('l2', 'clockOut', Date.UTC(2025, 9, 14, 1))];
    expect(summarizeDay(legacy, '2025-10-14', later, BERLIN).workedMs).toBe(2 * H);
    expect(summarizeDay(legacy, '2025-10-13', later, NY).workedMs).toBe(2 * H);
  });

  it('reports a running session on its day', () => {
    const running = [ev('r1', 'clockIn', wallTime('2025-10-13', 22 * 60, BERLIN), BERLIN)];
    const now = wallTime('2025-10-14', 2 * 60, BERLIN);
    const day = summarizeDay(running, '2025-10-13', now, BERLIN);
    expect(day.state).toBe('working');
    expect(day.workedMs).toBe(4 * H);
    expect(summarizeDay(running, '2025-10-14', now, BERLIN).state).toBe('off');
  });

  it('exports each session in its own zone', () => {
    const trip = [...monday, ev('t1', 'clockIn', wallTime('2025-10-14', 9 * 60, NY), NY), ev('t2', 'clockOut', wallTime('2025-10-14', 17 * 60, NY), NY)];
    const lines = toCsv(trip, [], NY, later).slice(1).trim().split('\r\n');
    expect(lines[1]).toBe('2025-10-13,08:00,17:00,30,510,8.50,,app,Europe/Berlin');
    expect(lines[2]).toBe('2025-10-14,09:00,17:00,0,480,8.00,,app,America/New_York');
  });
});

describe('geofence rules in the workplace zone', () => {
  const office: Workplace = {
    id: 'office',
    name: 'Office',
    lat: 52.52,
    lng: 13.405,
    radius: 100,
    tz: BERLIN,
    rules: { arrival: { enabled: true, delayMinutes: 0, window: { from: '07:00', to: '10:00' } }, departure: { enabled: false, delayMinutes: 15, onlyWhenClockedIn: true }, days: [1, 2, 3, 4, 5] },
  };
  const arrive = (at: number, deviceZone: string) =>
    step(initialState(), { type: 'fix', fix: { lat: office.lat, lng: office.lng, accuracy: 10, timestamp: at } }, { workplaces: [office], timeZone: deviceZone });

  it("uses the workplace's clock even before the phone switched zones", () => {
    // 08:00 in Berlin; the phone still thinks it's in New York (02:00) after landing.
    const { effects } = arrive(wallTime('2025-10-13', 8 * 60, BERLIN), NY);
    expect(effects.some((e) => e.type === 'notify' && e.kind === 'arrival')).toBe(true);
  });

  it('stays quiet outside the window in workplace time', () => {
    const { effects } = arrive(wallTime('2025-10-13', 11 * 60, BERLIN), TOKYO);
    expect(effects.some((e) => e.type === 'notify')).toBe(false);
  });
});
