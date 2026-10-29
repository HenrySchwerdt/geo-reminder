// Background tasks must be defined before anything else runs (the OS may start the app headless).
import '@/features/geofencing/tasks';
import '@/features/surfaces/register';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { resync } from '@/features/geofencing/runner';
import { SurfaceSync } from '@/features/surfaces/sync';
import { NotificationBridge } from '@/features/notifications/bridge';
import { OnboardingGate } from '@/features/onboarding';
import { useSettings } from '@/features/settings/store';
import { applyAppearance, palettes, useScheme } from '@/shared/theme';

export default function RootLayout() {
  const scheme = useScheme();
  const appearance = useSettings((s) => s.appearance);
  const c = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => applyAppearance(appearance), [appearance]);

  useEffect(() => {
    if (Platform.OS !== 'web') void resync();
  }, []);

  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c['bg/canvas'], primary: c.accent, card: c['bg/elevated'], text: c['text/primary'] } }}>
      <NotificationBridge />
      <SurfaceSync />
      <OnboardingGate />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c['bg/canvas'] }, headerTintColor: c.accent }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="workplace/[id]" options={{ presentation: 'modal', title: 'Workplace' }} />
        <Stack.Screen name="session/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="clock/in" options={{ presentation: 'formSheet', headerShown: false, sheetGrabberVisible: true, sheetAllowedDetents: [0.7, 1] }} />
        <Stack.Screen name="clock/out" options={{ presentation: 'formSheet', headerShown: false, sheetGrabberVisible: true, sheetAllowedDetents: [0.85, 1] }} />
        <Stack.Screen name="location" options={{ title: 'Location' }} />
        <Stack.Screen name="working-hours" options={{ title: 'Working hours' }} />
        <Stack.Screen name="breaks" options={{ title: 'Breaks' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
        <Stack.Screen name="data"options={{ title: 'Your data' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      </Stack>
    </ThemeProvider>
  );
}
