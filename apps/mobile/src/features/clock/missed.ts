/**
 * Missed check-in / check-out: the geofence engine saw an arrival or a departure that never became a clock
 * event (notification missed, delayed or ignored). Derived from the engine's per-workplace tracks and the
 * ledger — nothing is stored except which prompts the user has dismissed.
 */
import { dateKeyOf, effectiveEvents, summarizeDay, type EngineState, type TimeEvent, type Workplace } from '@worktime/core';

import { currentState } from '@/features/tracking/selectors';

export interface MissedPrompt {
  kind: 'arrival' | 'departure';
  workplaceId: string;
  /** The detected time to offer as the default answer. */
  at: number;
  /** Identifies this occurrence, so a dismissal only hides this one. */
  key: string;
}

const MINUTE = 60_000;

/**
 * Arrival: today the engine saw the user arrive at a workplace with arrival reminders, the question had time to
 * be asked, and the user is neither clocked in nor has a session today.
 * Departure: a session is running and the engine saw the user leave (for the rule's delay) after it started.
 * The most recent candidate wins. `dismissed` holds keys of prompts the user answered.
 */
export function missedPrompt(input: { engine: EngineState; workplaces: Workplace[]; ledger: TimeEvent[]; now: number; tz: string; dismissed: string[] }): MissedPrompt | undefined {
  const { engine, workplaces, ledger, now, tz, dismissed } = input;
  const state = currentState(ledger, now);
  const candidates: MissedPrompt[] = [];

  if (state.state === 'off') {
    const today = dateKeyOf(now, tz);
    const hasSession = summarizeDay(effectiveEvents(ledger), today, now, tz).sessions.length > 0;
    if (!hasSession) {
      for (const wp of workplaces) {
        const t = engine.tracks[wp.id];
        if (!wp.rules.arrival.enabled || t?.arrivedAt === undefined || t.arrivedAt > now || dateKeyOf(t.arrivedAt, tz) !== today) continue;
        if (t.insideSince !== undefined && now - t.insideSince < wp.rules.arrival.delayMinutes * MINUTE) continue;
        candidates.push({ kind: 'arrival', workplaceId: wp.id, at: t.arrivedAt, key: `arrival:${wp.id}:${t.arrivedAt}` });
      }
    }
  } else if (state.session) {
    const session = state.session;
    for (const wp of workplaces) {
      const t = engine.tracks[wp.id];
      const d = wp.rules.departure;
      if (!d.enabled || t === undefined || t.zone === 'inside' || t.outsideSince === undefined) continue;
      if (d.onlyWhenClockedIn && session.workplaceId !== wp.id) continue;
      if (now - t.outsideSince < d.delayMinutes * MINUTE) continue;
      const at = t.lastInsideAt ?? t.outsideSince;
      if (at <= session.start || at > now) continue;
      candidates.push({ kind: 'departure', workplaceId: wp.id, at, key: `departure:${wp.id}:${at}` });
    }
  }

  return candidates.filter((c) => !dismissed.includes(c.key)).sort((a, b) => b.at - a.at)[0];
}
