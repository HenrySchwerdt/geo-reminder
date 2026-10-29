import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SettingsSchema, salaryBasis, salaryEstimate, type TimeEvent } from '../src';

const settings = { ...DEFAULT_SETTINGS, salary: { annualGrossCents: 6_000_000, currency: 'EUR' as const, paidVacationDays: 30 } };
const event = (id: string, type: TimeEvent['type'], at: string, extra: Partial<TimeEvent> = {}): TimeEvent => ({ id, type, at: Date.parse(at), source: 'app', tz: 'Europe/Berlin', ...extra });
const now = Date.parse('2026-10-29T18:00:00Z');

describe('salary estimates', () => {
  it('uses the actual calendar, contract weekdays and paid vacation', () => {
    const basis = salaryBasis(settings, 2026)!;
    expect(basis.scheduledDays).toBe(261);
    expect(basis.annualHours).toBe(1848);
    expect(basis.hourlyCents).toBeCloseTo(3246.753);
    expect(salaryBasis({ ...settings, workdays: [1, 1, 2, 3, 4, 5] }, 2026)).toEqual(basis);
    expect(salaryBasis(settings, 2024)?.scheduledDays).toBe(262);
    expect(salaryBasis({ ...settings, weeklyHours: 20, workdays: [6, 7] }, 2026)?.dailyHours).toBe(10);
  });
  it('handles legacy settings, empty workweeks and excessive vacation without dividing by zero', () => {
    expect(SettingsSchema.parse(DEFAULT_SETTINGS).salary).toBeUndefined();
    expect(salaryBasis(DEFAULT_SETTINGS, 2026)).toBeUndefined();
    expect(salaryBasis({ ...settings, workdays: [] }, 2026)).toBeUndefined();
    expect(salaryBasis({ ...settings, salary: { ...settings.salary, paidVacationDays: 365 } }, 2026)).toBeUndefined();
    expect(SettingsSchema.safeParse({ ...settings, salary: { ...settings.salary, annualGrossCents: NaN } }).success).toBe(false);
  });
  it('subtracts breaks, applies corrections, excludes running and forgotten sessions', () => {
    const ledger = [
      event('in', 'clockIn', '2026-10-27T08:00:00Z'), event('break', 'breakStart', '2026-10-27T12:00:00Z'),
      event('resume', 'breakEnd', '2026-10-27T12:30:00Z'), event('out', 'clockOut', '2026-10-27T16:00:00Z'),
      event('fix', 'clockOut', '2026-10-27T16:30:00Z', { supersedes: 'out' }),
      event('forgot', 'clockIn', '2026-10-28T08:00:00Z'), event('running', 'clockIn', '2026-10-29T08:00:00Z'),
    ];
    const result = salaryEstimate(settings, ledger, '2026-10', now, 'America/New_York')!;
    expect(result.workedMs).toBe(8 * 3_600_000);
    expect(result.grossCents).toBe(25974);
    expect(salaryEstimate(settings, [], '2026-10', now, 'Europe/Berlin')?.grossCents).toBe(0);
    expect(salaryEstimate(settings, ledger, '2026-13', now, 'Europe/Berlin')).toBeUndefined();
  });
  it('keeps night shifts in the clock-in month and excludes future check-outs', () => {
    const ledger = [event('in', 'clockIn', '2026-09-30T21:00:00Z'), event('out', 'clockOut', '2026-10-01T05:00:00Z')];
    expect(salaryEstimate(settings, ledger, '2026-09', now, 'Asia/Tokyo')?.workedMs).toBe(8 * 3_600_000);
    expect(salaryEstimate(settings, ledger, '2026-10', now, 'Asia/Tokyo')?.workedMs).toBe(0);
    expect(salaryEstimate(settings, ledger, '2026-09', Date.parse('2026-10-01T01:00:00Z'), 'Europe/Berlin')?.workedMs).toBe(0);
  });
});
