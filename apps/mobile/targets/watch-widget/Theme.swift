// Shared by the `watch` and `watch-widget` targets. Both copies must stay identical
// (apps/mobile/test/watch-commands.test.ts checks it).
// Dark values of packages/design-tokens/tokens.json: the watch is always dark.
import SwiftUI

extension Color {
  init(hex: UInt32) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: 1)
  }
}

enum Theme {
  static let canvas = Color(hex: 0x0B0C0B)
  static let elevated = Color(hex: 0x181A18)
  static let track = Color(hex: 0x2C302C)
  static let textPrimary = Color(hex: 0xF3F2ED)
  static let textSecondary = Color(hex: 0xA7ABA5)
  static let textTertiary = Color(hex: 0x73776F)
  static let accent = Color(hex: 0x5CC99B)
  static let accentSoft = Color(hex: 0x16362A)
  static let onAccent = Color(hex: 0x06140E)
  static let amber = Color(hex: 0xF2B04E)
  static let amberSoft = Color(hex: 0x3A2B13)
  static let danger = Color(hex: 0xFF6B5D)

  /// Colour of a state: green while working, amber on a break, grey when off.
  static func tint(for state: SurfaceState) -> Color {
    switch state {
    case .working: return accent
    case .onBreak: return amber
    case .off: return textSecondary
    }
  }
}
