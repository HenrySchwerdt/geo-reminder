# Geofencing: accurate reminders without draining the battery

Goals: users decide **when** they get reminded, reminders work **in the background**, and the app samples
location **rarely when far away and more often close to a workplace**, so it is precise at the fence and almost
free everywhere else.

Implementation: `packages/core/src/geofence/` (pure TypeScript reducer, 14 tests incl. a commute simulation).
Platform glue: `apps/mobile/src/location/` (expo-location + expo-task-manager).

## 1. Three rings per workplace

```
            approach ring  (fence + 3 km)  ── OS region: wakes the app, costs ~nothing
          ┌───────────────────────────────┐
          │      near ring (fence + 600 m) ── OS region: switch to precise sampling
          │    ┌─────────────────────┐    │
          │    │   fence (100–500 m) │    │  ── decides inside / outside (with hysteresis)
          │    │        ● pin        │    │
          │    └─────────────────────┘    │
          └───────────────────────────────┘
   far: no GPS at all — only the OS watches the approach ring
```

| Zone | What runs | Accuracy | Interval |
|---|---|---|---|
| **far** (beyond approach ring) | nothing — OS region monitoring only | – | – |
| **approach** | location updates | low / balanced (Wi-Fi, cell) | `clamp(distance ÷ speed × ½, 2 min, 10 min)` |
| **near** | location updates | high (GPS) | `clamp(distance ÷ speed × ½, 20 s, 90 s)` |
| **inside**, dwell pending | location updates | balanced | until the dwell time is confirmed (≤ 2 min) |
| **inside**, decided | nothing — OS exit region wakes us | – | – |
| **outside**, departure pending | location updates | balanced | until the departure delay passes (≤ 2 min) |

*Interval = half the time it would take to reach the fence at the current speed.* Driving at 50 km/h, 2 km away,
gives 72 s (raised to the 2-minute minimum); walking at 5 km/h, 400 m away, gives ~2.5 min (capped at 90 s);
standing at the door gives the 20-second minimum. Speed comes from the fix; if unknown, 50 km/h is assumed, which
errs on the side of sampling too often.

Ring sizes and limits are chosen by the user as a **precision profile** (Settings › Location):

| Profile | Approach / near ring | Near interval | High-accuracy budget / day |
|---|---|---|---|
| Battery saver | 2 km / 400 m | 1–4 min, balanced accuracy | 15 min |
| **Balanced** (default) | 3 km / 600 m | 20–90 s, GPS | 40 min |
| Precise | 5 km / 900 m | 10–30 s, GPS | 90 min |

When the daily high-accuracy budget is used up (e.g. the user circles the block looking for parking), the engine
falls back to balanced accuracy and says so on the diagnostics screen.

### Measured in the simulation (12 km commute, last 600 m on foot)
`packages/core/test/simulation.test.ts`

| Profile | Fixes / hour | High-accuracy fixes | vs. GPS every 5 s | Arrival-time error |
|---|---|---|---|---|
| Battery saver | 9 | 4 | 1 % | 23 s |
| Balanced | 14 | 8 | 2 % | 0 s |
| Precise | 23 | 15 | 3 % | 0 s |

Balanced timeline: off for 17 min → approach ring at 2.8 km (every 2 min) → near ring at 660 m (every 20–90 s
depending on walking speed) → inside → 3-minute dwell confirmed → off.

## 2. Deciding inside / outside

* **Enter** only if the whole 50 %-accuracy circle is inside: `distance + accuracy/2 ≤ radius`.
* **Leave** only if clearly outside: `distance − accuracy/2 > radius + 40 m` (hysteresis against GPS drift).
* Fixes with accuracy worse than 1.5 × radius **cannot change** the state.
* The **arrival / departure time** is interpolated between the last fix outside and the first fix inside (gaps over
  20 min are not interpolated). This is the time offered as the default answer: “Clock in at 08:44”.
* OS fence events (when no fix is available, e.g. the app was asleep) are accepted with their timestamp.

## 3. Reminder rules the user controls (per workplace)

| Rule | Default | Purpose |
|---|---|---|
| Arrival reminder on/off | on | |
| Ask after being inside for **N min** | 5 min | filters walking past, a quick coffee across the street |
| Only between **from–to** | 06:00–11:00 | no clock-in question when you drop by in the evening |
| Departure reminder on/off | on | |
| Ask after being outside for **N min** | 15 min | lunch walks and smoking breaks never trigger it |
| Only when clocked in here | on | |
| Active days | Mon–Fri (or the weekly pattern) | |
| Precision profile (global) | Balanced | battery vs. accuracy |

Further rules built into the engine:
* at most one arrival question per workplace per day; clocking in anywhere answers it everywhere;
* coming back within the departure delay cancels the pending question; coming back after it **withdraws** the sent
  notification;
* workplaces with no due reminder (not a workday, already clocked in, reminders off) are **not monitored at all** —
  no regions, no sampling.

## 4. Platform mapping (expo-location / expo-task-manager)

| Engine output | iOS | Android |
|---|---|---|
| `regions` effect | `Location.startGeofencingAsync` → CLLocationManager region monitoring (max 20 → engine caps at 18: fences first, then near, then approach rings of the nearest workplaces) | same API → Play Services Geofencing (max 100) |
| `sampling: off` | `stopLocationUpdatesAsync` | `stopLocationUpdatesAsync` |
| `sampling: coarse/fine` | `startLocationUpdatesAsync({ accuracy, timeInterval, distanceInterval, pausesUpdatesAutomatically, activityType: Other, showsBackgroundLocationIndicator: false })` | same, with `foregroundService` notification (“Worktime is checking your arrival”) — only while sampling |
| `notify` | local notification with category actions | notification channel with actions |
| background wake-up | region events relaunch the app even after termination (not after the user force-quits it) | geofence transitions via broadcast; Android 8+ limits background location to a few fixes per hour **unless** a foreground service runs — that's why sampling uses one, only near a fence |

Both platforms need **“Always” / “Allow all the time”** location permission for background events; without it the
app falls back to time-based reminders (screen 27).

Every decision is a pure function `step(state, input) → {state, effects}`; the background task persists the state
(SQLite/MMKV) between wake-ups. Because of that, the same engine runs in tests, in the app and in a simulator, and
the diagnostics screen can show *why* it is sampling (“Near Studio Kreuzberg (350 m), every 45 s”).

## 5. Things to verify on real devices
* iOS region event latency with Wi-Fi off; behaviour after force-quit; whether `startLocationUpdatesAsync` may be
  started from a region-event wake-up (expected: yes, with “Always” and the `location` background mode).
* Android OEM battery managers (Samsung, Xiaomi) killing the foreground service → onboarding hint to exempt the app.
* Real battery drain over a week per profile (Xcode Energy Log / Android Battery Historian).
