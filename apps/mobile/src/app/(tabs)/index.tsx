import { breakRulesOf, dayRange, effectiveEvents, expectedEnd, formatBalance, formatDuration, sessionZone, zoneCity } from '@worktime/core';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { IncompleteCard, MissedCard } from '@/features/clock/cards';
import { useDismissed } from '@/features/clock/dismissed';
import { missedPrompt } from '@/features/clock/missed';
import { useGeofence } from '@/features/geofencing/store';
import { findIncomplete, targetFor } from '@/features/history/balance';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { clockIn, endBreak, startBreak } from '@/features/tracking/actions';
import { formatDayFull, formatTime } from '@/features/history/dates';
import { currentDay, daySummary, weekSummary } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { DayRibbon, WeekBars } from '@/shared/ui/charts';
import { Button, Card, Icon, Row, Screen, Stat, StatusPill, Text } from '@/shared/ui/components';

export default function Today() {
  const now = useNow(1000);
  const minute = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const breakRules = useSettings((s) => s.breakRules);
  const engine = useGeofence((s) => s.engine);
  const dismissed = useDismissed((s) => s.keys);
  const workplaces = useWorkplaces((s) => s.workplaces);

  const dailyMs = dailyTargetMs({ weeklyHours, workdays });
  const tz = deviceTimeZone();
  // A night shift stays on the day it started until it ends.
  const day = currentDay(ledger, now, tz);
  // A day the weekly pattern marks as off asks nothing of the user.
  const target = targetFor(day, { workdays, dailyMs });
  const today = daySummary(ledger, day, now, tz);
  const running = today.sessions.find((s) => s.end === undefined);
  // Times of the running session stay in the zone it started in, even after a flight.
  const zone = running ? sessionZone(running, tz) : tz;
  const time = (ms?: number) => (ms ? formatTime(ms, zone) : '–');
  const week = weekSummary(ledger, minute, workdays, dailyMs, tz);
  const workplace = workplaces.find((w) => w.id === today.workplaceId);
  const rules = breakRulesOf(breakRules);
  const end = target > 0 ? expectedEnd(today, target, now, rules) : undefined;
  const shown = today.state === 'break' ? now - (today.since ?? now) : today.workedMs;
  const date = formatDayFull(day);
  const missed = missedPrompt({ engine, workplaces, ledger, now: minute, tz, dismissed });
  // The most recent past session without a check-out (it stays out of the balance until fixed).
  const incomplete = findIncomplete(effectiveEvents(ledger), minute, tz).at(-1);

  return (
    <Screen title="Today" subtitle={date}>
      {missed ? <MissedCard prompt={missed} place={workplaces.find((w) => w.id === missed.workplaceId)?.name ?? 'your workplace'} now={now} targetMs={target} rules={rules} /> : null}
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
                : target > 0
                  ? `${formatDuration(target, true)} planned today`
                  : 'Day off'
              : today.state === 'break'
                ? `Break · ${formatDuration(today.workedMs, true)} worked so far`
                : `Since ${time(today.firstIn)} · ${formatDuration(today.breakMs, true)} break`}
          </Text>
        </View>

        <DayRibbon dayStart={dayRange(day, zone).start} segments={today.segments} now={now} plannedEnd={end} />

        {today.state !== 'off' ? (
          <Row>
            <Stat label="Remaining" value={target > 0 ? formatDuration(Math.max(0, target - today.workedMs), true) : '–'} />
            <Stat label="Expected end" value={time(end)} />
            <Stat label="Today" value={target > 0 ? `${Math.round((today.workedMs / target) * 100)}%` : 'Day off'} color="accent" />
          </Row>
        ) : null}

        {running && zone !== tz ? (
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <Icon name="location" size={18} color="accent" />
            <Text variant="footnote" color="text/secondary" style={{ flex: 1 }}>
              {`You're now in ${zoneCity(tz)} time. This session started in ${zoneCity(zone)} and counts towards ${date}; its times are shown in ${zoneCity(zone)} time.`}
            </Text>
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
              <Button label="Clock out" icon="stop" style="ink" flex onPress={() => router.push('/clock/out')} />
            </>
          ) : null}
          {today.state === 'break' ? <Button label="End break" icon="play" flex onPress={() => endBreak()} /> : null}
        </Row>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push(today.state === 'off' ? '/clock/in' : '/clock/out')} style={{ alignSelf: 'center' }}>
          <Text variant="subheadStrong" color="accent">
            {today.state === 'off' ? 'Clock in at another time…' : 'Clock out at another time…'}
          </Text>
        </Pressable>
      </Card>

      {incomplete ? <IncompleteCard session={incomplete} place={workplaces.find((w) => w.id === incomplete.workplaceId)?.name} /> : null}

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
        <WeekBars days={week.days.filter((d) => d.isWorkday || d.hours > 0)} targetHours={dailyMs / 3_600_000} />
      </Card>
    </Screen>
  );
}
