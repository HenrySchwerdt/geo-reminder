# Worktime — iOS & Android app (Expo)

Expo SDK 58 · Expo Router · TypeScript · React Compiler. One codebase for iPhone and Android phones; the
watch apps are native (see `docs/technical/architecture.md`).

## Run

```bash
npm install            # from the repository root (npm workspaces)
cd apps/mobile
npx expo run:ios       # or: npx expo run:android — a development build is required
```

Background location, geofencing and notification actions need a **development build** (not Expo Go) and a
real device. `npx expo start --web` runs a browser preview of the UI with local-storage data and no location.

## Features

| Area | Status |
|---|---|
| Tabs (Today, Calendar, Insights, Settings): Liquid Glass tab bar on iOS 26, Material on Android | ✅ |
| Today: clock in / break / clock out, live timer, day ribbon, expected end with your break rules, week bars, balance | ✅ |
| Clock-in / clock-out sheets (Arrived 08:44 / Now / Other, day summary, break warning); missed check-in / check-out cards | ✅ |
| Calendar: month grid, day details, history, edit / add / delete sessions with impact preview and undo (append-only) | ✅ |
| Insights: week, month (heat strip, averages) and year, with balance | ✅ |
| Time zones: sessions keep the zone and day they started in; night shifts count to their start day | ✅ |
| Workplaces with reminder rules (dwell time, time window, days, departure delay) | ✅ |
| Adaptive geofencing (`@worktime/core` engine + `features/geofencing`): OS regions, distance-scaled sampling, precision profiles, GPS budget, diagnostics | ✅ needs on-device verification |
| Reminder notifications with “Clock in at 08:44” actions | ✅ actions open the app |
| Time-based reminders (start / stop / missing check-out) for Home days and when location is off (`features/reminders`) | ✅ needs on-device verification |
| Settings: working hours and weekly pattern, break rules, reminders, appearance, Live Activity toggle | ✅ |
| Monthly PDF report (`expo-print`) | ✅ |
| Onboarding with prominent background-location disclosure | ✅ |
| Your data: CSV / JSON export, validated backup import, delete all; privacy screen | ✅ |
| Release: EAS profiles, privacy manifest, store docs (`docs/release`) | ✅ |
| Widgets (iOS Home / Lock Screen, Android), Live Activity & Dynamic Island, Android ongoing notification (`expo-widgets`, `features/surfaces`) | ✅ needs on-device verification |
| Apple Watch app + complications (`targets/watch*`, `modules/watch-bridge`) | ✅ compile in Xcode, verify on device |
| Wear OS app + tile + complications (`apps/wear`, `modules/wear-bridge`) | ✅ builds, verify on device |

## Architecture

* `@worktime/core`: pure domain logic with zod schemas as the single source of types, plus the geofence engine,
  time math, the append-only ledger and export. It is unit-tested.
* `src/features/<feature>`: Zustand stores (persisted synchronously to the SQLite key-value store and validated
  with zod on rehydrate), actions, pure planners and feature components.
* `src/app`: thin Expo Router routes. `src/shared`: UI kit, theme tokens, icons, storage helpers.
* Data never leaves the device. The event log is append-only SQLite with migrations; corrections supersede,
  they never overwrite.

Run `npm test` from the repo root (core + app logic), `npx tsc --noEmit` and `npx expo lint` here. CI runs all
of them plus `expo-doctor` and the iOS/Android bundles.

## Structure

```
src/app/                 routes: (tabs), onboarding/, clock/{in,out}, day/[date], session/[id], workplace/[id], settings screens, location, data, privacy
src/features/tracking    event log (SQLite), store, selectors, clock actions
src/features/history     calendar model, correction planning, day/session components
src/features/geofencing  background tasks, engine runner, permissions, engine store
src/features/onboarding  steps, disclosure copy, gate
src/features/data        CSV/JSON export, import, delete all
src/features/clock       clock-in/out sheets, missed check-in/out cards
src/features/insights    week / month / year models
src/features/surfaces    snapshot hub + adapters: widgets & Live Activity, Apple Watch, Wear OS, reminders
src/features/settings, workplaces, notifications, reminders (time-based planner + scheduling)
modules/                 local Expo modules: watch-bridge (iOS), wear-bridge (Android)
targets/                 Apple Watch app + complications (@bacons/apple-targets)
src/shared               UI kit, charts, theme tokens, icons, storage/persistence helpers
```

App icons in `assets/images` are exported from the FigCraft Brand page (`design/figcraft/src/export.py`).
