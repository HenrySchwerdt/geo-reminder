/**
 * The append-only event log in SQLite. Rows are validated with the zod schema when read, so a damaged
 * row can never crash the app — it is skipped and reported.
 */
import { TimeEventSchema, type TimeEvent } from '@worktime/core';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('worktime.db');

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS events (
     id TEXT PRIMARY KEY NOT NULL,
     type TEXT NOT NULL,
     at INTEGER NOT NULL,
     workplace_id TEXT,
     source TEXT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS events_at ON events (at);`,
  `ALTER TABLE events ADD COLUMN recorded_at INTEGER;
   ALTER TABLE events ADD COLUMN supersedes TEXT;
   ALTER TABLE events ADD COLUMN voids INTEGER;`,
  `ALTER TABLE events ADD COLUMN tz TEXT;`,
];

function migrate() {
  db.execSync('PRAGMA journal_mode = WAL;');
  const { user_version: current } = db.getFirstSync<{ user_version: number }>('PRAGMA user_version') ?? { user_version: 0 };
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
migrate();

type Row = {
  id: string;
  type: string;
  at: number;
  workplace_id: string | null;
  source: string;
  recorded_at: number | null;
  supersedes: string | null;
  voids: number | null;
  tz: string | null;
};

const fromRow = (r: Row) =>
  TimeEventSchema.safeParse({
    id: r.id,
    type: r.type,
    at: r.at,
    source: r.source,
    workplaceId: r.workplace_id ?? undefined,
    recordedAt: r.recorded_at ?? undefined,
    supersedes: r.supersedes ?? undefined,
    voids: r.voids ? true : undefined,
    tz: r.tz ?? undefined,
  });

export function loadAll(): TimeEvent[] {
  const out: TimeEvent[] = [];
  for (const row of db.getAllSync<Row>('SELECT * FROM events ORDER BY at')) {
    const parsed = fromRow(row);
    if (parsed.success) out.push(parsed.data);
    else console.warn(`Skipping invalid event ${row.id}`);
  }
  return out;
}

export function insert(events: TimeEvent[]) {
  db.withTransactionSync(() => {
    for (const e of events) {
      db.runSync(
        'INSERT OR IGNORE INTO events (id, type, at, workplace_id, source, recorded_at, supersedes, voids, tz) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        e.id,
        e.type,
        e.at,
        e.workplaceId ?? null,
        e.source,
        e.recordedAt ?? null,
        e.supersedes ?? null,
        e.voids ? 1 : null,
        e.tz ?? null,
      );
    }
  });
}

/** Irreversibly removes every event (Settings › Data › Delete all data). */
export function deleteAll() {
  db.runSync('DELETE FROM events');
}
