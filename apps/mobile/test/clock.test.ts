import { buildSessions, DEFAULT_BREAK_RULES, effectiveEvents, initialState, wallTime, type EngineState, type TimeEvent, type Workplace } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { missedPrompt } from '@/features/clock/missed';
import { checkTime, clockInBound, clockOutBound, clockOutPreview, issueText, parseTimeParam } from '@/features/clock/model';

const TZ = 'Europe/Berlin';
const at = (d: number, h: number, mi = 0, tz = TZ) => wallTime(`2025-10-${String(d).padStart(2, '0')}`, h * 60 + mi, tz);
let n = 0;
const ev = (type: TimeEvent['type'], ms: number, extra: Partial<TimeEvent> = {}): TimeEvent => ({ id: `e${n++}`, type, at: ms, source: 'app', tz: TZ, ...extra });
const targets = { dailyMs: 8 * 3_600_000, workdays: [1, 2, 3, 4, 5] };
const H = 3_600_000;

describe('time choices', () => {
  const now = at(16, 17, 31);

  it('rejects the future and times before a bound', () => {
    expect(checkTime(at(16, 17, 32), now)).toEqual({ kind: 'future' });
    expect(checkTime(at(16, 17, 30), now)).toBeUndefined();
    const bound = { at: at(16, 8, 44), label: 'the session start' };
    const issue = checkTime(at(16, 8, 0), now, bound)!;
    expect(issue).toMatchObject({ kind: 'before', limit: bound.at });
    expect(issueText(issue, TZ)).toBe('That time is before the session start (08:44).');
  });

  it('reads a suggested time from route params', () => {
    expect(parseTimeParam(String(at(16, 8, 44)), now)).toBe(at(16, 8, 44));
    expect(parseTimeParam(undefined, now)).toBeUndefined();
    expect(parseTimeParam('soon', now)).toBeUndefined();
    expect(parseTimeParam(String(now + 3_600_000), now)).toBeUndefined();
    expect(parseTimeParam(String(now + 30_000), now)).toBe(now); // slight clock skew is clamped
  });

  it('bounds a check-out by the last session change and a check-in by the previous check-out', () => {
    const ledger = [ev('clockIn', at(16, 8, 44)), ev('breakStart', at(16, 12)), ev('breakEnd', at(16, 12, 35))];
    const running = buildSessions(effectiveEvents(ledger), now)[0];
    expect(clockOutBound(running)).toMatchObject({ at: at(16, 12, 35), label: 'your last break change' });
    expect(clockOutBound(buildSessions([ev('clockIn', at(16, 8))], now)[0]).label).toBe('the session start');

    expect(clockInBound(ledger, now)).toBeUndefined();
    const done = [ev('clockIn', at(15, 9)), ev('clockOut', at(15, 17))];
    expect(clockInBound(done, now)?.at).toBe(at(15, 17));
  });
});

describe('clock-out preview', () => {
  const now = at(16, 17, 31);
  const ledger = [ev('clockIn', at(16, 8, 44)), ev('breakStart', at(16, 12, 15)), ev('breakEnd', at(16, 12, 50))];

  it('summarises the day at the chosen time with overtime against the target', () => {
    const p = clockOutPreview(ledger, at(16, 17, 29), now, targets, DEFAULT_BREAK_RULES, TZ)!;
    expect(p.breakMs).toBe(35 * 60_000);
    expect(p.workedMs).toBe(8 * H + 10 * 60_000);
    expect(p.overtimeMs).toBe(10 * 60_000);
    expect(p.breakShortMs).toBe(0);
    expect(p.dayStart).toBe(at(16, 0));
  });

  it('warns when the required break is missing, using the break rules from settings', () => {
    const noBreak = [ev('clockIn', at(16, 8))];
    const late = at(16, 18, 5);
    const p = clockOutPreview(noBreak, at(16, 18), late, targets, DEFAULT_BREAK_RULES, TZ)!;
    expect(p.requiredBreakMs).toBe(45 * 60_000); // 10 h of work
    expect(p.breakShortMs).toBe(45 * 60_000);
    expect(clockOutPreview(noBreak, at(16, 18), late, targets, [], TZ)!.breakShortMs).toBe(0);
    expect(clockOutPreview(noBreak, at(16, 18), late, targets, [{ afterMs: 4 * H, minBreakMs: 15 * 60_000 }], TZ)!.requiredBreakMs).toBe(15 * 60_000);
  });

  it('ends an open break at the chosen time and gives a day off no target', () => {
    const onBreak = [ev('clockIn', at(16, 8)), ev('breakStart', at(16, 12))];
    const p = clockOutPreview(onBreak, at(16, 12, 30), now, targets, DEFAULT_BREAK_RULES, TZ)!;
    expect(p.workedMs).toBe(4 * H);
    expect(p.breakMs).toBe(30 * 60_000);
    const sunday = [ev('clockIn', at(19, 9))];
    const off = clockOutPreview(sunday, at(19, 11), at(19, 12), targets, DEFAULT_BREAK_RULES, TZ)!;
    expect(off.targetMs).toBe(0);
    expect(off.overtimeMs).toBe(2 * H);
  });

  it('is undefined when nobody is clocked in', () => {
    expect(clockOutPreview([ev('clockIn', at(16, 8)), ev('clockOut', at(16, 9))], at(16, 10), now, targets, DEFAULT_BREAK_RULES, TZ)).toBeUndefined();
  });
});

describe('missed check-in / check-out', () => {
  const studio: Workplace = {
    id: 'studio',
    name: 'Studio',
    lat: 52.5,
    lng: 13.4,
    radius: 150,
    tz: TZ,
    rules: { arrival: { enabled: true, delayMinutes: 3 }, departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true }, days: [] },
  };
  const engine = (track: Partial<EngineState['tracks'][string]>): EngineState => ({ ...initialState(), tracks: { studio: { zone: 'inside', ...track } } });
  const base = { workplaces: [studio], tz: TZ, dismissed: [] as string[] };
  const arrived = { arrivedAt: at(16, 8, 44), insideSince: at(16, 8, 44) };

  it('offers the arrival when the user never clocked in today', () => {
    const p = missedPrompt({ ...base, engine: engine({ ...arrived, arrivalHandledOn: '2025-10-16' }), ledger: [], now: at(16, 8, 47) });
    expect(p).toMatchObject({ kind: 'arrival', workplaceId: 'studio', at: at(16, 8, 44) });
  });

  it('waits for the reminder delay and ignores yesterday, disabled rules, existing sessions and dismissals', () => {
    expect(missedPrompt({ ...base, engine: engine(arrived), ledger: [], now: at(16, 8, 45) })).toBeUndefined();
    const now = at(16, 9);
    expect(missedPrompt({ ...base, engine: engine({ arrivedAt: at(15, 8, 44), insideSince: at(15, 8, 44) }), ledger: [], now })).toBeUndefined();
    const off = { ...studio, rules: { ...studio.rules, arrival: { enabled: false, delayMinutes: 3 } } };
    expect(missedPrompt({ ...base, workplaces: [off], engine: engine(arrived), ledger: [], now })).toBeUndefined();
    // Clocked in earlier today and out again: not a missed check-in.
    const done = [ev('clockIn', at(16, 8, 50)), ev('clockOut', at(16, 8, 55))];
    expect(missedPrompt({ ...base, engine: engine(arrived), ledger: done, now })).toBeUndefined();
    const key = missedPrompt({ ...base, engine: engine(arrived), ledger: [], now })!.key;
    expect(missedPrompt({ ...base, dismissed: [key], engine: engine(arrived), ledger: [], now })).toBeUndefined();
  });

  it('offers the departure for a running session once the user was away long enough', () => {
    const ledger = [ev('clockIn', at(16, 8, 44), { workplaceId: 'studio' })];
    const left = { zone: 'far' as const, lastInsideAt: at(16, 17, 29), outsideSince: at(16, 17, 31) };
    expect(missedPrompt({ ...base, engine: engine(left), ledger, now: at(16, 17, 40) })).toBeUndefined();
    expect(missedPrompt({ ...base, engine: engine(left), ledger, now: at(16, 17, 50) })).toMatchObject({ kind: 'departure', at: at(16, 17, 29) });
    // A departure before the session started belongs to an earlier visit.
    const later = [ev('clockIn', at(16, 17, 40), { workplaceId: 'studio' })];
    expect(missedPrompt({ ...base, engine: engine(left), ledger: later, now: at(16, 18) })).toBeUndefined();
    // Still inside: no departure.
    expect(missedPrompt({ ...base, engine: engine({ zone: 'inside', arrivedAt: at(16, 8, 44) }), ledger, now: at(16, 18) })).toBeUndefined();
  });
});
