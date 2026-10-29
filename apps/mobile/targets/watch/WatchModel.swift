import Foundation
import WatchConnectivity
import WatchKit
import WidgetKit

/// The watch's connection to the iPhone.
///
/// * State arrives as an application context (`["snapshot": <JSON>]`; the latest one wins). It is kept in the App
///   Group so complications can read it, and complication timelines are reloaded.
/// * Every tap becomes a `SurfaceCommand` that is sent with `transferUserInfo` (queued by the system, delivered in
///   order, survives an unreachable iPhone) and, when the iPhone is reachable, also with `sendMessage` for an
///   instant response. The iPhone ignores a command id it has already applied.
/// * The watch never edits history: the shown state after a tap is a preview until the iPhone confirms it.
final class WatchModel: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchModel()

  /// Latest state, nil until the iPhone has sent one.
  @Published private(set) var snapshot: SurfaceSnapshot? = SnapshotStore.load()
  /// Commands that have not reached the iPhone yet.
  @Published private(set) var pendingCount = 0
  @Published private(set) var isReachable = false
  /// The last tap on this watch, to word the confirmation ("Clocked out 17:29").
  @Published private(set) var lastCommand: SurfaceCommand?

  private var heldTasks: [WKWatchConnectivityRefreshBackgroundTask] = []

  private var session: WCSession? {
    WCSession.isSupported() ? WCSession.default : nil
  }

  // MARK: Session

  func activate() {
    guard let session = session else { return }
    session.delegate = self
    session.activate()
  }

  /// Takes the newest context the iPhone has sent, also one that arrived while the app was not running.
  private func adoptReceivedContext() {
    guard let session = session, let json = session.receivedApplicationContext["snapshot"] as? String else { return }
    adopt(json: json)
  }

  private func adopt(json: String) {
    guard let incoming = SurfaceSnapshot.decode(json: json) else { return }
    DispatchQueue.main.async {
      // While a tap of this watch is still on its way, an older state does not replace the preview of it.
      if self.pendingCount > 0, let current = self.snapshot, incoming.updatedAt < current.updatedAt { return }
      self.snapshot = incoming
      SnapshotStore.save(incoming)
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  private func refreshStatus() {
    guard let session = session else { return }
    let pending = session.outstandingUserInfoTransfers.filter { $0.isTransferring }.count
    let reachable = session.isReachable
    DispatchQueue.main.async {
      self.pendingCount = pending
      self.isReachable = reachable
      self.completeHeldTasksIfPossible()
    }
  }

  // MARK: Commands

  func send(_ action: SurfaceAction) {
    let command = SurfaceCommand.make(action)
    guard let json = command.json() else { return }

    lastCommand = command
    let base = snapshot ?? SurfaceSnapshot.empty()
    let preview = base.applying(action, at: Date())
    snapshot = preview
    SnapshotStore.save(preview)
    WidgetCenter.shared.reloadAllTimelines()

    guard let session = session else { return }
    session.transferUserInfo(["command": json])
    if session.isReachable {
      session.sendMessage(["command": json], replyHandler: nil, errorHandler: nil)
    }
    refreshStatus()
  }

  // MARK: Background refresh

  /// The system wakes the app in the background to deliver WatchConnectivity content. The task may only be
  /// completed once the session has delivered everything.
  func hold(_ task: WKWatchConnectivityRefreshBackgroundTask) {
    DispatchQueue.main.async {
      self.heldTasks.append(task)
      self.completeHeldTasksIfPossible()
    }
  }

  private func completeHeldTasksIfPossible() {
    guard let session = session, session.activationState == .activated, !session.hasContentPending else { return }
    heldTasks.forEach { $0.setTaskCompletedWithSnapshot(false) }
    heldTasks.removeAll()
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    adoptReceivedContext()
    refreshStatus()
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    if let json = applicationContext["snapshot"] as? String { adopt(json: json) }
    refreshStatus()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    refreshStatus()
  }

  func session(_ session: WCSession, didFinish userInfoTransfer: WCSessionUserInfoTransfer, error: Error?) {
    refreshStatus()
  }
}
