import { getCalendars } from 'expo-localization';

/**
 * The zone the phone is in right now. Read from the OS on every call (not cached by the JS engine), so a
 * change of zone while the app runs is picked up on the next render or background wake-up.
 */
export function deviceTimeZone(): string {
  try {
    const tz = getCalendars()[0]?.timeZone;
    if (tz) return tz;
  } catch {
    // fall through to Intl
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
