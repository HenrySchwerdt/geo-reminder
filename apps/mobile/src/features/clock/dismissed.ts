/** Which missed check-in / check-out prompts the user already answered, so Today stops asking about them. */
import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/shared/lib/persist';

type DismissedState = {
  keys: string[];
  dismiss: (key: string) => void;
  reset: () => void;
};

const Persisted = z.object({ keys: z.array(z.string()) });

export const useDismissed = create<DismissedState>()(
  persist(
    (set) => ({
      keys: [],
      // Prompts are about today; a short tail is plenty.
      dismiss: (key) => set((s) => ({ keys: [...s.keys.filter((k) => k !== key), key].slice(-20) })),
      reset: () => set({ keys: [] }),
    }),
    persistOptions('missed-prompts', Persisted, ({ keys }) => ({ keys })),
  ),
);
