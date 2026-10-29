/**
 * Sessions that never got a check-out. They stay out of every total and balance until they are fixed
 * ("incomplete days don't count"), so a forgotten check-out never inflates a day — or, through the carry-over
 * to the next clock-in, the day after.
 */
import type { TimeEvent } from '../schema';
import { buildSessions, sessionDay, type Session } from './ledger';
import { dateKeyOf, type DateKey } from './zone';

/** A session running longer than this without a check-out was forgotten, not a long night shift. */
export const MAX_OPEN_SESSION_MS = 16 * 3_600_000;

/**
 * Sessions from a past day that never got a check-out. A session still running is not incomplete — even one
 * that started yesterday evening — unless it has been running for longer than any plausible shift.
 * `effective` are effective events (`effectiveEvents`); `tz` is where the phone is.
 */
export function findIncomplete(effective: TimeEvent[], now: number, tz: string): Session[] {
  const today = dateKeyOf(now, tz);
  const clockOuts = new Set(effective.filter((e) => e.type === 'clockOut').map((e) => e.id));
  return buildSessions(effective, now).filter(
    (s) => sessionDay(s, tz) < today && !s.eventIds.some((id) => clockOuts.has(id)) && (s.end !== undefined || now - s.start > MAX_OPEN_SESSION_MS),
  );
}

/** Days that contain an incomplete session. */
export const incompleteDays = (effective: TimeEvent[], now: number, tz: string): Set<DateKey> =>
  new Set(findIncomplete(effective, now, tz).map((s) => sessionDay(s, tz)));

/** Effective events without those of incomplete sessions: the events every total is computed from. */
export function countedEvents(effective: TimeEvent[], now: number, tz: string): TimeEvent[] {
  const dropped = new Set(findIncomplete(effective, now, tz).flatMap((s) => s.eventIds));
  return dropped.size ? effective.filter((e) => !dropped.has(e.id)) : effective;
}
