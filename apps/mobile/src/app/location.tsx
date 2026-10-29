import { PROFILES, type PrecisionProfile } from '@worktime/core';
import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { locationAccess, requestAlwaysLocation, type LocationAccess } from '@/features/geofencing/permissions';
import { dispatch, resync } from '@/features/geofencing/runner';
import { useGeofence } from '@/features/geofencing/store';
import { requestNotificationPermission } from '@/features/notifications';
import { LOCATION_DISCLOSURE, LOCATION_PROMPT_NOTE } from '@/features/onboarding/copy';
import { useSettings } from '@/features/settings/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useColors } from '@/shared/theme';
import type { IconName } from '@/shared/theme/icons';
import { Button, Card, Group, Icon, ListRow, Row, Screen, SectionHeader, Text } from '@/shared/ui/components';

const OPTIONS: { key: PrecisionProfile; title: string; text: string; icon: IconName }[] = [
  { key: 'batterySaver', title: 'Battery saver', text: 'Wi-Fi & cell near the fence. Reminders can be 1–3 min late.', icon: 'moon' },
  { key: 'balanced', title: 'Balanced', text: 'GPS only in the last few hundred metres. Recommended.', icon: 'target' },
  { key: 'precise', title: 'Precise', text: 'Earlier and more frequent GPS. For small radii or dense cities.', icon: 'location' },
];

async function chooseProfile(profile: PrecisionProfile) {
  useSettings.getState().update({ profile });
  await dispatch({ type: 'profile', profile, now: Date.now() });
}

const ZONE = { far: 'Far away', approach: 'Approaching', near: 'Near', inside: 'Inside' } as const;
const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function LocationScreen() {
  const c = useColors();
  const profile = useSettings((s) => s.profile);
  const engine = useGeofence((s) => s.engine);
  const log = useGeofence((s) => s.log);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const [access, setAccess] = useState<LocationAccess>('undetermined');
  useEffect(() => {
    void locationAccess().then(setAccess);
  }, []);
  const budget = PROFILES[profile].fineBudgetMinutes;

  async function grant() {
    setAccess(await requestAlwaysLocation());
    await requestNotificationPermission();
    await resync();
  }

  return (
    <Screen>
      {access !== 'always' ? (
        <Card tone="danger" style={{ gap: 10 }}>
          <Row gap={10}>
            <Icon name="warning" color="danger" />
            <Text variant="subheadStrong" color="danger" style={{ flex: 1 }}>
              Background location is {access === 'whenInUse' ? 'only allowed while using the app' : 'off'}
            </Text>
          </Row>
          <Text variant="footnote">{LOCATION_DISCLOSURE.body}</Text>
          {LOCATION_DISCLOSURE.points.slice(0, 2).map((p) => (
            <Text key={p} variant="footnote" color="text/secondary">
              • {p}
            </Text>
          ))}
          <Text variant="caption" color="text/secondary">
            {LOCATION_PROMPT_NOTE}
          </Text>
          <Button label={access === 'denied' ? 'Open settings' : 'Allow location'} style="ink" onPress={access === 'denied' ? () => Linking.openSettings() : grant} />
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Text variant="footnote" color="text/secondary">
          Now
        </Text>
        <Text variant="headline">{engine.plan.reason}</Text>
        <Text variant="footnote" color="text/secondary">
          {engine.plan.mode === 'off' ? 'No location updates running' : `${engine.plan.mode === 'fine' ? 'GPS' : 'Low-power checks'} every ${Math.round(engine.plan.intervalMs / 1000)} s`}
        </Text>
        <Text variant="footnote" color="text/secondary">
          GPS today: {Math.round(engine.budget.fineMs / 60_000)} of {budget} min
        </Text>
        {workplaces.map((w) => (
          <Row key={w.id} style={{ justifyContent: 'space-between' }}>
            <Text variant="subhead">{w.name}</Text>
            <Text variant="subheadStrong" color="accent">
              {ZONE[engine.tracks[w.id]?.zone ?? 'far']}
            </Text>
          </Row>
        ))}
      </Card>

      <SectionHeader>Precision</SectionHeader>
      {OPTIONS.map((o) => {
        const on = profile === o.key;
        return (
          <Pressable key={o.key} onPress={() => void chooseProfile(o.key)}>
            <Card style={{ flexDirection: 'row', gap: 14, borderWidth: on ? 2 : 0, borderColor: c.accent, padding: 16 }}>
              <Icon name={o.icon} color={on ? 'accent' : 'text/secondary'} size={22} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="headline">{o.title}</Text>
                <Text variant="footnote" color="text/secondary">
                  {o.text}
                </Text>
              </View>
              {on ? <Icon name="check" color="accent" /> : null}
            </Card>
          </Pressable>
        );
      })}

      <SectionHeader>Recent</SectionHeader>
      <Group>
        {log.length === 0 ? <ListRow title="Nothing yet" last /> : null}
        {log.slice(0, 12).map((l, i, arr) => (
          <ListRow key={`${l.at}-${i}`} title={l.text} value={time(l.at)} last={i === arr.length - 1} />
        ))}
      </Group>
      <Text variant="caption" color="text/tertiary" style={{ textAlign: 'center' }}>
        Nothing leaves this phone.
      </Text>
    </Screen>
  );
}
