import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { locationAccess, type LocationAccess } from '@/features/geofencing/permissions';
import { useSettings } from '@/features/settings/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { Chips, Group, ListRow, Screen, SectionHeader, Text } from '@/shared/ui/components';

const PROFILE_LABEL = { batterySaver: 'Battery saver', balanced: 'Balanced', precise: 'Precise' } as const;

export default function Settings() {
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const profile = useSettings((s) => s.profile);
  const update = useSettings((s) => s.update);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const [access, setAccess] = useState<LocationAccess>('undetermined');
  useEffect(() => {
    void locationAccess().then(setAccess);
  }, []);

  return (
    <Screen title="Settings">
      <SectionHeader>Working hours per week</SectionHeader>
      <Chips options={[20, 30, 35, 38, 40]} value={weeklyHours} format={(h) => `${h}h`} onChange={(h) => update({ weeklyHours: h })} />

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
          value={PROFILE_LABEL[profile]}
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
