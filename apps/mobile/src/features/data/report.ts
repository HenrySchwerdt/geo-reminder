/**
 * Monthly report: a pure model of the month and the HTML that is printed to PDF. Like the CSV export, every
 * session is shown in the zone it was recorded in; days count towards the balance exactly as in the calendar.
 */
import {
  addDays,
  buildSessions,
  clockTime,
  dateKeyOf,
  daysInMonth,
  effectiveEvents,
  formatBalance,
  formatDuration,
  parseKey,
  sessionDay,
  sessionZone,
  zoneCity,
  type DateKey,
  type TimeEvent,
} from '@worktime/core';

import { countedEvents, dayBalanceOf, findIncomplete, firstDay, incompleteDays, targetFor, type Targets } from '@/features/history/balance';

export interface ReportRow {
  day: DateKey;
  /** First row of its day: the date is printed only there. */
  first: boolean;
  start: string;
  /** Empty while the session has no check-out. */
  end: string;
  breakMs: number;
  workedMs: number;
  note?: string;
}

export interface Report {
  /** First day of the month. */
  month: DateKey;
  rows: ReportRow[];
  /** Totals over the days that count towards the balance (complete days before today). */
  workedMs: number;
  targetMs: number;
  balanceMs: number;
  /** Days with a session in the month. */
  days: number;
}

export interface ReportInput {
  ledger: TimeEvent[];
  /** First day of the month to report. */
  month: DateKey;
  now: number;
  targets: Targets;
  /** Where the phone is: decides "today" and is the zone of sessions recorded without one. */
  tz: string;
}

export function buildReport({ ledger, month, now, targets, tz }: ReportInput): Report {
  const effective = effectiveEvents(ledger);
  const skip = incompleteDays(effective, now, tz);
  const counted = countedEvents(effective, now, tz);
  const trackingStart = firstDay(effective, now, tz);
  const today = dateKeyOf(now, tz);
  const incomplete = new Set(findIncomplete(effective, now, tz).map((s) => s.id));

  let workedMs = 0;
  let targetMs = 0;
  for (let i = 0; i < daysInMonth(month); i++) {
    const day = addDays(month, i);
    const balance = trackingStart && day >= trackingStart ? dayBalanceOf(counted, day, now, targets, skip, tz) : undefined;
    if (balance === undefined) continue;
    targetMs += targetFor(day, targets);
    workedMs += balance + targetFor(day, targets);
  }

  const rows: ReportRow[] = [];
  const days = new Set<DateKey>();
  for (const s of buildSessions(effective, now)) {
    const day = sessionDay(s, tz);
    if (!day.startsWith(month.slice(0, 7))) continue;
    const zone = sessionZone(s, tz);
    const forgotten = incomplete.has(s.id);
    const notes = [
      forgotten ? 'No check-out, not counted' : s.end === undefined ? 'Still running' : day === today ? 'Today, not counted yet' : '',
      zone !== tz ? `${zoneCity(zone)} time` : '',
    ].filter(Boolean);
    rows.push({
      day,
      first: !days.has(day),
      start: clockTime(s.start, zone),
      // Without a check-out the session ends at the next clock-in, which says nothing about when work stopped.
      end: s.end === undefined || forgotten ? '' : clockTime(s.end, zone),
      breakMs: forgotten ? 0 : s.breakMs,
      workedMs: forgotten ? 0 : s.workedMs,
      note: notes.join('. ') || undefined,
    });
    days.add(day);
  }

  return { month, rows, workedMs, targetMs, balanceMs: workedMs - targetMs, days: days.size };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dayLabel = (key: DateKey) => {
  const p = parseKey(key)!;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

/** "October 2025". */
export const monthLabel = (month: DateKey) => {
  const p = parseKey(month)!;
  return new Date(Date.UTC(p.year, p.month - 1, 1, 12)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/** "worktime-report-2025-10.pdf". */
export const reportFileName = (month: DateKey, extension = 'pdf') => `worktime-report-${month.slice(0, 7)}.${extension}`;

const hm = (ms: number) => formatDuration(ms);

/** A self-contained A4 HTML document: header, totals and one table row per session. */
export function reportHtml(report: Report, generatedOn?: string): string {
  const { rows } = report;
  const body = rows.length
    ? rows
        .map(
          (r) => `<tr${r.first ? ' class="first"' : ''}>
      <td>${r.first ? escapeHtml(dayLabel(r.day)) : ''}</td>
      <td class="n">${r.start}</td>
      <td class="n">${r.end || '–'}</td>
      <td class="n">${r.breakMs ? hm(r.breakMs) : '–'}</td>
      <td class="n">${r.workedMs ? hm(r.workedMs) : '–'}</td>
      <td class="note">${r.note ? escapeHtml(r.note) : ''}</td>
    </tr>`,
        )
        .join('\n    ')
    : '<tr><td colspan="6" class="empty">No work recorded in this month.</td></tr>';
  const incomplete = rows.filter((r) => r.note?.startsWith('No check-out')).length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Worktime ${escapeHtml(monthLabel(report.month))}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font: 12px/1.45 -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif; color: #1f2420; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1f2420; padding-bottom: 8px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: -0.3px; }
  header .month { font-size: 16px; font-weight: 600; }
  .totals { display: flex; gap: 12px; margin: 16px 0; }
  .totals div { flex: 1; border: 1px solid #d9d5ca; border-radius: 8px; padding: 8px 12px; }
  .totals small { display: block; color: #6b6f68; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .totals strong { font-size: 18px; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b6f68; border-bottom: 1px solid #1f2420; padding: 6px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #ece9e0; vertical-align: top; }
  tr.first td { border-top: 1px solid #d9d5ca; }
  .n { font-variant-numeric: tabular-nums; white-space: nowrap; }
  th.n { text-align: left; }
  .note { color: #8a4b12; }
  .empty { color: #6b6f68; text-align: center; padding: 24px; }
  tr { break-inside: avoid; }
  footer { margin-top: 16px; color: #6b6f68; font-size: 10px; }
</style>
</head>
<body>
<header>
  <h1>Worktime</h1>
  <span class="month">${escapeHtml(monthLabel(report.month))}</span>
</header>
<section class="totals">
  <div><small>Worked</small><strong>${hm(report.workedMs)} h</strong></div>
  <div><small>Target</small><strong>${hm(report.targetMs)} h</strong></div>
  <div><small>Balance</small><strong>${formatBalance(report.balanceMs)}</strong></div>
  <div><small>Days</small><strong>${report.days}</strong></div>
</section>
<table>
  <thead><tr><th>Date</th><th class="n">Start</th><th class="n">End</th><th class="n">Breaks</th><th class="n">Worked</th><th>Notes</th></tr></thead>
  <tbody>
    ${body}
  </tbody>
</table>
<footer>
  Times are in the time zone each session was recorded in.${incomplete ? ` ${incomplete === 1 ? 'One session has' : `${incomplete} sessions have`} no check-out and is not counted in the totals.` : ''}
  Totals cover completed days before today.${generatedOn ? ` Created on ${escapeHtml(generatedOn)}.` : ''}
</footer>
</body>
</html>
`;
}
