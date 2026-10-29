/**
 * Worktime complications and Smart Stack widget (WidgetKit, watchOS 10+). Reads the last snapshot the watch
 * app saved in the App Group; embedded in the watch app.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'watch-widget',
  name: 'WorktimeWatchWidget',
  displayName: 'Worktime',
  // com.worktime.app.watchkitapp.widget (an extension id must start with its watch app's id).
  bundleIdentifier: '.watchkitapp.widget',
  deploymentTarget: '10.0',
  colors: {
    $accent: '#5CC99B',
    $widgetBackground: '#0B0C0B',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.worktime.app'],
  },
};
