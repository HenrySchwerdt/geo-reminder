// Background tasks must be defined before anything else runs (the OS may start the app headless).
import '@/features/geofencing/tasks';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { resync } from '@/features/geofencing/runner';
import { NotificationBridge } from '@/features/notifications/bridge';
import { OnboardingGate } from '@/features/onboarding';
import { palettes } from '@/shared/theme';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (Platform.OS !== 'web') void resync();
  }, []);

  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c['bg/canvas'], primary: c.accent, card: c['bg/elevated'], text: c['text/primary'] } }}>
      <NotificationBridge />
      <OnboardingGate />
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c['bg/canvas'] }, headerTintColor: c.accent }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="workplace/[id]" options={{ presentation: 'modal', title: 'Workplace' }} />
        <Stack.Screen name="session/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="location" options={{ title: 'Location' }} />
        <Stack.Screen name="data" options={{ title: 'Your data' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      </Stack>
    </ThemeProvider>
  );
}
