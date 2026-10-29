/**
 * In-memory view of the event log. The log is small (a few thousand events a year), so it is loaded once
 * and every screen derives what it needs with the pure functions from @worktime/core.
 */
import type { TimeEvent } from '@worktime/core';
import { create } from 'zustand';

import * as repository from './repository';

type TrackingState = {
  /** All stored events, including superseded versions and tombstones (the full ledger). */
  ledger: TimeEvent[];
  append: (events: TimeEvent[]) => void;
  reload: () => void;
  clear: () => void;
};

export const useTracking = create<TrackingState>()((set) => ({
  ledger: repository.loadAll(),
  append: (events) => {
    repository.insert(events);
    set((s) => ({ ledger: [...s.ledger, ...events.filter((e) => !s.ledger.some((x) => x.id === e.id))] }));
  },
  reload: () => set({ ledger: repository.loadAll() }),
  clear: () => {
    repository.deleteAll();
    set({ ledger: [] });
  },
}));

export const getLedger = () => useTracking.getState().ledger;
