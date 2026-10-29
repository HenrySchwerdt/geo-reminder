import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { wallTime, type TimeEvent } from '@worktime/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { daySummary } from '@/features/tracking/selectors';

const state = vi.hoisted(() => ({ db: undefined as DatabaseSync | undefined }));

// Exercise real SQLite SQL and migrations through the small synchronous Expo facade.
vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: (sql: string) => state.db!.exec(sql),
    getFirstSync: (sql: string) => state.db!.prepare(sql).get(),
    getAllSync: (sql: string) => state.db!.prepare(sql).all(),
    runSync: (sql: string, ...params: SQLInputValue[]) => state.db!.prepare(sql).run(...params),
    withTransactionSync: (body: () => void) => {
      state.db!.exec('BEGIN');
      try {
        body();
        state.db!.exec('COMMIT');
      } catch (error) {
        state.db!.exec('ROLLBACK');
        throw error;
      }
    },
  }),
}));

beforeEach(() => {
  state.db = new DatabaseSync(':memory:');
  vi.resetModules();
});
afterEach(() => state.db!.close());

describe('native event persistence', () => {
  it('keeps a session on its original day after reloading in another zone', async () => {
    const repository = await import('@/features/tracking/repository');
    const start = wallTime('2026-10-29', 15, 'Europe/Berlin');
    const events: TimeEvent[] = [
      { id: 'in', type: 'clockIn', at: start, source: 'app', tz: 'Europe/Berlin' },
      { id: 'out', type: 'clockOut', at: start + 3_600_000, source: 'app', tz: 'Europe/Berlin' },
    ];
    repository.insert(events);
    vi.resetModules();
    const reloaded = (await import('@/features/tracking/repository')).loadAll();
    expect(reloaded).toEqual(events);
    const day = daySummary(reloaded, '2026-10-29', start + 7_200_000, 'America/New_York');
    expect(day.sessions).toHaveLength(1);
    expect(day.workedMs).toBe(3_600_000);
  });

  it('migrates old databases without rewriting legacy events or inventing a zone', async () => {
    state.db!.exec(`CREATE TABLE events (
      id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, at INTEGER NOT NULL,
      workplace_id TEXT, source TEXT NOT NULL, recorded_at INTEGER, supersedes TEXT, voids INTEGER
    );
    INSERT INTO events (id, type, at, source) VALUES ('legacy', 'clockIn', 1000, 'app');
    PRAGMA user_version = 2;`);
    const repository = await import('@/features/tracking/repository');
    expect(repository.loadAll()).toEqual([{ id: 'legacy', type: 'clockIn', at: 1000, source: 'app' }]);
    expect(state.db!.prepare('PRAGMA user_version').get()).toEqual({ user_version: 3 });
    expect(state.db!.prepare('SELECT tz FROM events').get()).toEqual({ tz: null });
  });

  it('preserves correction metadata and zones while duplicate inserts remain idempotent', async () => {
    const repository = await import('@/features/tracking/repository');
    const original: TimeEvent = { id: 'original', type: 'clockIn', at: 1000, source: 'app', tz: 'Asia/Tokyo' };
    const correction: TimeEvent = { ...original, id: 'correction', at: 2000, source: 'manual', supersedes: original.id, recordedAt: 3000 };
    repository.insert([original, correction]);
    repository.insert([correction]);
    expect(repository.loadAll()).toEqual([original, correction]);
  });
});
