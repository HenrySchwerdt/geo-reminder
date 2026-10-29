import { formatBalance, formatDuration } from '@worktime/core';

import { WeekBars } from '@/components/charts';
import { Card, Row, Screen, Stat, Text } from '@/components/ui';
import { dailyTargetMs, daySummary, getSettings, trackingSince, useStoreVersion, weekStart } from '@/data/store';
import { useNow } from '@/hooks/use-now';

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Insights() {
  useStoreVersion();
  const now = useNow(60_000);
  const settings = getSettings();
  const target = dailyTargetMs(settings);
  const start = weekStart(now);
  const days = LABELS.map((label, i) => {
    const d = daySummary(start, now, i);
    return { label, hours: d.workedMs / 3_600_000, today: d.start <= now && now < d.start + 86_400_000, first: d.firstIn, last: d.lastOut };
  });
  const worked = days.reduce((t, d) => t + d.hours * 3_600_000, 0);
  const starts = days.map((d) => d.first).filter(Boolean) as number[];
  const avg = (xs: number[]) => {
    if (!xs.length) return '–';
    const mins = xs.map((x) => new Date(x).getHours() * 60 + new Date(x).getMinutes());
    const m = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  const ends = days.map((d) => d.last).filter(Boolean) as number[];
  const since = trackingSince() ?? now;
  const pastWorkdays = days.filter((d, i) => settings.workdays.includes(i + 1) && !d.today && start + i * 86_400_000 >= since && start + i * 86_400_000 < now).length;

  return (
    <Screen title="Insights" subtitle="This week">
      <Card style={{ gap: 16 }}>
        <Row gap={8} style={{ alignItems: 'baseline' }}>
          <Text variant="numericLarge" style={{ fontSize: 40, lineHeight: 44 }}>
            {formatDuration(worked, true)}
          </Text>
          <Text variant="callout" color="text/secondary">
            of {settings.weeklyHours}h
          </Text>
        </Row>
        <WeekBars days={days} targetHours={target / 3_600_000} height={140} />
      </Card>
      <Row>
        <Card style={{ flex: 1, padding: 16, gap: 4 }}>
          <Stat label="Avg. start" value={avg(starts)} />
        </Card>
        <Card style={{ flex: 1, padding: 16, gap: 4 }}>
          <Stat label="Avg. end" value={avg(ends)} />
        </Card>
      </Row>
      <Card style={{ padding: 16 }}>
        <Stat label="Balance this week" value={formatBalance(days.filter((d) => !d.today).reduce((t, d) => t + d.hours * 3_600_000, 0) - pastWorkdays * target)} color="accent" />
      </Card>
    </Screen>
  );
}
