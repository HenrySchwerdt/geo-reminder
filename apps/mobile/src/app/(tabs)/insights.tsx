import { addMonths, formatBalance, formatDuration, type TimeEvent } from '@worktime/core';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { formatMonth, toDateKey } from '@/features/history/dates';
import type { Targets } from '@/features/history/balance';
import { HeatStrip, Stepper, YearBars } from '@/features/insights/components';
import { averageTime, monthInsights, yearInsights } from '@/features/insights/model';
import { dailyTargetMs, useSettings } from '@/features/settings/store';
import { weekSummary } from '@/features/tracking/selectors';
import { useTracking } from '@/features/tracking/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { WeekBars } from '@/shared/ui/charts';
import { Card, Row, Screen, Stat, Text } from '@/shared/ui/components';
import { Segmented } from '@/shared/ui/segmented';

const RANGES = ['Week', 'Month', 'Year'] as const;
type Range = (typeof RANGES)[number];

const balanceColor = (ms: number) => (ms >= 0 ? 'accent' : 'danger');

export default function Insights() {
  const now = useNow(60_000);
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const [range, setRange] = useState<Range>('Week');
  const tz = deviceTimeZone();
  const today = toDateKey(now, tz);
  // Anchors of the month and year views: any day inside them.
  const [month, setMonth] = useState(() => addMonths(today, 0));
  const [year, setYear] = useState(() => `${today.slice(0, 4)}-01-01`);

  const dailyMs = dailyTargetMs({ weeklyHours, workdays });
  const targets = useMemo<Targets>(() => ({ workdays, dailyMs }), [workdays, dailyMs]);

  return (
    <Screen title="Insights" subtitle={range === 'Week' ? 'This week' : undefined}>
      <Segmented options={[...RANGES]} value={range} onChange={setRange} />
      {range === 'Week' ? <WeekView now={now} /> : null}
      {range === 'Month' ? (
        <MonthView month={month} setMonth={setMonth} currentMonth={addMonths(today, 0)} now={now} targets={targets} tz={tz} ledger={ledger} />
      ) : null}
      {range === 'Year' ? <YearView year={year} setYear={setYear} currentYear={`${today.slice(0, 4)}-01-01`} now={now} targets={targets} tz={tz} ledger={ledger} /> : null}
    </Screen>
  );
}

function WeekView({ now }: { now: number }) {
  const ledger = useTracking((s) => s.ledger);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const target = dailyTargetMs({ weeklyHours, workdays });
  const tz = deviceTimeZone();
  const week = weekSummary(ledger, now, workdays, target, tz);
  const zoned = (pick: 'firstIn' | 'lastOut') => week.days.flatMap((d) => (d[pick] ? [{ at: d[pick], tz: d.tz ?? tz }] : []));

  return (
    <>
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
          <Stat label="Avg. start" value={averageTime(zoned('firstIn')) ?? '–'} />
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <Stat label="Avg. end" value={averageTime(zoned('lastOut')) ?? '–'} />
        </Card>
      </Row>
      <Card style={{ padding: 16 }}>
        <Stat label="Balance this week" value={formatBalance(week.balance)} color={balanceColor(week.balance)} />
      </Card>
    </>
  );
}

type PeriodProps = { now: number; targets: Targets; tz: string; ledger: TimeEvent[] };

function MonthView({ month, setMonth, currentMonth, now, targets, tz, ledger }: PeriodProps & { month: string; setMonth: (m: string) => void; currentMonth: string }) {
  const m = useMemo(() => monthInsights(ledger, month, now, targets, tz), [ledger, month, now, targets, tz]);
  const isCurrent = month >= currentMonth;
  return (
    <>
      <Stepper title={formatMonth(month)} unit="month" onPrev={() => setMonth(addMonths(month, -1))} onNext={() => setMonth(addMonths(month, 1))} nextDisabled={isCurrent} />
      <Card style={{ gap: 16 }}>
        <View>
          <Text variant="footnote" color="text/secondary">
            Worked
          </Text>
          <Row gap={8} style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Text variant="numericLarge" style={{ fontSize: 40, lineHeight: 44 }}>
              {formatDuration(m.workedMs, true)}
            </Text>
            <Text variant="callout" color="text/secondary">
              {`of ${formatDuration(m.targetMs, true)}${isCurrent ? ' so far' : ''}`}
            </Text>
          </Row>
        </View>
        <HeatStrip days={m.days} />
        <Text variant="footnote" color="text/tertiary">
          Each bar is a workday · darker = longer · red = no check-out
        </Text>
      </Card>
      <Row>
        <Card style={{ flex: 1, padding: 16 }}>
          <Stat label="Avg. start" value={m.avgStart ?? '–'} />
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <Stat label="Avg. end" value={m.avgEnd ?? '–'} />
        </Card>
      </Row>
      <Card style={{ padding: 16 }}>
        <Stat label="Balance this month" value={formatBalance(m.balanceMs)} color={balanceColor(m.balanceMs)} />
      </Card>
    </>
  );
}

function YearView({ year, setYear, currentYear, now, targets, tz, ledger }: PeriodProps & { year: string; setYear: (y: string) => void; currentYear: string }) {
  const y = useMemo(() => yearInsights(ledger, year, now, targets, tz), [ledger, year, now, targets, tz]);
  const isCurrent = year >= currentYear;
  const shift = (years: number) => setYear(addMonths(year, 12 * years));
  return (
    <>
      <Stepper title={year.slice(0, 4)} unit="year" onPrev={() => shift(-1)} onNext={() => shift(1)} nextDisabled={isCurrent} />
      <Card style={{ gap: 16 }}>
        <View>
          <Text variant="footnote" color="text/secondary">
            Worked
          </Text>
          <Row gap={8} style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Text variant="numericLarge" style={{ fontSize: 40, lineHeight: 44 }}>
              {formatDuration(y.workedMs, true)}
            </Text>
            <Text variant="callout" color="text/secondary">
              {`of ${formatDuration(y.targetMs, true)}${isCurrent ? ' so far' : ''}`}
            </Text>
          </Row>
        </View>
        <YearBars months={y.months} />
        <Text variant="footnote" color="text/tertiary">
          Bars show worked time · the line marks the monthly target
        </Text>
      </Card>
      <Card style={{ padding: 16 }}>
        <Stat label="Balance this year" value={formatBalance(y.balanceMs)} color={balanceColor(y.balanceMs)} />
      </Card>
    </>
  );
}
