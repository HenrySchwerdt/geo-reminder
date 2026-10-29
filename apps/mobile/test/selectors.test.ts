import type { TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { daySummary, weekStart, weekSummary } from '@/features/tracking/selectors';

// Local-time helpers so the test is independent of the machine's time zone.
const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
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
    expect(weekStart(NOW)).toBe(at(2025, 10, 13, 0));
  });

  it('summarises today from the effective ledger', () => {
    const today = daySummary(ledger, NOW, NOW);
    expect(today.state).toBe('working');
    expect(Math.round(today.workedMs / 60_000)).toBe(350); // 5h 50m
  });

  it('counts the balance only from the first tracked day and not for today', () => {
    const week = weekSummary(ledger, NOW, [1, 2, 3, 4, 5], TARGET);
    // Monday is before tracking started; Tue +1h, Wed −1h → 0
    expect(week.balance).toBe(0);
    expect(week.days.find((d) => d.today)?.label).toBe('T');
  });

  it('applies corrections (supersede) before summarising', () => {
    const corrected = [...ledger, ev('clockOut', at(2025, 10, 15, 17), { supersedes: ledger[3].id, source: 'manual' })];
    expect(weekSummary(corrected, NOW, [1, 2, 3, 4, 5], TARGET).balance).toBe(3_600_000);
  });
});
