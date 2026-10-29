import { describe, expect, it } from 'vitest';
import { buildSnapshot, DEFAULT_SETTINGS, SurfaceCommandSchema, SurfaceSnapshotSchema, wallTime, type TimeEvent } from '../src';

const TZ = 'Europe/Berlin';
const H = 3_600_000;
const at = (day: string, h: number, m = 0) => wallTime(day, h * 60 + m, TZ);
const ev = (id: string, type: TimeEvent['type'], ms: number): TimeEvent => ({ id, type, at: ms, source: 'app', tz: TZ, workplaceId: 'w' });
const workplaces = [{ id: 'w', name: 'Studio', lat: 0, lng: 0, radius: 100, rules: { arrival: { enabled: true, delayMinutes: 5 }, departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true }, days: [] } }];

describe('surface snapshot', () => {
  // Thursday 16 Oct 2025: Tue 9h, Wed 7h, today since 08:47 with a break 12:30–13:05.
  const ledger = [
    ev('a', 'clockIn', at('2025-10-14', 9)),
    ev('b', 'clockOut', at('2025-10-14', 18)),
    ev('c', 'clockIn', at('2025-10-15', 9)),
    ev('d', 'clockOut', at('2025-10-15', 16)),
    ev('e', 'clockIn', at('2025-10-16', 8, 47)),
    ev('f', 'breakStart', at('2025-10-16', 12, 30)),
    ev('g', 'breakEnd', at('2025-10-16', 13, 5)),
  ];
  const now = at('2025-10-16', 15, 12);
  const snap = buildSnapshot({ ledger, settings: DEFAULT_SETTINGS, workplaces, now, tz: TZ });

  it('describes the running day for timers', () => {
    expect(SurfaceSnapshotSchema.parse(snap)).toEqual(snap);
    expect(snap).toMatchObject({ state: 'working', day: '2025-10-16', workplaceName: 'Studio', targetMs: 8 * H, tz: TZ });
    expect(snap.workedMs).toBe((5 * 60 + 50) * 60_000);
    expect(snap.workedAnchor).toBe(now - snap.workedMs);
    expect(snap.since).toBe(at('2025-10-16', 13, 5));
    // 2h 10m of work left; the 35 min break already covers the 30 min required for 8 h
    expect(snap.expectedEnd).toBe(now + (2 * 60 + 10) * 60_000);
  });

  it('sums the week and balances finished days', () => {
    expect(snap.weekWorkedMs).toBe(16 * H + snap.workedMs);
    expect(snap.weekBalanceMs).toBe(0); // +1h Tue, −1h Wed; Monday was before tracking started
    expect(snap.weekTargetMs).toBe(40 * H);
  });

  it('is off without a running session', () => {
    const off = buildSnapshot({ ledger: ledger.slice(0, 4), settings: DEFAULT_SETTINGS, workplaces, now, tz: TZ });
    expect(off).toMatchObject({ state: 'off', day: '2025-10-16', workedMs: 0 });
    expect(off.workedAnchor).toBeUndefined();
    expect(off.expectedEnd).toBeUndefined();
  });

  it('validates commands', () => {
    expect(SurfaceCommandSchema.safeParse({ id: 'x', action: 'clockOut', at: 1, source: 'watch' }).success).toBe(true);
    expect(SurfaceCommandSchema.safeParse({ id: 'x', action: 'teleport', at: 1, source: 'watch' }).success).toBe(false);
  });
});
