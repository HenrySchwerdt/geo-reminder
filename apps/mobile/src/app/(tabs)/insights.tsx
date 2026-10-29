import { formatBalance, formatDuration } from '@worktime/core';

import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { weekSummary } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useNow } from '@/shared/hooks/use-now';
import { WeekBars } from '@/shared/ui/charts';
import { Card, Row, Screen, Stat, Text } from '@/shared/ui/components';

const avgTime = (xs: number[]) => {
  if (!xs.length) return '–';
  const mins = xs.map((x) => new Date(x).getHours() * 60 + new Date(x).getMinutes());
  const m = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export default function Insights() {
  const now = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const target = dailyTargetMs({ weeklyHours, workdays });
  const week = weekSummary(ledger, now, workdays, target);

  return (
    <Screen title="Insights" subtitle="This week">
      <Card style={{ gap: 16 }}>
        <Row gap={8} style={{ alignItems: 'baseline' }}>
          <Text variant="numericLarge" style={{ fontSize: 40, lineHeight: 44 }}>
            {formatDuration(week.worked, true)}
          </Text>
          <Text variant="callout" color="text/secondary">
            of {weeklyHours}h
          </Text>
        </Row>
        <WeekBars days={week.days} targetHours={target / 3_600_000} height={140} />
      </Card>
      <Row>
        <Card style={{ flex: 1, padding: 16 }}>
          <Stat label="Avg. start" value={avgTime(week.days.flatMap((d) => (d.firstIn ? [d.firstIn] : [])))} />
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <Stat label="Avg. end" value={avgTime(week.days.flatMap((d) => (d.lastOut ? [d.lastOut] : [])))} />
        </Card>
      </Row>
      <Card style={{ padding: 16 }}>
        <Stat label="Balance this week" value={formatBalance(week.balance)} color={week.balance >= 0 ? 'accent' : 'danger'} />
      </Card>
    </Screen>
  );
}
