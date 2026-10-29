import { effectiveEvents, formatBalance, formatDuration } from '@worktime/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { findIncomplete, type Targets } from '@/features/history/balance';
import { buildMonth } from '@/features/history/calendar';
import { UndoBanner } from '@/features/history/components/undo-banner';
import { Legend, MonthGrid } from '@/features/history/components/month-grid';
import { formatDayLong, formatTime, monthStart, toDateKey } from '@/features/history/dates';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { space, useColors } from '@/shared/theme';
import { Card, Icon, Row, Screen, Text } from '@/shared/ui/components';

const openDay = (date: string) => router.push({ pathname: '/day/[date]', params: { date } });

function RoundButton({ icon, label, onPress, disabled }: { icon: 'back' | 'chevron' | 'calendarAdd'; label: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c['bg/elevated'],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.separator,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

export default function Calendar() {
  const now = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const [month, setMonth] = useState(() => monthStart(Date.now()));
  const [selected, setSelected] = useState<string>();

  const targets = useMemo<Targets>(() => ({ workdays, dailyMs: dailyTargetMs({ weeklyHours, workdays }) }), [weeklyHours, workdays]);
  const model = useMemo(() => buildMonth(ledger, month, now, targets, selected), [ledger, month, now, targets, selected]);
  // The most recent past session without a check-out.
  const incomplete = useMemo(() => findIncomplete(effectiveEvents(ledger), now).at(-1), [ledger, now]);

  const thisMonth = monthStart(now);
  const title = new Date(month).toLocaleDateString([], { month: 'long', year: 'numeric' });
  const workplace = workplaces.find((w) => w.id === incomplete?.workplaceId);

  return (
    <Screen
      title="Calendar"
      trailing={
        <RoundButton icon="calendarAdd" label="Add a missed session" onPress={() => router.push({ pathname: '/session/[id]', params: { id: 'new', date: toDateKey(Date.now()) } })} />
      }>
      <UndoBanner />

      <Row style={{ justifyContent: 'space-between' }}>
        <RoundButton icon="back" label="Previous month" onPress={() => setMonth(monthStart(month, -1))} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text variant="headline">{title}</Text>
          <Text variant="subhead" color="text/secondary">{`${formatDuration(model.workedMs, true)} · balance ${formatBalance(model.balanceMs)}`}</Text>
        </View>
        <RoundButton icon="chevron" label="Next month" disabled={month >= thisMonth} onPress={() => setMonth(monthStart(month, 1))} />
      </Row>

      <MonthGrid
        month={model}
        onSelect={(key) => {
          setSelected(key);
          openDay(key);
        }}
      />
      <Legend />

      {incomplete ? (
        <Card tone="danger" style={{ gap: space.xs, padding: space.l }}>
          <Row gap={space.m} style={{ alignItems: 'flex-start' }}>
            <Icon name="warning" size={22} color="danger" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="headline" color="danger">{`${formatDayLong(incomplete.start)} has no check-out`}</Text>
              <Text variant="subhead">{`Clocked in ${formatTime(incomplete.start)}${workplace ? ` at ${workplace.name}` : ''}.`}</Text>
              <Pressable accessibilityRole="button" onPress={() => openDay(toDateKey(incomplete.start))} hitSlop={8}>
                <Text variant="headline" color="danger">
                  Fix entry
                </Text>
              </Pressable>
            </View>
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
