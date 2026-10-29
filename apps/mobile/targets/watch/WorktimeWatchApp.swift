import SwiftUI
import WatchKit

@main
struct WorktimeWatchApp: App {
  @WKApplicationDelegateAdaptor(ExtensionDelegate.self) private var delegate
  @StateObject private var model = WatchModel.shared

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(model)
    }
  }
}

final class ExtensionDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    // Activate early: pending application contexts and user info are delivered once the session is active.
    WatchModel.shared.activate()
  }

  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
      if let connectivityTask = task as? WKWatchConnectivityRefreshBackgroundTask {
        WatchModel.shared.hold(connectivityTask)
      } else {
        task.setTaskCompletedWithSnapshot(false)
      }
    }
  }
}
