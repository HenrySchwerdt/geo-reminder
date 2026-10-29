# User flows

Screen numbers refer to the captions in `design/figcraft/worktime.figcraft` and the files in
`design/exports/`. The *Flows* page shows these as diagrams; the *Prototype* tab links the real screens.

## Flow 1 — First-time setup
Install → **Welcome (19)** → **Working hours (20)** → **Location explained (21)** → iOS prompt →
**Notifications explained (22)** → iOS prompt → **Workplace (23)** → **Ready (24)** → Today (1).

* Every permission is explained *before* the system prompt; “Not now” never blocks onboarding.
* Location: request *When In Use* first, then upgrade to *Always* when the first workplace is saved (iOS shows
  the upgrade prompt later; screen 21 sets expectations).
* Skipping the workplace leads to time-based reminders only.

## Flow 2 — Arriving at work
Region **enter** event → local notification **(15)** with actions *Clock in at 08:44*, *Clock in now*,
*Not working today* → session starts (2) → Live Activity (38) and Island (39) where allowed.

* Opening the notification instead shows the clock-in sheet **(4)** with *Arrived 08:44 / Now / Other*.
* “Not working today” suppresses further arrival reminders for that workplace today.
* If the event arrives late or the notification is ignored, Today shows **Missed check-in (29)** the next time
  the app opens.

## Flow 3 — Leaving work
Region **exit** → wait 15 min (debounce; re-entry cancels) → notification **(16)**: *Clock out at 17:29*,
*Clock out now*, *Still working* → day summary in **Day details (7)**. In-app: clock-out sheet **(5)** shows
worked time, breaks, overtime and the day ribbon before confirming.

## Flow 4 — Home-office day
Weekly pattern says Home **(17)** → 09:00 time-based reminder if not clocked in → start (2) → break (3) →
end break → after 8 h 30 m or at 18:00 a stop reminder → clock out (5).

## Flow 5 — Forgotten check-in / check-out
Calendar **(6)** marks the day red → tap → **Incomplete entry (30)** proposes the last time Worktime saw you at
the workplace → accept, or *Choose another time* → **Add / edit (9)** with live impact preview → Save →
toast with Undo **(32)**. Overlaps open **Conflict (31)** with three explicit resolutions.

## Flow 6 — Apple Watch
Open app **(33)** → *Clock in* → **active (34)** with ring and ribbon → optional break **(35)** → clock-out prompt
**(36)** → events sync to iPhone (queued `transferUserInfo`, applied in order). Complications **(37)** show
state and progress.

## State model
```
           clock in                 start break
  Off ───────────────▶ Working ─────────────────▶ OnBreak
   ▲                     │  ▲                       │
   │      clock out      │  └──────── end break ────┘
   └─────────────────────┘
```
Every transition is an **event** (`clockIn`, `breakStart`, `breakEnd`, `clockOut`, `edit`, `delete`) with an
instant, timezone, source (`app`, `notification`, `watch`, `widget`, `liveActivity`, `manual`) and optional
workplace. Sessions and totals are derived; edits append events, which is what powers the History list.
