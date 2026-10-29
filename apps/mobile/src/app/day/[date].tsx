import { useLocalSearchParams } from 'expo-router';

import { parseDateKey } from '@/features/history/dates';
import { DayDetails } from '@/features/history/components/day-details';
import { Card, Screen, Text } from '@/shared/ui/components';

export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const day = parseDateKey(date);
  if (day === undefined) {
    return (
      <Screen>
        <Card>
          <Text variant="headline">Unknown date</Text>
          <Text variant="subhead" color="text/secondary">{`"${date}" is not a valid day (expected YYYY-MM-DD).`}</Text>
        </Card>
      </Screen>
    );
  }
  return <DayDetails day={day} />;
}
