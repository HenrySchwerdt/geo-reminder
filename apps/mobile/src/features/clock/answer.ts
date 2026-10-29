import { router } from 'expo-router';

/** Tell the geofence engine the question was answered, so it stops asking ("Not working today", "Still working"). */
export async function answer(kind: 'arrival' | 'departure', workplaceId: string) {
  const { dispatch } = await import('@/features/geofencing/runner');
  await dispatch({ type: 'answered', kind, workplaceId, now: Date.now() });
}

/** Close a sheet; when it was opened directly (web reload, notification cold start) go to Today instead. */
export const closeSheet = () => (router.canGoBack() ? router.back() : router.replace('/'));
