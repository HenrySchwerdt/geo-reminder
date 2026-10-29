import { formatDuration } from '@worktime/core';
import { View } from 'react-native';

import { daySummary } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useNow } from '@/shared/hooks/use-now';
import { DayRibbon } from '@/shared/ui/charts';
import { Card, Row, Screen, StatusPill, Text } from '@/shared/ui/components';

export default function Calendar() {
  const now = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const todayStart = daySummary(ledger, now, now).start;
  const days = Array.from({ length: 14 }, (_, i) => daySummary(ledger, now, now, -i)).filter((d, i) => i === 0 || d.segments.length > 0);

  return (
    <Screen title="Calendar" subtitle="Last two weeks">
      {days.map((d) => (
        <Card key={d.start} style={{ gap: 10, padding: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="headline">{new Date(d.start).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <Text variant="numericSmall">{formatDuration(d.workedMs, true)}</Text>
          </Row>
          <DayRibbon dayStart={d.start} segments={d.segments} labels={false} height={8} />
          {d.state !== 'off' && d.start < todayStart ? (
            <View>
              <StatusPill state="alert" label="Missing check-out" />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
