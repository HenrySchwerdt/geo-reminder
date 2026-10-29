"""Foundations (variables, text and effect styles), icons and reusable components.

Everything here lives on the "Design System" page; screens use instances of it.
"""
from lib import COLORS, TYPE, SPACE, RADIUS, GLASS_EFFECTS, CARD_EFFECTS, SF, col

COLORS = dict(COLORS)
COLORS["glass/lens"] = ("#FFFFFFC7", "#FFFFFF24")

ICONS_REGULAR = sorted(SF)
ICONS_FILL = ["house", "calendar-blank", "chart-bar", "gear-six", "play", "pause", "stop", "coffee",
              "map-pin", "buildings", "house-line", "check-circle", "warning", "warning-circle",
              "bell-ringing", "navigation-arrow", "battery-full", "wifi-high", "cell-signal-full",
              "clock", "timer", "briefcase", "sun", "moon", "lock-simple", "shield-check", "info",
              "calendar-check", "calendar-x", "gps-slash", "hand-waving", "sparkle"]

# Direction C ("Flat Minimal", pre-iOS 26 grouped style) is explored as a third colour mode.
FLAT = {"bg/canvas": "#F2F2F7", "bg/sunken": "#E5E5EA", "bg/track": "#E5E5EA", "text/primary": "#000000",
        "text/secondary": "#6C6C70", "separator": "#C6C6C8", "accent": "#007AFF", "accent/soft": "#E5F0FF",
        "break": "#FF9500", "break/soft": "#FFF2E0", "glass/fill": "#F9F9F9", "glass/stroke": "#C6C6C8",
        "glass/lens": "#FFFFFF00", "glass/tint": "#007AFF"}

GLASS = dict(fill="glass/fill", stroke="glass/stroke", effects=GLASS_EFFECTS)


def foundations(b):
    c = b.add("variable.createCollection", {"name": "Color", "modes": ["Light", "Dark", "Exploration · Flat"]})
    b.color_collection = c
    for name, (light, dark) in COLORS.items():
        b.add("variable.create", {"collection": c, "name": name, "type": "color",
                                  "values": {"Light": light, "Dark": dark,
                                             "Exploration · Flat": FLAT.get(name, light)}})
    s = b.add("variable.createCollection", {"name": "Spacing"})
    for name, v in SPACE.items():
        b.add("variable.create", {"collection": s, "name": f"space/{name}", "type": "number", "value": v})
    for name, v in RADIUS.items():
        b.add("variable.create", {"collection": s, "name": f"radius/{name}", "type": "number", "value": v})
    for name, (fam, sty, size, lh, ls, extra) in TYPE.items():
        value = {"fontFamily": fam, "fontStyle": sty, "fontSize": size, "lineHeight": lh, "letterSpacing": ls}
        if "textCase" in extra:
            value["textCase"] = extra["textCase"]
        b.tstyle[name] = b.add("style.create", {"type": "text", "name": name, "value": value})
    b.estyle["Glass/Regular"] = b.add("style.create", {"type": "effect", "name": "Glass/Regular", "value": GLASS_EFFECTS})
    b.estyle["Elevation/Card"] = b.add("style.create", {"type": "effect", "name": "Elevation/Card", "value": CARD_EFFECTS})


def board(b, title, x, y, w, h, note=None):
    """A labelled specimen board on the design-system page."""
    f = b.frame(None, name=title, x=x, y=y, w=w, h=h, fill="bg/canvas", radius=32,
                dir="v", gap=24, pad=40, sw="fixed", sh="hug")
    b.text(f, title, "Title/1")
    if note:
        b.text(f, note, "Subhead", "text/secondary", sw="fill")
    return f


def define_icons(b, x, y):
    f = board(b, "Icons", x, y, 1180, 760,
              "Phosphor (MIT) glyphs drawn on a 24 pt grid as stand-ins for SF Symbols. "
              "Each icon is a component; the SF Symbol to use in code is listed in design-system.md.")
    grid = b.frame(f, name="Grid", dir="h", gap=16, wrap=True, sw="fill")
    for name in ICONS_REGULAR:
        b.define_icon(name, "regular", grid, 0, 0)
    for name in ICONS_FILL:
        b.define_icon(name, "fill", grid, 0, 0)


# ---------------------------------------------------------------------------
# Components
# ---------------------------------------------------------------------------

def _variants(b, frames, key):
    comps = b.add("component.createMultiple", {"ids": frames})
    s = b.add("component.combineVariants", {"ids": frames})
    b.comp[key] = s
    return s


def status_bar(b, parent):
    f = b.frame(parent, name="iOS/Status Bar", w=393, h=54, dir="h", main="spaceBetween", cross="center",
                pad=[14, 34, 0, 52], sw="fixed", sh="fixed")
    b.text(f, "9:41", "Headline", name="Time", features={"tnum": True})
    r = b.frame(f, name="Indicators", dir="h", gap=6, cross="center")
    bars = b.frame(r, name="Cellular", w=18, h=12, sw="fixed", sh="fixed")
    for k, hh in enumerate([4, 6.5, 9, 12]):
        b.rect(bars, 3, hh, "text/primary", radius=1, x=k * 5, y=12 - hh)
    b.icon(r, "wifi-high", 18, weight="fill")
    b.icon(r, "battery-full", 26, weight="fill")
    island = b.rect(f, 126, 37, "#000000", radius=19, name="Dynamic Island")
    b.absolute(island, 133, 11)
    b.comp["status"] = b.add("component.create", {"ids": [f]})


def home_indicator(b, parent):
    f = b.frame(parent, name="iOS/Home Indicator", w=393, h=34, dir="v", main="max", cross="center",
                pad=[0, 0, 8, 0], sw="fixed", sh="fixed")
    b.rect(f, 139, 5, "text/primary", radius=3, name="Bar")
    b.comp["home"] = b.add("component.create", {"ids": [f]})


TABS = [("Today", "house"), ("Calendar", "calendar-blank"), ("Insights", "chart-bar"), ("Settings", "gear-six")]


def tab_bar(b, parent):
    frames = []
    for sel, _ in TABS:
        bar = b.frame(parent, name=f"Tab={sel}", w=361, h=64, dir="h", gap=0, pad=4, radius=32,
                      sw="fixed", sh="fixed", cross="center", **GLASS)
        for label, icon in TABS:
            on = label == sel
            t = b.frame(bar, name=label, dir="v", gap=1, h=56, radius=28, sw="fill", sh="fixed",
                        main="center", cross="center", fill="glass/lens" if on else None)
            b.icon(t, icon, 24, color="accent" if on else "text/primary", weight="fill" if on else "regular")
            b.text(t, label, "Caption", "accent" if on else "text/primary", fontSize=10, lineHeight=12,
                   fontStyle="Semi Bold")
        frames.append(bar)
    _variants(b, frames, "tabbar")


BUTTONS = {
    "Primary": dict(fill="accent", label="on-accent"),
    "Secondary": dict(fill="bg/sunken", label="text/primary"),
    "Glass": dict(fill="glass/fill", label="text/primary", glass=True),
    "Break": dict(fill="break/soft", label="break"),
    "Destructive": dict(fill="danger/soft", label="danger"),
    "Ink": dict(fill="text/primary", label="bg/canvas"),
}


def button(b, parent):
    frames, labels, icons = [], [], []
    for style, spec in BUTTONS.items():
        extra = dict(stroke="glass/stroke", effects=GLASS_EFFECTS) if spec.get("glass") else {}
        f = b.frame(parent, name=f"Style={style}", dir="h", gap=8, pad=[0, 22, 0, 22], h=52, radius=26,
                    main="center", cross="center", fill=spec["fill"], sh="fixed", **extra)
        i = b.icon(f, "play", 20, color=spec["label"], weight="fill")
        b.set(i, name="Icon")
        t = b.text(f, "Clock in", "Headline", spec["label"], name="Label")
        frames.append(f)
        labels.append(t)
        icons.append(i)
    s = _variants(b, frames, "button")
    b.add("component.addProperty", {"id": s, "name": "Label", "type": "text", "layer": labels[0]})
    for t in labels[1:]:
        b.add("component.bindProperty", {"layer": t, "property": "Label", "field": "characters"})
    b.add("component.addProperty", {"id": s, "name": "Show icon", "type": "boolean", "layer": icons[0], "default": True})
    for i in icons[1:]:
        b.add("component.bindProperty", {"layer": i, "property": "Show icon", "field": "visible"})


def icon_button(b, parent):
    """Round Liquid Glass control (44 pt touch target)."""
    f = b.frame(parent, name="Glass Icon Button", w=44, h=44, radius=22, dir="h", main="center",
                cross="center", sw="fixed", sh="fixed", **GLASS)
    i = b.icon(f, "plus", 22)
    b.set(i, name="Icon")
    b.comp["iconbtn"] = b.add("component.create", {"ids": [f]})


PILLS = {
    "Working": ("accent/soft", "accent", "Working"),
    "Break": ("break/soft", "break", "On break"),
    "Off": ("bg/sunken", "text/secondary", "Not working"),
    "Alert": ("danger/soft", "danger", "Missing check-out"),
}


def status_pill(b, parent):
    frames, labels = [], []
    for state, (bg, fg, label) in PILLS.items():
        f = b.frame(parent, name=f"State={state}", dir="h", gap=6, pad=[6, 12, 6, 10], radius=14,
                    cross="center", fill=bg)
        b.ellipse(f, 8, 8, fg, name="Dot")
        t = b.text(f, label, "Footnote/Strong", fg, name="Label")
        frames.append(f)
        labels.append(t)
    s = _variants(b, frames, "pill")
    b.add("component.addProperty", {"id": s, "name": "Label", "type": "text", "layer": labels[0]})
    for t in labels[1:]:
        b.add("component.bindProperty", {"layer": t, "property": "Label", "field": "characters"})


def toggle(b, parent):
    frames = []
    for on in (True, False):
        f = b.frame(parent, name=f"On={'true' if on else 'false'}", w=63, h=28, radius=14, dir="h",
                    pad=2, main="max" if on else "min", cross="center", sw="fixed", sh="fixed",
                    fill="accent" if on else "bg/track")
        b.rect(f, 38, 24, "#FFFFFF", radius=12, name="Knob",
               effects=[{"type": "dropShadow", "color": "#00000026", "offset": [0, 2], "radius": 6}])
        frames.append(f)
    _variants(b, frames, "toggle")


def chip(b, parent):
    frames, labels = [], []
    for sel in (True, False):
        f = b.frame(parent, name=f"Selected={'true' if sel else 'false'}", dir="h", pad=[8, 14, 8, 14],
                    radius=18, h=36, sh="fixed", cross="center", main="center",
                    fill="text/primary" if sel else "bg/elevated", stroke=None if sel else "separator")
        t = b.text(f, "Office", "Subhead/Strong", "bg/canvas" if sel else "text/primary", name="Label")
        frames.append(f)
        labels.append(t)
    s = _variants(b, frames, "chip")
    b.add("component.addProperty", {"id": s, "name": "Label", "type": "text", "layer": labels[0]})
    b.add("component.bindProperty", {"layer": labels[1], "property": "Label", "field": "characters"})


def row(b, parent):
    """Grouped list row: icon tile, title, optional value and chevron (min height 52 pt)."""
    f = b.frame(parent, name="List Row", w=361, dir="h", gap=12, pad=[12, 16, 12, 16], h=56,
                cross="center", sw="fixed", sh="fixed", fill="bg/elevated")
    tile = b.frame(f, name="Tile", w=32, h=32, radius=9, dir="h", main="center", cross="center",
                   sw="fixed", sh="fixed", fill="accent/soft")
    ic = b.icon(tile, "map-pin", 18, color="accent")
    b.set(ic, name="Icon")
    t = b.text(f, "Workplaces", "Body", name="Title", sw="fill")
    v = b.text(f, "2", "Body", "text/secondary", name="Value")
    ch = b.icon(f, "caret-right", 16, color="text/tertiary")
    b.set(ch, name="Chevron")
    c = b.add("component.create", {"ids": [f]})
    b.comp["row"] = c
    b.add("component.addProperty", {"id": c, "name": "Title", "type": "text", "layer": t})
    b.add("component.addProperty", {"id": c, "name": "Value", "type": "text", "layer": v})
    b.add("component.addProperty", {"id": c, "name": "Show tile", "type": "boolean", "layer": tile, "default": True})
    b.add("component.addProperty", {"id": c, "name": "Show chevron", "type": "boolean", "layer": ch, "default": True})


def section_header(b, parent):
    f = b.frame(parent, name="Section Header", w=361, dir="h", pad=[0, 16, 0, 16], sw="fixed")
    t = b.text(f, "This week", "Caption/Upper", "text/secondary", name="Label")
    c = b.add("component.create", {"ids": [f]})
    b.comp["section"] = c
    b.add("component.addProperty", {"id": c, "name": "Label", "type": "text", "layer": t})


def segmented(b, parent):
    frames = []
    opts = ["Week", "Month", "Year"]
    for sel in opts:
        f = b.frame(parent, name=f"Selected={sel}", w=361, h=36, radius=18, dir="h", pad=2, gap=0,
                    sw="fixed", sh="fixed", fill="bg/sunken")
        for o in opts:
            seg = b.frame(f, name=o, h=32, radius=16, sw="fill", sh="fixed", dir="h", main="center",
                          cross="center", fill="bg/elevated" if o == sel else None,
                          effects=CARD_EFFECTS if o == sel else None)
            b.text(seg, o, "Subhead/Strong" if o == sel else "Subhead", "text/primary")
        frames.append(f)
    _variants(b, frames, "segmented")


DAYS = {
    "Default": ("bg/elevated", "text/primary", "accent"),
    "Today": ("text/primary", "bg/canvas", "accent"),
    "Selected": ("accent", "on-accent", "on-accent"),
    "Missing": ("danger/soft", "danger", "danger"),
    "Off": ("bg/sunken", "text/tertiary", None),
    "Future": (None, "text/tertiary", None),
}


def calendar_day(b, parent):
    frames, labels, metas = [], [], []
    for state, (bg, fg, dot) in DAYS.items():
        f = b.frame(parent, name=f"State={state}", w=46, h=54, radius=14, dir="v", gap=4, main="center",
                    cross="center", sw="fixed", sh="fixed", fill=bg,
                    stroke="separator" if state == "Future" else None)
        t = b.text(f, "14", "Headline", fg, name="Day", features={"tnum": True})
        m = b.text(f, "8.5" if dot else "–", "Caption", fg, name="Hours", fontSize=10, lineHeight=12)
        if dot is None:
            b.set(m, opacity=0.6)
        frames.append(f)
        labels.append(t)
        metas.append(m)
    s = _variants(b, frames, "day")
    b.add("component.addProperty", {"id": s, "name": "Day", "type": "text", "layer": labels[0]})
    b.add("component.addProperty", {"id": s, "name": "Hours", "type": "text", "layer": metas[0]})
    for t in labels[1:]:
        b.add("component.bindProperty", {"layer": t, "property": "Day", "field": "characters"})
    for t in metas[1:]:
        b.add("component.bindProperty", {"layer": t, "property": "Hours", "field": "characters"})


def notification(b, parent):
    f = b.frame(parent, name="Notification", w=361, dir="v", gap=2, pad=[14, 16, 14, 16], radius=24,
                sw="fixed", **GLASS)
    top = b.frame(f, name="Header", dir="h", gap=10, cross="center", sw="fill")
    app_icon(b, top, 20)
    b.text(top, "WORKTIME", "Caption", "text/secondary", sw="fill", name="App")
    b.text(top, "now", "Caption", "text/secondary", name="When")
    t = b.text(f, "Arrived at Studio Kreuzberg", "Subhead/Strong", name="Title", sw="fill")
    m = b.text(f, "Clock in now? You arrived at 08:44.", "Subhead", name="Message", sw="fill")
    c = b.add("component.create", {"ids": [f]})
    b.comp["notif"] = c
    b.add("component.addProperty", {"id": c, "name": "Title", "type": "text", "layer": t})
    b.add("component.addProperty", {"id": c, "name": "Message", "type": "text", "layer": m})


def app_icon(b, parent, size=60, name="App Icon"):
    """Worktime app icon: a deep green squircle with a day arc that starts at an amber dot."""
    f = b.frame(parent, name=name, w=size, h=size, radius=size * 0.225, sw="fixed", sh="fixed",
                fills=[{"type": "linearGradient", "stops": ["#2C8A66", "#14473A"]}])
    s = size / 60
    b.ellipse(f, 30 * s, 30 * s, None, x=15 * s, y=15 * s, name="Track",
              stroke="#FFFFFF40", strokeWeight=4.5 * s)
    b.vector(f, f"M{30*s} {15*s} A{15*s} {15*s} 0 1 1 {15*s} {30*s}", stroke="#FFFFFF", sw=4.5 * s,
             name="Arc")
    b.ellipse(f, 8 * s, 8 * s, "#F2B04E", x=26 * s, y=11 * s, name="Start")
    return f


def define_components(b, x, y):
    f = board(b, "Components", x, y, 1180, 1500,
              "Small, coherent set. Liquid Glass is reserved for the floating control layer "
              "(tab bar, toolbar buttons, notifications, sheets); content sits on calm, opaque cards.")
    rowf = lambda name: b.frame(f, name=name, dir="h", gap=24, wrap=True, sw="fill", cross="min")
    r1 = rowf("System")
    status_bar(b, r1)
    home_indicator(b, r1)
    r2 = rowf("Navigation")
    tab_bar(b, r2)
    icon_button(b, r2)
    segmented(b, r2)
    r3 = rowf("Buttons")
    button(b, r3)
    r4 = rowf("Status & Inputs")
    status_pill(b, r4)
    toggle(b, r4)
    chip(b, r4)
    r5 = rowf("Lists")
    row(b, r5)
    section_header(b, r5)
    r6 = rowf("Calendar & Notifications")
    calendar_day(b, r6)
    notification(b, r6)
    app_icon(b, r6, 60)


# ---------------------------------------------------------------------------
# Specimens (documentation boards)
# ---------------------------------------------------------------------------

def specimens(b, x, y):
    f = board(b, "Color", x, y, 1180, 900,
              "Semantic tokens with Light and Dark values (variables, collection “Color”). "
              "Green means working, amber means break, red only for problems that need action.")
    grid = b.frame(f, name="Swatches", dir="h", gap=16, wrap=True, sw="fill")
    for name in COLORS:
        sw_ = b.frame(grid, name=name, w=170, dir="v", gap=8, sw="fixed")
        chip_ = b.frame(sw_, name="Pair", dir="h", h=64, sw="fill", sh="fixed", radius=16, clip=True,
                        stroke="separator")
        b.rect(chip_, 85, 64, COLORS[name][0], name="Light")
        b.rect(chip_, 85, 64, COLORS[name][1], name="Dark")
        b.text(sw_, name, "Footnote/Strong")
        b.text(sw_, f"{COLORS[name][0]} · {COLORS[name][1]}", "Caption", "text/secondary")

    t = board(b, "Typography", x + 1240, y, 900, 900,
              "Inter / Inter Display stand in for SF Pro / SF Pro Display. Numbers always use tabular figures.")
    for name, (fam, sty, size, lh, ls, extra) in TYPE.items():
        r = b.frame(t, name=name, dir="h", gap=24, cross="center", sw="fill")
        b.text(r, name, "Footnote", "text/secondary", w=150)
        sample = "5:50:12" if "Timer" in name or "Numeric" in name else "Expected end 17:22"
        b.text(r, sample, name, features={"tnum": True} if "features" in extra else {})
        b.text(r, f"{sty} {size}/{lh}", "Caption", "text/tertiary")

    s = board(b, "Spacing & Radii", x + 2200, y, 700, 900,
              "4 pt base grid. Corner radii are concentric: inner radius = outer radius − padding.")
    for name, v in SPACE.items():
        r = b.frame(s, name=f"space/{name}", dir="h", gap=16, cross="center", sw="fill")
        b.text(r, f"space/{name}", "Footnote", "text/secondary", w=110)
        b.rect(r, v * 6, 16, "accent", radius=4)
        b.text(r, f"{v}", "Footnote/Strong")
    rr = b.frame(s, name="Radii", dir="h", gap=12, wrap=True, sw="fill")
    for name, v in RADIUS.items():
        cell = b.frame(rr, name=f"radius/{name}", dir="v", gap=6, cross="center")
        b.rect(cell, 72, 72, "accent/soft", radius=min(v, 36), stroke=col("accent"), strokeWeight=1)
        b.text(cell, f"{name} {v if v < 999 else '∞'}", "Caption", "text/secondary")


def build(b):
    b.page("Design System")
    foundations(b)
    define_icons(b, 0, 1000)
    define_components(b, 0, 1820)
    specimens(b, 0, 0)
