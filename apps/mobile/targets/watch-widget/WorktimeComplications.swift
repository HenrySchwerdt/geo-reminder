import SwiftUI
import WidgetKit

// MARK: - Timeline

struct WorktimeEntry: TimelineEntry {
  let date: Date
  let snapshot: SurfaceSnapshot?

  /// A running day is more relevant in the Smart Stack than an idle one.
  var relevance: TimelineEntryRelevance? {
    guard let snapshot = snapshot, snapshot.state != .off else { return nil }
    return TimelineEntryRelevance(score: 10)
  }
}

/// Reads the last snapshot the watch app saved. Timers count by themselves (`Text(timerInterval:)`); entries
/// every ten minutes only advance the gauge while working.
struct WorktimeProvider: TimelineProvider {
  func placeholder(in context: Context) -> WorktimeEntry {
    WorktimeEntry(date: Date(), snapshot: Self.sample())
  }

  func getSnapshot(in context: Context, completion: @escaping (WorktimeEntry) -> Void) {
    completion(WorktimeEntry(date: Date(), snapshot: context.isPreview ? Self.sample() : SnapshotStore.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WorktimeEntry>) -> Void) {
    let now = Date()
    let snapshot = SnapshotStore.load()
    var entries = [WorktimeEntry(date: now, snapshot: snapshot)]
    var policy = TimelineReloadPolicy.after(now.addingTimeInterval(30 * 60))
    if snapshot?.state == .working {
      for step in 1...18 {
        entries.append(WorktimeEntry(date: now.addingTimeInterval(Double(step) * 600), snapshot: snapshot))
      }
      policy = .atEnd
    }
    completion(Timeline(entries: entries, policy: policy))
  }

  private static func sample() -> SurfaceSnapshot {
    let now = Date()
    let nowMs = now.timeIntervalSince1970 * 1000
    var snapshot = SurfaceSnapshot.empty(now: now)
    snapshot.state = .working
    snapshot.day = SurfaceFormat.dayKey(now, in: .current)
    snapshot.workedMs = 5.83 * 3_600_000
    snapshot.workedAnchor = nowMs - snapshot.workedMs
    snapshot.since = nowMs - 2 * 3_600_000
    snapshot.sessionStart = snapshot.since
    snapshot.targetMs = 8 * 3_600_000
    snapshot.expectedEnd = nowMs + 2.17 * 3_600_000
    snapshot.weekWorkedMs = 30.7 * 3_600_000
    snapshot.weekTargetMs = 40 * 3_600_000
    snapshot.weekBalanceMs = 6.3 * 3_600_000
    return snapshot
  }
}

// MARK: - Shared pieces

private extension SurfaceSnapshot {
  var stateLabel: String {
    switch state {
    case .working: return "Working"
    case .onBreak: return "On break"
    case .off: return "Not working"
    }
  }

  var stateIcon: String {
    switch state {
    case .working: return "briefcase.fill"
    case .onBreak: return "cup.and.saucer.fill"
    case .off: return "play.fill"
    }
  }
}

/// The live timer: the day's worked time while working, the break so far on a break, else the day's total.
private struct StateTimer: View {
  var snapshot: SurfaceSnapshot
  var now: Date

  var body: some View {
    if snapshot.state == .working, let anchor = snapshot.workedAnchorDate {
      Text(timerInterval: anchor...Date.distantFuture, countsDown: false, showsHours: true)
        .monospacedDigit()
    } else if snapshot.state == .onBreak, let since = snapshot.sinceDate {
      Text(timerInterval: since...Date.distantFuture, countsDown: false, showsHours: true)
        .monospacedDigit()
    } else {
      Text(SurfaceFormat.hoursMinutes(snapshot.workedMs(at: now)))
    }
  }
}

private func detailText(_ snapshot: SurfaceSnapshot, now: Date) -> String {
  switch snapshot.state {
  case .working:
    var parts: [String] = []
    if let end = snapshot.expectedEndDate { parts.append("ends \(SurfaceFormat.clock(end, in: snapshot.timeZone))") }
    if let left = snapshot.remainingMs(at: now), left > 0 { parts.append("\(SurfaceFormat.duration(left)) left") }
    return parts.isEmpty ? "Today \(SurfaceFormat.duration(snapshot.workedMs(at: now)))" : parts.joined(separator: " · ")
  case .onBreak:
    return "worked \(SurfaceFormat.duration(snapshot.workedMs(at: now)))"
  case .off:
    return "Today \(SurfaceFormat.duration(snapshot.workedMs(at: now))) · Week \(SurfaceFormat.signedDuration(snapshot.weekBalanceMs))"
  }
}

// MARK: - Views

struct WorktimeComplicationView: View {
  @Environment(\.widgetFamily) private var family
  var entry: WorktimeEntry

  var body: some View {
    let snapshot = entry.snapshot ?? SurfaceSnapshot.empty(now: entry.date)
    let tint = Theme.tint(for: snapshot.state == .off ? .working : snapshot.state)
    let progress = snapshot.progress(at: entry.date)

    switch family {
    case .accessoryCircular:
      Gauge(value: progress) {
        Image(systemName: snapshot.stateIcon)
      } currentValueLabel: {
        if snapshot.state == .working {
          Text("\(Int((progress * 100).rounded()))%")
        } else {
          Image(systemName: snapshot.stateIcon)
        }
      }
      .gaugeStyle(.accessoryCircularCapacity)
      .tint(tint)

    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        HStack(alignment: .firstTextBaseline) {
          Text(snapshot.stateLabel)
            .font(.headline)
            .foregroundStyle(tint)
            .widgetAccentable()
          Spacer(minLength: 4)
          StateTimer(snapshot: snapshot, now: entry.date)
            .font(.headline)
            .lineLimit(1)
        }
        ProgressView(value: progress)
          .tint(tint)
        Text(detailText(snapshot, now: entry.date))
          .font(.caption2)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }

    case .accessoryCorner:
      Text(SurfaceFormat.hoursMinutes(snapshot.workedMs(at: entry.date)))
        .font(.system(.title3, design: .rounded))
        .widgetLabel {
          ProgressView(value: progress)
            .tint(tint)
        }

    case .accessoryInline:
      if snapshot.state == .off {
        Label("Clock in", systemImage: "play.fill")
      } else {
        Label {
          StateTimer(snapshot: snapshot, now: entry.date)
        } icon: {
          Image(systemName: snapshot.stateIcon)
        }
      }

    default:
      Text(snapshot.stateLabel)
    }
  }
}

/// Second Smart Stack card: the week.
struct WorktimeWeekView: View {
  var entry: WorktimeEntry

  var body: some View {
    let snapshot = entry.snapshot ?? SurfaceSnapshot.empty(now: entry.date)
    VStack(alignment: .leading, spacing: 2) {
      Text("This week · \(SurfaceFormat.signedDuration(snapshot.weekBalanceMs))")
        .font(.caption)
        .foregroundStyle(Theme.accent)
        .widgetAccentable()
      Text(SurfaceFormat.duration(snapshot.weekWorkedMs))
        .font(.system(.title2, design: .rounded).weight(.semibold))
      if snapshot.weekTargetMs > 0 {
        ProgressView(value: min(1, snapshot.weekWorkedMs / snapshot.weekTargetMs))
          .tint(Theme.accent)
      }
    }
  }
}

// MARK: - Widgets

struct WorktimeStatusWidget: Widget {
  let kind = "WorktimeStatus"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WorktimeProvider()) { entry in
      WorktimeComplicationView(entry: entry)
        .containerBackground(Theme.elevated, for: .widget)
    }
    .configurationDisplayName("Worktime")
    .description("Status, timer and progress of your work day.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryCorner, .accessoryInline])
  }
}

struct WorktimeWeekWidget: Widget {
  let kind = "WorktimeWeek"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WorktimeProvider()) { entry in
      WorktimeWeekView(entry: entry)
        .containerBackground(Theme.elevated, for: .widget)
    }
    .configurationDisplayName("Worktime week")
    .description("Hours and balance of this week.")
    .supportedFamilies([.accessoryRectangular])
  }
}

@main
struct WorktimeWatchWidgets: WidgetBundle {
  var body: some Widget {
    WorktimeStatusWidget()
    WorktimeWeekWidget()
  }
}
