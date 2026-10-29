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

## Wear OS
The Wear OS app (`apps/wear`, Kotlin, Compose for Wear OS / Material 3, Tiles and complications) is a pure surface:
it renders the latest snapshot and queues taps. It never touches history.

```
 phone (RN)                                                          watch (apps/wear)
 publishSurfaces ─▶ adapters/wear.ts ─▶ modules/wear-bridge ─ DataClient.putDataItem ─▶ DataLayerListenerService
                                         /worktime/snapshot  {json, publishedAt}        ─▶ WorktimeRepository ─▶ UI / Tile / Complications
 runSurfaceCommand ◀─ adapters/wear.ts ◀─ CommandListenerService ◀─ MessageClient ◀──── CommandDispatcher ◀─ PendingCommands (persisted)
                      (sorted by `at`)     /worktime/command  (SurfaceCommand JSON)
```

### Data Layer contract
| Path | Direction | Transport | Payload |
|---|---|---|---|
| `/worktime/snapshot` | phone → watch | `DataClient` item (urgent) | `json`: `JSON.stringify(SurfaceSnapshot)`, `publishedAt`: ms. The timestamp makes every publish a new item, so the watch is notified even when nothing changed. |
| `/worktime/command` | watch → phone | `MessageClient` | `SurfaceCommand` JSON with `source: "watch"`, UUID `id`, `at` = time of the tap, `tz`. |

* **Watch:** `data/SurfaceModels.kt` mirrors both shapes with kotlinx.serialization. Unknown keys are ignored; a snapshot
  with a `version` other than `1` (or malformed JSON) is dropped and the old state stays on screen. Millisecond fields
  tolerate fractional values (a daily target such as 40 h / 6 days is not a whole number of ms).
* **Offline queue:** every tap is stored in `PendingCommands` (SharedPreferences) and sent when a phone node is
  connected, in `at` order, stopping at the first failure so the order is kept. Commands keep their original `at`; the
  phone's `runSurfaceCommand` de-duplicates by `id`, so a retry is harmless. Flushing is triggered by a tap, by opening
  the app, by a snapshot arriving and by the phone connecting (`onPeerConnected`).
* **While commands are queued** the watch shows the last snapshot with those commands applied (`OptimisticState.kt`,
  same transition rules as the app) and the note "Will sync when your phone is nearby". The phone's next snapshot
  replaces it. Before the phone has ever published, the watch asks to open Worktime on the phone.
* **Phone bridge** (`apps/mobile/modules/wear-bridge`, Expo local module, autolinked from `modules/`):
  `publishSnapshot(json)`, `drainCommands(): string[]` and the `onCommand` event. A `WearableListenerService` declared in
  the module's manifest receives `/worktime/command` even when the app is not running and persists it to a queue
  (SharedPreferences); if the JS app is running it also emits `onCommand`. The event is only a nudge: JS calls
  `drainCommands()`. `adapters/wear.ts` drains on start and whenever the app becomes active and applies the commands
  ordered by `at` through `runSurfaceCommand`. Off Android (and in Expo Go) the bridge is a no-op.
* **Screens:** Today (state, live timer from `workedAnchor` / `since`, progress ring to `targetMs`, expected end,
  Clock in / Break / Resume / Clock out), a clock-out confirmation, and the offline note. The **tile** shows state,
  timer, progress bar and one button (Break and Clock in act immediately via an invisible activity; Clock out opens the
  app's confirmation); it refreshes every minute and whenever the state changes. **Complications:** a ranged value
  (worked time / target, with the time as text) and a short text with the worked time that counts up by itself while
  working (`TimeDifferenceComplicationText`, no updates needed).

### Same application id, same signing key
The watch app uses the phone app's `applicationId` (`com.worktime.app`); the Data Layer only pairs apps with the same
package name **and** the same signing certificate. Debug builds share the local debug keystore, which is why they pair
on an emulator. **Release builds of both apps must be signed with the same key** (upload both to the same Play listing
or use the same keystore / Play App Signing).

### Build and install
Requirements: Android SDK (`ANDROID_HOME`), JDK 17+; compile SDK 37 and minSdk 30 for the watch.

```bash
# Watch app (own Gradle project, wrapper included)
cd apps/wear
./gradlew testDebugUnitTest          # JVM unit tests: JSON, offline queue, optimistic state, formatting
./gradlew assembleDebug              # app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug               # to the connected watch / Wear emulator

# Phone app with the bridge (Expo development build, not Expo Go)
cd apps/mobile
npx expo prebuild --platform android --clean   # generates android/ (git-ignored)
npx expo run:android                           # or: cd android && ./gradlew :app:installDebug
```

With Android Studio: open `apps/wear` as its own project (run configuration `app`, select the Wear device), and run the
Expo-generated `apps/mobile/android` project for the phone.

### Pairing an emulator
1. Create a phone AVD with the Play Store (e.g. Pixel 8) and a Wear OS AVD (e.g. Wear OS Large Round).
2. Start the phone emulator, then in Device Manager choose **Pair Wearable** on the phone and pick the watch AVD, or
   in the phone's Play Store / Wear OS app complete the pairing flow. Both need Google Play services.
3. Install the phone app and the watch app (see above). The watch app opens after the phone has published once; open
   Worktime on the phone to publish.
4. Test the offline path by switching the watch's Bluetooth/phone connection off (Device Manager, or
   `adb -s <watch> shell cmd bluetooth_manager disable`), tapping actions, then re-enabling it.

### What is verified and what needs a device
Verified by building and testing on a Linux machine without a device: both apps compile (`apps/wear` `assembleDebug`, phone `:app:assembleDebug` with the
bridge autolinked), the watch's JVM unit tests (JSON parsing incl. unknown versions, command ordering and queue
persistence, optimistic transitions, formatting) and the TypeScript adapter's ordering/apply logic (vitest).

Needs a watch or paired emulators (not exercised here): the Data Layer round trip itself (snapshot arriving,
messages being delivered, `WearableListenerService` start while the app is closed), visual fidelity of the Compose
screens against `design/exports/android/Wear · *.png` on round displays of different sizes, tile and complication
rendering and the watch face pickers, ambient mode, and the reconnect flush after real Bluetooth loss.

## Widgets & Live Activity (`expo-widgets`)

Home / lock screen widgets, the iOS Live Activity / Dynamic Island and the Android ongoing notification are built
with `expo-widgets` (Expo SDK 58): layouts are React components marked with the `'widget'` directive, written with
`@expo/ui` (SwiftUI on iOS, Jetpack Compose / Glance on Android) and rendered natively by a small JS runtime inside
the widget extension / widget provider. They render a `SurfaceSnapshot` and nothing else.

```
features/surfaces/
  adapters/widgets.ios.ts      Widget + Live Activity: publish(), interaction listener, drain of recorded taps
  adapters/widgets.android.ts  Widgets + ongoing notification (CustomNotifications), same
  adapters/widgets.ts / .web.ts  no-ops (other platforms)
  widgets/model.ts             SurfaceSnapshot -> WorktimeView: texts, timer anchors, progress, buttons, colours (tested)
  widgets/ios-layouts.tsx      WorktimeWidget (all families), WorktimeActivity (banner + Dynamic Island)
  widgets/android-layouts.tsx  WorktimeSmallWidget, WorktimeMediumWidget, WorktimeNotification
  widgets/bridge.ts            event / recorded tap -> SurfaceCommand -> runSurfaceCommand
```

### Setup
* `apps/mobile/app.json` configures the `expo-widgets` plugin: App Group `group.com.worktime.app`, extension bundle id
  `com.worktime.app.ExpoWidgetsTarget`, `enableAndroid`, and the widget list. iOS: one widget `Worktime` with the
  families `systemSmall`, `systemMedium`, `accessoryCircular`, `accessoryRectangular`, `accessoryInline`. Android: `WorktimeSmall`
  (2x2) and `WorktimeMedium` (4x2). The Live Activity needs no entry (the plugin always adds it and sets
  `NSSupportsLiveActivities`).
* A **development build** is required (not Expo Go; the adapters detect the missing native module and do nothing).
* iOS signing: the app and the `ExpoWidgetsTarget` extension both need the App Group `group.com.worktime.app`
  (Apple Developer portal / EAS credentials) and a team ID. Widget buttons need iOS 17; Live Activities iOS 16.2.
* Layout functions are serialized to strings (the babel preset does this for `'widget'`), so inside them only their
  arguments and the SwiftUI / Compose globals exist: no imports, no helper modules, no hooks, and no
  capitalized inner components (React Compiler would compile those and break them: use lower-case helper
  functions). Everything a layout shows is prepared in `model.ts` (a `WorktimeView`, including the design-token
  colours for light and dark). Layout logic is unit-tested by calling the functions with stand-in components
  (`apps/mobile/test/widgets.test.ts`).
* The layouts are registered when the app starts (`createWidget` / `createLiveActivity` store them in the App Group),
  so a widget added before the app has ever been opened stays empty until the first launch.

### What each surface shows
| Surface | Content |
|---|---|
| iOS `systemSmall` | state, live timer (`Text(timerInterval:)` from `workedAnchor`; during a break the break timer), "since", live progress to `targetMs` (`ProgressView(timerInterval:)`), start and expected end |
| iOS `systemMedium` | the same plus this week (total, target, balance) and **one button**: Clock in (off), Break (working), End break (break). Clock out is on the Live Activity / in the app |
| `accessoryCircular` | ring that fills with worked time (timer driven; static gauge with percent when not working) |
| `accessoryRectangular` / `accessoryInline` | state + workplace + timer + expected end / one line |
| Live Activity banner | state, workplace, live timer, "since … · ends ~…", progress, **Break / End break** and **Clock out** buttons |
| Dynamic Island | compact leading (state icon) / trailing (timer), minimal (icon), expanded leading (workplace), trailing (timer), bottom (progress + buttons) |
| Android small / medium widget | same content as iOS small / medium; the worked time is computed when the widget renders (no live timer in Glance), so it is current after every refresh and "as of the last refresh" otherwise |
| Android ongoing notification | "Working · workplace", since / expected end, progress, **Break** and **Clock out** actions (not ongoing when off) |

### Live Activity lifecycle (iOS)
* Start when a session is running and `settings.liveActivity` is on. ActivityKit only allows this while the app is in
  the foreground, so a clock-in from the background (geofence, notification) starts it the next time the app comes to the
  foreground (`SurfaceSync` publishes then; `publish` starts it if none exists).
* Update on every publish (break start / end, settings), re-attached after an app restart with `getInstances()`
  (the start time is kept in the key-value store to keep the stale date right).
* `staleDate` = start + 7.5 h (the system ends activities after 8 h): when stale, the banner says "Open Worktime to
  refresh". On clock-out the activity gets final content (day total, no buttons) and is dismissed after 5 minutes; with the
  setting off it is ended immediately.
* Android: the ongoing notification is posted, updated and cancelled the same way (`CustomNotifications`); posting needs
  the notification permission the app already asks for.

### How taps reach the app
Every tap ends as `runSurfaceCommand({ id: <uuid>, action, at: <tap time>, source })`, with `source` `widget` for
widgets and `liveActivity` for the Live Activity and the Android notification. Buttons are named by their action
(`target` = `clockIn | startBreak | endBreak | clockOut`). The hub drops ids it has already applied.

| | App in foreground | In background / suspended | Killed (no JS) |
|---|---|---|---|
| iOS Live Activity button | App Intent runs in the app, event → command immediately | the system wakes the app, same | iOS starts the app process for the intent but JS is not listening yet: the tap is **lost** and the activity keeps its old state until the next publish |
| iOS widget button | the intent records the tap in the widget's props (App Group) and a drain applies it (also on the interaction event, if the intent ran in the app) | recorded; applied the next time the app publishes (foreground / launch / event) | recorded, shown as "queued" in the widget; applied on the next launch with its original time, never lost |
| Android widget button | broadcast → event → command immediately | same while the process is alive | process dead: expo-widgets has no queue, the tap is **dropped**, the widget stays as it was |
| Android notification button | event → command immediately | same | the tap is recorded in the notification's props (shown as queued) and read back by `getActive()` on the next launch |

The recorded taps (`pending: [{ id, action, at }]`) are written by the button handler running inside the widget runtime
(`Date.now()` at the tap), and the app drains them in `publish` before it renders anything new; if any were new it
publishes again, because they changed the ledger.

### Previewing
```bash
cd apps/mobile
npx expo prebuild --clean            # generates ios/ and android/ (gitignored)
npx expo run:ios --device            # Live Activities and widgets need a device (or a recent simulator); open the app once
npx expo run:android                 # then long-press the home screen > Widgets > Worktime
```
iOS: add the widget from the home / lock screen gallery. Clock in from the app: the Live Activity appears on the lock
screen and in the Dynamic Island (needs a device with one, otherwise only the banner). Android: the notification appears
while a session runs; deny the notification permission to check it degrades silently.

### Verified here and still to verify
Verified in CI-like checks (Linux): unit tests of the view model and of every layout (states, families, buttons, press
records, pending drain parsing); the serialized layout strings evaluate in a bare context with only the runtime globals;
`expo export` for iOS and Android; `expo prebuild` for iOS (widget extension target, App Group entitlements, `NSSupportsLiveActivities`
in Info.plist, extension embedded in the app) and Android (providers, manifest receivers, widget XML); Gradle `:app:compileDebugKotlin`, `:app:processDebugMainManifest` and `:app:processDebugResources` for Android (the full `assembleDebug`, i.e. the native C++ libraries, dexing and packaging, still has to be run: the build machine ran out of disk space).

To verify on a Mac / device:
1. Extension compiles and signs; widget gallery lists "Worktime" with all five families; layouts render (spacing, timer
   width: `Text(timerInterval:)` is wider than expected in some layouts, check the `frame` widths).
2. Timer anchors: the widget and Live Activity timers match the app; progress bar fills during work; break shows the
   break timer.
3. Live Activity start from the foreground, update on break, end on clock-out, re-attach after killing the app, stale state
   after 7.5 h, and that clock-in from a notification action starts it on the next foreground only.
4. Taps in every cell of the table above, especially: widget button with the app killed (does the intent run in the
   extension or in the app? the drain covers both), Live Activity button with the app killed, Android widget button with the
   process killed, notification buttons.
5. Tinted / clear widget styles (iOS 26), Dynamic Island compact / minimal widths, dark mode, small Android launcher sizes.
