import SwiftUI

/// Progress ring of the day's target.
struct ProgressRing: View {
  var progress: Double
  var tint: Color
  var lineWidth: CGFloat = 10

  var body: some View {
    ZStack {
      Circle().stroke(Theme.track, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: max(0.005, min(1, progress)))
        .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
    .padding(lineWidth / 2)
  }
}

/// Full-width pill button (Resume work, Clock out, Still working).
struct PillButtonStyle: ButtonStyle {
  var fill: Color
  var foreground: Color

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 16, weight: .semibold, design: .rounded))
      .foregroundStyle(foreground)
      .frame(maxWidth: .infinity, minHeight: 44)
      .background(Capsule().fill(fill))
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

/// Round icon button (Break, Stop).
struct RoundButtonStyle: ButtonStyle {
  var fill: Color
  var foreground: Color
  var size: CGFloat = 44

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: size * 0.4, weight: .semibold))
      .foregroundStyle(foreground)
      .frame(width: size, height: size)
      .background(Circle().fill(fill))
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
}

/// Shown while commands are queued for the iPhone.
struct SyncPill: View {
  var text = "Waiting for iPhone"

  var body: some View {
    Label(text, systemImage: "arrow.triangle.2.circlepath")
      .font(.system(size: 13, weight: .medium, design: .rounded))
      .foregroundStyle(Theme.textSecondary)
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(Capsule().fill(Theme.elevated))
  }
}

/// Soft glow behind a page: green when working or ready to start, amber on a break.
struct StateBackground: View {
  var state: SurfaceState

  var body: some View {
    ZStack {
      Theme.canvas
      RadialGradient(
        colors: [(state == .onBreak ? Theme.amber : Theme.accent).opacity(0.25), .clear],
        center: .top, startRadius: 0, endRadius: 220)
    }
    .ignoresSafeArea()
  }
}
