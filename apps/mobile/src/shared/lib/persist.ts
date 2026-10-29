/**
 * Zustand persistence on the synchronous SQLite key-value store. Hydration is synchronous, so stores are
 * ready immediately — also when the OS launches the app headless for a background location event.
 * Persisted data is validated with its zod schema; anything invalid falls back to the defaults.
 */
import type { z } from 'zod';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';

import { kv } from './kv';

export function persistOptions<S, P>(name: string, schema: z.ZodType<P>, pick: (s: S) => P): PersistOptions<S, P> {
  return {
    name,
    storage: createJSONStorage<P>(() => kv),
    version: 1,
    partialize: pick,
    merge: (persisted, current) => {
      const parsed = schema.safeParse(persisted);
      return parsed.success ? { ...current, ...parsed.data } : current;
    },
  };
}
