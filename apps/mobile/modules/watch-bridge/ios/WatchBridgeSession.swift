import Foundation
import WatchConnectivity

/// Owns the iPhone side of the `WCSession`.
///
/// * Commands from the watch (`transferUserInfo` / `sendMessage`) are appended to a queue in `UserDefaults` the
///   moment they arrive, even when the JS runtime is not running (the system launches the app in the background).
///   JS drains the queue with `drainCommands()` and is told about new entries through `onCommand`.
/// * Snapshots are pushed with `updateApplicationContext` (latest state wins).
final class WatchBridgeSession: NSObject, WCSessionDelegate {
  static let shared = WatchBridgeSession()

  private static let queueKey = "worktime.watch.commandQueue"
  private static let maxQueued = 500

  private let lock = NSLock()
  private var latestSnapshot: String?

  /// Set while JS listens for `onCommand`.
  var onCommand: (() -> Void)?

  private var session: WCSession? {
    WCSession.isSupported() ? WCSession.default : nil
  }

  // MARK: Activation

  func activate() {
    guard let session = session else { return }
    session.delegate = self
    session.activate()
  }

  var isPaired: Bool { session?.isPaired ?? false }
  var isWatchAppInstalled: Bool { session?.isWatchAppInstalled ?? false }

  // MARK: Snapshots (phone -> watch)

  func publish(snapshot json: String) {
    lock.lock()
    latestSnapshot = json
    lock.unlock()
    pushLatestSnapshot()
  }

  private func pushLatestSnapshot() {
    guard let session = session, session.activationState == .activated,
      session.isPaired, session.isWatchAppInstalled
    else { return }
    lock.lock()
    let json = latestSnapshot
    lock.unlock()
    guard let json = json else { return }
    do {
      try session.updateApplicationContext(["snapshot": json])
    } catch {
      NSLog("[WatchBridge] updateApplicationContext failed: \(error.localizedDescription)")
    }
  }

  // MARK: Commands (watch -> phone)

  private func enqueue(userInfo: [String: Any]) {
    guard let json = userInfo["command"] as? String else { return }
    lock.lock()
    let defaults = UserDefaults.standard
    var queue = defaults.stringArray(forKey: Self.queueKey) ?? []
    queue.append(json)
    if queue.count > Self.maxQueued { queue.removeFirst(queue.count - Self.maxQueued) }
    defaults.set(queue, forKey: Self.queueKey)
    lock.unlock()
    DispatchQueue.main.async { [weak self] in self?.onCommand?() }
  }

  /// Returns the queued command JSON strings in arrival order and empties the queue.
  func drainCommands() -> [String] {
    lock.lock()
    defer { lock.unlock() }
    let defaults = UserDefaults.standard
    let queue = defaults.stringArray(forKey: Self.queueKey) ?? []
    if !queue.isEmpty { defaults.removeObject(forKey: Self.queueKey) }
    return queue
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if activationState == .activated { pushLatestSnapshot() }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // The user switched watches: activate again for the new one.
    session.activate()
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    // A watch was paired or the watch app was installed: give it the current state.
    pushLatestSnapshot()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    enqueue(userInfo: userInfo)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    enqueue(userInfo: message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    enqueue(userInfo: message)
    replyHandler(["ok": true])
  }
}
