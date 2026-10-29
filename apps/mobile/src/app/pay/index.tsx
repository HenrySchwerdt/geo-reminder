import { dateKeyOf, formatDuration, salaryEstimate } from '@worktime/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { money } from '@/features/pay/model';
import { useSettings } from '@/features/settings/store';
import { useTracking } from '@/features/tracking/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { Button, Card, Chips, Screen, SectionHeader, Text } from '@/shared/ui/components';

export default function Pay() {
  const settings = useSettings();
  const { fontScale } = useWindowDimensions();
  const ledger = useTracking((s) => s.ledger);
  const [range, setRange] = useState<'Month' | 'Year'>('Month');
  const now = useNow(60_000);
  const tz = deviceTimeZone();
  const today = dateKeyOf(now, tz);
  const period = today.slice(0, range === 'Month' ? 7 : 4);
  const estimate = salaryEstimate(settings, ledger, period, now, tz);
  const salary = settings.salary;
  const periodLabel = new Intl.DateTimeFormat(undefined, { month: range === 'Month' ? 'long' : undefined, year: 'numeric', timeZone: tz }).format(now);
  return (
    <Screen>
      {fontScale < 1.5 ? <Text variant="title1">What your time is worth</Text> : null}
      <Text color="text/secondary">A gross estimate from your contract and completed work.</Text>
      {!salary ? <>
        <Card tone="accent"><Text variant="title2">Start with your contract</Text><Text>Enter your annual salary, weekly hours and paid vacation to see your effective hourly rate.</Text></Card>
        <Button label="Set up salary" onPress={() => router.push('/pay/contract')} />
      </> : <>
        <Chips options={['Month', 'Year'] as const} value={range} onChange={setRange} />
        {estimate ? <>
          <Card tone="accent" style={{ gap: 10 }}>
            <Text variant="footnoteStrong" color="accent">{periodLabel} · tracked gross value</Text>
            <Text variant="largeTitle" numberOfLines={1} adjustsFontSizeToFit>{money(estimate.grossCents, salary.currency)}</Text>
            <Text>{formatDuration(estimate.workedMs)} completed work</Text>
            <Text variant="footnote" color="text/secondary">{money(estimate.hourlyCents, salary.currency)} per working hour, after paid vacation.</Text>
          </Card>
          <Text variant="footnote" color="text/secondary">Running sessions and missing check-outs are excluded. This is the value of tracked work; your fixed salary payment does not change with this total.</Text>
          <SectionHeader>{`Calculation · ${estimate.year}`}</SectionHeader>
          <Card style={{ gap: 16 }}>
            <Text variant="headline">{money(salary.annualGrossCents, salary.currency)} annual gross</Text>
            <Text color="text/secondary">{settings.weeklyHours} h/week across {new Set(settings.workdays).size} working days</Text>
            <Text color="text/secondary">{estimate.scheduledDays} scheduled days − {salary.paidVacationDays} paid vacation days</Text>
            <Text variant="headline">{estimate.annualHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} working hours → {money(estimate.hourlyCents, salary.currency)} / h</Text>
          </Card>
          <Card><Text variant="footnote" color="text/secondary">Monthly contract reference</Text><Text variant="title2">{money(salary.annualGrossCents / 12, salary.currency)}</Text><Text variant="footnote" color="text/secondary">Annual gross divided by 12. Actual payment schedules can differ.</Text></Card>
        </> : <Card tone="danger"><Text>Set at least one working day and fewer vacation days than scheduled workdays to calculate your rate.</Text></Card>}
        <Button label="Edit contract" style="secondary" onPress={() => router.push('/pay/contract')} />
        <Text variant="footnote" color="text/secondary">Based on your current contract and weekly pattern for the whole year. Public holidays and bonuses are not included.</Text>
      </>}
    </Screen>
  );
}
