import ExpoModulesCore

/// Activates the `WCSession` as early as possible, so commands that wake the app in the background are received
/// (and queued) before any JavaScript runs.
public class WatchBridgeAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    WatchBridgeSession.shared.activate()
    return true
  }
}
