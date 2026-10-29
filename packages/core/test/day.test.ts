import { describe, expect, it } from 'vitest';
import { expectedEnd, formatBalance, formatDuration, requiredBreak, summarize, type TimeEvent } from '../src';

const T = (h: number, m = 0) => Date.UTC(2025, 9, 16, h, m);
const DAY = [T(0), T(24)] as const;
let n = 0;
const ev = (type: TimeEvent['type'], at: number): TimeEvent => ({ id: String(n++), type, at, source: 'app', workplaceId: 'studio' });

describe('summarize', () => {
  it('derives the working state, worked and break time', () => {
    const events = [ev('clockIn', T(8, 47)), ev('breakStart', T(12, 30)), ev('breakEnd', T(13, 5))];
    const d = summarize(events, ...DAY, T(15, 12));
    expect(d.state).toBe('working');
    expect(d.since).toBe(T(13, 5));
    expect(formatDuration(d.workedMs)).toBe('5:50');
    expect(d.breakMs).toBe(35 * 60_000);
    expect(d.segments.map((s) => s.kind)).toEqual(['work', 'break', 'work']);
    expect(d.firstIn).toBe(T(8, 47));
  });

  it('handles a finished day and ignores out-of-order or invalid transitions', () => {
    const events = [ev('clockOut', T(17, 31)), ev('breakEnd', T(9)), ev('clockIn', T(8, 47)), ev('breakStart', T(12, 30)), ev('breakEnd', T(13, 5))];
    const d = summarize(events, ...DAY, T(20));
    expect(d.state).toBe('off');
    expect(formatDuration(d.workedMs, true)).toBe('8h 09m');
    expect(d.lastOut).toBe(T(17, 31));
  });

  it('clips sessions across midnight to the requested day', () => {
    const events = [ev('clockIn', T(22)), ev('clockOut', T(26))];
    expect(summarize(events, ...DAY, T(30)).workedMs).toBe(2 * 3_600_000);
  });
});

describe('expected end', () => {
  it('adds the remaining work and the legally required break', () => {
    const working = summarize([ev('clockIn', T(8, 47)), ev('breakStart', T(12, 30)), ev('breakEnd', T(13, 5))], ...DAY, T(15, 12));
    // 8h target → 2h 10m remaining, break rule already met (35 ≥ 30)
    expect(expectedEnd(working, 8 * 3_600_000, T(15, 12))).toBe(T(17, 22));

    const noBreak = summarize([ev('clockIn', T(8))], ...DAY, T(10));
    // 6h remaining + 30 min break still required
    expect(expectedEnd(noBreak, 8 * 3_600_000, T(10))).toBe(T(16, 30));
    expect(expectedEnd(summarize([], ...DAY, T(10)), 8 * 3_600_000, T(10))).toBeUndefined();
  });

  it('follows the ArbZG thresholds', () => {
    expect(requiredBreak(5.9 * 3_600_000)).toBe(0);
    expect(requiredBreak(8 * 3_600_000)).toBe(30 * 60_000);
    expect(requiredBreak(9.5 * 3_600_000)).toBe(45 * 60_000);
  });
});

describe('formatting', () => {
  it('formats balances with a sign', () => {
    expect(formatBalance(6 * 3_600_000 + 20 * 60_000)).toBe('+6h 20m');
    expect(formatBalance(-15 * 60_000)).toBe('−15m');
  });
});
