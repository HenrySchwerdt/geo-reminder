# Native simulator QA — Worktime

Date: 2026-10-29. Branch: `codex/ios-qa`.

The native builds and the observed flows below pass. This is **not a complete release
sign-off**: Android interaction, widget gallery, background notifications and the remaining
Watch sizes still need the checks listed below. Simulator `transferUserInfo` support is a
separate hardware limitation.

## Environment and design

- Apple Silicon Mac, 24 GB; Xcode 26.3 (17C529), Swift 6.2.
- iPhone 17 Pro, iOS 26.3; paired Apple Watch Series 11 46 mm, watchOS 26.2.
- Pixel 9, Android 16 / API 36 arm64, Android Studio embedded emulator.
- Expo SDK 58 / React Native 0.88.1. Required checks also run with Node 22.23.4, npm 11.17.0.
- `design/figcraft/worktime.figcraft` opened in FigCraft and inspected/exported with CLI 0.11.2.
  The configured headless MCP has different allowed roots, so the CLI uses explicit project roots.
- Compared Today iPhone (828), Today Android (5045), Watch and design tokens. Added eight
  Pay & time / Contract references for iPhone and Android, light and dark, on the final page
  (7134; overview frames 7136 / 7197 / 7258 / 7319). The new page retains existing pages.
- The app uses native SF Pro / Roboto, SF / Material icons and platform navigation.
  FigCraft uses Inter stand-ins; Inter Display is missing on this Mac.

## Fixes and feature

1. **Watch privacy manifest build failure.** React Native's CocoaPods aggregation adds the
   phone manifest to application targets. The native Watch target already has its own
   synchronized-folder manifest. A config plugin removes the extra resource reference after
   integration, preserving source manifests and surviving prebuild.
2. **Swift 6.2 JSI compilation.** `expo-modules-jsi@58.0.21` captures a bare pointer in
   `withEncodedValue`. A versioned patch uses Expo's existing `UncheckedSendable` wrapper,
   following [Expo PR 51040](https://github.com/expo/expo/pull/51040). The synchronous pointer
   lifetime is unchanged. `postinstall` applies the patch with `--error-on-fail`.
3. **Native event zones.** SQLite discarded `tz` on reload. Migration 3 adds a nullable
   column and reads/writes it. Existing rows retain their documented fallback. Tests use
   real SQLite to cover migration, restart/travel, corrections and duplicate insertion.
4. **Today chart and clock-out.** Weekly target reference uses the regular daily target
   even on days off; zero targets do not divide by zero. Clock out opens the confirmation
   sheet instead of immediately writing an event.
5. **Watch queue.** Commands before activation are persisted and retried on activation /
   reachability, retained until successful transfer completion, and deduplicated against
   outstanding transfers. Working and break screens show pending sync. The initial sync
   explanation wraps fully. The off-state Clock in button selects a smaller native layout
   when 40 mm cannot fit the full 100-point version without title overlap. Working and break
   use a full-width readout with a shorter Resume label when a readable ring cannot fit. Standard UserDefaults use is declared in the Watch manifest.
6. **Watch first-session totals.** Both Swift model copies advance the snapshot day at
   clock-in; offline clock-out no longer erases the first day's total or carries yesterday's
   total forward. Executable Swift regressions cover these cases and breaks.
7. **Permission timing.** Onboarding asks only for foreground location. Saving the first
   workplace explains and requests background access separately; declining remains optional.
   Location failures are visible and workplace names disable autocorrection.
8. **Native UI and accessibility.** Status bar contrast follows app appearance. Android tabs
   use the app's surface and selection colours with all labels visible. Native iOS back
   buttons hide technical route names. Switch rows expose the actual switch; chips expose
   selection, have a 44-point minimum height and grow with text. Buttons and row values wrap.
   Scroll views preserve actionable taps with the keyboard open and dismiss it on drag.
9. **Pay & time.** Settings opens a salary overview and modal contract editor. Annual gross,
   currency, weekly hours and paid vacation persist locally and travel in JSON backups.
   Annual hours use the actual year's configured weekdays minus vacation; completed sessions
   after corrections and incomplete-session exclusion produce a gross tracked value. Breaks
   are deducted, night shifts keep their clock-in zone/month, running/future sessions are
   excluded, and cents are rounded only at the final total. Fixed salary reference and
   tracked value are explicitly distinguished; public holidays, tax and bonuses are not computed.
10. **Contract integration.** Weekly-hour precision is preserved to two decimal places in
    both editors. Invalid Save shows a native alert as well as inline feedback. Reset and
    full restoration of a legacy backup explicitly clear an absent salary. Regression tests
    cover parsing, schema compatibility, backup round-trip and reset/import semantics.

## Automated verification

| Check | Result |
| --- | --- |
| `npm install`, patch application | Passed |
| `npm test` | 110 app + 48 core tests passed |
| `npm run typecheck` | Passed |
| Mobile `npx expo lint` | Passed |
| Mobile `npx -y expo-doctor` | 20/20 passed |
| iOS + Android production bundle export | Passed |
| Executable Swift snapshot regressions | Passed |
| iPhone, widget, Watch and complication workspace build | Passed |
| Android arm64 debug APK build / install | Passed |
| Independent TS, UI and native code reviews | Findings fixed; no further concrete findings |

Native build logs were recorded locally in `/tmp/worktime-ios-signed-build.log`,
`/tmp/worktime-ios-compact-watch-final.log` and `/tmp/worktime-android-build.log`. Generated native folders are not committed. Production
bundle export does not exercise native background delivery or widget installation.

## Observed app flows

| Check | Result | Evidence / limits |
| --- | --- | --- |
| iPhone onboarding / optional permissions | Passed | Foreground location, notifications, workplace save and separate Always upgrade |
| iPhone clock in → break → resume → clock out | Passed | Confirmation sheet, alternate native time picker and persisted app events |
| Missing checkout → suggested end → Undo | Passed | 26 October changes to 7h25m / −35m; Undo restores missing state and appends history |
| Calendar / day details / Insights | Passed sampled views | Red missing day excluded; weekly bars / averages render; not every report range tested |
| Appearance and persistence | Passed sampled views | Light / dark native screens; restart retained ledger and saved salary |
| Salary setup, save, edit, invalid input, month/year | Passed on iPhone | €60,000 / 40 h / 30 days → 1,848 planned h and €32.47/h in 2026 |
| Android onboarding Hours / Today | Rendered and reached Today | No workplace, permissions not exhaustively tested |
| Android salary empty state and loaded contract | Rendered | Loaded synthetic persisted contract: €0 tracked with €32.47/h; interactive editor save pending |
| CSV export | Passed iPhone | Native share sheet and local file; 13 session rows, zone column |
| JSON export | Passed iPhone | Native share sheet; 54 append-only events and salary contract verified in local file |
| Monthly PDF | Passed iPhone | One-page native-generated PDF; missing checkout excluded; today's entries explicitly not counted yet |
| Native import picker | Opened, selection pending | Picker contents not exposed by UI automation; fixture seeding is not an import test |
| Delete all | Not exercised | Reset/import salary behaviour has regression tests; destructive UI workflow remains pending |
| Geofence dwell / arrival / departure / notification actions | Pending native delivery | Engine simulations pass; native timing and background paths not verified |
| Home-office scheduled reminder | Pending native delivery | No claim of delivery from pure logic tests |
| Largest Dynamic Type | Partial | Overview inspected; heading adapts and amount fits. Complete scroll/keyboard/VoiceOver/Reduce Transparency matrix pending |
| Travel/restart | SQLite regression passed | Full native travel UI scenario pending |

### Test fixtures and UI automation limitation

The iPhone's ordinary onboarding and tracking actions were performed through the UI. For
historical calendar testing, 40 past-only synthetic demo events were appended after backing up
the simulator databases; existing events and workplaces were retained. This was **not** a
successful document-picker import. Salary values are synthetic test data, not personal pay data.

The Android salary contract was seeded in its local settings database after a local backup,
then loaded on app restart. Its ledger remains empty (schema migration 3 verified). This
proves loading/rendering rather than contract input or tracking actions on Android.

The 40 mm Watch working/break layouts were rendered from synthetic snapshots and a pending
command in its local preferences after a cold boot. That Watch was unpaired. This tests
readability and tap-target layout, not live WatchConnectivity or actual clock actions.
The snapshot/queue fixtures were removed afterwards and the test Watch was shut down.

Coordinate interaction with both native simulator windows stopped returning usable targets
(`noWindowsAvailable` / `windowNotFoundAtPosition`), despite readable app screenshots and
accessibility trees. Rebinding windows, raising them and restarting the UI tool did not restore
coordinate input. The user confirmed the Mac was unlocked and the simulator visible; a fresh
coordinate attempt still failed. iPhone app controls exposed in the accessibility tree remained usable;
Android Studio exposes its own controls, but not the emulated app's buttons. These restrictions
prevented completing Android gestures, system file-picker selection and widget gallery tests.

## Widgets, Live Activity and Watch

| Check | Result | Evidence / follow-up |
| --- | --- | --- |
| iPhone widget extension and Watch complications compile | Passed | Native workspace build |
| Widget families / gallery / taps / tinted / StandBy | Pending runtime | Extension compilation is not runtime verification |
| Live Activity / Island lifecycle and setting | Pending runtime | Pure snapshot/layout tests pass |
| Watch install / launch / clock in / break / resume / clock out | Passed on 46 mm | `screenshots/watch-break-46mm.png` |
| Phone → Watch snapshot | Observed in paired simulators | Foreground state updates |
| Watch → phone event delivery / deduplication | Passed foreground sample | Four watch-source actions present exactly once in phone SQLite, explicit Europe/Berlin zones |
| Offline queued delivery / relaunch | Requires hardware | Apple excludes `transferUserInfo` from Simulator support |
| 40 mm off / working / break with pending sync | Passed visual checks | Adaptive button and compact readout; synthetic snapshot/queue fixtures on an unpaired test Watch |
| 42 / 49 mm / Smart Stack and complication layouts | Pending | Remaining layout states and sizes |

Apple's [WatchConnectivity documentation](https://developer.apple.com/documentation/watchconnectivity/wcsession/transferuserinfo(_:))
requires paired physical devices for `transferUserInfo` verification. Foreground messages and
arithmetic regression tests do not establish durable background delivery.

## Evidence

Screenshots in `docs/qa/screenshots/` show the iPhone salary overview (light/dark), contract,
incomplete day, 46 mm Watch break, 40 mm Watch idle/working/break, Android empty setup and the rendered native PDF. The floating
gear on phone screenshots is Expo's development-menu control and is absent from production builds.

## Reproduce

Use Node 22 and npm 11, then from the root:

```sh
npm install
npm test
npm run typecheck
cd apps/mobile
npx expo lint
npx -y expo-doctor
npx expo export --platform ios --platform android --output-dir /tmp/worktime-expo-dist
npx expo prebuild --no-install
cd ios
pod install
xcodebuild -workspace Worktime.xcworkspace -scheme Worktime \
  -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath /tmp/worktime-derived -jobs 2 \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO
```

Ad-hoc simulator signing avoids the notification module's Keychain entitlement error seen
with an entirely unsigned build; no signing team is needed for this simulator build.
For Android, from `apps/mobile/android`, with Android SDK and JDK configured:

```sh
./gradlew :app:assembleDebug --max-workers=1 -PreactNativeArchitectures=arm64-v8a
```

Restore mobile `ios` / `android` package scripts after prebuild rewrites them. Start Metro:
`npx expo start --dev-client --port 8090 --localhost`. Android needs `adb reverse tcp:8090 tcp:8090`.
Swift arithmetic checks, from the repo root:

```sh
xcrun swiftc apps/mobile/targets/watch/SurfaceModels.swift \
  apps/mobile/test/native/watch-model/main.swift -o /tmp/worktime-watch-model-test
/tmp/worktime-watch-model-test
```

Pay design page generation is documented in `design/figcraft/src/screens_pay.py`; run against
the original 15-page document once. The committed design already includes the page.
