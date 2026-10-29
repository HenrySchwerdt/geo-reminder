"""Geofencing UX (rings, reminder rules, precision profiles, live status) and Android / Wear OS adaptations."""
import math

from common import (W, H, Grid, heading, phone, nav_title, inline_nav, glass_btn, card, group, sep, row,
                    toggle_row, section, button, pill, chip, ribbon, ring, map_tile, banner, time_field, GLASS)
from lib import GLASS_EFFECTS, CARD_EFFECTS

CW = W - 32


def rings_map(b, parent, w, h, radius=0, scale=1.0, labels=True, highlight=None, name="Rings"):
    """Schematic map with the three rings (not to scale): approach, near and fence."""
    cx, cy = w * 0.5, h * 0.52
    f = map_tile(b, parent, w, h, radius=radius, fence=0, pin=False, cx=cx, cy=cy, name=name)
    specs = [("approach", 150 * scale, "info", [6, 6]), ("near", 82 * scale, "break", [5, 5]),
             ("fence", 34 * scale, "accent", None)]
    for key, r, colr, dash in specs:
        on = highlight in (None, key)
        b.ellipse(f, 2 * r, 2 * r, colr, x=cx - r, y=cy - r, opacity=0.10 if on else 0.04, name=f"{key} area")
        props = dict(stroke={"$var": "Color/" + colr}, strokeWeight=2 if on else 1)
        if dash:
            props["dashes"] = dash
        b.ellipse(f, 2 * r, 2 * r, None, x=cx - r, y=cy - r, name=f"{key} ring", opacity=1 if on else 0.4, **props)
    p = b.frame(f, name="Pin", w=28, h=28, radius=14, x=cx - 14, y=cy - 14, sw="fixed", sh="fixed", dir="h",
                main="center", cross="center", fill="accent", stroke="#FFFFFF", sweight=2.5)
    b.icon(p, "buildings", 15, color="on-accent", weight="fill")
    if labels:
        for key, r, colr, _ in specs:
            text = {"approach": "Approach · 3 km", "near": "Near · 600 m", "fence": "Fence · 150 m"}[key]
            pos = (12, h - 36) if key == "approach" else (cx + r * 0.62, cy - r * 0.86 - 10)
            lab = b.frame(f, name=f"{key} label", dir="h", pad=[4, 8, 4, 8], radius=10, fill="bg/elevated",
                          x=pos[0], y=pos[1])
            b.text(lab, text, "Caption", colr, fontStyle="Semi Bold")
    # the user, approaching
    me = b.frame(f, name="You", w=18, h=18, radius=9, x=cx - 120 * scale, y=cy + 58 * scale, sw="fixed", sh="fixed",
                 fill="info", stroke="#FFFFFF", sweight=3,
                 effects=[{"type": "dropShadow", "color": "#3559A680", "offset": [0, 0], "radius": 10}])
    return f


def stepper_chips(b, parent, options, selected):
    r = b.frame(parent, name="Options", dir="h", gap=6, sw="fill", wrap=True)
    for o in options:
        chip(b, r, o, o == selected)
    return r


def workplace_detail(b, x, y):
    root, c = phone(b, "Geo · Workplace detail", x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Studio Kreuzberg", right="dots-three")
    rings_map(b, c, CW, 230, radius=26)
    st = b.frame(c, name="Status", dir="h", gap=10, pad=[12, 14, 12, 14], radius=18, sw="fill", cross="center",
                 fill="info/soft")
    b.icon(st, "navigation-arrow", 18, color="info", weight="fill")
    b.text(st, "You're 2.4 km away · checking every 2 min", "Footnote/Strong", "info", sw="fill")
    section(b, c, "Reminders")
    g = group(b, c, "Rules")
    row(b, g, "When I arrive", "5 min · 06–11", icon="sign-in")
    row(b, g, "When I leave", "after 15 min", icon="sign-out")
    row(b, g, "Days", "Mon · Wed · Fri", icon="calendar-blank", tint="text/secondary", tile="bg/sunken", last=True)
    g2 = group(b, c, "Place")
    row(b, g2, "Radius", "150 m", icon="map-pin-area")
    row(b, g2, "Address", "Oranienstr. 24", icon="map-pin", last=True)
    return root


def arrival_rule(b, x, y):
    root, c = phone(b, "Geo · Arrival rule", x, y, tab=None, gap=14)
    inline_nav(b, c, "When I arrive", left="caret-left")
    g = group(b, c, "Toggle")
    toggle_row(b, g, "Ask me to clock in", True, icon="bell-ringing", last=True)
    section(b, c, "Ask after I've been there for")
    k = card(b, c, name="Delay", gap=12, pad=16)
    stepper_chips(b, k, ["Right away", "2 min", "5 min", "10 min", "15 min"], "5 min")
    b.text(k, "Walking past or a quick coffee nearby won't trigger a reminder.", "Footnote", "text/secondary", sw="fill")
    section(b, c, "Only between")
    g2 = group(b, c, "Window")
    time_field(b, g2, "From", "06:00", icon="sun")
    sep(b, g2, 48)
    time_field(b, g2, "To", "11:00", icon="clock")
    section(b, c, "On these days")
    days = b.frame(c, name="Days", dir="h", gap=6, sw="fill")
    for d, on in [("M", 1), ("T", 0), ("W", 1), ("T", 0), ("F", 1), ("S", 0), ("S", 0)]:
        cc = b.frame(days, name=d, w=42, h=42, radius=21, dir="h", main="center", cross="center", sw="fixed",
                     sh="fixed", fill="text/primary" if on else "bg/elevated", stroke=None if on else "separator")
        b.text(cc, d, "Subhead/Strong", "bg/canvas" if on else "text/secondary")
    prev = b.frame(c, name="Summary", dir="h", gap=10, pad=14, radius=20, sw="fill", fill="accent/soft", cross="min")
    b.icon(prev, "check-circle", 20, color="accent", weight="fill")
    b.text(prev, "On Mon, Wed and Fri between 06:00 and 11:00 we'll ask once you've been at Studio Kreuzberg "
                 "for 5 minutes.", "Footnote", "accent", sw="fill")
    return root


def departure_rule(b, x, y):
    root, c = phone(b, "Geo · Departure rule", x, y, tab=None, gap=14)
    inline_nav(b, c, "When I leave", left="caret-left")
    g = group(b, c, "Toggle")
    toggle_row(b, g, "Ask me to clock out", True, icon="sign-out")
    toggle_row(b, g, "Only if I clocked in here", True, sub="Ignore when tracking from home", last=True)
    section(b, c, "Ask after I've been away for")
    k = card(b, c, name="Delay", gap=12, pad=16)
    stepper_chips(b, k, ["5 min", "10 min", "15 min", "30 min"], "15 min")
    # timeline illustration: lunch walk vs. going home
    ill = card(b, c, name="Illustration", gap=12, pad=16)
    b.text(ill, "Why wait?", "Subhead/Strong")
    for label, segs, note, colr in [
        ("Lunch walk", [("12:30", "12:52", "break")], "back after 22 min — no reminder", "text/secondary"),
        ("Going home", [("17:29", "18:30", "away")], "away 15 min — “Clock out at 17:29?”", "accent"),
    ]:
        r = b.frame(ill, name=label, dir="v", gap=4, sw="fill")
        hd = b.frame(r, name="Head", dir="h", sw="fill", main="spaceBetween")
        b.text(hd, label, "Footnote/Strong")
        b.text(hd, note, "Caption", colr)
        ribbon(b, r, CW - 32, segs, labels=False, h=8, start=12 if "Lunch" in label else 16,
               end=14 if "Lunch" in label else 19)
    b.text(c, "The suggested time is when you actually left, not when the reminder arrives.", "Footnote",
           "text/secondary", sw="fill", align="center")
    return root


def precision(b, x, y):
    root, c = phone(b, "Geo · Precision & battery", x, y, tab="Settings", gap=12)
    inline_nav(b, c, "Location precision", left="caret-left")
    b.text(c, "Worktime only uses GPS when you're close to a workplace. Choose how hard it may work.",
           "Subhead", "text/secondary", sw="fill")
    for name_, sub, stats, sel, icon in [
        ("Battery saver", "Wi-Fi & cell near the fence. Reminders can be 1–3 min late.", "≈ 9 location checks per commute", False, "moon"),
        ("Balanced", "GPS only in the last few hundred metres. Recommended.", "≈ 14 location checks per commute", True, "target"),
        ("Precise", "Earlier and more frequent GPS. For small radii or dense cities.", "≈ 23 location checks per commute", False, "crosshair"),
    ]:
        k = b.frame(c, name=name_, dir="h", gap=14, pad=16, radius=22, sw="fill", cross="min",
                    fill="bg/elevated", stroke="accent" if sel else "separator", sweight=2 if sel else 1,
                    effects=CARD_EFFECTS)
        t = b.frame(k, name="Tile", w=40, h=40, radius=12, dir="h", main="center", cross="center", sw="fixed",
                    sh="fixed", fill="accent/soft" if sel else "bg/sunken")
        b.icon(t, icon, 22, color="accent" if sel else "text/secondary", weight="fill")
        tx = b.frame(k, name="Text", dir="v", gap=3, sw="fill")
        b.text(tx, name_, "Headline")
        b.text(tx, sub, "Footnote", "text/secondary", sw="fill")
        b.text(tx, stats, "Caption", "accent" if sel else "text/tertiary")
        dot = b.frame(k, name="Radio", w=22, h=22, radius=11, sw="fixed", sh="fixed", dir="h", main="center",
                      cross="center", fill="accent" if sel else None, stroke=None if sel else "separator", sweight=2)
        if sel:
            b.icon(dot, "check", 14, color="on-accent")
    g = group(b, c, "Extras")
    toggle_row(b, g, "Pause in Low Power Mode", True, icon="moon", sub="Time-based reminders still work", last=True)
    return root


def how_it_works(b, x, y):
    root, c = phone(b, "Geo · How it works", x, y, tab=None, gap=14)
    inline_nav(b, c, "How location works", left="x")
    rings_map(b, c, CW, 260, radius=26, scale=1.05)
    steps = [("Far away", "Nothing runs. iOS watches the outer ring for us — no battery cost.", "moon", "text/secondary", "bg/sunken"),
             ("Approaching", "A quick, low-power check every few minutes.", "navigation-arrow", "info", "info/soft"),
             ("Near", "GPS every 20–90 s, more often the closer you get.", "crosshair", "break", "break/soft"),
             ("Arrived", "GPS turns off. We ask once you've stayed 5 min.", "check-circle", "accent", "accent/soft")]
    g = group(b, c, "Stages")
    for k, (t, d, icon, tint, tile) in enumerate(steps):
        r = b.frame(g, name=t, dir="h", gap=12, pad=[12, 16, 12, 16], sw="fill", cross="min", fill="bg/elevated")
        tl = b.frame(r, name="Tile", w=32, h=32, radius=9, dir="h", main="center", cross="center", sw="fixed",
                     sh="fixed", fill=tile)
        b.icon(tl, icon, 18, color=tint, weight="fill")
        tx = b.frame(r, name="Text", dir="v", gap=2, sw="fill")
        b.text(tx, t, "Subhead/Strong")
        b.text(tx, d, "Footnote", "text/secondary", sw="fill")
        if k < len(steps) - 1:
            sep(b, g, 60)
    return root


def live_status(b, x, y):
    root, c = phone(b, "Geo · Live status", x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Location status", left="caret-left")
    k = card(b, c, name="Now", gap=14)
    hd = b.frame(k, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center")
    p = b.frame(hd, name="Zone", dir="h", gap=6, pad=[6, 12, 6, 10], radius=14, cross="center", fill="break/soft")
    b.ellipse(p, 8, 8, "break")
    b.text(p, "Near · Studio Kreuzberg", "Footnote/Strong", "break")
    b.text(hd, "350 m", "Numeric/Medium")
    st = b.frame(k, name="Stats", dir="h", gap=12, sw="fill")
    from common import stat
    stat(b, st, "Checking", "every 45 s")
    stat(b, st, "Accuracy", "GPS ±8 m")
    stat(b, st, "Speed", "walking")
    # GPS budget bar
    bud = b.frame(k, name="Budget", dir="v", gap=6, sw="fill")
    hr = b.frame(bud, name="Head", dir="h", sw="fill", main="spaceBetween")
    b.text(hr, "GPS today", "Footnote", "text/secondary")
    b.text(hr, "12 of 40 min", "Footnote/Strong")
    tr = b.frame(bud, name="Track", w=CW - 40, h=8, radius=4, fill="bg/track", sw="fixed", sh="fixed")
    b.rect(tr, (CW - 40) * 0.3, 8, "accent", radius=4, x=0, y=0)
    section(b, c, "Today")
    g = group(b, c, "Log")
    for t, what, icon, tint, tile in [
        ("08:31", "Entered approach ring · 3.0 km", "navigation-arrow", "info", "info/soft"),
        ("08:39", "Near ring · GPS on", "crosshair", "break", "break/soft"),
        ("08:44", "Arrived (interpolated) · GPS off", "map-pin", "accent", "accent/soft"),
        ("08:49", "Asked to clock in · answered 08:44", "bell-ringing", "accent", "accent/soft"),
    ]:
        r = b.frame(g, name=t, dir="h", gap=12, pad=[10, 16, 10, 16], sw="fill", cross="center", fill="bg/elevated")
        tl = b.frame(r, name="Tile", w=28, h=28, radius=8, dir="h", main="center", cross="center", sw="fixed",
                     sh="fixed", fill=tile)
        b.icon(tl, icon, 15, color=tint, weight="fill")
        b.text(r, what, "Footnote", sw="fill")
        b.text(r, t, "Footnote/Strong", "text/secondary", features={"tnum": True})
    b.text(c, "6 of 18 iOS regions in use · nothing leaves this iPhone", "Caption", "text/tertiary", sw="fill",
           align="center")
    return root


# ---------------------------------------------------------------------------
# Android & Wear OS
# ---------------------------------------------------------------------------

AW, AH = 412, 915


def android_frame(b, name, x, y, tab="Today", dark_mode=False):
    root = b.frame(None, name=name, x=x, y=y, w=AW, h=AH, fill="bg/canvas", clip=True, radius=34)
    if dark_mode:
        b.add("variable.setMode", {"ids": [root], "collection": b.color_collection, "mode": "Dark"})
    sb = b.frame(root, name="Android status bar", x=0, y=0, w=AW, h=40, dir="h", pad=[0, 24, 0, 24],
                 main="spaceBetween", cross="center", sw="fixed", sh="fixed")
    b.text(sb, "9:41", "Footnote/Strong")
    b.ellipse(sb, 22, 22, "#000000", name="Camera")
    ind = b.frame(sb, name="Indicators", dir="h", gap=6, cross="center")
    b.icon(ind, "wifi-high", 16, weight="fill")
    b.icon(ind, "battery-full", 22, weight="fill")
    content = b.frame(root, name="Content", x=0, y=40, w=AW, dir="v", gap=16, pad=[8, 16, 120, 16], sw="fixed")
    if tab:
        nav = b.frame(root, name="Navigation bar", x=0, y=AH - 92, w=AW, h=92, dir="h", pad=[12, 8, 24, 8],
                      sw="fixed", sh="fixed", fill="bg/elevated")
        for label, icon in [("Today", "house"), ("Calendar", "calendar-blank"), ("Insights", "chart-bar"),
                            ("Settings", "gear-six")]:
            on = label == tab
            it = b.frame(nav, name=label, dir="v", gap=4, sw="fill", cross="center")
            ind_ = b.frame(it, name="Indicator", w=64, h=32, radius=16, dir="h", main="center", cross="center",
                           sw="fixed", sh="fixed", fill="accent/soft" if on else None)
            b.icon(ind_, icon, 22, color="accent" if on else "text/secondary", weight="fill" if on else "regular")
            b.text(it, label, "Caption", "text/primary" if on else "text/secondary",
                   fontStyle="Semi Bold" if on else "Medium")
        b.rect(root, 108, 4, "text/primary", radius=2, x=(AW - 108) / 2, y=AH - 14, name="Gesture bar", opacity=0.6)
    return root, content


def android_today(b, x, y, dark_mode=False):
    root, c = android_frame(b, "Android · Today" + (" · Dark" if dark_mode else ""), x, y, dark_mode=dark_mode)
    top = b.frame(c, name="Top app bar", dir="h", sw="fill", main="spaceBetween", cross="center", h=56, sh="fixed")
    tx = b.frame(top, name="Title", dir="v", gap=0)
    b.text(tx, "Today", "Title/1")
    b.text(tx, "Thursday, 16 October", "Subhead", "text/secondary")
    b.icon(top, "calendar-plus", 24, color="text/secondary")
    from screens_core import IW, WORK_SEGS, week_card
    from common import stat, button as btn_
    hero = card(b, c, name="Session", gap=16, pad=20)
    b.set(hero, cornerRadius=28, effects=[])
    pill(b, hero, "Working", "Working · Studio Kreuzberg")
    t = b.frame(hero, name="Elapsed", dir="h", gap=0, cross="baseline")
    b.text(t, "5:50", "Display/Timer")
    b.text(t, ":12", "Numeric/Large", "text/tertiary")
    ribbon(b, hero, AW - 72, WORK_SEGS, now="15:12", planned="17:22", marker_label="Ends ~17:22")
    stats = b.frame(hero, name="Stats", dir="h", gap=12, sw="fill")
    stat(b, stats, "Remaining", "2h 10m")
    stat(b, stats, "Expected end", "17:22")
    stat(b, stats, "Today", "73%", color="accent")
    acts = b.frame(hero, name="Actions", dir="h", gap=10, sw="fill")
    btn_(b, acts, "Break", "Break", icon="coffee")
    btn_(b, acts, "Clock out", "Ink", icon="stop")
    wk = week_card(b, c)
    b.set(wk, cornerRadius=28, effects=[])
    return root


def android_shade(b, x, y):
    """Notification shade: ongoing session notification + the foreground-service notice while sampling."""
    root = b.frame(None, name="Android · Notifications", x=x, y=y, w=AW, h=AH, fill="#1B1F1D", clip=True, radius=34)
    b.add("variable.setMode", {"ids": [root], "collection": b.color_collection, "mode": "Dark"})
    hd = b.frame(root, name="Quick settings", x=16, y=48, w=AW - 32, dir="v", gap=12, sw="fixed")
    b.text(hd, "15:12", "Display/Large", "text/primary")
    tiles = b.frame(hd, name="Tiles", dir="h", gap=10, sw="fill")
    for label, icon, on in [("Internet", "wifi-high", True), ("Worktime", "stop", True), ("Location", "navigation-arrow", True)]:
        t = b.frame(tiles, name=label, dir="h", gap=8, pad=[14, 14, 14, 14], radius=24, sw="fill", cross="center",
                    fill="accent" if label == "Worktime" else "#2C312E")
        b.icon(t, icon, 18, color="on-accent" if label == "Worktime" else "text/primary", weight="fill")
        tx = b.frame(t, name="Text", dir="v", gap=0)
        b.text(tx, label, "Footnote/Strong", "on-accent" if label == "Worktime" else "text/primary")
        if label == "Worktime":
            b.text(tx, "Clock out", "Caption", "on-accent")
    stack = b.frame(root, name="Notifications", x=12, y=230, w=AW - 24, dir="v", gap=4, sw="fixed")
    n1 = b.frame(stack, name="Ongoing session", dir="v", gap=10, pad=18, radius=28, sw="fill", fill="#262B28")
    top = b.frame(n1, name="Top", dir="h", gap=8, cross="center", sw="fill")
    from brand import icon as app_icon_
    app_icon_(b, top, 22, "Green")
    b.text(top, "Worktime · Working since 08:47", "Caption", "text/secondary", sw="fill")
    b.text(n1, "Studio Kreuzberg · 5:50:12", "Headline")
    ribbon(b, n1, AW - 60, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
           now="15:12", planned="17:22", labels=False, h=7)
    acts = b.frame(n1, name="Actions", dir="h", gap=20)
    for a in ("BREAK", "CLOCK OUT"):
        b.text(acts, a, "Footnote/Strong", "accent")
    n2 = b.frame(stack, name="Foreground service", dir="v", gap=4, pad=18, radius=28, sw="fill", fill="#262B28")
    top2 = b.frame(n2, name="Top", dir="h", gap=8, cross="center", sw="fill")
    b.icon(top2, "navigation-arrow", 18, color="info", weight="fill")
    b.text(top2, "Worktime · now", "Caption", "text/secondary", sw="fill")
    b.text(n2, "Checking your arrival", "Subhead/Strong")
    b.text(n2, "Near Client — Mitte. This stops automatically when you arrive.", "Footnote", "text/secondary", sw="fill")
    b.text(root, "Android shows a notification while precise location runs in the background. Worktime shows it only "
                 "near a workplace — typically a few minutes a day.", "Footnote", "#FFFFFFB3", x=24, y=760, w=AW - 48,
           textAlign="center")
    return root


def android_permission(b, x, y):
    root, c = android_frame(b, "Android · Background location", x, y, tab=None)
    b.set(c, gap=18, paddingTop=40)
    rings_map(b, c, AW - 32, 240, radius=28, labels=False)
    b.text(c, "Allow location all the time", "Title/1", sw="fill")
    b.text(c, "Android asks this in two steps. On the next screen choose “Allow all the time” so Worktime can notice "
              "arrivals while your phone is in your pocket.", "Callout", "text/secondary", sw="fill")
    steps = card(b, c, name="Steps", gap=10, pad=18)
    b.set(steps, cornerRadius=28, effects=[])
    for n_, t in [("1", "Tap “Open settings”"), ("2", "Permissions › Location"), ("3", "Choose “Allow all the time”")]:
        r = b.frame(steps, name=n_, dir="h", gap=12, cross="center")
        cc = b.frame(r, name="Num", w=28, h=28, radius=14, dir="h", main="center", cross="center", sw="fixed",
                     sh="fixed", fill="accent/soft")
        b.text(cc, n_, "Footnote/Strong", "accent")
        b.text(r, t, "Body")
    b.text(c, "Some phones (Samsung, Xiaomi) also stop background apps — we'll show you how to exempt Worktime.",
           "Footnote", "text/secondary", sw="fill")
    foot = b.frame(root, name="Footer", x=16, y=AH - 150, w=AW - 32, dir="v", gap=8, sw="fixed")
    from common import button as btn_
    btn_(b, foot, "Open settings", "Ink")
    sec = b.frame(foot, name="Later", dir="h", h=48, sh="fixed", sw="fill", main="center", cross="center")
    b.text(sec, "Use time-based reminders", "Headline", "accent")
    return root


RW = 227  # Wear OS large round (dp)


def wear(b, name, x, y):
    root = b.frame(None, name=name, x=x, y=y, w=RW, h=RW, fill=None, clip=True)
    b.add("variable.setMode", {"ids": [root], "collection": b.color_collection, "mode": "Dark"})
    b.ellipse(root, RW, RW, "#000000", x=0, y=0, name="Display")
    b.text(root, "15:12", "Footnote/Strong", "text/primary", x=0, y=12, w=RW, textAlign="center")
    return root


def edge_arc(b, root, frac, color):
    """Progress along the round screen edge (Wear OS style)."""
    r = RW / 2 - 6
    c = RW / 2
    a0 = -90 + 30
    sweep = 300 * frac
    def pt(a):
        return c + r * math.cos(math.radians(a)), c + r * math.sin(math.radians(a))
    x0, y0 = pt(a0)
    x1, y1 = pt(a0 + 300)
    b.vector(root, f"M{x0:.1f} {y0:.1f} A{r:.1f} {r:.1f} 0 1 1 {x1:.1f} {y1:.1f}", stroke="#FFFFFF26", sw=6, name="Track")
    x2, y2 = pt(a0 + sweep)
    b.vector(root, f"M{x0:.1f} {y0:.1f} A{r:.1f} {r:.1f} 0 {1 if sweep > 180 else 0} 1 {x2:.1f} {y2:.1f}",
             stroke=color, sw=6, name="Progress")


def wear_chip(b, root, label, icon, fill, fg, y, w=150):
    f = b.frame(root, name=label, x=(RW - w) / 2, y=y, w=w, h=48, radius=24, dir="h", gap=8, main="center",
                cross="center", sw="fixed", sh="fixed", fill=fill)
    b.icon(f, icon, 18, color=fg, weight="fill")
    b.text(f, label, "Subhead/Strong", fg)


def wear_screens(b, g):
    x, y = g.next("W1 · Wear OS — clock in", w=RW, h=RW)
    r = wear(b, "Wear · Clock in", x, y)
    b.text(r, "Studio Kreuzberg", "Footnote", "text/secondary", x=0, y=50, w=RW, textAlign="center")
    b.text(r, "Arrived 08:44", "Headline", "text/primary", x=0, y=72, w=RW, textAlign="center")
    wear_chip(b, r, "Clock in", "play", "#5CC99B", "#06140E", 112)
    b.text(r, "Week +6h 20m", "Caption", "text/secondary", x=0, y=176, w=RW, textAlign="center")
    x, y = g.next("W2 · Working", w=RW, h=RW)
    r = wear(b, "Wear · Working", x, y)
    edge_arc(b, r, 0.73, "#5CC99B")
    b.text(r, "WORKING", "Caption/Upper", "accent", x=0, y=50, w=RW, textAlign="center", fontSize=11)
    b.text(r, "5:50", "Numeric/Large", "text/primary", x=0, y=66, w=RW, textAlign="center", fontSize=44, lineHeight=48)
    b.text(r, "ends 17:22", "Footnote", "text/secondary", x=0, y=116, w=RW, textAlign="center")
    for k, (icon, fill, fg) in enumerate([("coffee", "#3A2B13", "#F2B04E"), ("stop", "#2A2D2B", "#FFFFFF")]):
        f = b.frame(r, name=icon, w=52, h=52, radius=26, x=RW / 2 - 60 + k * 68, y=146, sw="fixed", sh="fixed",
                    dir="h", main="center", cross="center", fill=fill)
        b.icon(f, icon, 22, color=fg, weight="fill")
    x, y = g.next("W3 · Break", w=RW, h=RW)
    r = wear(b, "Wear · Break", x, y)
    edge_arc(b, r, 0.42, "#F2B04E")
    b.text(r, "BREAK", "Caption/Upper", "break", x=0, y=50, w=RW, textAlign="center", fontSize=11)
    b.text(r, "12:40", "Numeric/Large", "break", x=0, y=66, w=RW, textAlign="center", fontSize=44, lineHeight=48)
    b.text(r, "of 30 min", "Footnote", "text/secondary", x=0, y=116, w=RW, textAlign="center")
    wear_chip(b, r, "Resume", "play", "#5CC99B", "#06140E", 146, w=140)
    x, y = g.next("W4 · Tile", w=RW, h=RW)
    r = wear(b, "Wear · Tile", x, y)
    b.text(r, "Worktime", "Footnote/Strong", "accent", x=0, y=40, w=RW, textAlign="center")
    b.text(r, "5:50", "Numeric/Large", "text/primary", x=0, y=60, w=RW, textAlign="center", fontSize=40, lineHeight=44)
    rb = ribbon(b, r, 150, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
                now="15:12", planned="17:22", labels=False, h=7)
    b.set(rb, x=(RW - 150) / 2, y=112)
    wear_chip(b, r, "Clock out", "stop", "#F3F2ED", "#0B0C0B", 136, w=140)


def build(b):
    b.page("Geofencing")
    heading(b, "Geofencing", 0, -260,
            "Three rings per workplace: far away nothing runs, approaching = a low-power check every few minutes, "
            "near = GPS every 20–90 s, inside = off. Users decide when they're asked. See docs/technical/geofencing.md.")
    g = Grid(b, 0, 0, cols=6)
    for fn, cap in [(workplace_detail, "G1 · Workplace with rings"), (arrival_rule, "G2 · Arrival rule"),
                    (departure_rule, "G3 · Departure rule"), (precision, "G4 · Precision & battery"),
                    (how_it_works, "G5 · How location works"), (live_status, "G6 · Live status")]:
        x, y = g.next(cap)
        b.screens["geo_" + fn.__name__] = fn(b, x, y)
    b.page("Android & Wear OS")
    heading(b, "Android & Wear OS", 0, -260,
            "Same product, platform-native chrome: Material 3 navigation bar and surfaces instead of Liquid Glass, "
            "an ongoing notification instead of a Live Activity, round Wear OS layouts with edge progress.")
    g = Grid(b, 0, 0, cols=4, w=AW, h=AH)
    x, y = g.next("A1 · Today (Material 3)")
    android_today(b, x, y)
    x, y = g.next("A2 · Today · Dark")
    android_today(b, x, y, dark_mode=True)
    x, y = g.next("A3 · Ongoing & location notifications")
    android_shade(b, x, y)
    x, y = g.next("A4 · Background location permission")
    android_permission(b, x, y)
    wg = Grid(b, 0, AH + 260, cols=4, w=RW, h=RW)
    wear_screens(b, wg)
