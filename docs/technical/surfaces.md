# Surfaces: widgets, Live Activity, watches

Everything outside the main app UI — iOS/Android widgets, the iOS Live Activity / Dynamic Island, the Android
ongoing notification, the Apple Watch app and the Wear OS app — is a **surface**. Surfaces are thin: they render
a snapshot published by the phone app and send taps back as commands. History is only ever written by the phone.

```
             publishSurfaces()                         runSurfaceCommand()
 ledger ──▶ buildSnapshot() ──▶ adapters ──▶ surface ──▶ { id, action, at, source } ──▶ actions ──▶ ledger
            (@worktime/core)    (features/surfaces/adapters/*)
```

## Snapshot (`SurfaceSnapshot`, version 1)
Plain JSON, defined with zod in `packages/core/src/surfaces.ts` and mirrored in Swift / Kotlin.

| Field | Type | Meaning |
|---|---|---|
| `version` | `1` | Bump on breaking changes; surfaces ignore versions they don't know. |
| `state` | `off` \| `working` \| `break` | |
| `day` | `YYYY-MM-DD` | Work day shown (a running night shift keeps its start day). |
| `workedMs`, `breakMs` | number | Totals of that day at `updatedAt`. |
| `workedAnchor` | ms? | While working: timers count up from here (`now - workedAnchor` = worked today). |
| `since` | ms? | Start of the current state (clock-in / break start). |
| `sessionStart` | ms? | Clock-in of the running session. |
| `targetMs` | number | Today's target (0 on days off). |
| `expectedEnd` | ms? | When the target is reached incl. required breaks. |
| `workplaceName` | string? | |
| `weekWorkedMs`, `weekTargetMs`, `weekBalanceMs` | number | This week; balance counts finished days only. |
| `tz` | IANA zone | Zone to format times in. |
| `updatedAt` | ms | When the snapshot was built. |

Surfaces must not compute history. Live counting uses system timer views (`Text(timerInterval:)`,
`Chronometer`) anchored at `workedAnchor` / `since`, so no updates are needed while time passes.

## Commands (`SurfaceCommand`)
`{ id, action: clockIn | startBreak | endBreak | clockOut, at, source: watch | widget | liveActivity, tz? }`

* `id` is unique per tap (UUID). The app keeps the last 200 applied ids and ignores repeats, so transports may
  retry freely.
* `at` is the time of the tap. A watch that was offline sends its queued commands later with their original
  times; they are applied in order.
* Invalid transitions (clock out while off) are ignored, exactly as in the app.

## Adapters
`apps/mobile/src/features/surfaces/register.ts` imports one module per adapter; each calls `registerSurface`.
Adapters must be no-ops where unsupported (no watch paired, Expo Go, web) and must never throw.
Publishing happens after every event, on launch, on returning to the foreground and on settings changes.

## Apple Watch
A SwiftUI watchOS 10+ app plus a WidgetKit complication extension, added to the generated Xcode project by the
config plugin `@bacons/apple-targets` (Continuous Native Generation: `ios/` stays untracked), and a local Expo
module that bridges WatchConnectivity on the phone.

```
 iPhone (RN)                                   │ Apple Watch
 publishSurfaces() ─▶ adapters/watch.ts        │
        │ JSON.stringify(snapshot)             │
        ▼                                      │
 modules/watch-bridge (WatchBridgeSession) ────┼─▶ updateApplicationContext(["snapshot": json]) ─▶ WatchModel
        ▲                                      │                                                   │ App Group
        │ queue in UserDefaults, onCommand     │                                                   ▼ defaults
 runSurfaceCommand ◀─ drain, sort by `at`      │ ◀─ transferUserInfo(["command": json]) + sendMessage  Complications
```

### Pieces
| Path | What |
|---|---|
| `apps/mobile/targets/watch/` | `watch` target (`WorktimeWatch`, `com.worktime.app.watchkitapp`, watchOS 10): `WorktimeWatchApp` (app + `WKApplicationDelegate` for background delivery), `WatchModel` (WCSession, snapshot, queued commands), `Views` (today, clock-out confirmation, summary, offline), `Components`. |
| `apps/mobile/targets/watch-widget/` | `watch-widget` target (`com.worktime.app.watchkitapp.widget`, embedded in the watch app): accessoryCircular gauge, accessoryRectangular, accessoryCorner, accessoryInline and a Smart Stack "This week" card, all from the last snapshot. |
| `SurfaceModels.swift`, `Theme.swift` | Swift mirror of `SurfaceSnapshot` / `SurfaceCommand` (`Codable`; unknown `version`s are ignored), formatting, App Group storage, design-token colours. They exist **twice** (one copy per target, because the targets cannot share files without also compiling them into the iPhone app); `test/watch-commands.test.ts` fails if the copies differ. |
| `apps/mobile/modules/watch-bridge/` | Local Expo module (iOS only; Android/web get TS no-op stubs, nothing is compiled on Android). `WatchBridgeSession` owns the `WCSession`, `WatchBridgeAppDelegateSubscriber` activates it at launch so commands that wake the app in the background are received before JS runs and are persisted in `UserDefaults`. JS API: `publishSnapshot(json)`, `drainCommands()`, `isPaired`, `isWatchAppInstalled`, `addCommandListener()` (`onCommand`). |
| `features/surfaces/adapters/watch.ts` | Registers `{ name: 'watch', publish }`, drains the queue on start, on `AppState` active and on `onCommand`, applies commands sorted by `at` through `runSurfaceCommand` (`watch-commands.ts`, unit-tested). `.android.ts` / `.web.ts` are empty. |

### Sync rules
* Phone → watch: `updateApplicationContext(["snapshot": <JSON string>])` after every publish; latest state wins. The
  watch stores it in the App Group (`group.com.worktime.app`) and reloads the complication timelines.
* Watch → phone: every tap creates a `SurfaceCommand` (`source: "watch"`, UUID `id`, `at` = tap time) and sends it with
  `transferUserInfo(["command": json])` (queued by the system, in order, survives an unreachable iPhone) and, when the
  iPhone is reachable, also with `sendMessage` for an instant reaction. Both copies carry the same `id`; the app applies it once.
* The watch shows the result of a tap at once (a preview computed from the last snapshot); the next snapshot from the
  iPhone replaces it. While `outstandingUserInfoTransfers` is not empty the watch shows "Waiting for iPhone" /
  "Will sync when your iPhone is nearby". The watch never edits history.
* Timers use `Text(timerInterval:)` from `workedAnchor` (break: from `since`), so nothing is pushed while time passes.
  The snapshot has no required break length, so the break ring shows the day's progress instead of "of 30 min"
  (design 35); the arrival notification with actions (37a) is a phone-side notification category, not part of this target.

### Open and run on a Mac
Requires Xcode 16+, CocoaPods and an Apple developer team.
1. Set `expo.ios.appleTeamId` in `apps/mobile/app.json` (the plugin warns while it is missing), or choose the team per target in Xcode.
2. `cd apps/mobile && npx expo prebuild -p ios --clean`, then `xed ios`.
3. Targets: `Worktime` (iPhone app, embeds the watch app), `WorktimeWatch`, `WorktimeWatchWidget`. Under **Signing & Capabilities**
   each of the three needs the App Group `group.com.worktime.app` (they are generated into `ios/.targets/*/generated.entitlements`;
   automatic signing registers the group and the three bundle ids `com.worktime.app`, `.watchkitapp`, `.watchkitapp.widget`).
4. Pick the **WorktimeWatch** scheme and a paired iPhone + Apple Watch simulator (or devices) and run. To run the phone side, run the
   **Worktime** scheme (a development build; Expo Go does not contain the bridge) on the paired iPhone, then `npx expo start --dev-client`.
5. Sources of the watch targets live in `apps/mobile/targets/*` (shown under `expo:targets` in Xcode): edit them there, `ios/` is regenerated.
   After adding/removing a file run prebuild again. `Assets.xcassets` of the targets (accent colour, app icon) is generated and git-ignored.

### Verification status
Verified on Linux (no Xcode): TypeScript (typecheck, lint, expo-doctor, vitest for the command queue), `expo export` for iOS and
Android, `expo prebuild -p ios` output (targets, bundle ids, deployment targets, embedding, App Group entitlements, autolinking of the
local module for Apple only), `swiftc -parse` on every Swift file, and `SurfaceModels.swift` compiled and run with a Swift 6 toolchain
(JSON decode incl. unknown version / unknown keys, command encoding, tap previews, formatting).

Must be checked on a Mac / device: the Swift files compile against the SDKs (SwiftUI, WatchConnectivity, WidgetKit, ExpoModulesCore);
signing and App Group registration; the watch app installs together with the iPhone app; the phone→watch context arrives and
complications update; a tap with the iPhone out of reach is delivered later in order with its original time; a command that
arrives while the iPhone app is closed is applied at the next launch; layouts on 41/45/49 mm; the complications on the watch face
and in the Smart Stack; the `UserDefaults` privacy-manifest reasons (`1C8F.1` on the watch targets).
