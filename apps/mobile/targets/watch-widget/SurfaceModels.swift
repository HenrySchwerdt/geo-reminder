// Shared by the `watch` and `watch-widget` targets. Both copies must stay identical
// (apps/mobile/test/watch-commands.test.ts checks it). Mirrors packages/core/src/surfaces.ts.
import Foundation

enum SurfaceState: String, Codable {
  case off
  case working
  case onBreak = "break"
}

/// The state the iPhone publishes after every change. Plain JSON, `version` 1. All times are epoch milliseconds.
struct SurfaceSnapshot: Codable, Equatable {
  static let supportedVersion = 1

  var version: Int
  var state: SurfaceState
  var day: String
  var workedMs: Double
  var breakMs: Double
  /// While working: a timer started at this instant shows the day's worked time.
  var workedAnchor: Double?
  /// Start of the current state (clock-in / break start).
  var since: Double?
  var sessionStart: Double?
  var targetMs: Double
  var expectedEnd: Double?
  var workplaceName: String?
  var weekWorkedMs: Double
  var weekTargetMs: Double
  var weekBalanceMs: Double
  var tz: String
  var updatedAt: Double

  /// Nil for malformed JSON and for versions this build does not know.
  static func decode(json: String) -> SurfaceSnapshot? {
    guard let data = json.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(SurfaceSnapshot.self, from: data),
      snapshot.version == supportedVersion
    else { return nil }
    return snapshot
  }

  /// What the watch shows before the iPhone has sent anything.
  static func empty(now: Date = Date()) -> SurfaceSnapshot {
    SurfaceSnapshot(
      version: supportedVersion, state: .off, day: "", workedMs: 0, breakMs: 0, workedAnchor: nil,
      since: nil, sessionStart: nil, targetMs: 0, expectedEnd: nil, workplaceName: nil,
      weekWorkedMs: 0, weekTargetMs: 0, weekBalanceMs: 0, tz: TimeZone.current.identifier,
      updatedAt: now.timeIntervalSince1970 * 1000)
  }
}

enum SurfaceAction: String, Codable {
  case clockIn
  case startBreak
  case endBreak
  case clockOut
}

/// A tap on the watch, sent to the iPhone which turns it into a ledger event.
struct SurfaceCommand: Codable, Equatable, Identifiable {
  var id: String
  var action: SurfaceAction
  /// Time of the tap, epoch milliseconds (kept when the command is delivered later).
  var at: Int64
  var source: String
  var tz: String?

  static func make(_ action: SurfaceAction, at date: Date = Date()) -> SurfaceCommand {
    SurfaceCommand(
      id: UUID().uuidString, action: action, at: Int64(date.timeIntervalSince1970 * 1000),
      source: "watch", tz: TimeZone.current.identifier)
  }

  func json() -> String? {
    guard let data = try? JSONEncoder().encode(self) else { return nil }
    return String(data: data, encoding: .utf8)
  }
}

// MARK: - Derived values (display only, no history)

extension SurfaceSnapshot {
  static func date(_ ms: Double) -> Date { Date(timeIntervalSince1970: ms / 1000) }

  var workedAnchorDate: Date? { workedAnchor.map(Self.date) }
  var sinceDate: Date? { since.map(Self.date) }
  var sessionStartDate: Date? { sessionStart.map(Self.date) }
  var expectedEndDate: Date? { expectedEnd.map(Self.date) }
  var updatedAtDate: Date { Self.date(updatedAt) }

  var timeZone: TimeZone { TimeZone(identifier: tz) ?? .current }

  /// The snapshot describes a day other than today (an old state shown after midnight).
  func isStale(at now: Date) -> Bool {
    state == .off && day != SurfaceFormat.dayKey(now, in: timeZone)
  }

  /// Worked time of the day at `now`: counts on while working.
  func workedMs(at now: Date) -> Double {
    if state == .working, let anchor = workedAnchor {
      return max(0, now.timeIntervalSince1970 * 1000 - anchor)
    }
    return isStale(at: now) ? 0 : workedMs
  }

  /// Share of today's target that is done, 0...1 (0 without a target).
  func progress(at now: Date) -> Double {
    guard targetMs > 0 else { return 0 }
    return min(1, max(0, workedMs(at: now) / targetMs))
  }

  func remainingMs(at now: Date) -> Double? {
    guard targetMs > 0 else { return nil }
    return max(0, targetMs - workedMs(at: now))
  }

  /// The state after a tap, shown at once while the iPhone has not confirmed it yet (the next snapshot
  /// from the iPhone replaces it).
  func applying(_ action: SurfaceAction, at date: Date) -> SurfaceSnapshot {
    var next = self
    let at = date.timeIntervalSince1970 * 1000
    next.updatedAt = at
    switch (state, action) {
    case (.off, .clockIn):
      let carried = isStale(at: date) ? 0 : workedMs
      next.state = .working
      next.workedMs = carried
      next.workedAnchor = at - carried
      next.since = at
      next.sessionStart = at
      next.expectedEnd = targetMs > 0 ? at + max(0, targetMs - carried) : nil
    case (.working, .startBreak):
      next.workedMs = max(0, at - (workedAnchor ?? at))
      next.workedAnchor = nil
      next.state = .onBreak
      next.since = at
      next.expectedEnd = nil
    case (.onBreak, .endBreak):
      next.breakMs = breakMs + max(0, at - (since ?? at))
      next.state = .working
      next.workedAnchor = at - workedMs
      next.since = at
      next.expectedEnd = targetMs > 0 ? at + max(0, targetMs - workedMs) : nil
    case (.working, .clockOut), (.onBreak, .clockOut):
      if state == .working {
        next.workedMs = max(0, at - (workedAnchor ?? at))
      } else {
        next.breakMs = breakMs + max(0, at - (since ?? at))
      }
      next.state = .off
      next.workedAnchor = nil
      next.since = nil
      next.sessionStart = nil
      next.expectedEnd = nil
    default:
      break  // Invalid transition: the iPhone ignores it too.
    }
    return next
  }
}

// MARK: - Formatting

enum SurfaceFormat {
  /// `5h 50m`, `42m`, `0m`.
  static func duration(_ ms: Double) -> String {
    let minutes = Int((max(0, ms) / 60_000).rounded())
    let h = minutes / 60
    let m = minutes % 60
    return h > 0 ? "\(h)h \(String(format: "%02d", m))m" : "\(m)m"
  }

  /// `+6h 20m` / `-1h 05m`.
  static func signedDuration(_ ms: Double) -> String {
    (ms < 0 ? "-" : "+") + duration(abs(ms))
  }

  /// `5:50` (hours:minutes) for compact displays.
  static func hoursMinutes(_ ms: Double) -> String {
    let minutes = Int((max(0, ms) / 60_000).rounded(.down))
    return "\(minutes / 60):" + String(format: "%02d", minutes % 60)
  }

  /// Clock time in the snapshot's zone, in the user's 12/24-hour style.
  static func clock(_ date: Date, in zone: TimeZone) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.timeZone = zone
    formatter.dateStyle = .none
    formatter.timeStyle = .short
    return formatter.string(from: date)
  }

  /// `yyyy-MM-dd`, the form of `SurfaceSnapshot.day`.
  static func dayKey(_ date: Date, in zone: TimeZone) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = zone
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }
}

// MARK: - App Group storage (watch app writes, complications read)

enum SnapshotStore {
  static let groupId = "group.com.worktime.app"
  private static let key = "worktime.snapshot"

  private static var defaults: UserDefaults {
    UserDefaults(suiteName: groupId) ?? .standard
  }

  static func save(_ snapshot: SurfaceSnapshot) {
    guard let data = try? JSONEncoder().encode(snapshot),
      let json = String(data: data, encoding: .utf8)
    else { return }
    defaults.set(json, forKey: key)
  }

  static func load() -> SurfaceSnapshot? {
    guard let json = defaults.string(forKey: key) else { return nil }
    return SurfaceSnapshot.decode(json: json)
  }
}
