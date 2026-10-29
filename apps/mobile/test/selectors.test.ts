import { wallTime, type TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { currentDay, currentState, daySummary, weekStart, weekSummary } from '@/features/tracking/selectors';

// Explicit zone so the test is independent of the machine's time zone.
const TZ = 'Europe/Berlin';
const pad = (x: number) => String(x).padStart(2, '0');
const at = (y: number, mo: number, d: number, h: number, mi = 0) => wallTime(`${y}-${pad(mo)}-${pad(d)}`, h * 60 + mi, TZ);
let n = 0;
const ev = (type: TimeEvent['type'], ms: number, extra: Partial<TimeEvent> = {}): TimeEvent => ({ id: `e${n++}`, type, at: ms, source: 'app', ...extra });

// Week of Mon 13 – Sun 19 Oct 2025; "now" is Thursday 16 Oct, 15:12.
const NOW = at(2025, 10, 16, 15, 12);
const TARGET = 8 * 3_600_000;
const ledger: TimeEvent[] = [
  ev('clockIn', at(2025, 10, 14, 9)),
  ev('clockOut', at(2025, 10, 14, 18)), // Tue 9h
  ev('clockIn', at(2025, 10, 15, 9)),
  ev('clockOut', at(2025, 10, 15, 16)), // Wed 7h
  ev('clockIn', at(2025, 10, 16, 8, 47)),
  ev('breakStart', at(2025, 10, 16, 12, 30)),
  ev('breakEnd', at(2025, 10, 16, 13, 5)),
];

describe('tracking selectors', () => {
  it('finds Monday as the start of the week', () => {
    expect(weekStart('2025-10-16')).toBe('2025-10-13');
    expect(weekStart('2025-10-13')).toBe('2025-10-13');
    expect(weekStart('2025-10-19')).toBe('2025-10-13');
  });

  it('summarises today from the effective ledger', () => {
    const today = daySummary(ledger, '2025-10-16', NOW, TZ);
    expect(today.state).toBe('working');
    expect(Math.round(today.workedMs / 60_000)).toBe(350); // 5h 50m
  });

  it('counts the balance only from the first tracked day and not for today', () => {
    const week = weekSummary(ledger, NOW, [1, 2, 3, 4, 5], TARGET, TZ);
    // Monday is before tracking started; Tue +1h, Wed −1h → 0
    expect(week.balance).toBe(0);
    expect(week.days.find((d) => d.today)?.label).toBe('T');
  });

  it('applies corrections (supersede) before summarising', () => {
    const corrected = [...ledger, ev('clockOut', at(2025, 10, 15, 17), { supersedes: ledger[3].id, source: 'manual' })];
    expect(weekSummary(corrected, NOW, [1, 2, 3, 4, 5], TARGET, TZ).balance).toBe(3_600_000);
  });

  it('keeps a running night shift on the day it started', () => {
    const night = [ev('clockIn', at(2025, 10, 16, 22))];
    const later = at(2025, 10, 17, 2);
    expect(currentDay(night, later, TZ)).toBe('2025-10-16');
    expect(currentState(night, later).state).toBe('working');
    expect(daySummary(night, '2025-10-16', later, TZ).workedMs).toBe(4 * 3_600_000);
    // not in the balance until it ends
    expect(weekSummary(night, later, [1, 2, 3, 4, 5], TARGET, TZ).balance).toBe(0);
  });
});
