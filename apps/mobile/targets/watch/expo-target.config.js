/**
 * Worktime for Apple Watch (SwiftUI, watchOS 10+): today, primary action, clock-out confirmation, summary,
 * offline queue. Talks to the iPhone app over WatchConnectivity (see docs/technical/surfaces.md).
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'watch',
  // Product / target name: must differ from the iPhone target ("Worktime").
  name: 'WorktimeWatch',
  displayName: 'Worktime',
  // com.worktime.app.watchkitapp (a watch app id must start with the iPhone app's id).
  bundleIdentifier: '.watchkitapp',
  deploymentTarget: '10.0',
  icon: '../../assets/images/icon.png',
  colors: {
    $accent: '#5CC99B',
  },
  entitlements: {
    // Shared with the complication (and the iPhone app): the last snapshot.
    'com.apple.security.application-groups': ['group.com.worktime.app'],
  },
};
