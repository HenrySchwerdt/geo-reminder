import { useLocalSearchParams } from 'expo-router';

import { SessionEditor } from '@/features/history/components/session-editor';
import { parseDateKey } from '@/features/history/dates';

/** `/session/<id>` edits a session; `/session/new?date=YYYY-MM-DD` adds a missed one. Presented as a modal. */
export default function SessionRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const isNew = id === 'new';
  return <SessionEditor key={isNew ? `new-${date}` : id} sessionId={isNew ? undefined : id} initialDay={parseDateKey(date)} />;
}
