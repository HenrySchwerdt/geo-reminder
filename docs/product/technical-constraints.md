# Technical constraints that shape the UX

Target stack for later milestones: React Native + Expo (dev builds), TypeScript, Swift modules for native
integrations, SwiftUI for watchOS, WidgetKit, ActivityKit, Core Location, UserNotifications, SQLite.
Items marked **verify** must be confirmed with a prototype on device before implementation decisions are final.

## Geofencing (Core Location)
* **Region monitoring is event-driven and coarse.** Use `CLMonitor` (iOS 17+) or `CLCircularRegion`
  monitoring. Practical accuracy is ~100–200 m; events can arrive seconds to several minutes late, and
  occasionally not at all (no signal, Low Power Mode, airplane mode).
  → UX: radius 100–500 m with a warning below 100 m (14); the *detected* time is offered as the default
  answer (4, 5, 15, 16); missed events are reconciled on next launch (29, 30).
* **Limit of 20 monitored regions per app.** Plenty for workplaces; enforce a soft limit in the UI.
* **Background delivery requires “Always” authorization.** iOS first grants *When In Use*; the *Always* upgrade
  prompt appears later and can be declined → screen 21 explains, 27 recovers, time-based reminders are the
  fallback.
* On an event the app is (re)launched in the background with a short execution window — enough to write the
  event to SQLite and schedule a local notification, nothing more. No network is needed.
* Behaviour after the user force-quits the app differs from normal termination — **verify** on current iOS.
* Exit events bounce (walking out for lunch, GPS drift) → 15-minute debounce before a departure reminder,
  cancelled on re-entry; duplicates merged (18).

## Notifications
* Local notifications with a category of up to 4 actions; we use 3. Actions like “Clock in at 08:44” carry
  the time in `userInfo`, so they are composed when the event happens.
* Background actions (no `.foreground` option) run briefly in the app process — enough to append an event.
  Use `.authenticationRequired` for none of them (they are low risk); “Not working today” is `.destructive`.
* Time-sensitive interruption level for arrival/departure reminders (user can disable). No remote push.

## Live Activities & Dynamic Island (ActivityKit)
* A Live Activity can be active for **up to 8 hours**, then the system ends it; an ended activity can stay on the
  Lock Screen for up to 4 more hours. A normal workday exceeds 8 h → the activity is started at clock-in and,
  if it is ended by the system, the widget and the clock-out reminder take over (copy on screen 39).
* Starting an activity requires the app to be in the foreground or an App Intent that is allowed to start one
  (`LiveActivityIntent`) — whether clock-in from a **notification action** can start it must be **verified**;
  the fallback is to start it the next time the app or widget runs.
* The running timer uses `Text(timerInterval:)` so it counts without updates. The day ribbon is re-rendered
  only on events (break start/end), well within update budgets.
* Buttons in the Live Activity / Island are App Intents (iOS 17+).

## Widgets (WidgetKit)
* Timelines have a daily refresh budget; the app calls `WidgetCenter.reloadAllTimelines()` after every event.
* Live counting uses timer text styles, not frequent reloads.
* iOS 26 renders widgets in default, tinted and clear styles: layouts avoid relying on colour alone (state
  is also expressed by text and shape) — see “Small · Clear” on screen 40.
* Interactive widget buttons (Clock out) are App Intents.

## Apple Watch
* SwiftUI watchOS app; shares the event model. Sync with `WatchConnectivity`: `transferUserInfo` for events
  (queued, delivered in order, survives unreachability), `updateApplicationContext` for current state.
* The watch can clock in/out while the phone is unreachable; events are merged by timestamp on the phone.
  Conflicts (e.g. clock-out on both devices) resolve to the earliest clock-out and are shown in History.
* Complications via WidgetKit (accessoryCircular / Rectangular / Corner / Inline).

## Time correctness
* Store instants in UTC plus the IANA time zone at the event. Day boundaries are computed in the zone where
  the session started; sessions across midnight belong to their start day (configurable later).
* DST days: durations come from instants, never from wall-clock subtraction.
* Expected end = start + target daily hours + planned break − breaks taken − already worked; recomputed on
  every event.
* Break rules default to the German ArbZG (30 min after 6 h, 45 min after 9 h) and are configurable.

## Persistence & privacy
* SQLite (e.g. `expo-sqlite`) with an append-only `events` table and derived `sessions`/`days` views.
* No account, no analytics SDK, no server. Optional backup is a file written to iCloud Drive / Files; export
  as CSV and PDF.
* Store workplace coordinates (user-entered) but never the user's own location fixes.

## App lifecycle
* Nothing in the design depends on continuous background execution: reminders come from region events and
  scheduled local notifications; timers are system-rendered.
* On every launch/foreground: reconcile pending region events, incomplete days and watch events, then show at
  most one question (priority: conflict > missed check-in > incomplete day).
