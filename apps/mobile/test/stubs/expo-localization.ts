// Node stand-in for the native module: the zone comes from the test runner's Intl.
export const getCalendars = () => [{ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }];
