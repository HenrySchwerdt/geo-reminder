/** Native persistence: SQLite for the event log, the SQLite-backed key-value store for documents. */
import type { TimeEvent } from '@worktime/core';
import * as SQLite from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

const db = SQLite.openDatabaseSync('worktime.db');
db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    at INTEGER NOT NULL,
    workplace_id TEXT,
    source TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_at ON events (at);
`);

type Row = { id: string; type: TimeEvent['type']; at: number; workplace_id: string | null; source: TimeEvent['source'] };

export function queryEvents(from: number, to: number): TimeEvent[] {
  // Include the last clock-in before `from` so a session that started yesterday is still open today.
  const rows = db.getAllSync<Row>(
    `SELECT * FROM events WHERE at >= (SELECT COALESCE(MAX(at), 0) FROM events WHERE at < ? AND type = 'clockIn') AND at < ? ORDER BY at`,
    from,
    to,
  );
  return rows.map((r) => ({ id: r.id, type: r.type, at: r.at, source: r.source, workplaceId: r.workplace_id ?? undefined }));
}

export function insertEvent(e: TimeEvent) {
  db.runSync('INSERT INTO events (id, type, at, workplace_id, source) VALUES (?, ?, ?, ?, ?)', e.id, e.type, e.at, e.workplaceId ?? null, e.source);
}

export function firstEventAt(): number | undefined {
  return db.getFirstSync<{ at: number | null }>('SELECT MIN(at) AS at FROM events')?.at ?? undefined;
}

export const kvGet = (key: string) => Storage.getItemSync(key);
export const kvSet = (key: string, value: string) => Storage.setItemSync(key, value);
