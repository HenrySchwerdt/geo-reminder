# Architecture — one codebase for iPhone and Android, native watches

## Decision
* **Phone apps (iOS + Android): React Native with Expo** (SDK 58, development builds, Expo Router, TypeScript).
  One codebase, one design system, native modules where needed.
* **Watch apps: native.** React Native cannot run on watchOS or Wear OS. Both watch apps are small, glanceable
  and state-driven, so native code is the right tool:
  * **Apple Watch** — SwiftUI, added as a target of the iOS app via a config plugin (`@bacons/apple-targets`),
    so `expo prebuild` keeps generating the Xcode project. Complications and Smart Stack via WidgetKit.
  * **Wear OS** — Kotlin + Compose for Wear OS, a separate Gradle module in the generated Android project
    (config plugin), tiles + complications via the Wear OS Tiles / Complications APIs.
* **Shared contract instead of shared code:** phone and watches exchange the same event format (below) and the
  watches never compute balances — they show what the phone sends and queue state changes.

```
packages/core            pure TypeScript: geofence engine, time math, event model (tested with Vitest)
packages/design-tokens   colours (light/dark), type, spacing, radii, icon mapping — consumed by the app
apps/mobile              Expo app (iOS + Android): UI, SQLite, notifications, background location task
  targets/watch          SwiftUI watchOS app + WidgetKit complications (milestone 4)
  wear/                  Compose for Wear OS app + tiles (milestone 4)
```

## Data model (local-first)
Append-only event log in SQLite (`expo-sqlite`):

```ts
type Event = {
  id: string;          // ULID
  type: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut' | 'edit' | 'delete';
  at: string;          // ISO instant (UTC)
  tz: string;          // IANA zone at the time of the event
  workplaceId?: string;
  source: 'app' | 'notification' | 'watch' | 'widget' | 'liveActivity' | 'manual' | 'geofence';
  ref?: string;        // event that an edit/delete refers to
};
```
Sessions, days, balances are derived (pure functions in `packages/core`).

## Watch sync
| | iPhone ↔ Apple Watch | Android ↔ Wear OS |
|---|---|---|
| Transport | WatchConnectivity (`transferUserInfo` for events, `applicationContext` for state) | Wearable Data Layer (`DataClient` for state, `MessageClient` for commands) |
| Phone side | small Expo module (Swift) bridging to JS | small Expo module (Kotlin) bridging to JS |
| Offline | watch queues events, phone merges by timestamp, conflicts shown in History | same |

## Platform differences the UI handles
| | iOS | Android |
|---|---|---|
| Glass | Liquid Glass via `expo-glass-effect` / blur | Material 3 surfaces with tonal elevation (no fake glass) |
| Navigation | floating capsule tab bar | Material 3 navigation bar |
| Live status | Live Activity + Dynamic Island (ActivityKit, Swift target) | ongoing notification with chronometer + actions |
| Widgets | WidgetKit (Swift target) | Glance app widgets (Kotlin) |
| Quick actions | Control Center controls, App Intents | Quick Settings tile |
| Background location | region monitoring + location updates | Geofencing API + foreground service while sampling |

Shared: all screens, flows, data, the geofence engine, notifications (expo-notifications with action categories).

## Milestones
1. ✅ Product design (this repo's `design/`).
2. ✅ **Core + app shell**: `packages/core` geofence engine with tests, Expo app with tabs, Today screen
   with manual clock in/out/break, local persistence, workplace setup, background geofencing task.
3. Calendar, corrections, insights, onboarding, notifications with actions.
4. Widgets / Live Activity (Swift), Glance widgets + ongoing notification (Kotlin), watch apps.
5. Device testing (battery, OEM background limits), accessibility, store submission.
