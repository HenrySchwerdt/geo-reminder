import { DEFAULT_SETTINGS, type ExportFile } from '@worktime/core';
import { expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/kv', () => {
  const values = new Map<string, string>();
  return { kv: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) } };
});
vi.mock('@/features/geofencing/runner', () => ({ resync: vi.fn(async () => {}) }));
vi.mock('@/features/tracking/store', () => ({ getLedger: () => [], useTracking: { getState: () => ({ append: vi.fn() }) } }));
vi.mock('@/features/workplaces/store', () => ({ getWorkplaces: () => [], useWorkplaces: { getState: () => ({ replaceAll: vi.fn() }) } }));
vi.mock('@/features/data/files', () => ({ pickTextFile: vi.fn() }));

const { applyImport } = await import('@/features/data/import');
const { getSettings, useSettings } = await import('@/features/settings/store');

it('restores legacy backups without retaining a salary absent from the backup', async () => {
  const salary = { annualGrossCents: 6000000, currency: 'EUR' as const, paidVacationDays: 30 };
  const file: ExportFile = { format: 'worktime-export', version: 1, exportedAt: '2026-10-29T12:00:00Z', timeZone: 'Europe/Berlin', settings: DEFAULT_SETTINGS, workplaces: [], events: [] };
  useSettings.getState().update({ salary });
  await applyImport(file);
  expect(getSettings().salary).toEqual(salary);
  await applyImport(file, { restoreSettings: true });
  expect(getSettings().salary).toBeUndefined();
  await applyImport({ ...file, settings: { ...DEFAULT_SETTINGS, salary } }, { restoreSettings: true });
  expect(getSettings().salary).toEqual(salary);
});
