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
