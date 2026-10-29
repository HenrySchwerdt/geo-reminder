/**
 * Month and year insights. Everything derives from one pass over the sessions, in the zone each was recorded
 * in (`tz` — where the phone is — decides "today" and is the fallback for older events). Rules match the
 * calendar: a session counts towards the day it started, incomplete days stay out of the balance, and targets
 * only count from the first recorded day.
 */
import { addDays, addMonths, buildSessions, dateKeyOf, daysInMonth, effectiveEvents, minutesOfDay, sessionDay, sessionZone, type DateKey, type TimeEvent } from '@worktime/core';

import { countedEvents, findIncomplete, firstDay, targetFor, type Targets } from '@/features/history/balance';

/** One day of the strip: `missing` = no check-out, `empty` = a workday with nothing recorded (yet). */
export type StripState = 'worked' | 'missing' | 'empty' | 'off' | 'future';

export interface InsightDay {
  key: DateKey;
  state: StripState;
  today: boolean;
  workedMs: number;
  targetMs: number;
  /** Worked / target, for shading; 1 on a day without target that has work. */
  ratio: number;
}

interface DayFacts {
  workedMs: number;
  running: boolean;
  firstIn?: { at: number; tz: string };
  lastOut?: { at: number; tz: string };
}

/** Worked time and first start / last end per day, from completed sessions plus the one still running. */
function factsByDay(ledger: TimeEvent[], now: number, tz: string) {
  const effective = effectiveEvents(ledger);
  const missing = new Set(findIncomplete(effective, now, tz).map((s) => sessionDay(s, tz)));
  const facts = new Map<DateKey, DayFacts>();
  for (const s of buildSessions(countedEvents(effective, now, tz), now)) {
    const day = sessionDay(s, tz);
    const zone = sessionZone(s, tz);
    const f = facts.get(day) ?? { workedMs: 0, running: false };
    f.workedMs += s.workedMs;
    if (s.end === undefined) f.running = true;
    else if (!f.lastOut || s.end > f.lastOut.at) f.lastOut = { at: s.end, tz: zone };
    if (!f.firstIn || s.start < f.firstIn.at) f.firstIn = { at: s.start, tz: zone };
    facts.set(day, f);
  }
  return { facts, missing, trackingStart: firstDay(effective, now, tz) };
}

type Facts = ReturnType<typeof factsByDay>;

export interface Period {
  days: InsightDay[];
  /** Worked up to and including today (incomplete days excluded). */
  workedMs: number;
  /** What those days asked for: the target of every counted day from the first recorded day to today. */
  targetMs: number;
  /** Over finished days only — today and running sessions are not in it yet. */
  balanceMs: number;
  avgStart?: string;
  avgEnd?: string;
}

/** Average wall-clock time, each read in the zone it was recorded in (08:00 in Berlin and 08:00 in New York → 08:00). */
export function averageTime(xs: { at: number; tz: string }[]): string | undefined {
  if (!xs.length) return undefined;
  const m = Math.round(xs.reduce((t, x) => t + minutesOfDay(x.at, x.tz), 0) / xs.length);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** The days `from` … `to` (inclusive) as one period. */
function period({ facts, missing, trackingStart }: Facts, from: DateKey, to: DateKey, now: number, targets: Targets, tz: string): Period {
  const today = dateKeyOf(now, tz);
  // Without any record nothing was asked of the user yet.
  const start = trackingStart ?? '9999-12-31';
  const days: InsightDay[] = [];
  const starts: { at: number; tz: string }[] = [];
  const ends: { at: number; tz: string }[] = [];
  let workedMs = 0;
  let targetMs = 0;
  let balanceMs = 0;

  for (let key = from; key <= to; key = addDays(key, 1)) {
    const f = facts.get(key);
    const target = targetFor(key, targets);
    const worked = f?.workedMs ?? 0;
    const isMissing = missing.has(key);
    const state: StripState = key > today ? 'future' : isMissing ? 'missing' : f ? 'worked' : target === 0 ? 'off' : 'empty';
    days.push({ key, state, today: key === today, workedMs: worked, targetMs: target, ratio: target > 0 ? worked / target : worked > 0 ? 1 : 0 });
    if (key > today || isMissing) continue;
    workedMs += worked;
    if (key >= start) {
      targetMs += target;
      if (key < today && !f?.running) balanceMs += worked - target;
    }
    if (f?.firstIn) starts.push(f.firstIn);
    if (f?.lastOut) ends.push(f.lastOut);
  }
  return { days, workedMs, targetMs, balanceMs, avgStart: averageTime(starts), avgEnd: averageTime(ends) };
}

/** `month` is any day of the month. */
export function monthInsights(ledger: TimeEvent[], month: DateKey, now: number, targets: Targets, tz: string): Period {
  const first = addMonths(month, 0);
  return period(factsByDay(ledger, now, tz), first, addDays(first, daysInMonth(first) - 1), now, targets, tz);
}

export interface MonthBar {
  /** First day of the month. */
  month: DateKey;
  workedMs: number;
  targetMs: number;
  balanceMs: number;
}

export interface YearModel {
  months: MonthBar[];
  workedMs: number;
  targetMs: number;
  balanceMs: number;
}

/** `year` is any day of the year. */
export function yearInsights(ledger: TimeEvent[], year: DateKey, now: number, targets: Targets, tz: string): YearModel {
  const january = `${year.slice(0, 4)}-01-01`;
  const facts = factsByDay(ledger, now, tz);
  const months: MonthBar[] = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(january, i);
    const p = period(facts, month, addDays(month, daysInMonth(month) - 1), now, targets, tz);
    return { month, workedMs: p.workedMs, targetMs: p.targetMs, balanceMs: p.balanceMs };
  });
  const sum = (pick: (m: MonthBar) => number) => months.reduce((t, m) => t + pick(m), 0);
  return { months, workedMs: sum((m) => m.workedMs), targetMs: sum((m) => m.targetMs), balanceMs: sum((m) => m.balanceMs) };
}
