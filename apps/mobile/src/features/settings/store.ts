import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from '@worktime/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/shared/lib/persist';

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(SettingsSchema.partial().parse(patch)),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    persistOptions('settings', SettingsSchema, ({ weeklyHours, workdays, profile, onboarded }) => ({ weeklyHours, workdays, profile, onboarded })),
  ),
);

/** Plain snapshot for non-React code (background tasks, exports). */
export const getSettings = (): Settings => {
  const { weeklyHours, workdays, profile, onboarded } = useSettings.getState();
  return { weeklyHours, workdays, profile, onboarded };
};

export const dailyTargetMs = (s: Pick<Settings, 'weeklyHours' | 'workdays'>) =>
  (s.weeklyHours / Math.max(1, s.workdays.length)) * 3_600_000;
