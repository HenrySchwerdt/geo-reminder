/** One day: totals, sessions, the fix for a missing check-out, and the history of every correction. */
import { buildSessions, effectiveEvents, formatBalance, formatDuration, summarize, type Session } from '@worktime/core';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { dayBounds } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { newId } from '@/shared/lib/id';
import { space } from '@/shared/theme';
import { DayRibbon } from '@/shared/ui/charts';
import { Button, Card, Group, Icon, ListRow, Row, Screen, SectionHeader, Stat, StatusPill, Text } from '@/shared/ui/components';
import { countedEvents, findIncomplete, targetFor, type Targets } from '../balance';
import { formatDayLong, formatStamp, formatTime, toDateKey } from '../dates';
import { dayHistory } from '../history';
import { commit } from '../last-change';
import { planSessionEdit, suggestCompletion } from '../plan';
import { UndoBanner } from './undo-banner';

const openSession = (id: string) => router.push({ pathname: '/session/[id]', params: { id } });

export function DayDetails({ dayStart }: { dayStart: number }) {
  const now = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const workplaces = useWorkplaces((s) => s.workplaces);

  const targets = useMemo<Targets>(() => ({ workdays, dailyMs: dailyTargetMs({ weeklyHours, workdays }) }), [weeklyHours, workdays]);
  const { end: dayEnd } = dayBounds(dayStart);
  const key = toDateKey(dayStart);

  const model = useMemo(() => {
    const effective = effectiveEvents(ledger);
    const byId = new Map(effective.map((e) => [e.id, e]));
    const incompleteIds = new Set(findIncomplete(effective, now).map((s) => s.id));
    const sessions = buildSessions(effective, now).filter((s) => s.start >= dayStart && s.start < dayEnd);
    return {
      summary: summarize(countedEvents(effective, now), dayStart, dayEnd, now),
      sessions: sessions.map((s) => ({ s, incomplete: incompleteIds.has(s.id), edited: s.eventIds.some((id) => byId.get(id)?.supersedes) })),
      history: dayHistory(ledger, dayStart, dayEnd),
    };
  }, [ledger, now, dayStart, dayEnd]);

  const { summary, sessions, history } = model;
  const incomplete = sessions.filter((x) => x.incomplete);
  const balance = summary.workedMs - targetFor(dayStart, targets);
  const nameOf = (s: Session) => workplaces.find((w) => w.id === s.workplaceId)?.name ?? 'Work session';

  const completion = (s: Session) => {
    const plan = planSessionEdit(ledger, s.id, suggestCompletion(s, now, targets), { now, newId, targets });
    return plan && plan.issues.length === 0 && plan.events.length > 0 ? { plan, end: suggestCompletion(s, now, targets).end } : undefined;
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: formatDayLong(dayStart) }} />
      <UndoBanner />

      {incomplete.map(({ s }) => {
        const fix = completion(s);
        return (
          <View key={s.id} style={{ gap: space.m }}>
            <StatusPill state="alert" label="Missing check-out" />
            <Card style={{ gap: space.m }}>
              <Text variant="headline">{`Clocked in ${formatTime(s.start)} · no check-out`}</Text>
              <DayRibbon dayStart={dayStart} segments={[{ from: s.start, to: Math.min(dayEnd, now), kind: 'work' }]} />
              {fix?.end ? (
                <>
                  <Text variant="subhead" color="text/secondary">
                    {`A typical day for you would end around ${formatTime(fix.end)}. Adjust it if that's not right.`}
                  </Text>
                  <Button label={`End at ${formatTime(fix.end)}`} icon="check" onPress={() => commit(fix.plan.events, `Session saved · balance ${formatBalance(fix.plan.impact.totalAfter)}`)} />
                </>
              ) : null}
              <Button label="Choose another time" style="secondary" onPress={() => openSession(s.id)} />
            </Card>
            <Text variant="footnote" color="text/secondary" style={{ textAlign: 'center' }}>
              Incomplete days don&apos;t count towards your balance until they&apos;re fixed.
            </Text>
          </View>
        );
      })}

      {incomplete.length === 0 ? (
        <Card style={{ gap: space.l }}>
          <Row gap={space.l}>
            <Stat label="Worked" value={formatDuration(summary.workedMs, true)} />
            <Stat label="Breaks" value={formatDuration(summary.breakMs, true)} />
            <Stat label="Balance" value={formatBalance(balance)} color={balance < 0 ? 'danger' : 'accent'} />
          </Row>
          <DayRibbon dayStart={dayStart} segments={summary.segments} />
        </Card>
      ) : null}

      <SectionHeader>Sessions</SectionHeader>
      {sessions.length === 0 ? (
        <Card>
          <Text variant="subhead" color="text/secondary">
            Nothing recorded for this day.
          </Text>
        </Card>
      ) : (
        <Group>
          {sessions.flatMap(({ s, incomplete: open, edited }, i) => {
            const lastSession = i === sessions.length - 1;
            const detail = [`${formatTime(s.start)} – ${s.end && !open ? formatTime(s.end) : open ? 'no check-out' : 'running'}`, edited ? 'edited' : s.source === 'manual' ? 'added manually' : undefined];
            return [
              <ListRow
                key={s.id}
                title={nameOf(s)}
                subtitle={detail.filter(Boolean).join(' · ')}
                value={open ? undefined : formatDuration(s.workedMs, true)}
                icon={open ? 'warning' : 'building'}
                tint={open ? 'danger' : 'accent'}
                onPress={() => openSession(s.id)}
                last={lastSession && s.breaks.length === 0}
              />,
              ...s.breaks.map((b, j) => (
                <ListRow
                  key={`${s.id}-b${j}`}
                  title="Break"
                  subtitle={`${formatTime(b.start)} – ${b.end ? formatTime(b.end) : 'ongoing'}`}
                  value={formatDuration((b.end ?? now) - b.start, true)}
                  icon="break"
                  tint="break"
                  onPress={() => openSession(s.id)}
                  last={lastSession && j === s.breaks.length - 1}
                />
              )),
            ];
          })}
        </Group>
      )}

      <Button label="Add session" icon="calendarAdd" style="secondary" onPress={() => router.push({ pathname: '/session/[id]', params: { id: 'new', date: key } })} />

      <SectionHeader>History</SectionHeader>
      <Card style={{ gap: space.m, padding: space.l }}>
        {history.length === 0 ? (
          <Text variant="subhead" color="text/secondary">
            No changes recorded.
          </Text>
        ) : (
          history.map((h) => (
            <Row key={h.key} gap={space.m} style={{ alignItems: 'flex-start' }}>
              <Icon name="history" size={18} color="text/secondary" />
              <View style={{ flex: 1 }}>
                <Text variant="body">{h.title}</Text>
                <Text variant="footnote" color="text/secondary">
                  {formatStamp(h.when)}
                </Text>
              </View>
            </Row>
          ))
        )}
      </Card>
    </Screen>
  );
}
