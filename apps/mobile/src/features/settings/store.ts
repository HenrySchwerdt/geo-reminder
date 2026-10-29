import { dailyTarget, DEFAULT_SETTINGS, SettingsSchema, type DayMode, type Settings } from '@worktime/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/shared/lib/persist';

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

/** Keeps `workdays` and `pattern` describing the same week, whichever of the two was changed. */
function reconcile(current: Settings, patch: Partial<Settings>): Partial<Settings> {
  if (patch.pattern) {
    return { ...patch, workdays: patch.pattern.flatMap((m, i) => (m === 'off' ? [] : [i + 1])) };
  }
  if (patch.workdays) {
    const days = new Set(patch.workdays);
    const pattern = current.pattern.map((m, i): DayMode => (!days.has(i + 1) ? 'off' : m === 'off' ? 'office' : m));
    return { ...patch, pattern };
  }
  return patch;
}

/** The persisted fields of the store (drops the actions). */
const pick = (s: Settings): Settings => SettingsSchema.parse(s);

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      // Validate the whole result: a partial schema would fill defaults into fields the patch doesn't touch.
      update: (patch) => {
        const current = pick(get());
        set(SettingsSchema.parse({ ...current, ...reconcile(current, patch) }));
      },
      reset: () => set({ ...DEFAULT_SETTINGS, salary: undefined }),
    }),
    persistOptions<SettingsState, Settings>('settings', SettingsSchema, pick),
  ),
);

/** Plain snapshot for non-React code (background tasks, exports). */
export const getSettings = (): Settings => pick(useSettings.getState());

export const dailyTargetMs = dailyTarget;
