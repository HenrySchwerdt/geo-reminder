# Handover: iOS, widgets and design QA on the Mac (Codex)

You are taking over Worktime on a Mac with Xcode and simulators. Everything has been written and checked
on Linux, but **nothing has run on iOS yet and none of the Swift has been compiled.** Your job:

1. Get the iPhone app, the widget extension and the Apple Watch app to build and run in the simulators.
2. Test the app's flows on iOS and fix what's broken.
3. Test widgets, the Live Activity / Dynamic Island and the Apple Watch app.
4. Compare every screen with the FigCraft design and fix visible differences.
5. Write down what you found and what you changed in `docs/qa/ios-report.md`, and open a PR to `main`.

Read [AGENTS.md](../../AGENTS.md) first (conventions and checks), then
[architecture](../technical/architecture.md), [surfaces](../technical/surfaces.md) (widgets, Live Activity,
watch: contract and what to verify) and [user flows](../product/user-flows.md).

## Where things stand

| Part | Status before you |
|---|---|
| Domain core (`packages/core`) | Done; ~45 unit tests (time zones, DST, ledger, export, surfaces, geofence engine). |
| iPhone/Android app (`apps/mobile`) | Feature-complete; ~100 unit tests; all flows clicked through in a web build. Never run on iOS. |
| Android | Full debug APK builds (incl. widgets + Wear bridge). Not run on a device. |
| Widgets + Live Activity (`expo-widgets`) | Layouts written in JS (`src/features/surfaces/widgets/`); `expo prebuild` generates the extension. **Not compiled.** |
| Apple Watch (`apps/mobile/targets/watch`, `watch-widget`, `modules/watch-bridge`) | SwiftUI written; `swiftc -parse` clean; **not compiled against the SDKs.** |
| Wear OS (`apps/wear`) | Builds, 22 JVM tests pass. Not your scope. |

## Setup

Requirements: macOS with Xcode 26 (iOS 26 SDK; Liquid Glass tab bar needs iOS 26), the iOS and watchOS
simulator runtimes, CocoaPods, Node 22, npm 11.

```bash
git checkout main && git pull           # if PR #1 isn't merged yet: git checkout claude/sweet-volta-d06ukj
git checkout -b codex/ios-qa
npm install
npm test && npm run typecheck           # must be green before you start
cd apps/mobile
npx expo prebuild --platform ios --clean
git checkout package.json               # prebuild rewrites the ios/android scripts; don't commit that
npx expo run:ios                        # builds the dev client and boots an iPhone simulator
```

* Simulator builds don't need a signing team. For a device, set `expo.ios.appleTeamId` in `apps/mobile/app.json`.
* Targets in `xed ios`: **Worktime** (the iPhone app), **ExpoWidgetsTarget** (widgets and Live Activity),
  **WorktimeWatch** and **WorktimeWatchWidget** (watch app and complications). All four share the App Group
  `group.com.worktime.app`.
* `ios/` is generated. Fix native code at its source: `targets/*` (watch), `modules/watch-bridge` (WatchConnectivity),
  `src/features/surfaces/widgets/*` (widget layouts in JS) or the config in `app.json`, then run prebuild again.
* JS changes reload live with `npx expo start --dev-client`. Native changes need `npx expo run:ios` again.

### Compile problems to expect
The Swift was written without an SDK. Places most likely to need fixes:
- `containerBackground(for: .tabView)` inside a `TimelineView` (watch).
- `.tabViewStyle(.verticalPage)` with a `navigationTitle` per page (watch).
- `widgetLabel { ProgressView … }` on `accessoryCorner` (watch complication).
- The `Property` / `Events` DSL in `modules/watch-bridge/ios/*Module.swift` (ExpoModulesCore API).

Keep fixes minimal and idiomatic. If an API doesn't exist, use the closest supported one and note it in the report.

## Test data and simulator tools

```bash
node docs/handover/make-demo-backup.mjs > /tmp/worktime-demo.json   # 2 weeks of data around today
open -R /tmp/worktime-demo.json                                     # then drag it onto the simulator → Save to Files
```
In the app, go to Settings → Your data → Import backup → pick the file and turn on "Also restore settings". The demo data contains:
- a running session today since 08:47;
- a day without a check-out, which the calendar shows red;
- a corrected day with history;
- office and home days.

Useful commands:

```bash
xcrun simctl io booted screenshot ~/Desktop/today.png               # screenshots for the design comparison
xcrun simctl ui booted appearance dark                               # dark mode (light to go back)
xcrun simctl status_bar booted override --time 9:41                  # clean status bar like the designs
xcrun simctl privacy booted grant location-always com.worktime.app   # skip the location prompt
xcrun simctl location booted set 52.50166,13.41794                   # at the workplace (Studio Kreuzberg, 150 m)
xcrun simctl location booted set 52.5200,13.4050                     # ~2 km away
xcrun simctl location booted start --speed=1.4 52.5120,13.4100 52.50166,13.41794   # walk to work
SIMCTL_CHILD_TZ=America/New_York xcrun simctl launch booted com.worktime.app       # run in another time zone
xcrun simctl openurl booted "worktime://day/$(date +%F)"            # deep link (app must be running)
```
For repeatable UI flows, [Maestro](https://maestro.mobile.dev) works with the simulator. If you add flows, put them in
`apps/mobile/e2e/` (YAML) and document how to run them.

## 1 · App flows on iOS
Each check passes when the result matches the expected behaviour. Note anything that differs in the report.

| # | Flow | Expected |
|---|---|---|
| 1 | Fresh install → onboarding (`Welcome → Hours → Location → Notifications → Workplace → Ready`) | Every permission is explained before the system prompt, and "Not now" never blocks. Location asks *While Using* first; *Always* comes later. "Use current location" fills in the workplace. |
| 2 | Today: Clock in → Break → End break → Clock out | Status pill, timer (seconds tick), day ribbon, expected end (includes the required break), week bars. |
| 3 | "Clock out at another time…" sheet | Form sheet with detents; worked/breaks/overtime summary; break warning when less than required; Other time picker; can't pick a future time or one before the session started. |
| 4 | Calendar → red day → "Fix entry" | Suggested end, impact card ("What changes"), save, then undo banner for a few seconds. |
| 5 | Edit a past session, delete one, add a missed day | History list on the day shows every change; balance updates everywhere (Today week card, Calendar, Insights). |
| 6 | Insights Week / Month / Year | Numbers agree with Calendar; a day without a check-out counts for nothing. |
| 7 | Settings: working hours + weekly pattern, breaks, reminders, appearance, Live Activity toggle | Values persist across app restarts; Dark/Light apply app-wide, including the tab bar and pickers. |
| 8 | Data: CSV, JSON, PDF report, import, delete all | Share sheet opens. The PDF looks right (A4, month table). Import preview counts are right. Delete all returns to onboarding. |
| 9 | Geofencing with simulated location (workplace + far-away point, then the walk route) | Location screen shows the live status and sampling plan. Arrival reminder "Clock in at HH:MM" appears after the dwell time inside the arrival window. Departure reminder after leaving (15 min). The notification actions work. A plain tap opens the clock-in/out sheet. |
| 10 | Time-based reminders: set today to Home in the weekly pattern | Start reminder at the set time (set it 2 min ahead to test) with "Clock in now" / "Not working today". |
| 11 | Time zone: clock in, then relaunch with `SIMCTL_CHILD_TZ=America/New_York` | Session times stay in the original zone with a "Berlin time" note; Today shows the travel notice; past days don't move. |
| 12 | Accessibility: largest Dynamic Type, VoiceOver on Today and the sheets, Reduce Transparency | Nothing truncated or overlapping; buttons have labels. |

## 2 · Widgets, Live Activity, Dynamic Island
Design: `design/exports/widgets/` (incl. `gallery/`), `design/exports/overview/09-live-activity-widgets.png`,
`10-widgets.png`. Details and the tap-delivery table: [surfaces.md → Widgets & Live Activity](../technical/surfaces.md).

- Add the widgets to the simulator's Home Screen (long-press, then +) in each size: small, medium, Lock Screen circular,
  rectangular and inline. Or use Xcode's WidgetKit Simulator with the ExpoWidgetsTarget scheme.
- **States:**
  - not working
  - working: the timer counts without app updates
  - on break
  - after clock-out: the day total is shown
- **Medium widget button:** tap Clock in, Break and End break with the app in the foreground, in the background,
  and after it was killed. A tap recorded while the app was killed must be applied on the next launch.
- **Live Activity and Dynamic Island** (use an iPhone 17 Pro simulator):
  - It starts on clock-in and updates on break. The Break and Clock-out buttons work.
  - It ends about 5 minutes after clock-out.
  - It re-attaches after you kill and relaunch the app.
  - Turning off the Settings toggle ends it.
- Dark mode, tinted and clear styles (iOS 26 Home Screen customisation), StandBy (landscape while charging).

## 3 · Apple Watch
Design: `design/exports/watch/*.png`, `overview/08-apple-watch.png`.
- Pair a watch simulator with the iPhone simulator (Xcode → Devices and Simulators, or `xcrun simctl pair`). Run the
  **WorktimeWatch** scheme.
- **Phone to watch:** the state appears on the watch and follows changes made on the phone.
- **Watch to phone:** Clock in, Break and Clock out on the watch create events on the phone with `source: "watch"`.
  Each tap is applied once, even though it is sent twice.
- **Offline:** with the phone app killed, the watch shows "Will sync…". Its queued taps are applied in order with
  their original times on the next phone launch.
- **Complications:** circular, rectangular, corner and inline, plus the Smart Stack card. They update after each change.
- **Screen sizes:** 41, 45 and 49 mm.

## 4 · Design comparison (FigCraft)
The source of truth is `design/figcraft/worktime.figcraft`. PNG exports are in `design/exports/` (@2x).
Overview boards: `design/exports/overview/`. Tokens: `packages/design-tokens/tokens.json` (the app reads them
through `src/shared/theme`). Type, spacing and component rules: [design-system.md](../design/design-system.md).
FigCraft (<https://github.com/storytold/figcraft>) can open the file if you need exact measurements; the PNGs are
enough for most checks.

| Screen in the app | Route | Design export |
|---|---|---|
| Today (off / working / break) | `/` | `iphone/core/Today · Not working.png`, `Today · Working.png`, `Today · On break.png` |
| Clock-in / clock-out sheet | `/clock/in`, `/clock/out` | `iphone/core/Clock-in confirmation.png`, `Clock-out confirmation.png` |
| Calendar | `/calendar` | `iphone/core/Calendar · Month.png`, `states/State · Empty calendar.png` |
| Day details | `/day/<date>` | `iphone/core/Day details.png`, `states/State · Incomplete entry.png` |
| Edit session / add missed day | `/session/<id>`, `/session/new` | `iphone/core/Edit session.png`, `Add missed session.png`, `states/State · Conflicting entries.png` |
| Insights | `/insights` | `iphone/core/Insights · Week.png`, `Insights · Month.png` |
| Missed check-in card | `/` | `iphone/states/State · Missed check-in.png` |
| Settings | `/settings` | `iphone/places/Settings.png` |
| Workplaces / add workplace | `/workplace/<id>` | `iphone/places/Workplaces.png`, `Add workplace.png`, `Geofence radius.png`, `Arrival reminder.png`, `Departure reminder.png` |
| Weekly pattern / reminders | `/working-hours`, `/reminders` | `iphone/places/Home-office schedule.png`, `Reminder preferences.png` |
| Location status | `/location` | `iphone/geofencing/Geo · Live status.png`, `Geo · Precision & battery.png`, `Geo · How it works.png` |
| Onboarding | `/onboarding/*` | `iphone/onboarding/*.png` |
| Permission / error states | various | `iphone/states/State · Location denied.png`, `Location unavailable.png`, `Saved & error.png` |
| Dark mode | all | `iphone/dark/*.png` |
| Widgets / Live Activity | — | `widgets/*.png`, `widgets/gallery/*.png` |
| Watch | — | `watch/*.png` |

How to compare: same simulator size as the design (iPhone 17 Pro), status bar at 9:41, demo data. Put the
screenshot next to the export and check:
- layout and order
- type sizes and weights
- colours (light and dark)
- corner radii and spacing
- icons: SF Symbols on iOS, mapped in `src/shared/theme/icons.ts`
- copy

**Fix it** when the difference is a bug or easy to correct: wrong colour, spacing, missing state, wrong icon.

**List it in the report, don't fix it** when the app deliberately differs: a native control instead of a drawn
one, data that doesn't exist yet.

Known, accepted differences:
- The break ring on the watch shows day progress, not "of 30 min" (the snapshot carries no break target).
- The watch summary has no per-session rows; the watch never computes history.
- The medium widget has one button (Clock in / Break / End break).

## Report and hand-back
Create `docs/qa/ios-report.md` with:
- the environment (Xcode, simulators);
- a table per section above (check, result, screenshot path, fix commit or open issue);
- the build fixes you made;
- open items, ordered by severity.

Put screenshots in `docs/qa/screenshots/` (keep them small; PNG, one per finding).

Commit in small steps and run the checks from AGENTS.md before each commit. Push `codex/ios-qa` and open a
PR to `main`. Don't change the domain rules (append-only log, time zones, incomplete days) without writing
down why in the report.
