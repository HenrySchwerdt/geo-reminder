import { useLocalSearchParams } from 'expo-router';

import { ClockInSheet } from '@/features/clock/clock-in-sheet';

/** `/clock/in?suggestedAt=<ms>&workplaceId=<id>` — a sheet; the params come from an arrival reminder. */
export default function ClockInRoute() {
  const { suggestedAt, workplaceId } = useLocalSearchParams<{ suggestedAt?: string; workplaceId?: string }>();
  return <ClockInSheet key={`${suggestedAt}-${workplaceId}`} suggestedAt={suggestedAt} workplaceId={workplaceId} />;
}
