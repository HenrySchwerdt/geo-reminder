import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { locationAccess, type LocationAccess } from '@/features/geofencing/permissions';
import { APPEARANCE_LABEL } from '@/features/settings/appearance';
import { describeReminders, describeWorkdays, formatHours } from '@/features/settings/format';
import { useSettings } from '@/features/settings/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { Group, ListRow, Screen, SectionHeader, Text, ToggleRow } from '@/shared/ui/components';

const PROFILE_LABEL = { batterySaver: 'Battery saver', balanced: 'Balanced', precise: 'Precise' } as const;

export default function Settings() {
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const breakRules = useSettings((s) => s.breakRules);
  const reminders = useSettings((s) => s.reminders);
  const appearance = useSettings((s) => s.appearance);
  const liveActivity = useSettings((s) => s.liveActivity);
  const profile = useSettings((s) => s.profile);
  const update = useSettings((s) => s.update);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const [access, setAccess] = useState<LocationAccess>('undetermined');
  useEffect(() => {
    void locationAccess().then(setAccess);
  }, []);

  return (
    <Screen title="Settings">
      <SectionHeader>Work</SectionHeader>
      <Group>
        <ListRow title="Working hours" value={`${formatHours(weeklyHours)} · ${describeWorkdays(workdays)}`} icon="clock" onPress={() => router.push('/working-hours')} />
        <ListRow title="Pay & time" subtitle="Salary, vacation and the value of your hours" icon="pay" onPress={() => router.push('/pay')} />
        <ListRow title="Breaks" value={breakRules.length ? `${breakRules.length} ${breakRules.length === 1 ? 'rule' : 'rules'}` : 'None'} icon="break" tint="break" onPress={() => router.push('/breaks')} />
        <ListRow title="Reminders" subtitle={describeReminders(reminders)} icon="bell" onPress={() => router.push('/reminders')} last />
      </Group>

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

      <SectionHeader>App</SectionHeader>
      <Group>
        <ListRow title="Appearance" value={APPEARANCE_LABEL[appearance]} icon="moon" tint="info" onPress={() => router.push('/appearance')} />
        <ToggleRow
          title="Live Activity"
          subtitle="Shows the running session on the Lock Screen and in the Dynamic Island on iPhone, and as an ongoing notification on Android."
          icon="pulse"
          value={liveActivity}
          onChange={(v) => update({ liveActivity: v })}
          last
        />
      </Group>

      <SectionHeader>Data</SectionHeader>
      <Group>
        <ListRow icon="lock" title="Your data" subtitle="Export as CSV or JSON, import, delete" onPress={() => router.push('/data')} />
        <ListRow icon="shield" title="Privacy" onPress={() => router.push('/privacy')} last />
      </Group>
      <Text variant="footnote" color="text/secondary" style={{ textAlign: 'center' }}>
        All data stays on this phone. No account, no analytics.
      </Text>
    </Screen>
  );
}
