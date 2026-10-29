import { Platform } from 'react-native';

/**
 * Prominent disclosure for background location. It is shown in the app, before any location permission prompt,
 * and names: the data (location), the feature, and background use ("even when the app is closed or not in use").
 * Keep the Play Console app description and the privacy policy consistent with this text.
 */
export const LOCATION_DISCLOSURE = {
  title: 'Reminders where you work',
  body: 'Worktime collects location data to detect when you arrive at or leave the workplaces you save, so it can remind you to clock in and out. This works even when the app is closed or not in use.',
  points: [
    'Used only for arrival and departure reminders. Your route is not recorded.',
    'Stays on this phone. Not shared, not uploaded, no ads.',
    'Optional: tap “Not now” and clock in manually or with time-based reminders.',
  ],
} as const;

/** What the OS calls the background option. */
export const ALWAYS_LABEL = Platform.OS === 'android' ? 'Allow all the time' : 'Always';

export const LOCATION_PROMPT_NOTE =
  Platform.OS === 'android'
    ? 'Next, Android asks for location while you use the app. When you save your first workplace, we ask for “Allow all the time” so reminders can work with the app closed.'
    : 'Next, choose “Allow While Using App”. When you save your first workplace, we ask for “Always” so reminders can work with the app closed.';

export const BACKGROUND_PROMPT_NOTE = Platform.OS === 'android'
  ? 'Android opens Settings for background access. Choose “Allow all the time” to receive reminders with the app closed.'
  : 'Choose “Always” when iOS offers the background upgrade. You can also enable it later in Settings.';

export const SETTINGS_STEPS = Platform.OS === 'android'
  ? ['Open Settings › Location › App permissions › Worktime', `Choose “${ALWAYS_LABEL}”`, 'Turn on Use precise location']
  : ['Open Settings › Worktime › Location', `Choose “${ALWAYS_LABEL}”`, 'Turn on Precise Location'];
