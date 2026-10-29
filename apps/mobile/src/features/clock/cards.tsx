/** Cards on Today for things the app noticed but the user never confirmed (design 29). */
import { dateKeyOf, dayRange, requiredBreak, sessionDay, sessionZone, type BreakRule, type Session } from '@worktime/core';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatDayLong, formatTime } from '@/features/history/dates';
import { clockIn, clockOut } from '@/features/tracking/actions';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { DayRibbon } from '@/shared/ui/charts';
import { Button, Card, Icon, Row, Text } from '@/shared/ui/components';
import { answer } from './answer';
import { useDismissed } from './dismissed';
import type { MissedPrompt } from './missed';

/** "Did you start work at 08:44?" / "Did you leave at 17:29?" with one-tap answers. */
export function MissedCard({ prompt, place, now, targetMs, rules }: { prompt: MissedPrompt; place: string; now: number; targetMs: number; rules: BreakRule[] }) {
  const tz = deviceTimeZone();
  const dismiss = useDismissed((s) => s.dismiss);
  const time = formatTime(prompt.at, tz);
  const decline = () => {
    dismiss(prompt.key);
    void answer(prompt.kind, prompt.workplaceId);
  };

  if (prompt.kind === 'arrival') {
    const plannedEnd = targetMs > 0 ? prompt.at + targetMs + requiredBreak(targetMs, rules) : undefined;
    return (
      <Card style={{ gap: 14 }}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Icon name="bell" size={22} color="break" />
          <Text variant="headline" style={{ flex: 1 }}>{`Did you start work at ${time}?`}</Text>
        </Row>
        <Text variant="subhead" color="text/secondary">
          {`You arrived at ${place} but didn't clock in. The notification may have been missed or delayed.`}
        </Text>
        <DayRibbon dayStart={dayRange(dateKeyOf(prompt.at, tz), tz).start} segments={[{ from: prompt.at, to: now, kind: 'work' }]} now={now} plannedEnd={plannedEnd} />
        <Row gap={10}>
          <Button label={`From ${time}`} flex onPress={() => clockIn(prompt.at, 'geofence', prompt.workplaceId)} />
          <Button label="From now" style="secondary" flex onPress={() => clockIn(Date.now(), 'app', prompt.workplaceId)} />
        </Row>
        <Link label="Not working today" onPress={decline} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 14 }}>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Icon name="bell" size={22} color="break" />
        <Text variant="headline" style={{ flex: 1 }}>{`Did you leave at ${time}?`}</Text>
      </Row>
      <Text variant="subhead" color="text/secondary">{`You left ${place} but are still clocked in. The notification may have been missed or delayed.`}</Text>
      <Button label={`Clock out at ${time}`} icon="stop" style="ink" onPress={() => clockOut(prompt.at, 'geofence')} />
      <Link label="Still working" color="accent" onPress={decline} />
    </Card>
  );
}

function Link({ label, onPress, color = 'danger' }: { label: string; onPress: () => void; color?: 'danger' | 'accent' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 4 }}>
      <Text variant="headline" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A past day whose session never got a check-out: links to the day, where it can be fixed. */
export function IncompleteCard({ session, place }: { session: Session; place?: string }) {
  const tz = deviceTimeZone();
  const day = sessionDay(session, tz);
  return (
    <Card tone="danger" style={{ gap: 4, padding: 16 }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <Icon name="warning" size={22} color="danger" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="headline" color="danger">{`${formatDayLong(day)} has no check-out`}</Text>
          <Text variant="subhead">{`Clocked in ${formatTime(session.start, sessionZone(session, tz))}${place ? ` at ${place}` : ''}. It stays out of your balance until fixed.`}</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/day/[date]', params: { date: day } })} hitSlop={8}>
            <Text variant="headline" color="danger">
              Fix entry
            </Text>
          </Pressable>
        </View>
      </Row>
    </Card>
  );
}
