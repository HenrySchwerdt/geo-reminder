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

## What's in this milestone

| Area | Status |
|---|---|
| Tabs (Today, Calendar, Insights, Settings) — Liquid Glass tab bar on iOS 26, Material on Android | ✅ |
| Today: clock in / break / clock out, live timer, day ribbon, expected end incl. legal break, week bars, balance | ✅ |
| Local-first storage: append-only event log in SQLite | ✅ |
| Workplaces with reminder rules (dwell time, time window, days, departure delay) | ✅ |
| Adaptive geofencing (`@worktime/core` engine + `src/location`): OS regions, distance-scaled sampling, precision profiles, GPS budget, diagnostics | ✅ needs on-device verification |
| Reminder notifications with “Clock in at 08:44” actions | ✅ actions open the app; fully-background actions need a native extension |
| Calendar editing, corrections, onboarding, Live Activity, widgets, watch apps | next milestones |

## Structure

```
src/app/                 routes (Expo Router)
  (tabs)/                Today, Calendar, Insights, Settings
  workplace/[id].tsx     workplace + reminder rules editor
  location.tsx           precision profile, live engine status, permission state, event log
src/location/            background tasks, engine runner (effects → expo-location / notifications), permissions
src/data/                SQLite event log (db.ts, web preview: db.web.ts), store, clock actions
src/components/          UI kit mirroring the FigCraft design system, day ribbon and charts
src/theme/               tokens from @worktime/design-tokens, SF Symbol / Material Symbol map
```

App icons in `assets/images` are exported from the FigCraft Brand page (`design/figcraft/src/export.py`).
