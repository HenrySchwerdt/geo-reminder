/** Export to CSV (for spreadsheets / payroll) and JSON (full backup), and validated JSON import. */
import { ExportFileSchema, type ExportFile, type Settings, type TimeEvent, type Workplace } from '../schema';
import { buildSessions, effectiveEvents } from '../time/ledger';

function local(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ['date', 'start', 'end', 'break_minutes', 'worked_minutes', 'worked_hours', 'workplace', 'source', 'time_zone'];

/**
 * One row per work session, in the user's time zone. UTF-8 with BOM and CRLF so Excel, Numbers and
 * Google Sheets open it correctly. Open sessions are exported up to `now` with an empty end.
 */
export function toCsv(events: TimeEvent[], workplaces: Workplace[], timeZone: string, now: number): string {
  const names = new Map(workplaces.map((w) => [w.id, w.name]));
  const rows = buildSessions(effectiveEvents(events), now).map((s) => {
    const start = local(s.start, timeZone);
    return [
      start.date,
      start.time,
      s.end !== undefined ? local(s.end, timeZone).time : '',
      Math.round(s.breakMs / 60_000),
      Math.round(s.workedMs / 60_000),
      (s.workedMs / 3_600_000).toFixed(2),
      s.workplaceId ? (names.get(s.workplaceId) ?? '') : '',
      s.source,
      timeZone,
    ];
  });
  return '﻿' + [CSV_HEADER, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function toExportFile(input: { settings: Settings; workplaces: Workplace[]; events: TimeEvent[]; timeZone: string; now: number }): ExportFile {
  return {
    format: 'worktime-export',
    version: 1,
    exportedAt: new Date(input.now).toISOString(),
    timeZone: input.timeZone,
    settings: input.settings,
    workplaces: input.workplaces,
    events: input.events,
  };
}

export type ImportResult = { ok: true; file: ExportFile } | { ok: false; error: string };

/** Parse and validate a backup file. Never throws. */
export function parseExportFile(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  const res = ExportFileSchema.safeParse(json);
  if (!res.success) {
    const first = res.error.issues[0];
    return { ok: false, error: `Not a Worktime backup (${first?.path.join('.') || 'file'}: ${first?.message ?? 'invalid'}).` };
  }
  return { ok: true, file: res.data };
}

/** Events from a backup that aren't stored yet (import is additive and idempotent). */
export function newEventsFrom(file: ExportFile, existing: TimeEvent[]): TimeEvent[] {
  const ids = new Set(existing.map((e) => e.id));
  return file.events.filter((e) => !ids.has(e.id));
}
