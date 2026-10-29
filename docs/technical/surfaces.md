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
