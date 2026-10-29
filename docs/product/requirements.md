# Worktime — Product requirements (Milestone 1)

Worktime is a minimal, privacy-first work-time tracker for iPhone, with an Apple Watch companion, Live Activities
and widgets. Guiding principle: **tracking should need as little interaction as possible.**

## Audience
People who work in offices, remotely or hybrid, who forget to clock in or out, and who want an accurate,
editable record of their hours and overtime without enterprise software.

## Priorities (in order)
1. Effortless tracking 2. Beautiful, intuitive UX 3. Reliable reminders 4. Accurate, editable records
5. Privacy / local-first 6. Native Apple integration 7. Minimal configuration

## Information architecture
Four tabs in a floating Liquid Glass tab bar:

| Tab | Purpose | Key screens |
|---|---|---|
| **Today** | Main interaction surface: state, elapsed time, primary action, how the day is going | 1–5, 28, 29 |
| **Calendar** | History, corrections, missing days | 6–9, 25, 30–32 |
| **Insights** | Week / month / year summaries, balance | 10, 11, 26 |
| **Settings** | Hours, breaks, workplaces, pattern, reminders, appearance, data | 12a–18, 27 |

The **Today** screen answers, in this order: *Am I working?* (status pill, colour) → *How long?* (timer) →
*How is my day going?* (day ribbon, expected end) → *What can I do?* (one or two capsule buttons).

## Functional requirements → screens

### A. Work time tracking
| Requirement | Design |
|---|---|
| Start/stop session, start/end break | Today 1–3, Watch 33–35, Live Activity 38, Island 39 |
| Current elapsed time, today total | Today timer + week card; widgets 40 |
| Daily / weekly / monthly summaries | Day details 7, Insights 10–11 |
| Overtime vs expected hours, expected end | Today stats, balance in week card, month balance chart |
| Edit / delete / create entries | Edit session 8, Add missed day 9, delete confirmation 32 |
| Backdate missed check-ins/outs | Confirmation sheets offer *arrived/left* vs *now*; 9, 29, 30 |
| History without losing integrity | Day details “History” list; edits are new events, originals are kept |

### B. Geolocation reminders
* Multiple workplaces with name, location, radius (100–500 m), arrival/departure reminders, optional days (12–14).
* **Confirmation-based by default** — entering a geofence produces a *question*, never an entry (15, 16, 4, 5).
* Imprecision handled explicitly: the time the event was detected is offered as a suggestion (“Clock in at 08:44”),
  late events are reconciled (29 “Did you start at 08:44?”), repeated exits/entries within 15 min are merged
  (16, 18), unavailable location is surfaced (28), denied permission degrades to time-based reminders (27).

### C. Home office
Weekly pattern per weekday: Office / Home / Flexible / Off (17). Home days use time-based reminders (start at
09:00 if not clocked in; stop after 8 h 30 m or 18:00). No calendar-style scheduler.

### D. Corrections (core feature)
* Add a whole missed day, change check-in/out, add/edit breaks, fix wrong sessions (8, 9, 30, 31).
* Every correction shows its **impact on worked time and balance before saving** (8 “What changes”, 9 footer).
* Destructive actions confirm and offer undo (32). Incomplete days don't count until fixed (30).

### E. Overview
Today, week, month, balance, expected vs actual, sessions, calendar (6, 7, 10, 11). Charts are quiet:
bars with a dashed target line, a month heat strip, one balance line.

### F. Apple Watch
Clock in/out, breaks, active time, today total, complications, sync (33–37), arrival notification with
actions (37a), today summary (37b), Smart Stack widget (37c), offline state with queued sync (37d).
The watch never edits history.

### G. Lock Screen & Dynamic Island
Live Activity with interactive buttons (38), Dynamic Island compact/minimal/expanded (39), Lock Screen circular
and rectangular widgets (38), Home Screen small/medium/large and clear-style widgets (40). The **Widgets**
page has every family on its own in light and dark, including interactive widgets (clock in, break, clock out),
Lock Screen accessories, Control Center controls and StandBy.

### H. Settings
Working hours, workdays, breaks, workplaces, pattern, reminders, appearance, Apple Watch, export (CSV/PDF),
backup (iCloud Drive file, optional), privacy (12a).

### I. Privacy
No account, no mandatory cloud, no analytics SDKs, no continuous GPS. Only region enter/exit events are used and
only the timestamp + workplace id is stored — never coordinates of the user.

## Sample data used in the designs
Lena works 40 h/week at *Studio Kreuzberg* (Oranienstraße 24, Berlin, 150 m radius) Mon/Wed/Fri and from home
Tue/Thu. “Today” is Thursday 16 October 2025, 15:12; clocked in 08:47, break 12:30–13:05, balance +6 h 20 m.
