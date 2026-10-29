/** Clock-in sheet (design 4): pick when the work started — the arrival time, now, or any other time. */
import { useState } from 'react';
import { View } from 'react-native';

import { formatTime } from '@/features/history/dates';
import { clockIn } from '@/features/tracking/actions';
import { currentState } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { Button, Card, Chips, Text } from '@/shared/ui/components';
import { answer, closeSheet } from './answer';
import { OtherTime, SheetBody, SheetHeader, TimeTiles, useTimeChoice, type Tile } from './components';
import { checkTime, clockInBound, issueText, parseTimeParam } from './model';

/** `suggestedParam` is the detected arrival time (epoch ms) as it comes in a route parameter. */
export function ClockInSheet({ suggestedAt: suggestedParam, workplaceId }: { suggestedAt?: string; workplaceId?: string }) {
  const now = useNow(10_000);
  const suggestedAt = parseTimeParam(suggestedParam, now);
  const ledger = useTracking((s) => s.ledger);
  const workplaces = useWorkplaces((s) => s.workplaces);
  const tz = deviceTimeZone();
  const [place, setPlace] = useState(workplaces.some((w) => w.id === workplaceId) ? (workplaceId ?? '') : '');
  const time = useTimeChoice(suggestedAt);

  const at = time.at(now);
  const issue = checkTime(at, now, clockInBound(ledger, now));
  const name = workplaces.find((w) => w.id === place)?.name;
  const alreadyIn = currentState(ledger, now).state !== 'off';

  const tiles: Tile[] = [
    ...(suggestedAt !== undefined ? [{ id: 'suggested' as const, time: formatTime(suggestedAt, tz), label: 'Arrived' }] : []),
    { id: 'now', time: formatTime(now, tz), label: 'Now' },
    { id: 'other', time: time.choice === 'other' && time.custom !== undefined ? formatTime(time.custom, tz) : '…', label: 'Other' },
  ];

  const confirm = () => {
    // "Now" is the moment of confirming, not of the last refresh.
    clockIn(time.choice === 'now' ? undefined : at, time.choice === 'suggested' ? 'notification' : 'app', place || undefined);
    closeSheet();
  };
  // Opened from an arrival reminder: the other answer is "not working today".
  const fromReminder = suggestedAt !== undefined && workplaceId !== undefined && !alreadyIn;
  const notToday = () => {
    if (workplaceId) void answer('arrival', workplaceId);
    closeSheet();
  };

  return (
    <SheetBody>
      <SheetHeader
        icon="building"
        title={name ? `Clock in at ${name}?` : 'Clock in?'}
        subtitle={suggestedAt !== undefined ? `You arrived at ${formatTime(suggestedAt, tz)}. Pick the time your work started.` : 'Pick the time your work started.'}
      />
      {alreadyIn ? (
        <Card tone="break">
          <Text variant="subhead">You are already clocked in.</Text>
        </Card>
      ) : (
        <>
          <TimeTiles tiles={tiles} value={time.choice} onChange={(v) => time.select(v, now)} tone="accent" />
          {time.choice === 'other' ? <OtherTime value={time.custom ?? now} onChange={time.setCustom} tz={tz} label="Started at" /> : null}
          {issue ? (
            <Text variant="footnote" color="danger">
              {issueText(issue, tz)}
            </Text>
          ) : null}
          {workplaces.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text variant="footnote" color="text/secondary">
                Workplace
              </Text>
              <Chips options={['', ...workplaces.map((w) => w.id)]} value={place} onChange={setPlace} format={(id) => (id ? (workplaces.find((w) => w.id === id)?.name ?? id) : 'None')} />
            </View>
          ) : null}
          <Button label={`Clock in at ${formatTime(at, tz)}`} icon="play" disabled={issue !== undefined} onPress={confirm} />
        </>
      )}
      <Button label={fromReminder ? 'Not working today' : alreadyIn ? 'Close' : 'Cancel'} style="secondary" onPress={fromReminder ? notToday : closeSheet} />
    </SheetBody>
  );
}
