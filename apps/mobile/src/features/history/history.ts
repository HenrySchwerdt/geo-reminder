/** The "History" list of a day: every correction and where each entry originally came from, newest first. */
import { historyOf, type EventSource, type EventType, type TimeEvent } from '@worktime/core';

import { formatTime } from './dates';

export interface HistoryEntry {
  key: string;
  title: string;
  /** When the change was recorded (epoch ms). */
  when: number;
  kind: 'created' | 'changed' | 'deleted';
}

const NOUN: Record<EventType, string> = { clockIn: 'Check-in', clockOut: 'Check-out', breakStart: 'Break start', breakEnd: 'Break end' };
const VERB: Record<EventType, string> = { clockIn: 'Clocked in', clockOut: 'Clocked out', breakStart: 'Break started', breakEnd: 'Break ended' };
const SOURCE: Partial<Record<EventSource, string>> = {
  notification: 'from reminder',
  geofence: 'by location',
  watch: 'from Apple Watch',
  widget: 'from widget',
  liveActivity: 'from Live Activity',
  manual: 'added manually',
  import: 'imported',
};

function describe(version: TimeEvent, previous?: TimeEvent): Pick<HistoryEntry, 'title' | 'kind'> {
  const noun = NOUN[version.type];
  if (!previous) {
    const source = SOURCE[version.source];
    return { title: `${VERB[version.type]} ${formatTime(version.at, version.tz)}${source ? ` · ${source}` : ''}`, kind: 'created' };
  }
  if (version.voids) return { title: `${noun} deleted (was ${formatTime(previous.at, previous.tz)})`, kind: 'deleted' };
  if (version.at !== previous.at) return { title: `${noun} changed ${formatTime(previous.at, previous.tz)} → ${formatTime(version.at, version.tz)}`, kind: 'changed' };
  if (version.workplaceId !== previous.workplaceId) return { title: `${noun}: workplace changed`, kind: 'changed' };
  return { title: `${noun} saved again`, kind: 'changed' };
}

/** Entries for every event chain that has a version inside [from, to). */
export function dayHistory(ledger: TimeEvent[], from: number, to: number): HistoryEntry[] {
  const byId = new Map(ledger.map((e) => [e.id, e]));
  const roots = new Set<string>();
  for (const e of ledger) {
    if (e.at < from || e.at >= to) continue;
    let root = e;
    while (root.supersedes) {
      const up = byId.get(root.supersedes);
      if (!up) break;
      root = up;
    }
    roots.add(root.id);
  }
  const entries: HistoryEntry[] = [];
  for (const id of roots) {
    historyOf(ledger, id).forEach((version, i, chain) => {
      entries.push({ key: version.id, when: version.recordedAt ?? version.at, ...describe(version, chain[i - 1]) });
    });
  }
  return entries.sort((a, b) => b.when - a.when);
}
