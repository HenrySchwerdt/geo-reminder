import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Segmented } from '@/features/settings/components';
import { DAY_MODES, formatHours, formatMinutes, parseWeeklyHours, setDayMode, WEEKDAYS } from '@/features/settings/format';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { radius, space, useColors } from '@/shared/theme';
import { Card, Chips, Group, Screen, SectionHeader, Text } from '@/shared/ui/components';

const HOURS = [20, 30, 35, 38, 40];

export default function WorkingHours() {
  const c = useColors();
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const pattern = useSettings((s) => s.pattern);
  const update = useSettings((s) => s.update);
  const [draft, setDraft] = useState<string>();
  const invalid = draft !== undefined && draft.trim() !== '' && parseWeeklyHours(draft) === undefined;

  const commit = () => {
    const hours = draft === undefined ? undefined : parseWeeklyHours(draft);
    if (hours !== undefined) update({ weeklyHours: hours });
    setDraft(undefined);
  };

  return (
    <Screen>
      <SectionHeader>Hours per week</SectionHeader>
      <Chips options={HOURS} value={weeklyHours} format={(h) => `${h} h`} onChange={(h) => update({ weeklyHours: h })} />
      <Card style={{ gap: space.s }}>
        <Text variant="footnote" color="text/secondary">
          Custom, between 1 and 80 hours
        </Text>
        <TextInput
          accessibilityLabel="Custom hours per week"
          value={draft ?? String(weeklyHours)}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{ fontSize: 17, color: c['text/primary'], paddingVertical: 6, borderRadius: radius.s }}
        />
        {invalid ? (
          <Text variant="footnote" color="danger">
            Enter a number from 1 to 80, for example 37.5.
          </Text>
        ) : null}
      </Card>
      <Card tone="accent">
        <Text variant="footnote" color="text/secondary">
          Daily target
        </Text>
        <Text variant="title2">{formatMinutes(Math.round(dailyTargetMs({ weeklyHours, workdays }) / 60_000))}</Text>
        <Text variant="footnote" color="text/secondary">
          {formatHours(weeklyHours)} spread over {workdays.length} working {workdays.length === 1 ? 'day' : 'days'}.
        </Text>
      </Card>

      <SectionHeader>Weekly pattern</SectionHeader>
      <Group>
        {WEEKDAYS.map((name, i) => (
          <View key={name} style={{ paddingHorizontal: space.l, paddingVertical: space.m, gap: space.s, borderBottomWidth: i < 6 ? 0.5 : 0, borderBottomColor: c.separator }}>
            <Text variant="body">{name}</Text>
            <Segmented label={name} options={DAY_MODES} value={pattern[i] ?? 'off'} onChange={(mode) => update({ pattern: setDayMode(pattern, i, mode) })} />
          </View>
        ))}
      </Group>
      <Text variant="footnote" color="text/secondary">
        Office days use your workplace location. On Home days Worktime reminds you by time instead. Flexible days can be either, and Off days have no target.
      </Text>
    </Screen>
  );
}
