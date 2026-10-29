import type { Appearance as AppearanceSetting } from '@worktime/core';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { resolveScheme, type Scheme } from '@/features/settings/appearance';
import { useSettings } from '@/features/settings/store';

/** The colour scheme every screen draws with: the Appearance setting, falling back to the system's. */
export function useScheme(): Scheme {
  return resolveScheme(useSettings((s) => s.appearance), useColorScheme());
}

/** Makes native UI (tab bar, pickers, alerts) follow the setting too; 'system' removes the override. */
export function applyAppearance(appearance: AppearanceSetting) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
}
