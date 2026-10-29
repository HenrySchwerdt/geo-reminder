/** One icon vocabulary for both platforms: SF Symbols on iOS, Material Symbols on Android. */
export const ICONS = {
  today: { ios: 'house.fill', android: 'home', web: 'home' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  insights: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  stop: { ios: 'stop.fill', android: 'stop', web: 'stop' },
  break: { ios: 'cup.and.saucer.fill', android: 'coffee', web: 'coffee' },
  building: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  home: { ios: 'house.lodge.fill', android: 'cottage', web: 'cottage' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  location: { ios: 'location.fill', android: 'near_me', web: 'near_me' },
  bell: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  target: { ios: 'scope', android: 'my_location', web: 'my_location' },
  moon: { ios: 'moon.fill', android: 'bedtime', web: 'bedtime' },
  signIn: { ios: 'arrow.right.to.line', android: 'login', web: 'login' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  pulse: { ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' },
} as const;

export type IconName = keyof typeof ICONS;
