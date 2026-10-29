import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Chips, Group, ListRow, Screen, SectionHeader, Text } from '@/components/ui';
import { getSettings, getWorkplaces, saveSettings, useStoreVersion } from '@/data/store';
import { locationAccess, type LocationAccess } from '@/location/permissions';

const PROFILE_LABEL = { batterySaver: 'Battery saver', balanced: 'Balanced', precise: 'Precise' } as const;

export default function Settings() {
  useStoreVersion();
  const settings = getSettings();
  const workplaces = getWorkplaces();
  const [access, setAccess] = useState<LocationAccess>('undetermined');
  useEffect(() => {
    void locationAccess().then(setAccess);
  }, []);

  return (
    <Screen title="Settings">
      <SectionHeader>Working hours per week</SectionHeader>
      <Chips options={[20, 30, 35, 38, 40]} value={settings.weeklyHours} format={(h) => `${h}h`} onChange={(h) => saveSettings({ weeklyHours: h })} />

      <SectionHeader>Workplaces</SectionHeader>
      <Group>
        {workplaces.map((w) => (
          <ListRow
            key={w.id}
            title={w.name}
            subtitle={`${w.radius} m · ${w.rules.arrival.enabled ? `ask after ${w.rules.arrival.delayMinutes} min` : 'no arrival reminder'}`}
            icon="building"
            onPress={() => router.push({ pathname: '/workplace/[id]', params: { id: w.id } })}
          />
        ))}
        <ListRow title="Add workplace" icon="plus" onPress={() => router.push({ pathname: '/workplace/[id]', params: { id: 'new' } })} last />
      </Group>

      <SectionHeader>Location</SectionHeader>
      <Group>
        <ListRow
          title="Precision & status"
          value={PROFILE_LABEL[settings.profile]}
          icon="target"
          onPress={() => router.push('/location')}
        />
        <ListRow
          title="Background location"
          value={access === 'always' ? 'Always' : access === 'whenInUse' ? 'While using' : access === 'denied' ? 'Off' : 'Not set'}
          icon="location"
          tint={access === 'always' ? 'accent' : 'danger'}
          onPress={() => router.push('/location')}
          last
        />
      </Group>
      <Text variant="footnote" color="text/secondary" style={{ textAlign: 'center' }}>
        All data stays on this phone. No account, no analytics.
      </Text>
    </Screen>
  );
}
