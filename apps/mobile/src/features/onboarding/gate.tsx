import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useSettings } from '@/features/settings/store';

import { shouldRedirectToOnboarding, stepHref } from './steps';

/**
 * Sends first-time users to onboarding. Mount once inside the root layout (renders nothing).
 * It only redirects; every onboarding step can be skipped, so nothing blocks manual use of the app.
 */
export function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const ready = useRootNavigationState()?.key != null;
  const onboarded = useSettings((s) => s.onboarded);
  const redirect = ready && shouldRedirectToOnboarding(onboarded, segments);

  useEffect(() => {
    if (redirect) router.replace(stepHref('welcome'));
  }, [redirect, router]);

  return null;
}
