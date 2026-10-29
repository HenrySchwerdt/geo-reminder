import { Stack } from 'expo-router';

import { useColors } from '@/shared/theme';

/** Onboarding stack. Each step draws its own back button and progress dots, so the native header is hidden. */
export default function OnboardingLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c['bg/canvas'] } }} />;
}
