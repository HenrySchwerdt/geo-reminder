import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useColors } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui/components';

import { ONBOARDING_STEPS, stepIndex, type OnboardingStep } from './steps';

/** Progress dots: the current step is a wide pill (see design/exports/iphone/onboarding). */
function Dots({ step }: { step: OnboardingStep }) {
  const c = useColors();
  const current = stepIndex(step);
  return (
    <View accessible accessibilityLabel={`Step ${current + 1} of ${ONBOARDING_STEPS.length}`} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {ONBOARDING_STEPS.map((s, i) => (
        <View key={s} style={{ height: 8, width: i === current ? 24 : 8, borderRadius: 4, backgroundColor: i === current ? c['text/primary'] : c['bg/track'] }} />
      ))}
    </View>
  );
}

/** Secondary, text-only action ("Not now", "Skip"). Deliberately as easy to tap as the primary button. */
export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text variant="headline" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

/** Shared layout of every step: back button + progress dots, scrollable content, pinned actions. */
export function OnboardingFrame({
  step,
  title,
  subtitle,
  children,
  actions,
}: {
  step: OnboardingStep;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const canGoBack = stepIndex(step) > 0 && router.canGoBack();
  return (
    <View style={{ flex: 1, backgroundColor: c['bg/canvas'], paddingTop: insets.top + space.s }}>
      <View style={{ height: 44, paddingHorizontal: space.l, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={{ position: 'absolute', left: space.l, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c['bg/elevated'] }}>
            <Icon name="back" size={18} />
          </Pressable>
        ) : null}
        <Dots step={step} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingTop: space.xl, gap: space.l, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: space.s }}>
          <Text variant="largeTitle">{title}</Text>
          {subtitle ? (
            <Text variant="callout" color="text/secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: Math.max(insets.bottom, space.l), gap: space.xs }}>{actions}</View>
    </View>
  );
}

/** Icon + text line for short bullet lists. */
export function Point({ icon, children }: { icon: Parameters<typeof Icon>[0]['name']; children: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name={icon} size={18} color="accent" />
      </View>
      <Text variant="body" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

export function NumberedSteps({ steps }: { steps: readonly string[] }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c['bg/sunken'], borderRadius: radius.card, padding: space.l, gap: space.s }}>
      {steps.map((s, i) => (
        <Text key={s} variant="subhead">{`${i + 1}   ${s}`}</Text>
      ))}
    </View>
  );
}
