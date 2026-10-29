import { formatDuration } from '@worktime/core';
import { View } from 'react-native';

import { DayRibbon } from '@/components/charts';
import { Card, Row, Screen, StatusPill, Text } from '@/components/ui';
import { daySummary, useStoreVersion } from '@/data/store';
import { useNow } from '@/hooks/use-now';

export default function Calendar() {
  useStoreVersion();
  const now = useNow(60_000);
  const days = Array.from({ length: 14 }, (_, i) => daySummary(now, now, -i)).filter((d, i) => i === 0 || d.segments.length > 0);

  return (
    <Screen title="Calendar" subtitle="Last two weeks">
      {days.length === 0 ? (
        <Text variant="subhead" color="text/secondary">
          Your days appear here after your first clock-in.
        </Text>
      ) : null}
      {days.map((d) => {
        const incomplete = d.state !== 'off' && d.start < daySummary(now, now).start;
        return (
          <Card key={d.start} style={{ gap: 10, padding: 16 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="headline">{new Date(d.start).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              <Text variant="numericSmall">{formatDuration(d.workedMs, true)}</Text>
            </Row>
            <DayRibbon dayStart={d.start} segments={d.segments} labels={false} height={8} />
            {incomplete ? (
              <View>
                <StatusPill state="alert" label="Missing check-out" />
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
