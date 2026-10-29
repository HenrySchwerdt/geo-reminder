/** Clock-out sheet (design 5): the day as it would stand, then pick when work ended — the departure time, now, or another time. */
import { breakRulesOf, formatBalance, formatDuration } from '@worktime/core';
import { View } from 'react-native';

import { formatTime } from '@/features/history/dates';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { clockOut } from '@/features/tracking/actions';
import { currentState } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { useColors } from '@/shared/theme';
import { DayRibbon } from '@/shared/ui/charts';
import { Button, Card, Icon, Row, Stat, Text } from '@/shared/ui/components';
import { answer, closeSheet } from './answer';
import { OtherTime, SheetBody, SheetHeader, TimeTiles, useTimeChoice, type Tile } from './components';
import { checkTime, clockOutBound, clockOutPreview, issueText, parseTimeParam } from './model';

/** `suggestedParam` is the detected departure time (epoch ms) as it comes in a route parameter. */
export function ClockOutSheet({ suggestedAt: suggestedParam, workplaceId }: { suggestedAt?: string; workplaceId?: string }) {
  const c = useColors();
  const now = useNow(10_000);
  const suggestedAt = parseTimeParam(suggestedParam, now);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const breakRules = useSettings((s) => s.breakRules);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const tz = deviceTimeZone();
  const time = useTimeChoice(suggestedAt);

  const { state, session } = currentState(ledger, now);
  const at = time.at(now);
  const preview = clockOutPreview(ledger, at, now, { workdays, dailyMs: dailyTargetMs({ weeklyHours, workdays }) }, breakRulesOf(breakRules), tz);
  // Times of a session stay in the zone it started in.
  const zone = preview?.zone ?? tz;
  const issue = session ? checkTime(at, now, clockOutBound(session)) : undefined;
  const place = workplaces.find((w) => w.id === (workplaceId ?? session?.workplaceId))?.name;

  const tiles: Tile[] = [
    ...(suggestedAt !== undefined ? [{ id: 'suggested' as const, time: formatTime(suggestedAt, zone), label: 'Left' }] : []),
    { id: 'now', time: formatTime(now, zone), label: 'Now' },
    { id: 'other', time: time.choice === 'other' && time.custom !== undefined ? formatTime(time.custom, zone) : '…', label: 'Other' },
  ];

  const confirm = () => {
    clockOut(time.choice === 'now' ? undefined : at, time.choice === 'suggested' ? 'notification' : 'app');
    closeSheet();
  };
  const stillWorking = () => {
    if (workplaceId) void answer('departure', workplaceId);
    closeSheet();
  };

  if (state === 'off' || !preview) {
    return (
      <SheetBody>
        <SheetHeader title="Clock out" />
        <Card tone="break">
          <Text variant="subhead">You are not clocked in.</Text>
        </Card>
        <Button label="Close" style="secondary" onPress={closeSheet} />
      </SheetBody>
    );
  }

  return (
    <SheetBody>
      <SheetHeader
        title={`Clock out at ${formatTime(at, zone)}?`}
        subtitle={suggestedAt !== undefined ? `You left${place ? ` ${place}` : ''} at ${formatTime(suggestedAt, zone)}.` : place ? `Working · ${place}` : undefined}
      />

      <View style={{ backgroundColor: c['bg/sunken'], borderRadius: 20, borderCurve: 'continuous', padding: 16, gap: 12 }}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Stat label="Worked" value={formatDuration(preview.workedMs, true)} />
          <Stat label="Breaks" value={formatDuration(preview.breakMs, true)} />
          <Stat
            label={preview.targetMs === 0 ? 'Extra day' : preview.overtimeMs >= 0 ? 'Overtime' : 'Under target'}
            value={formatBalance(preview.overtimeMs)}
            color={preview.overtimeMs >= 0 ? 'accent' : 'danger'}
          />
        </Row>
        <DayRibbon dayStart={preview.dayStart} segments={preview.segments} />
      </View>

      {preview.breakShortMs > 0 ? (
        <Card tone="break" style={{ padding: 14 }}>
          <Row gap={10} style={{ alignItems: 'flex-start' }}>
            <Icon name="warning" size={20} color="break" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="subheadStrong" color="break">
                Required break not met
              </Text>
              <Text variant="footnote">
                {`${formatDuration(preview.requiredBreakMs, true)} of break is required for ${formatDuration(preview.workedMs, true)} of work; you took ${formatDuration(preview.breakMs, true)}. You can add it later in the day's details.`}
              </Text>
            </View>
          </Row>
        </Card>
      ) : null}

      <TimeTiles tiles={tiles} value={time.choice} onChange={(v) => time.select(v, now)} tone="ink" />
      {time.choice === 'other' ? <OtherTime value={time.custom ?? now} onChange={time.setCustom} tz={zone} label="Left at" /> : null}
      {issue ? (
        <Text variant="footnote" color="danger">
          {issueText(issue, zone)}
        </Text>
      ) : null}

      <Button label={`Clock out at ${formatTime(at, zone)}`} icon="stop" style="ink" disabled={issue !== undefined} onPress={confirm} />
      <Button label={workplaceId ? 'Still working' : 'Cancel'} style="secondary" onPress={stillWorking} />
    </SheetBody>
  );
}
