import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { locationAccess, requestAlwaysLocation, type LocationAccess } from '@/features/geofencing/permissions';
import { ALWAYS_LABEL, LOCATION_DISCLOSURE, LOCATION_PROMPT_NOTE, SETTINGS_STEPS } from '@/features/onboarding/copy';
import { NumberedSteps, OnboardingFrame, Point, TextButton } from '@/features/onboarding/components';
import { locationView, nextStep, stepHref } from '@/features/onboarding/steps';
import { space } from '@/shared/theme';
import { Button, Card, Icon, Row, Text } from '@/shared/ui/components';

export default function LocationStep() {
  const [access, setAccess] = useState<LocationAccess>('undetermined');
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const view = locationView(access, requested);

  const refresh = useCallback(() => void locationAccess().then(setAccess), []);
  useEffect(() => {
    refresh();
    // The user may change the permission in system Settings and come back.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const next = () => router.push(stepHref(nextStep('location') ?? 'notifications'));

  async function allow() {
    setBusy(true);
    try {
      setAccess(await requestAlwaysLocation());
      setRequested(true);
    } finally {
      setBusy(false);
    }
  }

  if (view === 'always') {
    return (
      <OnboardingFrame step="location" title="Location reminders are on" subtitle="Worktime can notice when you arrive at or leave a workplace." actions={<Button label="Continue" style="ink" onPress={next} />}>
        <Point icon="check">Add a workplace in a moment to start getting reminders.</Point>
      </OnboardingFrame>
    );
  }

  if (view === 'whenInUse' || view === 'denied') {
    const denied = view === 'denied';
    return (
      <OnboardingFrame
        step="location"
        title={denied ? 'Location reminders are off' : 'Almost there'}
        subtitle={
          denied
            ? `Worktime needs “${ALWAYS_LABEL}” location access to notice when you arrive or leave. Without it you can still clock in manually and use time-based reminders.`
            : `Location is only allowed while you use the app. For reminders when the app is closed, Worktime needs “${ALWAYS_LABEL}”. Without it you can still clock in manually.`
        }
        actions={
          <>
            <Button label="Open Settings" icon="export" style="ink" onPress={() => void Linking.openSettings()} />
            <TextButton label="Use time-based reminders" onPress={next} />
          </>
        }>
        <Card tone={denied ? 'danger' : 'info'}>
          <Row gap={10}>
            <Icon name="warning" color={denied ? 'danger' : 'info'} />
            <Text variant="subheadStrong" color={denied ? 'danger' : 'info'} style={{ flex: 1 }}>
              {denied ? 'Location access is off' : 'Only while using the app'}
            </Text>
          </Row>
        </Card>
        <NumberedSteps steps={SETTINGS_STEPS} />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      step="location"
      title={LOCATION_DISCLOSURE.title}
      subtitle={LOCATION_DISCLOSURE.body}
      actions={
        <>
          <Button label="Continue" style="ink" disabled={busy} onPress={() => void allow()} />
          <TextButton label="Not now" onPress={next} />
        </>
      }>
      <View style={{ gap: space.m }}>
        <Point icon="shield">{LOCATION_DISCLOSURE.points[0]}</Point>
        <Point icon="lock">{LOCATION_DISCLOSURE.points[1]}</Point>
        <Point icon="info">{LOCATION_DISCLOSURE.points[2]}</Point>
      </View>
      <Text variant="footnote" color="text/secondary">
        {LOCATION_PROMPT_NOTE}
      </Text>
    </OnboardingFrame>
  );
}
