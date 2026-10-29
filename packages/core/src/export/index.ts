/** Export to CSV (for spreadsheets / payroll) and JSON (full backup), and validated JSON import. */
import { ExportFileSchema, type ExportFile, type Settings, type TimeEvent, type Workplace } from '../schema';
import { buildSessions, effectiveEvents, sessionDay, sessionZone } from '../time/ledger';
import { clockTime } from '../time/zone';
import { findIncomplete } from '../time/complete';

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ['date', 'start', 'end', 'break_minutes', 'worked_minutes', 'worked_hours', 'workplace', 'source', 'time_zone'];

/**
 * One row per work session, in the zone it was recorded in (`timeZone` for sessions from before zones were
 * stored): the date is the day the session started, so a night shift stays one row. UTF-8 with BOM and CRLF
 * so Excel, Numbers and Google Sheets open it correctly. Open sessions are exported up to `now` with an empty end;
 * sessions that never got a check-out have an empty end and no durations (they don't count until fixed).
 */
export function toCsv(events: TimeEvent[], workplaces: Workplace[], timeZone: string, now: number): string {
  const names = new Map(workplaces.map((w) => [w.id, w.name]));
  const effective = effectiveEvents(events);
  const incomplete = new Set(findIncomplete(effective, now, timeZone).map((s) => s.id));
  const rows = buildSessions(effective, now).map((s) => {
    const tz = sessionZone(s, timeZone);
    const missing = incomplete.has(s.id);
    return [
      sessionDay(s, timeZone),
      clockTime(s.start, tz),
      s.end !== undefined && !missing ? clockTime(s.end, tz) : '',
      missing ? '' : Math.round(s.breakMs / 60_000),
      missing ? '' : Math.round(s.workedMs / 60_000),
      missing ? '' : (s.workedMs / 3_600_000).toFixed(2),
      s.workplaceId ? (names.get(s.workplaceId) ?? '') : '',
      s.source,
      tz,
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
