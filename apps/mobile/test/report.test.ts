import { wallTime, type TimeEvent } from '@worktime/core';
import { describe, expect, it } from 'vitest';

import { buildReport, monthLabel, reportFileName, reportHtml } from '@/features/data/report';

const TZ = 'Europe/Berlin';
const at = (day: string, h: number, mi = 0, tz = TZ) => wallTime(day, h * 60 + mi, tz);
const ev = (id: string, type: TimeEvent['type'], ms: number, tz = TZ): TimeEvent => ({ id, type, at: ms, source: 'app', tz });
const targets = { workdays: [1, 2, 3, 4, 5], dailyMs: 8 * 3_600_000 };

const ledger: TimeEvent[] = [
  ev('a', 'clockIn', at('2025-10-13', 9)), // Monday: 9:00–17:30 with a 30 min break = 8 h
  ev('b', 'breakStart', at('2025-10-13', 12)),
  ev('c', 'breakEnd', at('2025-10-13', 12, 30)),
  ev('d', 'clockOut', at('2025-10-13', 17, 30)),
  ev('e', 'clockIn', at('2025-10-14', 8)), // Tuesday: 6 h
  ev('f', 'clockOut', at('2025-10-14', 14)),
  ev('g', 'clockIn', at('2025-10-15', 9)), // Wednesday: no check-out
  ev('h', 'clockIn', at('2025-10-16', 22, 0, 'Asia/Tokyo'), 'Asia/Tokyo'), // Thursday in Tokyo
  ev('i', 'clockOut', at('2025-10-16', 23, 30, 'Asia/Tokyo'), 'Asia/Tokyo'),
];
const now = at('2025-10-20', 10);
const report = buildReport({ ledger, month: '2025-10-01', now, targets, tz: TZ });

describe('buildReport', () => {
  it('lists sessions in the zone they were recorded in, with notes', () => {
    expect(report.rows.map((r) => [r.day, r.start, r.end, r.note])).toEqual([
      ['2025-10-13', '09:00', '17:30', undefined],
      ['2025-10-14', '08:00', '14:00', undefined],
      ['2025-10-15', '09:00', '', 'No check-out, not counted'],
      ['2025-10-16', '22:00', '23:30', 'Tokyo time'],
    ]);
    expect(report.rows[0]).toMatchObject({ breakMs: 30 * 60_000, workedMs: 8 * 3_600_000 });
  });

  it('counts only complete days before today towards the totals', () => {
    // Mon 8 h + Tue 6 h + Thu 1.5 h worked; targets of Mon, Tue, Thu and Fri (Wednesday is incomplete, the weekend is off).
    expect(report.workedMs).toBe((8 + 6 + 1.5) * 3_600_000);
    expect(report.targetMs).toBe(4 * 8 * 3_600_000);
    expect(report.balanceMs).toBe(report.workedMs - report.targetMs);
    expect(report.days).toBe(4);
  });

  it('is empty for a month without records', () => {
    const empty = buildReport({ ledger, month: '2025-09-01', now, targets, tz: TZ });
    expect(empty).toMatchObject({ rows: [], workedMs: 0, targetMs: 0, balanceMs: 0, days: 0 });
  });
});

describe('reportHtml', () => {
  const html = reportHtml(report, '2025-10-20');

  it('has the header, totals and one row per session', () => {
    expect(html).toContain('<h1>Worktime</h1>');
    expect(html).toContain('October 2025');
    expect(html).toContain('Mon 13 Oct');
    expect(html).toContain('<td class="n">17:30</td>');
    expect(html).toContain('No check-out, not counted');
    expect(html.match(/<tr class="first">/g)).toHaveLength(4);
  });

  it('escapes text and handles an empty month', () => {
    expect(reportHtml({ ...report, rows: [{ ...report.rows[0]!, note: '<b>"x"</b>' }] })).toContain('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    expect(reportHtml({ ...report, rows: [], days: 0 })).toContain('No work recorded in this month.');
  });

  it('names the file after the month', () => {
    expect(reportFileName('2025-10-01')).toBe('worktime-report-2025-10.pdf');
    expect(monthLabel('2025-10-01')).toBe('October 2025');
  });
});
