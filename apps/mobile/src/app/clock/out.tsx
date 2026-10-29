import { useLocalSearchParams } from 'expo-router';

import { ClockOutSheet } from '@/features/clock/clock-out-sheet';

/** `/clock/out?suggestedAt=<ms>&workplaceId=<id>` — a sheet; the params come from a departure reminder. */
export default function ClockOutRoute() {
  const { suggestedAt, workplaceId } = useLocalSearchParams<{ suggestedAt?: string; workplaceId?: string }>();
  return <ClockOutSheet key={`${suggestedAt}-${workplaceId}`} suggestedAt={suggestedAt} workplaceId={workplaceId} />;
}
