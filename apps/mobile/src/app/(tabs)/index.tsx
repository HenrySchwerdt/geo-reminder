import { expectedEnd, formatBalance, formatDuration } from '@worktime/core';
import { View } from 'react-native';

import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { clockIn, clockOut, endBreak, startBreak } from '@/features/tracking/actions';
import { daySummary, weekSummary } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { DayRibbon, WeekBars } from '@/shared/ui/charts';
import { Button, Card, Icon, Row, Screen, Stat, StatusPill, Text } from '@/shared/ui/components';

const time = (ms?: number) => (ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–');

export default function Today() {
  const now = useNow(1000);
  const minute = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const workplaces = useWorkplaces((s) => s.workplaces);

  const target = dailyTargetMs({ weeklyHours, workdays });
  const today = daySummary(ledger, now, now);
  const week = weekSummary(ledger, minute, workdays, target);
  const workplace = workplaces.find((w) => w.id === today.workplaceId);
  const end = expectedEnd(today, target, now);
  const shown = today.state === 'break' ? now - (today.since ?? now) : today.workedMs;
  const date = new Date(now).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen title="Today" subtitle={date}>
      <Card style={{ gap: 16 }}>
        {today.state === 'working' ? (
          <StatusPill state="working" label={workplace ? `Working · ${workplace.name}` : 'Working'} />
        ) : today.state === 'break' ? (
          <StatusPill state="break" label={`On break · since ${time(today.since)}`} />
        ) : (
          <StatusPill state="off" />
        )}

        <View>
          <Row gap={0} style={{ alignItems: 'baseline' }}>
            <Text variant="timer" color={today.state === 'break' ? 'break' : today.state === 'off' ? 'text/tertiary' : 'text/primary'}>
              {formatDuration(shown)}
            </Text>
            {today.state !== 'off' ? (
              <Text variant="numericLarge" color="text/tertiary">
                :{String(Math.floor(shown / 1000) % 60).padStart(2, '0')}
              </Text>
            ) : null}
          </Row>
          <Text variant="subhead" color="text/secondary">
            {today.state === 'off'
              ? today.workedMs > 0
                ? `Worked ${formatDuration(today.workedMs, true)} today`
                : `${formatDuration(target, true)} planned today`
              : today.state === 'break'
                ? `Break · ${formatDuration(today.workedMs, true)} worked so far`
                : `Since ${time(today.firstIn)} · ${formatDuration(today.breakMs, true)} break`}
          </Text>
        </View>

        <DayRibbon dayStart={today.start} segments={today.segments} now={now} plannedEnd={end} />

        {today.state !== 'off' ? (
          <Row>
            <Stat label="Remaining" value={formatDuration(Math.max(0, target - today.workedMs), true)} />
            <Stat label="Expected end" value={time(end)} />
            <Stat label="Today" value={`${Math.round((today.workedMs / target) * 100)}%`} color="accent" />
          </Row>
        ) : null}

        {today.state === 'off' && workplaces.length === 0 ? (
          <Row gap={10}>
            <Icon name="location" size={18} color="accent" />
            <Text variant="footnote" color="accent" style={{ flex: 1 }}>
              Add a workplace in Settings to get reminded when you arrive.
            </Text>
          </Row>
        ) : null}

        <Row gap={10}>
          {today.state === 'off' ? <Button label="Clock in" icon="play" flex onPress={() => clockIn()} /> : null}
          {today.state === 'working' ? (
            <>
              <Button label="Break" icon="break" style="break" flex onPress={() => startBreak()} />
              <Button label="Clock out" icon="stop" style="ink" flex onPress={() => clockOut()} />
            </>
          ) : null}
          {today.state === 'break' ? <Button label="End break" icon="play" flex onPress={() => endBreak()} /> : null}
        </Row>
      </Card>

      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text variant="footnote" color="text/secondary">
              This week
            </Text>
            <Row gap={6} style={{ alignItems: 'baseline' }}>
              <Text variant="numericLarge">{formatDuration(week.worked, true)}</Text>
              <Text variant="subhead" color="text/secondary">
                of {weeklyHours}h
              </Text>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="footnote" color="text/secondary">
              Balance
            </Text>
            <Text variant="numericMedium" color={week.balance >= 0 ? 'accent' : 'danger'}>
              {formatBalance(week.balance)}
            </Text>
          </View>
        </Row>
        <WeekBars days={week.days.filter((d) => d.isWorkday || d.hours > 0)} targetHours={target / 3_600_000} />
      </Card>
    </Screen>
  );
}
