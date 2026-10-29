/** Export functions: UI-free, everything stays on the device until the user picks a share target. */
import { dateKeyOf, toCsv, toExportFile } from '@worktime/core';

import { getSettings } from '@/features/settings/store';
import { getLedger } from '@/features/tracking/store';
import { getWorkplaces } from '@/features/workplaces/store';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { shareTextFile } from './files';

const timeZone = deviceTimeZone;

/** Local calendar date, YYYY-MM-DD. */
const today = (now: number) => dateKeyOf(now, timeZone());

/** One row per work session, for spreadsheets and payroll. */
export async function exportCsv(now = Date.now()): Promise<string> {
  const name = `worktime-${today(now)}.csv`;
  const text = toCsv(getLedger(), getWorkplaces(), timeZone(), now);
  await shareTextFile({ name, text, mimeType: 'text/csv', uti: 'public.comma-separated-values-text' });
  return name;
}

/** Full backup: settings, workplaces and the complete event ledger. */
export async function exportJson(now = Date.now()): Promise<string> {
  const name = `worktime-${today(now)}.json`;
  const file = toExportFile({ settings: getSettings(), workplaces: getWorkplaces(), events: getLedger(), timeZone: timeZone(), now });
  await shareTextFile({ name, text: JSON.stringify(file, null, 2), mimeType: 'application/json', uti: 'public.json' });
  return name;
}
