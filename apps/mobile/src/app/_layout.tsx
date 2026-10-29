// Background tasks must be defined before anything else runs (the OS may start the app headless).
import '@/location/tasks';

import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { resync } from '@/location/runner';
import { NotificationBridge } from '@/components/notification-bridge';
import { palettes } from '@/theme';

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
      <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c['bg/canvas'] }, headerTintColor: c.accent }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workplace/[id]" options={{ presentation: 'modal', title: 'Workplace' }} />
        <Stack.Screen name="location" options={{ title: 'Location' }} />
      </Stack>
    </ThemeProvider>
  );
}
