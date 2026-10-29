/** Web preview: reminders are logged instead of shown. */
export type ReminderKind = 'arrival' | 'departure';
export async function showReminder(kind: ReminderKind, _workplaceId: string, place: string) {
  console.info(`[reminder] ${kind} · ${place}`);
}
export async function cancelReminder() {}
export async function handleResponse() {
  return false;
}
export async function requestNotificationPermission() {
  return false;
}
