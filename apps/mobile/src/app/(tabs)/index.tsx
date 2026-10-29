import { expectedEnd, formatBalance, formatDuration } from '@worktime/core';
import { View } from 'react-native';

import { DayRibbon, WeekBars } from '@/components/charts';
import { Button, Card, Icon, Row, Screen, Stat, StatusPill, Text } from '@/components/ui';
import { clockIn, clockOut, endBreak, startBreak } from '@/data/actions';
import { dailyTargetMs, daySummary, getSettings, getWorkplaces, trackingSince, useStoreVersion, weekStart } from '@/data/store';
import { useNow } from '@/hooks/use-now';

const time = (ms?: number) => (ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–');
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Week totals; `version` is part of the signature so the React Compiler recomputes after store changes. */
function computeWeek(now: number, target: number, workdays: string, version: number) {
  const start = weekStart(now);
  const todayStart = daySummary(now, now).start;
  const since = trackingSince() ?? todayStart;
  const days = DAY_LABELS.map((label, i) => {
    const d = daySummary(start, now, i);
    return { label, hours: d.workedMs / 3_600_000, today: d.start === todayStart, isWorkday: workdays.includes(String(i + 1)), counts: d.start >= since && d.start < todayStart };
  }).filter((d) => d.isWorkday || d.hours > 0);
  const worked = days.reduce((t, d) => t + d.hours * 3_600_000, 0);
  const elapsedTarget = days.filter((d) => d.isWorkday && d.counts).length * target;
  const balance = days.filter((d) => !d.today).reduce((t, d) => t + d.hours * 3_600_000, 0) - elapsedTarget;
  return { days, worked, balance, version };
}

export default function Today() {
  const now = useNow(1000);
  const version = useStoreVersion();
  const settings = getSettings();
  const target = dailyTargetMs(settings);
  const today = daySummary(now, now);
  const workplace = getWorkplaces().find((w) => w.id === today.workplaceId);

  const weekNow = useNow(60_000);
  const workdays = settings.workdays.join(',');
  const week = computeWeek(weekNow, target, workdays, version);

  const end = expectedEnd(today, target, now);
  const elapsed = today.since ? now - today.since : 0;
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
              {formatDuration(today.state === 'break' ? elapsed : today.workedMs)}
            </Text>
            {today.state !== 'off' ? (
              <Text variant="numericLarge" color="text/tertiary">
                :{String(Math.floor(((today.state === 'break' ? elapsed : today.workedMs) / 1000) % 60)).padStart(2, '0')}
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

        {today.state === 'off' && !getWorkplaces().length ? (
          <Row style={{ padding: 12, borderRadius: 16 }} gap={10}>
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
                of {settings.weeklyHours}h
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
        <WeekBars days={week.days} targetHours={target / 3_600_000} />
      </Card>
    </Screen>
  );
}
