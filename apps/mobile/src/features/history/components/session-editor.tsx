/** Edit an existing session, or add a missed one, with a live preview of what the correction changes. */
import { buildSessions, dateKeyOf, effectiveEvents, formatBalance, formatDuration, sessionDay, sessionZone } from '@worktime/core';
import { router, Stack } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { getLedger, useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { newId } from '@/shared/lib/id';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { radius, space, useColors } from '@/shared/theme';
import { Button, Card, Chips, Group, Icon, ListRow, Row, Screen, SectionHeader, Text } from '@/shared/ui/components';
import { findIncomplete, type Targets } from '../balance';
import { formatDayLong, formatTime, moveToDay, toDateKey, zoneNote, type DateKey } from '../dates';
import { UNDO_MS, commit } from '../last-change';
import {
  defaultBreak,
  draftForNewDay,
  draftFromSession,
  planDeleteSession,
  planNewSession,
  planSessionEdit,
  suggestCompletion,
  type Issue,
  type SessionDraft,
} from '../plan';
import { ImpactCard } from './impact-card';
import { DateField, TimeField } from './time-field';

const MIN = 60_000;

function confirmAsync(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** A tappable chip for values that have no time yet (running session, ongoing break). */
function ChipButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ backgroundColor: c['bg/sunken'], borderRadius: radius.m, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 8 }}>
      <Text variant="numericSmall" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

function IssueCard({ issue, onFix, others }: { issue: Issue; onFix: (patch: NonNullable<Issue['fixes']>[number]['patch']) => void; others: ReactNode }) {
  const overlap = issue.kind === 'overlap';
  return (
    <>
      <Card tone="danger" style={{ gap: space.xs, padding: space.l }}>
        <Row gap={space.s}>
          <Icon name="warning" size={18} color="danger" />
          <Text variant="headline" color="danger">
            {overlap ? 'Two sessions overlap' : "Can't save yet"}
          </Text>
        </Row>
        <Text variant="subhead">{issue.message}</Text>
        {others}
      </Card>
      {issue.fixes?.length ? (
        <Group>
          {issue.fixes.map((fix, i) => (
            <ListRow key={fix.label} title={fix.label} icon="edit" onPress={() => onFix(fix.patch)} last={i === issue.fixes!.length - 1} />
          ))}
        </Group>
      ) : null}
    </>
  );
}

export function SessionEditor({ sessionId, initialDay }: { sessionId?: string; initialDay?: DateKey }) {
  const now = useNow(30_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const isNew = sessionId === undefined;

  const targets = useMemo<Targets>(() => ({ workdays, dailyMs: dailyTargetMs({ weeklyHours, workdays }) }), [weeklyHours, workdays]);
  const tz = deviceTimeZone();
  const env = useMemo(() => ({ now, newId, targets, tz }), [now, targets, tz]);

  // The session as it was when the editor opened; the draft starts from it and "changed" is measured against it.
  const [original] = useState(() => {
    if (!sessionId) return undefined;
    const t = Date.now();
    const effective = effectiveEvents(getLedger());
    const session = buildSessions(effective, t).find((s) => s.id === sessionId);
    return session && { session, incomplete: findIncomplete(effective, t, tz).some((s) => s.id === session.id) };
  });
  // Times are edited in the zone the session was recorded in; new sessions are in the phone's zone.
  const [zone] = useState(() => (original ? sessionZone(original.session, tz) : tz));
  const [draft, setDraft] = useState<SessionDraft | undefined>(() => {
    if (original) return original.incomplete ? suggestCompletion(original.session, Date.now(), targets, tz) : draftFromSession(original.session);
    return isNew ? draftForNewDay(initialDay ?? toDateKey(Date.now(), tz), targets, tz) : undefined;
  });
  const [done, setDone] = useState(false);

  const plan = useMemo(() => {
    if (!draft) return undefined;
    return isNew ? planNewSession(ledger, draft, env) : planSessionEdit(ledger, sessionId, draft, env);
  }, [ledger, draft, env, isNew, sessionId]);

  if (done) return null;
  if (!draft || !plan) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Edit session' }} />
        <Card style={{ gap: space.m }}>
          <Text variant="headline">This session no longer exists</Text>
          <Button label="Close" style="secondary" onPress={leave} />
        </Card>
      </Screen>
    );
  }

  const stored = original?.session;
  const set = (patch: Partial<SessionDraft>) => setDraft((d) => d && { ...d, ...patch });
  const setBreak = (i: number, patch: Partial<SessionDraft['breaks'][number]>) =>
    setDraft((d) => d && { ...d, breaks: d.breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const moveDate = (day: DateKey) => {
    const move = (ms: number) => moveToDay(ms, day, zone);
    setDraft((d) => d && { ...d, start: move(d.start), end: d.end && move(d.end), breaks: d.breaks.map((b) => ({ ...b, start: move(b.start), end: b.end && move(b.end) })) });
  };
  const note = zoneNote(zone);

  const canSave = plan.issues.length === 0 && plan.events.length > 0;
  const balanceLabel = formatBalance(plan.impact.countsTowardsTotal ? plan.impact.totalAfter : plan.impact.dayBalanceAfter);

  function save() {
    if (!canSave) return;
    commit(plan!.events, `${isNew ? 'Session added' : 'Session saved'} · balance ${balanceLabel}`);
    setDone(true);
    leave();
  }

  function remove() {
    if (!sessionId) return;
    const del = planDeleteSession(ledger, sessionId, env);
    if (!del) return;
    const label = `Session deleted · balance ${formatBalance(del.impact.countsTowardsTotal ? del.impact.totalAfter : del.impact.dayBalanceAfter)}`;
    confirmAsync('Delete this session?', `${formatDuration(del.removedMs, true)} will be removed. You can undo for ${UNDO_MS / 1000} seconds.`, 'Delete session', () => {
      commit(del.events, label);
      setDone(true);
      leave();
    });
  }

  const changed = {
    start: !!stored && draft.start !== stored.start,
    end: !!stored && draft.end !== stored.end,
  };
  const stop = draft.end ?? now;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: isNew ? 'Add work day' : 'Edit session',
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={leave}>
              <Icon name="close" size={18} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} hitSlop={12} disabled={!canSave} onPress={save}>
              <Text variant="headline" color="accent" style={{ opacity: canSave ? 1 : 0.4 }}>
                {isNew ? 'Add' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />

      {original?.incomplete && plan.issues.length === 0 ? (
        <Card tone="break" style={{ gap: space.xs, padding: space.l }}>
          <Row gap={space.s}>
            <Icon name="warning" size={18} color="break" />
            <Text variant="headline" color="break">
              {formatDayLong(sessionDay(original.session, tz))}
            </Text>
          </Row>
          <Text variant="subhead">{`You clocked in at ${formatTime(original.session.start, zone)} but no check-out was recorded. We suggest an end time; adjust it if needed.`}</Text>
        </Card>
      ) : null}

      {plan.issues.map((issue) => (
        <IssueCard
          key={issue.message}
          issue={issue}
          onFix={(patch) => set(patch)}
          others={
            issue.conflict ? (
              <View style={{ gap: 2, marginTop: space.xs }}>
                <Text variant="footnote" color="text/secondary">{`Other session  ${formatTime(issue.conflict.other.start, zone)} – ${issue.conflict.other.end ? formatTime(issue.conflict.other.end, zone) : 'running'}`}</Text>
                <Text variant="footnote" color="text/secondary">{`This session  ${formatTime(draft.start, zone)} – ${draft.end ? formatTime(draft.end, zone) : 'running'}`}</Text>
              </View>
            ) : null
          }
        />
      ))}

      {workplaces.length > 0 ? (
        <Chips
          options={['', ...workplaces.map((w) => w.id)]}
          value={draft.workplaceId ?? ''}
          format={(id) => workplaces.find((w) => w.id === id)?.name ?? 'No workplace'}
          onChange={(id) => set({ workplaceId: id || undefined })}
        />
      ) : null}

      <Group>
        {isNew ? (
          <ListRow
            title="Date"
            icon="calendar"
            accessory={<DateField label="Date" value={dateKeyOf(draft.start, zone)} maximum={toDateKey(now, tz)} onChange={moveDate} />}
          />
        ) : null}
        <ListRow
          title="Starts"
          subtitle={isNew ? undefined : formatDayLong(dateKeyOf(draft.start, zone))}
          icon="signIn"
          accessory={<TimeField label="Start time" value={draft.start} tz={zone} changed={changed.start} onChange={(start) => set({ start })} />}
        />
        <ListRow
          title="Ends"
          // A session without a check-out only "ends" at the next clock-in: there is no earlier end to show.
          subtitle={changed.end && stored?.end && !original?.incomplete ? `was ${formatTime(stored.end, zone)}` : undefined}
          icon="signOut"
          last
          accessory={
            draft.end === undefined ? (
              <ChipButton label="Still running" onPress={() => set({ end: Math.floor(now / MIN) * MIN })} />
            ) : (
              <TimeField label="End time" value={draft.end} tz={zone} changed={changed.end} onChange={(end) => set({ end })} />
            )
          }
        />
      </Group>

      {note ? (
        <Text variant="footnote" color="text/secondary">
          {`Times are in ${note}, where this session was recorded.`}
        </Text>
      ) : null}

      <SectionHeader>Breaks</SectionHeader>
      <Group>
        {draft.breaks.map((b, i) => (
          <ListRow
            key={b.origin ?? `new-${i}`}
            title={`Break ${i + 1}`}
            subtitle={`${Math.max(0, Math.round(((b.end ?? stop) - b.start) / MIN))} min`}
            icon="break"
            tint="break"
            accessory={
              <Row gap={space.xs}>
                <TimeField label={`Break ${i + 1} start`} value={b.start} tz={zone} onChange={(start) => setBreak(i, { start })} />
                {b.end === undefined ? (
                  <ChipButton label="Ongoing" onPress={() => setBreak(i, { end: Math.floor(now / MIN) * MIN })} />
                ) : (
                  <TimeField label={`Break ${i + 1} end`} value={b.end} tz={zone} onChange={(end) => setBreak(i, { end })} />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove break ${i + 1}`}
                  hitSlop={8}
                  onPress={() => set({ breaks: draft.breaks.filter((_, j) => j !== i) })}>
                  <Icon name="trash" size={18} color="danger" />
                </Pressable>
              </Row>
            }
          />
        ))}
        <ListRow
          title="Add break"
          icon="plus"
          last
          onPress={() => set({ breaks: [...draft.breaks, defaultBreak(draft.start, stop)] })}
          accessory={<View />}
        />
      </Group>

      {plan.issues.length === 0 ? <ImpactCard impact={plan.impact} title={isNew ? 'What this adds' : 'What changes'} /> : null}

      {!isNew ? (
        <>
          <Text variant="footnote" color="text/secondary" style={{ textAlign: 'center' }}>
            The original times are kept in the day&apos;s history.
          </Text>
          <Button label="Delete session" icon="trash" style="destructive" onPress={remove} />
        </>
      ) : null}
    </Screen>
  );
}
