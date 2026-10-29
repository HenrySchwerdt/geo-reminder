# Worktime

A calm, privacy-first work-time tracker for iPhone, Apple Watch and the Lock Screen.
It reminds you to clock in and out when you arrive at or leave work, and keeps an accurate record that you
can always correct.

> **Status: Milestone 1, product design.** The app itself is not implemented yet. This repository has
> the complete UX and visual design as editable FigCraft files, plus exports, specifications and research.

![Today](design/exports/iphone/core/Today%20·%20Working.png)

## What's here

```
design/
  figcraft/worktime.figcraft      ← the editable design file (FigCraft, open source)
  figcraft/src/                   ← generator: build.py writes the .figcraft, export.py the PNGs
  exports/                        ← PNG previews (@2x) per area + page overviews
    iphone/{core,places,onboarding,states,dark,directions}
    watch/  widgets/  overview/  design-system/
  references/                     ← research reference previews
docs/
  product/requirements.md         ← requirements → screens
  product/user-flows.md           ← six journeys + state model
  product/technical-constraints.md← iOS limits that shape the UX
  design/research.md              ← Kombai + Liquid Glass research
  design/design-system.md         ← tokens, type, components, icons (SF Symbol mapping)
  design/decisions.md             ← design decisions and trade-offs
packages/design-tokens/tokens.json← colours (light/dark), type, spacing, radii, icons
apps/  packages/core/             ← reserved for later milestones (React Native / watchOS / domain logic)
```

## Pages in `worktime.figcraft`

| Page | Contents |
|---|---|
| Cover | Overview |
| Design System | Colour variables (Light/Dark), type and effect styles, spacing and radii, 109 icon components, UI components with variants |
| Flows | Six user-journey diagrams |
| iPhone · Core | Today (off / working / break), clock-in/out sheets, calendar, day details, edit, add missed day, weekly and monthly insights |
| iPhone · Places & Schedule | Settings, workplaces, add workplace, geofence radius, arrival/departure notifications, weekly pattern, reminders |
| iPhone · Onboarding | Welcome, working hours, location and notification permission explanations, workplace setup, completion |
| iPhone · System States | Empty, loading, permission denied, location unavailable, missed check-in, incomplete entry, conflict, confirmation and error |
| Apple Watch | Main, active, break, clock-out prompt, complications |
| Live Activity & Widgets | Lock Screen Live Activity and widgets, Dynamic Island (compact, minimal, expanded), Home Screen widgets |
| Directions | The three explored visual directions |
| Dark Mode | Key screens in dark appearance |

The main journeys are linked in FigCraft's Prototype tab (onboarding chain, clock in, break, clock out,
fixing a missing day).

## Working with the designs

FigCraft is an open-source design app (<https://github.com/storytold/figcraft>). Open the file in the desktop
app, or work headless with the CLI:

```bash
cd design/figcraft/src
python3 build.py screens_core screens_places screens_onboarding screens_apple flows   # regenerate .figcraft
python3 export.py                                                                      # regenerate PNGs
```

`build.py` needs `figcraft-cli` on the `PATH`. The document is generated from code, so make changes in
`design/figcraft/src/` and rebuild. Hand edits made in FigCraft get overwritten on the next build unless
you port them back to the generator.

## Recommended implementation sequence
1. **Domain core** (`packages/core`): event log, session/day derivation, balance, time zones, break rules (unit tested).
2. **Expo app shell**: tabs, design tokens, Today with manual clock in/out/break, SQLite persistence.
3. **Calendar & corrections**: day details, edit/add/delete with impact preview, history, conflict detection.
4. **Notifications + geofencing** (Swift module): region monitoring, debounce, actionable notifications, reconciliation.
5. **Insights**: week/month, charts.
6. **Widgets & Live Activity** (WidgetKit/ActivityKit + App Intents).
7. **Apple Watch** (SwiftUI + WatchConnectivity) and complications.
8. **Onboarding, export/backup, accessibility pass** (Dynamic Type, VoiceOver, Reduce Transparency).

## Credits
Icons: [Phosphor Icons](https://phosphoricons.com) (MIT) as design stand-ins for SF Symbols.
Typeface in the design files: Inter (OFL) as a stand-in for SF Pro.
