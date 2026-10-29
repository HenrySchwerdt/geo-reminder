/**
 * Applying a plan, and the short-lived "Undo" that follows it. Undo is itself an append-only correction
 * (see `planUndo`), so the ledger keeps the complete story.
 */
import type { TimeEvent } from '@worktime/core';
import { create } from 'zustand';

import { newId } from '@/shared/lib/id';
import { getLedger, useTracking } from '@/features/tracking/store';
import { planUndo } from './plan';

/** How long the Undo stays available after a correction. */
export const UNDO_MS = 10_000;

export interface LastChange {
  label: string;
  events: TimeEvent[];
  at: number;
}

export const useLastChange = create<{ change?: LastChange; clear: () => void }>()((set) => ({ change: undefined, clear: () => set({ change: undefined }) }));

/** Append the planned events in one write and remember them for Undo. */
export function commit(events: TimeEvent[], label: string) {
  if (!events.length) return;
  useTracking.getState().append(events);
  useLastChange.setState({ change: { label, events, at: Date.now() } });
}

export function undoLastChange() {
  const change = useLastChange.getState().change;
  if (!change) return;
  useTracking.getState().append(planUndo(getLedger(), change.events, { now: Date.now(), newId }));
  useLastChange.getState().clear();
}
