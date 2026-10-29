import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/kv', () => {
  const m = new Map<string, string>();
  return { kv: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } };
});

const { useSettings, getSettings } = await import('@/features/settings/store');

describe('settings store', () => {
  it('removes an optional salary when resetting settings', () => {
    useSettings.getState().update({ salary: { annualGrossCents: 6000000, currency: 'EUR', paidVacationDays: 30 } });
    useSettings.getState().update({ weeklyHours: 32 });
    expect(getSettings().salary?.annualGrossCents).toBe(6000000);
    useSettings.getState().reset();
    expect(getSettings().salary).toBeUndefined();
    expect(getSettings().weeklyHours).toBe(40);
  });

  it('keeps other fields when patching one', () => {
    useSettings.getState().update({ pattern: ['office', 'home', 'office', 'home', 'office', 'off', 'off'] });
    useSettings.getState().update({ weeklyHours: 32 });
    expect(getSettings()).toMatchObject({ weeklyHours: 32, pattern: ['office', 'home', 'office', 'home', 'office', 'off', 'off'] });
  });

  it('keeps workdays and the weekly pattern in sync', () => {
    useSettings.getState().update({ pattern: ['office', 'home', 'off', 'home', 'flexible', 'off', 'off'] });
    expect(getSettings().workdays).toEqual([1, 2, 4, 5]);
    useSettings.getState().update({ workdays: [1, 2, 3, 4] });
    expect(getSettings().pattern).toEqual(['office', 'home', 'office', 'home', 'off', 'off', 'off']);
  });
});
