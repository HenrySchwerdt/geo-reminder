import SwiftUI

struct RootView: View {
  @EnvironmentObject private var model: WatchModel
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    NavigationStack {
      TabView {
        TodayPage()
        SummaryPage()
      }
      .tabViewStyle(.verticalPage)
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .active { model.activate() }
    }
  }
}

// MARK: - Today

/// Status, live timer, progress to today's target and the primary action.
struct TodayPage: View {
  @EnvironmentObject private var model: WatchModel
  @State private var confirmingClockOut = false

  var body: some View {
    TimelineView(.periodic(from: .now, by: 15)) { context in
      let snapshot = model.snapshot ?? SurfaceSnapshot.empty(now: context.date)
      content(snapshot, now: context.date)
        .containerBackground(for: .tabView) { StateBackground(state: snapshot.state) }
    }
    .navigationTitle("Worktime")
    .sheet(isPresented: $confirmingClockOut) {
      ClockOutSheet()
    }
  }

  @ViewBuilder
  private func content(_ snapshot: SurfaceSnapshot, now: Date) -> some View {
    switch snapshot.state {
    case .off:
      offContent(snapshot, now: now)
    case .working:
      activeContent(snapshot, now: now, onBreak: false)
    case .onBreak:
      activeContent(snapshot, now: now, onBreak: true)
    }
  }

  // Not working: the big Clock in button.
  private func offContent(_ snapshot: SurfaceSnapshot, now: Date) -> some View {
    ViewThatFits(in: .vertical) {
      offLayout(snapshot, now: now, diameter: 100)
      offLayout(snapshot, now: now, diameter: 84)
      offLayout(snapshot, now: now, diameter: 68)
    }
  }

  private func offLayout(_ snapshot: SurfaceSnapshot, now: Date, diameter: CGFloat) -> some View {
    VStack(spacing: 6) {
      offHeadline(snapshot)
      Button {
        model.send(.clockIn)
      } label: {
        VStack(spacing: 4) {
          Image(systemName: "play.fill").font(.system(size: 30))
          Text("Clock in").font(.system(size: 16, weight: .semibold, design: .rounded))
        }
        .foregroundStyle(Theme.onAccent)
        .frame(width: diameter, height: diameter)
        .background(Circle().fill(Theme.accent))
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Clock in")

      if model.pendingCount > 0 {
        SyncPill()
      } else {
        Text(
          "Today \(SurfaceFormat.hoursMinutes(snapshot.workedMs(at: now)))  ·  Week \(SurfaceFormat.signedDuration(snapshot.weekBalanceMs))"
        )
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Theme.textSecondary)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      }
    }
  }

  @ViewBuilder
  private func offHeadline(_ snapshot: SurfaceSnapshot) -> some View {
    if let last = model.lastCommand, last.action == .clockOut {
      Label(
        "Clocked out \(SurfaceFormat.clock(Date(timeIntervalSince1970: Double(last.at) / 1000), in: .current))",
        systemImage: "checkmark.circle.fill"
      )
      .font(.system(size: 15, weight: .semibold, design: .rounded))
      .foregroundStyle(Theme.accent)
    } else if model.snapshot == nil {
      Text("Open Worktime on your iPhone to sync")
        .font(.system(size: 13, design: .rounded))
        .foregroundStyle(Theme.textSecondary)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)
    } else if let name = snapshot.workplaceName {
      Text(name)
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(Theme.textPrimary)
        .lineLimit(1)
    } else {
      Text("Ready")
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(Theme.textPrimary)
    }
  }

  // Working / on break: ring with live timer, plus the actions.
  private func activeContent(_ snapshot: SurfaceSnapshot, now: Date, onBreak: Bool) -> some View {
    let tint = onBreak ? Theme.amber : Theme.accent
    return GeometryReader { geo in
      let syncHeight: CGFloat = model.pendingCount > 0 ? 38 : 0
      let ring = max(60, min(geo.size.width, geo.size.height - 52 - syncHeight))
      let compact = ring < 100
      VStack(spacing: 8) {
        if compact {
          readout(snapshot, onBreak: onBreak, now: now, tint: tint, timerSize: 24)
        } else {
          ZStack {
            ProgressRing(progress: snapshot.progress(at: now), tint: tint)
            readout(snapshot, onBreak: onBreak, now: now, tint: tint, timerSize: ring * 0.2)
              .padding(.horizontal, 16)
          }
          .frame(width: ring, height: ring)
        }

        actions(onBreak: onBreak, compact: compact)
        if model.pendingCount > 0 {
          if compact {
            Label("Waiting for iPhone", systemImage: "arrow.triangle.2.circlepath")
              .font(.system(size: 11, weight: .medium, design: .rounded))
              .foregroundStyle(Theme.textSecondary)
              .lineLimit(1)
          } else {
            SyncPill()
          }
        }
      }
      .frame(maxWidth: .infinity)
    }
  }

  private func readout(_ snapshot: SurfaceSnapshot, onBreak: Bool, now: Date, tint: Color, timerSize: CGFloat) -> some View {
    VStack(spacing: 2) {
      Text(onBreak ? "BREAK" : "WORKING")
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .tracking(1)
        .foregroundStyle(tint)
        .lineLimit(1)
      timer(snapshot, onBreak: onBreak, now: now)
        .font(.system(size: timerSize, weight: .bold, design: .rounded).monospacedDigit())
        .foregroundStyle(tint)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      detail(snapshot, onBreak: onBreak, now: now)
        .font(.system(size: 12, design: .rounded))
        .foregroundStyle(Theme.textSecondary)
        .lineLimit(1)
    }
  }

  @ViewBuilder
  private func timer(_ snapshot: SurfaceSnapshot, onBreak: Bool, now: Date) -> some View {
    if onBreak, let since = snapshot.sinceDate {
      Text(timerInterval: since...Date.distantFuture, countsDown: false, showsHours: true)
    } else if let anchor = snapshot.workedAnchorDate {
      Text(timerInterval: anchor...Date.distantFuture, countsDown: false, showsHours: true)
    } else {
      Text(SurfaceFormat.hoursMinutes(snapshot.workedMs(at: now)))
    }
  }

  @ViewBuilder
  private func detail(_ snapshot: SurfaceSnapshot, onBreak: Bool, now: Date) -> some View {
    if onBreak {
      Text("worked \(SurfaceFormat.duration(snapshot.workedMs(at: now)))")
    } else if let end = snapshot.expectedEndDate {
      Text("ends \(SurfaceFormat.clock(end, in: snapshot.timeZone))")
    } else if let name = snapshot.workplaceName {
      Text(name)
    }
  }

  @ViewBuilder
  private func actions(onBreak: Bool, compact: Bool) -> some View {
    HStack(spacing: 8) {
      if onBreak {
        Button {
          model.send(.endBreak)
        } label: {
          Label(compact ? "Resume" : "Resume work", systemImage: "play.fill")
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .buttonStyle(PillButtonStyle(fill: Theme.accent, foreground: Theme.onAccent))
        .accessibilityLabel("Resume work")
      } else {
        Button {
          model.send(.startBreak)
        } label: {
          Image(systemName: "cup.and.saucer.fill")
        }
        .buttonStyle(RoundButtonStyle(fill: Theme.amberSoft, foreground: Theme.amber))
        .accessibilityLabel("Start break")
        Spacer(minLength: 0)
      }
      Button {
        confirmingClockOut = true
      } label: {
        Image(systemName: "stop.fill")
      }
      .buttonStyle(RoundButtonStyle(fill: Theme.elevated, foreground: Theme.textPrimary))
      .accessibilityLabel("Clock out")
    }
    .frame(height: 44)
  }
}

/// "Clock out?" confirmation: a stray tap must not end the day.
struct ClockOutSheet: View {
  @EnvironmentObject private var model: WatchModel
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    let now = Date()
    let snapshot = model.snapshot ?? SurfaceSnapshot.empty(now: now)
    VStack(alignment: .leading, spacing: 6) {
      Text("Clock out?")
        .font(.system(size: 18, weight: .semibold, design: .rounded))
        .foregroundStyle(Theme.textPrimary)
      Text("\(SurfaceFormat.duration(snapshot.workedMs(at: now))) today")
        .font(.system(size: 14, design: .rounded))
        .foregroundStyle(Theme.accent)
      Spacer(minLength: 4)
      Button {
        model.send(.clockOut)
        dismiss()
      } label: {
        Label("Clock out \(SurfaceFormat.clock(now, in: .current))", systemImage: "stop.fill")
      }
      .buttonStyle(PillButtonStyle(fill: Theme.textPrimary, foreground: Theme.canvas))
      Button("Still working") { dismiss() }
        .buttonStyle(PillButtonStyle(fill: Theme.elevated, foreground: Theme.textPrimary))
    }
  }
}

// MARK: - Summary

/// Today at a glance, from the snapshot: worked time, session, break, what is left, the week.
struct SummaryPage: View {
  @EnvironmentObject private var model: WatchModel

  var body: some View {
    TimelineView(.periodic(from: .now, by: 30)) { context in
      let snapshot = model.snapshot ?? SurfaceSnapshot.empty(now: context.date)
      ScrollView {
        VStack(alignment: .leading, spacing: 8) {
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(SurfaceFormat.duration(snapshot.workedMs(at: context.date)))
              .font(.system(size: 28, weight: .bold, design: .rounded))
              .foregroundStyle(Theme.textPrimary)
              .lineLimit(1)
              .minimumScaleFactor(0.6)
            Text("worked")
              .font(.system(size: 13, design: .rounded))
              .foregroundStyle(Theme.textSecondary)
          }
          ProgressView(value: snapshot.progress(at: context.date))
            .tint(Theme.accent)
          rows(snapshot, now: context.date)
          if model.pendingCount > 0 {
            Text("Will sync when your iPhone is nearby")
              .font(.system(size: 12, design: .rounded))
              .foregroundStyle(Theme.textSecondary)
          }
        }
      }
      .containerBackground(for: .tabView) { Theme.canvas }
    }
    .navigationTitle("Today")
  }

  @ViewBuilder
  private func rows(_ snapshot: SurfaceSnapshot, now: Date) -> some View {
    if snapshot.state != .off, let start = snapshot.sessionStartDate {
      SummaryRow(
        label: "Since \(SurfaceFormat.clock(start, in: snapshot.timeZone))",
        value: SurfaceFormat.duration(snapshot.workedMs(at: now)), tint: Theme.accent)
    }
    let breakMs = snapshot.state == .onBreak
      ? snapshot.breakMs + max(0, now.timeIntervalSince(snapshot.updatedAtDate) * 1000)
      : snapshot.breakMs
    if breakMs > 0 {
      SummaryRow(label: "Break", value: SurfaceFormat.duration(breakMs), tint: Theme.amber)
    }
    if let left = snapshot.remainingMs(at: now) {
      SummaryRow(
        label: left > 0 ? "Left today" : "Target reached",
        value: left > 0 ? SurfaceFormat.duration(left) : "✓", tint: Theme.accent)
    }
    SummaryRow(
      label: "Week \(SurfaceFormat.signedDuration(snapshot.weekBalanceMs))",
      value: SurfaceFormat.duration(snapshot.weekWorkedMs), tint: Theme.textTertiary)
  }
}

struct SummaryRow: View {
  var label: String
  var value: String
  var tint: Color

  var body: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 2).fill(tint).frame(width: 3, height: 18)
      Text(label)
        .font(.system(size: 14, design: .rounded))
        .foregroundStyle(Theme.textPrimary)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Spacer(minLength: 4)
      Text(value)
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(tint == Theme.textTertiary ? Theme.textSecondary : tint)
        .lineLimit(1)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 9)
    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.elevated))
  }
}
