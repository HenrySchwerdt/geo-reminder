import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, ExportFileSchema } from '@worktime/core';
import { parseContract } from '../src/features/pay/model';

describe('salary contract input and persistence', () => {
  it('accepts decimal commas, preserves cents and permits zero vacation', () => {
    expect(parseContract('60000,25', '37,5', '0', 'EUR')).toEqual({ salary: { annualGrossCents: 6000025, paidVacationDays: 0, currency: 'EUR' }, weeklyHours: 37.5 });
  });
  it('rejects ambiguous grouping, scientific notation, excess decimals and invalid ranges', () => {
    for (const annual of ['', '60,000', '60.000,00', '-1', '0', '1e5', 'Infinity']) expect(parseContract(annual, '40', '30', 'EUR')).toBeUndefined();
    expect(parseContract('60000', '81', '30', 'EUR')).toBeUndefined();
    expect(parseContract('60000', '40', '30.5', 'EUR')).toBeUndefined();
    expect(parseContract('60000', '40', '30', 'BTC')).toBeUndefined();
  });
  it('round-trips the salary in backups while accepting old backups', () => {
    const file = { format: 'worktime-export', version: 1, exportedAt: '2026-10-29T12:00:00Z', timeZone: 'Europe/Berlin', settings: DEFAULT_SETTINGS, workplaces: [], events: [] };
    expect(ExportFileSchema.parse(file).settings.salary).toBeUndefined();
    const salary = parseContract('60000', '40', '30', 'EUR')!.salary;
    expect(ExportFileSchema.parse(JSON.parse(JSON.stringify({ ...file, settings: { ...DEFAULT_SETTINGS, salary } }))).settings.salary).toEqual(salary);
  });
});
