import { WorkplaceSchema, type Workplace } from '@worktime/core';
import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/shared/lib/persist';
import { deviceTimeZone } from '@/shared/lib/time-zone';

type WorkplacesState = {
  workplaces: Workplace[];
  upsert: (w: Workplace) => void;
  remove: (id: string) => void;
  replaceAll: (ws: Workplace[]) => void;
};

export const useWorkplaces = create<WorkplacesState>()(
  persist(
    (set) => ({
      workplaces: [],
      // A workplace keeps the zone it was created in: its reminder windows are in local time there.
      upsert: (w) => set((s) => ({ workplaces: [...s.workplaces.filter((x) => x.id !== w.id), WorkplaceSchema.parse({ ...w, tz: w.tz ?? deviceTimeZone() })] })),
      remove: (id) => set((s) => ({ workplaces: s.workplaces.filter((x) => x.id !== id) })),
      replaceAll: (workplaces) => set({ workplaces: z.array(WorkplaceSchema).parse(workplaces) }),
    }),
    persistOptions('workplaces', z.object({ workplaces: z.array(WorkplaceSchema) }), ({ workplaces }) => ({ workplaces })),
  ),
);

export const getWorkplaces = () => useWorkplaces.getState().workplaces;
