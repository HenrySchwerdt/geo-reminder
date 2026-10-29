/** Engine state and the diagnostics log, persisted so background wake-ups continue where they left off. */
import { initialState, type EngineState } from '@worktime/core';
import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/shared/lib/persist';

export interface LogEntry {
  at: number;
  text: string;
}

type GeofenceState = {
  engine: EngineState;
  log: LogEntry[];
  setEngine: (engine: EngineState) => void;
  record: (text: string, at?: number) => void;
  reset: () => void;
};

// The engine state is produced by @worktime/core itself; only its envelope is checked here.
const Persisted = z.object({
  engine: z.custom<EngineState>((v) => typeof v === 'object' && v !== null && 'plan' in v && 'tracks' in v),
  log: z.array(z.object({ at: z.number(), text: z.string() })),
});

export const useGeofence = create<GeofenceState>()(
  persist(
    (set) => ({
      engine: initialState(),
      log: [],
      setEngine: (engine) => set({ engine }),
      record: (text, at = Date.now()) => set((s) => ({ log: [{ at, text }, ...s.log].slice(0, 80) })),
      reset: () => set({ engine: initialState(), log: [] }),
    }),
    persistOptions('geofence', Persisted, ({ engine, log }) => ({ engine, log })),
  ),
);

export const logLocation = (text: string) => useGeofence.getState().record(text);
