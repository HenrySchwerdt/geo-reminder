# Design system

Lives on the **Design System** page of `design/figcraft/worktime.figcraft` and is generated from
`design/figcraft/src/ds.py` + `lib.py`. A machine-readable copy is in `packages/design-tokens/tokens.json`.

## Principles
1. **Glass for controls, not content.** Liquid Glass (FigCraft `glass` effect + translucent fill + light rim)
   is used only on the floating layer: tab bar, toolbar buttons, notifications, sheets, Live Activity.
   Cards that carry numbers are opaque so time values stay legible.
2. **One accent, one meaning.** Green = working, amber = break, red = needs action, blue = home office.
   Nothing else is coloured.
3. **Numbers first.** Tabular figures everywhere; the timer is the largest element on the screen.
4. **The day ribbon** is the signature element: the same horizontal timeline appears on Today, sheets, day
   details, widgets, Live Activity, Dynamic Island and the watch.
5. **Concentric shapes.** Display corner → 40 pt sheets → 26 pt cards → 14–22 pt controls; capsules for buttons.

## Colour (variables, collection `Color`, modes Light / Dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `bg/canvas` | #F4F2EC | #0B0C0B | screen background (warm neutral, not pure white) |
| `bg/elevated` | #FFFFFF | #181A18 | cards, grouped lists |
| `bg/sunken` | #ECE9E2 | #222522 | secondary buttons, value chips |
| `bg/track` | #E4E1D9 | #2C302C | ribbon/ring tracks, off toggles |
| `text/primary` | #151715 | #F3F2ED | |
| `text/secondary` | #5D615C | #A7ABA5 | ≥ 4.5:1 on canvas and cards |
| `text/tertiary` | #8A8E88 | #73776F | axis labels, chevrons only (non-essential) |
| `accent` / `accent/soft` | #1E6B4F / #DDEBE3 | #5CC99B / #16362A | working |
| `break` / `break/soft` | #8F560A / #F6E8D2 | #F2B04E / #3A2B13 | breaks |
| `danger` / `danger/soft` | #A83226 / #F7E0DC | #FF6B5D / #3C1B17 | missing data, destructive |
| `info` / `info/soft` | #3559A6 / #E1E8F6 | #8CAAF2 / #1B2640 | home office |
| `glass/fill`, `glass/stroke`, `glass/lens`, `glass/tint` | translucent | translucent | Liquid Glass surfaces |
| `map/*` | | | stylised maps |

A third mode, `Exploration · Flat`, exists only to render visual direction C and is not part of the product.

**Contrast (WCAG, computed):** accent on white 6.4:1 · white on accent 6.4:1 · text/secondary on canvas 5.6:1 ·
accent on accent/soft 5.2:1 · break on break/soft 5.0:1 · danger on danger/soft 5.3:1 · info on info/soft 5.5:1.
Dark: accent on card 8.6:1 · secondary on card 7.5:1 · break on break/soft 7.2:1 · danger on danger/soft 5.5:1.
`text/tertiary` (3.0:1 light) is only used for non-essential labels such as chart axes and chevrons.
Reduce Transparency: glass tokens fall back to `bg/elevated` with a `separator` stroke.

## Typography (text styles)
Inter / Inter Display are used in the files as stand-ins for **SF Pro Text / SF Pro Display** (same metrics
class); the app uses the system font with Dynamic Type.

| Style | Spec | iOS text style |
|---|---|---|
| Display/Timer | Display Semibold 64/68, −2 %, tabular | custom, scales with Dynamic Type |
| Display/Large | Display Bold 34/41 | largeTitle |
| Title/1 · 2 · 3 | 28/34 Bold · 22/28 Semibold · 20/25 Semibold | title · title2 · title3 |
| Headline | 17/22 Semibold | headline |
| Body / Callout | 17/22 · 16/21 Regular | body · callout |
| Subhead (+Strong) | 15/20 | subheadline |
| Footnote (+Strong) | 13/18 | footnote |
| Caption / Caption Upper | 12/16 Medium · Semibold, uppercase +4 % | caption |
| Numeric/Large · Medium · Small | 28 · 20 · 15, tabular | monospacedDigit() |

## Spacing & radii (variables, collection `Spacing`)
4-pt base: 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40. Screen margin 16, card padding 20, list row padding 12/16.
Radii: 6 · 10 · 14 · 20 · card 26 · sheet 40 · capsule. Minimum touch target 44 × 44 (rows ≥ 56).

## Effects (effect styles)
* `Glass/Regular` — glass (refraction 0.55, depth 14, frost 8, dispersion 0.25) + soft drop shadow.
* `Elevation/Card` — two very soft shadows (1/2 and 8/24 at 4–5 %).

## Components
| Component | Variants / properties | Notes |
|---|---|---|
| iOS/Status Bar, iOS/Home Indicator | — | system chrome |
| Tab Bar | `Tab` = Today · Calendar · Insights · Settings | floating glass capsule, selected tab gets a lens |
| Glass Icon Button | nested `Icon` (swap) | 44 pt round glass control |
| Button | `Style` = Primary · Secondary · Glass · Break · Destructive · Ink; `Label`; `Show icon` | 52 pt capsule |
| Status Pill | `State` = Working · Break · Off · Alert; `Label` | always paired with a dot |
| Toggle | `On` | 63 × 28 |
| Chip | `Selected`; `Label` | weekdays, kind pickers |
| Segmented Control | `Selected` = Week · Month · Year | |
| List Row | `Title`, `Value`, `Show tile`, `Show chevron`, nested `Icon` | grouped lists |
| Section Header | `Label` | uppercase caption |
| Calendar Day | `State` = Default · Today · Selected · Missing · Off · Future; `Day`, `Hours` | 46 × 54 |
| Notification | `Title`, `Message` | glass card with app icon |
| Icons | 77 regular + 32 fill components | see below |
| Helpers (code, not components) | day ribbon, bar chart, ring, map tile, sheet, banner, time field | `common.py` |

## Iconography
Phosphor icons (MIT, `design/figcraft/src/icons/`) are drawn as stand-ins for SF Symbols because SF Symbols
cannot be redistributed in this repository. **Use SF Symbols in code**; regular ↔ default weight, fill ↔
`.fill` variant (selected tab, status glyphs). Full mapping in `packages/design-tokens/tokens.json`
(`icons`); the most used:

| Design glyph | SF Symbol | | Design glyph | SF Symbol |
|---|---|---|---|---|
| house | house | | coffee | cup.and.saucer |
| calendar-blank | calendar | | buildings | building.2 |
| chart-bar | chart.bar | | house-line | house.lodge |
| gear-six | gearshape | | map-pin-area | mappin.and.ellipse |
| play / stop / pause | play.fill / stop.fill / pause.fill | | bell-ringing | bell.badge |
| calendar-plus | calendar.badge.plus | | gps-slash | location.slash |
| clock-counter-clockwise | clock.arrow.circlepath | | arrows-merge | arrow.triangle.merge |

## Motion (spec for implementation)
* Timer digits use `.contentTransition(.numericText())`.
* State changes (Off → Working → Break) cross-fade the pill colour and grow the ribbon segment (spring 0.35 s).
* Sheets use the system detent animation; tab bar minimises on scroll (iOS 26 `tabBarMinimizeBehavior`).
* Haptics: success on clock-in/out, light impact on break toggle, warning on conflict.
