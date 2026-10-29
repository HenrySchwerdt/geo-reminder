import { describe, expect, it } from 'vitest';
import {
  buildSessions,
  CSV_HEADER,
  DEFAULT_SETTINGS,
  effectiveEvents,
  historyOf,
  newEventsFrom,
  parseExportFile,
  summarize,
  toCsv,
  toExportFile,
  type TimeEvent,
  type Workplace,
} from '../src';

const T = (h: number, m = 0) => Date.UTC(2025, 9, 16, h - 2, m); // Europe/Berlin (CEST)
const ev = (id: string, type: TimeEvent['type'], at: number, extra: Partial<TimeEvent> = {}): TimeEvent => ({
  id,
  type,
  at,
  source: 'app',
  workplaceId: 'studio',
  ...extra,
});
const studio: Workplace = {
  id: 'studio',
  name: 'Studio, Kreuzberg',
  lat: 52.5,
  lng: 13.4,
  radius: 150,
  rules: { arrival: { enabled: true, delayMinutes: 5 }, departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true }, days: [] },
};

const day: TimeEvent[] = [
  ev('a', 'clockIn', T(8, 52)),
  ev('b', 'breakStart', T(12, 15)),
  ev('c', 'breakEnd', T(13)),
  ev('d', 'clockOut', T(18, 2)),
];

describe('ledger', () => {
  it('applies edits without changing stored events and keeps their history', () => {
    const edited = [...day, ev('d2', 'clockOut', T(17, 41), { supersedes: 'd', source: 'manual' }), ev('d3', 'clockOut', T(17, 20), { supersedes: 'd2', source: 'manual' })];
    const eff = effectiveEvents(edited);
    expect(eff.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd3']);
    expect(historyOf(edited, 'd2').map((e) => e.id)).toEqual(['d', 'd2', 'd3']);
    expect(edited.find((e) => e.id === 'd')?.at).toBe(T(18, 2)); // original untouched
  });

  it('deletes with a tombstone', () => {
    const deleted = [...day, { ...day[1], id: 'x', supersedes: 'b', voids: true }, { ...day[2], id: 'y', supersedes: 'c', voids: true }];
    const s = summarize(effectiveEvents(deleted), T(0), T(24), T(20));
    expect(s.breakMs).toBe(0);
    expect(s.workedMs).toBe(T(18, 2) - T(8, 52));
  });

  it('builds sessions with breaks and open sessions', () => {
    const sessions = buildSessions([...day, ev('e', 'clockIn', T(19)), ev('f', 'breakStart', T(20))], T(20, 30));
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ start: T(8, 52), end: T(18, 2), breakMs: 45 * 60_000 });
    expect(sessions[0].workedMs).toBe(T(18, 2) - T(8, 52) - 45 * 60_000);
    expect(sessions[1]).toMatchObject({ end: undefined, breakMs: 30 * 60_000, workedMs: 60 * 60_000 });
  });
});

describe('CSV export', () => {
  it('writes one row per session in local time, escaped for spreadsheets', () => {
    const csv = toCsv(day, [studio], 'Europe/Berlin', T(20));
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines[1]).toBe('2025-10-16,08:52,18:02,45,505,8.42,"Studio, Kreuzberg",app,Europe/Berlin');
  });
});

describe('CSV export of a forgotten check-out', () => {
  it('leaves the end and durations empty instead of counting until the next clock-in', () => {
    const forgotten = [ev('a', 'clockIn', T(8, 52)), ev('x', 'clockIn', T(8, 50) + 86_400_000), ev('y', 'clockOut', T(17) + 86_400_000)];
    const lines = toCsv(forgotten, [studio], 'Europe/Berlin', T(20) + 86_400_000).slice(1).trim().split('\r\n');
    expect(lines[1]).toBe('2025-10-16,08:52,,,,,"Studio, Kreuzberg",app,Europe/Berlin');
    expect(lines[2]).toBe('2025-10-17,08:50,17:00,0,490,8.17,"Studio, Kreuzberg",app,Europe/Berlin');
  });
});

describe('JSON backup', () => {
  const file = toExportFile({ settings: DEFAULT_SETTINGS, workplaces: [studio], events: day, timeZone: 'Europe/Berlin', now: T(20) });

  it('round-trips and imports only new events', () => {
    const parsed = parseExportFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.events).toHaveLength(4);
    expect(newEventsFrom(parsed.file, day.slice(0, 2)).map((e) => e.id)).toEqual(['c', 'd']);
  });

  it('rejects invalid files with a readable message', () => {
    expect(parseExportFile('nope')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    const bad = parseExportFile(JSON.stringify({ ...file, events: [{ id: 'x', type: 'teleport', at: 1, source: 'app' }] }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/events\.0\.type/);
  });
});
