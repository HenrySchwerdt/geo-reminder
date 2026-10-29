import { wallTime, type TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { averageTime, monthInsights, yearInsights } from '@/features/insights/model';

const TZ = 'Europe/Berlin';
const at = (m: number, d: number, h: number, mi = 0, tz = TZ) => wallTime(`2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, h * 60 + mi, tz);
let n = 0;
const ev = (type: TimeEvent['type'], ms: number, tz = TZ): TimeEvent => ({ id: `e${n++}`, type, at: ms, source: 'app', tz });
const session = (m: number, d: number, from: number, to: number, tz = TZ): TimeEvent[] => [ev('clockIn', at(m, d, from, 0, tz), tz), ev('clockOut', at(m, d, to, 0, tz), tz)];
const targets = { dailyMs: 8 * 3_600_000, workdays: [1, 2, 3, 4, 5] };
const H = 3_600_000;

// Mon 29 Sep 8 h; Mon 6 Oct 9 h, Tue 7 Oct 7 h, Wed 8 Oct forgotten check-out, Thu 9 Oct 8 h.
const ledger: TimeEvent[] = [...session(9, 29, 9, 17), ...session(10, 6, 8, 17), ...session(10, 7, 9, 16), ev('clockIn', at(10, 8, 9)), ...session(10, 9, 10, 18)];
const NOW = at(10, 10, 12); // Friday 10 Oct, midday

describe('month insights', () => {
  const m = monthInsights(ledger, '2025-10-17', NOW, targets, TZ);

  it('lists every day with its state', () => {
    expect(m.days).toHaveLength(31);
    const state = (d: number) => m.days[d - 1].state;
    expect(state(6)).toBe('worked');
    expect(state(8)).toBe('missing');
    expect(state(3)).toBe('empty'); // a workday with nothing recorded
    expect(state(5)).toBe('off'); // Sunday
    expect(state(11)).toBe('future');
    expect(m.days[9].today).toBe(true);
    expect(m.days[5].ratio).toBeCloseTo(9 / 8);
  });

  it('adds worked time against the target and a balance over finished days', () => {
    // Worked 9 + 7 + 8 h; the forgotten day is out. Targets count from the first record (29 Sep):
    // workdays 1, 2, 3, 6, 7, 9 and today (10 Oct) = 7 × 8 h.
    expect(m.workedMs).toBe(24 * H);
    expect(m.targetMs).toBe(56 * H);
    // Finished days: 1–3 Oct empty (−24 h), 6 Oct +1 h, 7 Oct −1 h, 9 Oct 0; today is not in it yet.
    expect(m.balanceMs).toBe(-24 * H);
  });

  it('averages start and end of the days that have them', () => {
    expect(m.avgStart).toBe('09:00'); // 8:00, 9:00, 10:00
    expect(m.avgEnd).toBe('17:00'); // 17:00, 16:00, 18:00
  });

  it('reads times in the zone they were recorded in', () => {
    const away = [...session(10, 6, 8, 16, 'America/New_York'), ...session(10, 7, 9, 17, TZ)];
    const p = monthInsights(away, '2025-10-01', NOW, targets, TZ);
    expect(p.avgStart).toBe('08:30'); // 08:00 in New York and 09:00 in Berlin
    expect(p.days[5].state).toBe('worked');
  });

  it('gives days off no target and counts work on them as extra', () => {
    const sunday = monthInsights(session(10, 5, 10, 12), '2025-10-01', NOW, targets, TZ);
    expect(sunday.days[4]).toMatchObject({ state: 'worked', targetMs: 0, ratio: 1 });
    expect(sunday.balanceMs).toBe(2 * H - 32 * H); // the empty workdays 6–9 Oct after it count
  });

  it('is empty without data', () => {
    const p = monthInsights([], '2025-10-01', NOW, targets, TZ);
    expect(p).toMatchObject({ workedMs: 0, targetMs: 0, balanceMs: 0, avgStart: undefined });
  });
});

describe('year insights', () => {
  const y = yearInsights(ledger, '2025-06-15', NOW, targets, TZ);

  it('has a bar per month with worked vs target', () => {
    expect(y.months).toHaveLength(12);
    expect(y.months[0].month).toBe('2025-01-01');
    expect(y.months[8]).toMatchObject({ workedMs: 8 * H, targetMs: 16 * H, balanceMs: -8 * H }); // 29 and 30 Sep
    expect(y.months[9].workedMs).toBe(24 * H);
    expect(y.months[11].targetMs).toBe(0); // the future asks nothing
    expect(y.months[0].targetMs).toBe(0); // nor does the time before the first record
  });

  it('sums up the year', () => {
    expect(y.workedMs).toBe(32 * H);
    expect(y.targetMs).toBe(72 * H);
    expect(y.balanceMs).toBe(-32 * H);
  });
});

describe('average time', () => {
  it('is undefined for nothing', () => expect(averageTime([])).toBeUndefined());
});
