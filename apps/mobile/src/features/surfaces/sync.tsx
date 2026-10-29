import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/features/settings/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { publishSurfaces } from './index';

/**
 * Keeps surfaces current while the app runs: on launch, when it returns to the foreground (the zone or the
 * day may have changed) and when settings or workplaces change. Events publish themselves (tracking/actions).
 */
export function SurfaceSync() {
  useEffect(() => {
    void publishSurfaces();
    const subs = [
      AppState.addEventListener('change', (s) => s === 'active' && void publishSurfaces()),
      { remove: useSettings.subscribe(() => void publishSurfaces()) },
      { remove: useWorkplaces.subscribe(() => void publishSurfaces()) },
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return null;
}
