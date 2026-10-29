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
