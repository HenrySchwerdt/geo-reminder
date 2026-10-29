import { SalarySchema } from '@worktime/core';

import { parseWeeklyHours } from '@/features/settings/format';

/** Decimal input accepts either locale separator, never ambiguous thousands separators or exponents. */
function decimal(value: string, places: number) {
  const normalized = value.trim().replace(',', '.');
  return new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(normalized) ? Number(normalized) : NaN;
}

export function parseContract(annual: string, weekly: string, vacation: string, currency: string) {
  const salary = SalarySchema.safeParse({ annualGrossCents: Math.round(decimal(annual, 2) * 100), paidVacationDays: /^\d+$/.test(vacation.trim()) ? Number(vacation) : NaN, currency });
  const hours = parseWeeklyHours(weekly);
  return salary.success && hours !== undefined ? { salary: salary.data, weeklyHours: hours } : undefined;
}

export const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(cents / 100);
