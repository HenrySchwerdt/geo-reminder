import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { OnboardingFrame, Point, TextButton } from '@/features/onboarding/components';
import { nextStep, stepHref } from '@/features/onboarding/steps';
import { requestNotificationPermission } from '@/features/notifications';
import { Button } from '@/shared/ui/components';

type Result = 'idle' | 'granted' | 'denied';

export default function NotificationsStep() {
  const [result, setResult] = useState<Result>('idle');
  const [busy, setBusy] = useState(false);
  const next = () => router.push(stepHref(nextStep('notifications') ?? 'workplace'));

  async function allow() {
    setBusy(true);
    try {
      setResult((await requestNotificationPermission()) ? 'granted' : 'denied');
    } finally {
      setBusy(false);
    }
  }

  const title = result === 'granted' ? 'Notifications are on' : result === 'denied' ? 'Notifications are off' : 'Reminders you can answer';
  const subtitle =
    result === 'granted'
      ? 'Worktime will ask you when you arrive or leave, and you decide what gets recorded.'
      : result === 'denied'
        ? 'Without notifications Worktime cannot remind you. You can still clock in and out in the app, and turn them on later in Settings.'
        : 'Worktime sends a notification when you arrive at or leave a workplace, so you can clock in or out with one tap.';

  return (
    <OnboardingFrame
      step="notifications"
      title={title}
      subtitle={subtitle}
      actions={
        result === 'idle' ? (
          <>
            <Button label="Continue" style="ink" disabled={busy} onPress={() => void allow()} />
            <TextButton label="Not now" onPress={next} />
          </>
        ) : (
          <>
            {result === 'denied' ? <Button label="Open Settings" icon="export" style="ink" onPress={() => void Linking.openSettings()} /> : null}
            {result === 'denied' ? <TextButton label="Continue without notifications" onPress={next} /> : <Button label="Continue" style="ink" onPress={next} />}
          </>
        )
      }>
      <Point icon="bell">Only reminders about your own working time. No marketing, no promotions.</Point>
      <Point icon="check">Nothing is recorded until you confirm it.</Point>
    </OnboardingFrame>
  );
}
