import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';

import { useSettings } from '@/features/settings/store';
import { useColors } from '@/shared/theme';

/** Four tabs. On iOS 26 this is the floating Liquid Glass tab bar, on Android the Material 3 navigation bar. */
export default function TabsLayout() {
  const c = useColors();
  const onboarded = useSettings((s) => s.onboarded);
  // The onboarding gate redirects before the tabs exist; native preload events otherwise outlive that navigator.
  if (!onboarded) return null;
  return (
    <NativeTabs tintColor={c.accent} minimizeBehavior="onScrollDown"
      backgroundColor={Platform.OS === 'android' ? c['bg/elevated'] : undefined}
      indicatorColor={c['accent/soft']} labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
