/** Gross estimates from the current contract; no tax, holiday calendar or payroll assumptions. */
import type { Settings, TimeEvent } from './schema';
import { countedEvents } from './time/complete';
import { buildSessions, effectiveEvents, sessionDay } from './time/ledger';
import { addDays, isoWeekdayOf } from './time/zone';

export function salaryBasis(settings: Pick<Settings, 'salary' | 'weeklyHours' | 'workdays'>, year: number) {
  const { salary, weeklyHours } = settings;
  const workdays = new Set(settings.workdays);
  if (!salary || !workdays.size || !Number.isInteger(year) || year < 1900 || year > 9998) return undefined;
  let scheduledDays = 0;
  for (let day = `${year}-01-01`; day < `${year + 1}-01-01`; day = addDays(day, 1)) {
    if (workdays.has(isoWeekdayOf(day))) scheduledDays++;
  }
  const workingDays = scheduledDays - salary.paidVacationDays;
  if (workingDays <= 0) return undefined;
  const dailyHours = weeklyHours / workdays.size;
  const annualHours = workingDays * dailyHours;
  return { year, scheduledDays, workingDays, dailyHours, annualHours, hourlyCents: salary.annualGrossCents / annualHours };
}

/** Completed sessions only, after corrections and incomplete-session exclusion, in each clock-in's zone. */
export function salaryEstimate(settings: Pick<Settings, 'salary' | 'weeklyHours' | 'workdays'>, ledger: TimeEvent[], period: string, now: number, tz: string) {
  if (!/^\d{4}(-(?:0[1-9]|1[0-2]))?$/.test(period)) return undefined;
  const basis = salaryBasis(settings, Number(period.slice(0, 4)));
  if (!basis) return undefined;
  const events = countedEvents(effectiveEvents(ledger), now, tz);
  const clockOuts = new Set(events.filter((e) => e.type === 'clockOut').map((e) => e.id));
  const workedMs = buildSessions(events, now)
    .filter((s) => s.end !== undefined && s.end <= now && s.eventIds.some((id) => clockOuts.has(id)) && sessionDay(s, tz).startsWith(period))
    .reduce((total, s) => total + s.workedMs, 0);
  return { ...basis, workedMs, grossCents: Math.round(workedMs / 3_600_000 * basis.hourlyCents) };
}
