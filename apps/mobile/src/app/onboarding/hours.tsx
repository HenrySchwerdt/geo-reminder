import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { OnboardingFrame, TextButton } from '@/features/onboarding/components';
import { nextStep, stepHref } from '@/features/onboarding/steps';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { space, useColors } from '@/shared/theme';
import { Button, Card, Chips, SectionHeader, Text } from '@/shared/ui/components';

const HOURS = [20, 30, 35, 38, 40];
// ISO weekdays, Monday = 1 (matches Settings.workdays).
const DAYS = [
  { day: 1, short: 'M', name: 'Monday' },
  { day: 2, short: 'T', name: 'Tuesday' },
  { day: 3, short: 'W', name: 'Wednesday' },
  { day: 4, short: 'T', name: 'Thursday' },
  { day: 5, short: 'F', name: 'Friday' },
  { day: 6, short: 'S', name: 'Saturday' },
  { day: 7, short: 'S', name: 'Sunday' },
];

const formatDaily = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export default function WorkingHours() {
  const c = useColors();
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const update = useSettings((s) => s.update);

  const toggle = (day: number) => {
    const next = workdays.includes(day) ? workdays.filter((d) => d !== day) : [...workdays, day].sort((a, b) => a - b);
    if (next.length > 0) update({ workdays: next }); // at least one workday keeps the daily target defined
  };

  return (
    <OnboardingFrame
      step="hours"
      title="Your working hours"
      subtitle="Used for your daily target and overtime. You can change this later in Settings."
      actions={
        <>
          <Button label="Continue" style="ink" onPress={() => router.push(stepHref(nextStep('hours') ?? 'location'))} />
          <TextButton label="Skip" onPress={() => router.push(stepHref(nextStep('hours') ?? 'location'))} />
        </>
      }>
      <SectionHeader>Hours per week</SectionHeader>
      <Chips options={HOURS} value={weeklyHours} format={(h) => `${h} h`} onChange={(h) => update({ weeklyHours: h })} />

      <SectionHeader>Workdays</SectionHeader>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {DAYS.map(({ day, short, name }) => {
          const on = workdays.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityLabel={name}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(day)}
              style={{ flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c['text/primary'] : c['bg/elevated'] }}>
              <Text variant="subheadStrong" color={on ? 'bg/canvas' : 'text/primary'}>
                {short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ marginTop: space.s }}>
        <Text variant="footnote" color="text/secondary">
          Daily target
        </Text>
        <Text variant="title2">{formatDaily(dailyTargetMs({ weeklyHours, workdays }))}</Text>
      </Card>
    </OnboardingFrame>
  );
}
