/**
 * The append-only ledger: corrections are new events, never edits in place.
 *
 *   edit    → { …new values, supersedes: oldId }
 *   delete  → { …copy of the target, supersedes: targetId, voids: true }
 *
 * `effectiveEvents` folds the log into the events that currently count; `historyOf` returns the chain of
 * versions behind one event for the "History" list.
 */
import type { TimeEvent } from '../schema';

export function effectiveEvents(events: TimeEvent[]): TimeEvent[] {
  const replaced = new Set<string>();
  for (const e of events) if (e.supersedes) replaced.add(e.supersedes);
  return events.filter((e) => !replaced.has(e.id) && !e.voids).sort((a, b) => a.at - b.at);
}

/** Every version of an event, oldest first, ending with the current one (or the tombstone). */
export function historyOf(events: TimeEvent[], id: string): TimeEvent[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const successor = new Map<string, TimeEvent>();
  for (const e of events) if (e.supersedes) successor.set(e.supersedes, e);
  // walk back to the root…
  let root = byId.get(id);
  while (root?.supersedes && byId.has(root.supersedes)) root = byId.get(root.supersedes);
  // …then forward to the latest version
  const chain: TimeEvent[] = [];
  for (let e = root; e; e = successor.get(e.id)) chain.push(e);
  return chain;
}

export interface Session {
  /** Id of the clock-in event that opened it. */
  id: string;
  start: number;
  end?: number;
  workplaceId?: string;
  source: TimeEvent['source'];
  breaks: { start: number; end?: number }[];
  workedMs: number;
  breakMs: number;
  /** Ids of the events that make up this session (for editing). */
  eventIds: string[];
}

/** Pair clock-ins with clock-outs (open sessions run until `now`). Invalid transitions are ignored. */
export function buildSessions(events: TimeEvent[], now: number): Session[] {
  const sessions: Session[] = [];
  let cur: Session | undefined;
  const close = (s: Session, end: number | undefined) => {
    const last = s.breaks[s.breaks.length - 1];
    if (last && last.end === undefined && end !== undefined) last.end = end;
    s.end = end;
    const stop = end ?? now;
    s.breakMs = s.breaks.reduce((t, b) => t + Math.max(0, (b.end ?? now) - b.start), 0);
    s.workedMs = Math.max(0, stop - s.start - s.breakMs);
  };
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    switch (e.type) {
      case 'clockIn':
        if (cur) {
          close(cur, e.at);
          sessions.push(cur);
        }
        cur = { id: e.id, start: e.at, workplaceId: e.workplaceId, source: e.source, breaks: [], workedMs: 0, breakMs: 0, eventIds: [e.id] };
        break;
      case 'breakStart':
        if (cur && !cur.breaks.some((b) => b.end === undefined)) {
          cur.breaks.push({ start: e.at });
          cur.eventIds.push(e.id);
        }
        break;
      case 'breakEnd': {
        const open = cur?.breaks.find((b) => b.end === undefined);
        if (cur && open) {
          open.end = e.at;
          cur.eventIds.push(e.id);
        }
        break;
      }
      case 'clockOut':
        if (cur) {
          cur.eventIds.push(e.id);
          close(cur, e.at);
          sessions.push(cur);
          cur = undefined;
        }
        break;
    }
  }
  if (cur) {
    close(cur, undefined);
    sessions.push(cur);
  }
  return sessions;
}
