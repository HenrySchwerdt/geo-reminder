import { buildSessions, effectiveEvents, wallTime, type TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { buildMonth } from '@/features/history/calendar';
import { draftForNewDay, draftFromSession, planDeleteSession, planNewSession, planSessionEdit, suggestCompletion, validateDraft } from '@/features/history/plan';

const TZ = 'Europe/Berlin';
const at = (d: number, h: number, mi = 0, tz = TZ) => wallTime(`2025-10-${String(d).padStart(2, '0')}`, h * 60 + mi, tz);
let n = 0;
const id = () => `n${n++}`;
const ev = (i: string, type: TimeEvent['type'], ms: number): TimeEvent => ({ id: i, type, at: ms, source: 'app', workplaceId: 'studio' });

const NOW = at(16, 15, 12);
const env = { now: NOW, newId: id, targets: { dailyMs: 8 * 3_600_000, workdays: [1, 2, 3, 4, 5] }, tz: TZ };
const ledger: TimeEvent[] = [
  ev('a', 'clockIn', at(14, 8, 52)),
  ev('b', 'breakStart', at(14, 12, 15)),
  ev('c', 'breakEnd', at(14, 13)),
  ev('d', 'clockOut', at(14, 18, 2)),
  ev('e', 'clockIn', at(13, 8, 55)), // Monday: missing check-out
];

describe('correction planning', () => {
  it('moves the check-out with a superseding event and reports the impact', () => {
    const session = buildSessions(effectiveEvents(ledger), NOW).find((s) => s.id === 'a')!;
    const plan = planSessionEdit(ledger, 'a', { ...draftFromSession(session), end: at(14, 17, 20) }, env)!;
    expect(plan.events).toHaveLength(1);
    expect(plan.events[0]).toMatchObject({ type: 'clockOut', at: at(14, 17, 20), supersedes: 'd', source: 'manual' });
    expect(plan.impact.workedBefore - plan.impact.workedAfter).toBe(42 * 60_000);
    // the stored ledger is untouched
    expect(ledger.find((e) => e.id === 'd')?.at).toBe(at(14, 18, 2));
  });

  it('deletes a session with tombstones', () => {
    const plan = planDeleteSession(ledger, 'a', env)!;
    const after = effectiveEvents([...ledger, ...plan.events]);
    expect(after.some((e) => ['a', 'b', 'c', 'd'].includes(e.id))).toBe(false);
    expect(plan.events.every((e) => e.voids)).toBe(true);
  });

  it('refuses overlapping sessions and offers fixes', () => {
    const others = buildSessions(effectiveEvents(ledger), NOW).filter((s) => s.id === 'a');
    const issues = validateDraft({ start: at(14, 17), end: at(14, 19), breaks: [] }, others, NOW, false, TZ);
    const overlap = issues.find((i) => i.kind === 'overlap');
    expect(overlap).toBeDefined();
    expect(overlap?.fixes?.length).toBeGreaterThan(0);
    expect(validateDraft({ start: at(14, 18), end: at(14, 17), breaks: [] }, [], NOW, false, TZ).some((i) => i.kind === 'range')).toBe(true);
  });
});

describe('month model', () => {
  it('marks days with a missing check-out', () => {
    const month = buildMonth(ledger, '2025-10-01', NOW, env.targets, TZ);
    const cells = month.weeks.flat().filter(Boolean) as { key: string; state: string }[];
    expect(cells.find((c) => c.key === '2025-10-13')?.state).toBe('missing');
    expect(cells.find((c) => c.key === '2025-10-16')?.state).toBe('today');
  });
});

describe('month balance', () => {
  it('only counts targets from the first recorded day', () => {
    const month = buildMonth(ledger, '2025-10-01', NOW, env.targets, TZ);
    // Tue 14 Oct: 8h 25m worked vs 8h target; Mon 13 is incomplete; Wed 15 has no entry (−8h). Days before the 13th don't count.
    expect(month.balanceMs).toBe(25 * 60_000 - 8 * 3_600_000);
  });
});

describe('sessions recorded in another zone', () => {
  const NY = 'America/New_York';
  // Tuesday 08:00–17:00 in Berlin; the phone is now in New York.
  const berlin: TimeEvent[] = [
    { id: 'x1', type: 'clockIn', at: at(14, 8), source: 'app', tz: TZ },
    { id: 'x2', type: 'clockOut', at: at(14, 17), source: 'app', tz: TZ },
  ];
  const nyEnv = { ...env, tz: NY };

  it('edits in the zone the session was recorded in and keeps that zone', () => {
    const session = buildSessions(berlin, NOW)[0];
    const plan = planSessionEdit(berlin, 'x1', { ...draftFromSession(session), end: at(14, 16) }, nyEnv)!;
    expect(plan.day).toBe('2025-10-14');
    expect(plan.events[0]).toMatchObject({ type: 'clockOut', at: at(14, 16), tz: TZ, supersedes: 'x2' });
  });

  it('adds missed days in the zone the phone is in', () => {
    const draft = draftForNewDay('2025-10-15', env.targets, NY);
    expect(draft.start).toBe(at(15, 9, 0, NY));
    const plan = planNewSession(berlin, draft, nyEnv);
    expect(plan.events.every((e) => e.tz === NY)).toBe(true);
    expect(plan.day).toBe('2025-10-15');
  });

  it('suggests a completion inside the day the session started, in its zone', () => {
    const open: TimeEvent[] = [{ id: 'o1', type: 'clockIn', at: at(13, 22), source: 'app', tz: TZ }];
    const draft = suggestCompletion(buildSessions(open, NOW)[0], NOW, env.targets, NY);
    expect(draft.end).toBe(at(13, 23, 59));
  });

  it('counts a night shift towards the day it started', () => {
    const night: TimeEvent[] = [
      { id: 'n1', type: 'clockIn', at: at(14, 22), source: 'app', tz: TZ },
      { id: 'n2', type: 'clockOut', at: at(15, 6), source: 'app', tz: TZ },
    ];
    const cells = buildMonth(night, '2025-10-01', NOW, env.targets, TZ).weeks.flat();
    expect(cells.find((c) => c?.key === '2025-10-14')?.hours).toBe(8);
    expect(cells.find((c) => c?.key === '2025-10-15')?.hours).toBeUndefined();
  });
});
