"""Workplaces, geofences, reminders and the home-office schedule."""
from common import (W, H, Grid, heading, phone, nav_title, inline_nav, glass_btn, card, group, sep, row,
                    toggle_row, section, button, chip, map_tile, wallpaper, banner, GLASS)
from lib import GLASS_EFFECTS

CW = W - 32


def workplaces(b, x, y, name="Workplaces"):
    root, c = phone(b, name, x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Workplaces", right="plus")
    for title, addr, radius, days, fence in [
        ("Studio Kreuzberg", "Oranienstraße 24, Berlin", "150 m", "Mon · Wed · Fri", 46),
        ("Client — Mitte", "Rosenthaler Str. 40, Berlin", "200 m", "Any day", 56),
    ]:
        k = card(b, c, name=title, gap=0, pad=0, clip=True)
        map_tile(b, k, CW, 120, radius=0, fence=fence, name="Map")
        body = b.frame(k, name="Body", dir="h", gap=12, pad=16, sw="fill", cross="center")
        tx = b.frame(body, name="Text", dir="v", gap=2, sw="fill")
        b.text(tx, title, "Headline")
        b.text(tx, addr, "Footnote", "text/secondary")
        tags = b.frame(tx, name="Tags", dir="h", gap=6, pad=[6, 0, 0, 0])
        for t in (radius, days):
            tg = b.frame(tags, name=t, dir="h", pad=[3, 8, 3, 8], radius=8, fill="bg/sunken")
            b.text(tg, t, "Caption", "text/secondary")
        b.icon(body, "caret-right", 16, color="text/tertiary")
    home = card(b, c, name="Home office", gap=12, dir="h", cross="center", pad=16)
    t = b.frame(home, name="Tile", w=40, h=40, radius=12, dir="h", main="center", cross="center", sw="fixed",
                sh="fixed", fill="info/soft")
    b.icon(t, "house-line", 22, color="info", weight="fill")
    tx = b.frame(home, name="Text", dir="v", gap=2, sw="fill")
    b.text(tx, "Home office", "Headline")
    b.text(tx, "Schedule-based · no location used", "Footnote", "text/secondary")
    b.icon(home, "caret-right", 16, color="text/tertiary")
    b.text(c, "Geofences only wake Worktime when you arrive or leave. Your route is never recorded.",
           "Footnote", "text/secondary", sw="fill", align="center")
    return root


def add_workplace(b, x, y, name="Add workplace"):
    root, c = phone(b, name, x, y, tab=None, gap=14)
    inline_nav(b, c, "New workplace", left="x", right_label="Save")
    srch = b.frame(c, name="Search", dir="h", gap=8, pad=[0, 14, 0, 14], h=44, sh="fixed", radius=22,
                   sw="fill", cross="center", fill="bg/sunken")
    b.icon(srch, "magnifying-glass", 18, color="text/secondary")
    b.text(srch, "Oranienstraße 24", "Body", sw="fill")
    b.icon(srch, "x", 16, color="text/tertiary")
    map_tile(b, c, CW, 200, radius=26, fence=60, label="150 m")
    g = group(b, c, "Details")
    f = b.frame(g, name="Name", dir="h", gap=12, pad=[12, 16, 12, 16], sw="fill", cross="center",
                fill="bg/elevated", minHeight=56)
    b.text(f, "Name", "Body", "text/secondary", w=80)
    b.text(f, "Studio Kreuzberg", "Body", sw="fill")
    sep(b, g, 16)
    toggle_row(b, g, "Arrival reminder", True, sub="Ask to clock in when I arrive")
    toggle_row(b, g, "Departure reminder", True, sub="Ask to clock out when I leave", last=True)
    section(b, c, "Active on")
    days = b.frame(c, name="Days", dir="h", gap=6, sw="fill")
    for d, on in [("Mon", True), ("Tue", False), ("Wed", True), ("Thu", False), ("Fri", True)]:
        chip(b, days, d, on)
    return root


def geofence(b, x, y, name="Geofence radius"):
    root = b.frame(None, name=name, x=x, y=y, w=W, h=H, fill="map/land", clip=True)
    map_tile(b, root, W, H, radius=0, fence=118, cx=W / 2, cy=360, name="Map")
    b.inst("status", root, x=0, y=0)
    top = b.frame(root, name="Navigation", x=16, y=58, w=CW, h=44, dir="h", main="spaceBetween", cross="center",
                  sw="fixed", sh="fixed")
    glass_btn(b, top, "caret-left")
    lab = b.frame(top, name="Title", dir="h", pad=[0, 16, 0, 16], h=44, sh="fixed", radius=22, cross="center", **GLASS)
    b.text(lab, "Studio Kreuzberg", "Headline")
    glass_btn(b, top, "crosshair")
    panel = b.frame(root, name="Radius panel", x=8, y=H - 300, w=W - 16, h=292, dir="v", gap=16,
                    pad=[22, 24, 30, 24], radius=40, sw="fixed", sh="fixed", fill="bg/elevated",
                    stroke="glass/stroke", effects=GLASS_EFFECTS)
    hd = b.frame(panel, name="Header", dir="h", sw="fill", main="spaceBetween", cross="baseline")
    b.text(hd, "Reminder radius", "Title/3")
    b.text(hd, "150 m", "Numeric/Medium", "accent")
    sl = b.frame(panel, name="Slider", w=W - 64, h=28, sw="fixed", sh="fixed")
    b.rect(sl, W - 64, 6, "bg/track", radius=3, x=0, y=11)
    b.rect(sl, (W - 64) * 0.25, 6, "accent", radius=3, x=0, y=11)
    b.rect(sl, 38, 24, "#FFFFFF", radius=12, x=(W - 64) * 0.25 - 19, y=2,
           effects=[{"type": "dropShadow", "color": "#00000033", "offset": [0, 2], "radius": 8}])
    ax = b.frame(panel, name="Scale", dir="h", sw="fill", main="spaceBetween")
    for t in ("100 m", "250 m", "500 m"):
        b.text(ax, t, "Caption", "text/tertiary")
    tip = b.frame(panel, name="Tip", dir="h", gap=10, pad=14, radius=18, sw="fill", fill="bg/sunken", cross="min")
    b.icon(tip, "info", 18, color="text/secondary")
    b.text(tip, "iOS detects arrivals within roughly 100–200 m and can be a few minutes late. "
                "We always ask before recording anything.", "Footnote", "text/secondary", sw="fill")
    b.inst("home", root, x=0, y=H - 34)
    return root


def lock_screen(b, x, y, name):
    root = b.frame(None, name=name, x=x, y=y, w=W, h=H, fill="#1C2A25", clip=True)
    wallpaper(b, root)
    b.inst("status", root, x=0, y=0)
    b.add("variable.setMode", {"ids": [root], "collection": b.color_collection, "mode": "Dark"})
    clock = b.frame(root, name="Clock", x=0, y=90, w=W, dir="v", gap=0, cross="center", sw="fixed")
    return root, clock


def notification_expanded(b, parent, title, msg, actions, when="now"):
    n = b.frame(parent, name="Notification (expanded)", w=CW, dir="v", gap=10, sw="fixed")
    card_ = b.inst("notif", n, props={"Title": title, "Message": msg}, sizingH="fill")
    b.set(b.first(card_, name="When", type="TEXT"), characters=when)
    menu = b.frame(n, name="Actions", dir="v", gap=0, radius=22, sw="fill", clip=True, **GLASS)
    for k, (label, icon, tone) in enumerate(actions):
        r = b.frame(menu, name=label, dir="h", gap=10, pad=[14, 18, 14, 18], sw="fill", cross="center")
        b.text(r, label, "Body", tone, sw="fill")
        b.icon(r, icon, 20, color=tone)
        if k < len(actions) - 1:
            b.rect(menu, CW, 0.5, "glass/stroke")
    return n


def arrival(b, x, y, name="Arrival reminder"):
    root, clock = lock_screen(b, x, y, name)
    b.text(clock, "Thursday 16 October", "Headline", "#FFFFFFCC")
    b.text(clock, "8:44", "Display/Timer", "#FFFFFF", fontSize=96, lineHeight=100)
    stack = b.frame(root, name="Notifications", x=16, y=330, w=CW, dir="v", gap=10, sw="fixed")
    notification_expanded(b, stack, "Arrived at Studio Kreuzberg",
                          "Clock in now? Worktime noticed you at 08:44.",
                          [("Clock in at 08:44", "play", "text/primary"),
                           ("Clock in now", "clock", "text/primary"),
                           ("Not working today", "x", "danger")])
    b.text(root, "Long-press or swipe down on the notification to show its actions.", "Footnote", "#FFFFFFB3",
           x=40, y=700, w=W - 80, textAlign="center")
    b.inst("home", root, x=0, y=H - 34)
    return root


def departure(b, x, y, name="Departure reminder"):
    root, clock = lock_screen(b, x, y, name)
    b.text(clock, "Thursday 16 October", "Headline", "#FFFFFFCC")
    b.text(clock, "17:31", "Display/Timer", "#FFFFFF", fontSize=96, lineHeight=100)
    stack = b.frame(root, name="Notifications", x=16, y=330, w=CW, dir="v", gap=10, sw="fixed")
    notification_expanded(b, stack, "Left Studio Kreuzberg?",
                          "You've worked 8h 09m today. Clock out at 17:29?",
                          [("Clock out at 17:29", "stop", "text/primary"),
                           ("Clock out now", "clock", "text/primary"),
                           ("Still working", "briefcase", "text/primary")])
    b.text(stack, "Back inside within 15 minutes? The reminder is withdrawn automatically, so a short walk "
                  "never produces a second prompt.", "Footnote", "#FFFFFFB3", sw="fill", textAlign="center")
    b.inst("home", root, x=0, y=H - 34)
    return root


def schedule(b, x, y, name="Home-office schedule"):
    root, c = phone(b, name, x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Weekly pattern")
    b.text(c, "Tell Worktime where you usually work. Office days use location, home days use time.",
           "Subhead", "text/secondary", sw="fill")
    g = group(b, c, "Week")
    days = [("Monday", "Office", "buildings", "accent", "accent/soft"),
            ("Tuesday", "Home", "house-line", "info", "info/soft"),
            ("Wednesday", "Office", "buildings", "accent", "accent/soft"),
            ("Thursday", "Home", "house-line", "info", "info/soft"),
            ("Friday", "Flexible", "sparkle", "break", "break/soft"),
            ("Weekend", "Off", "moon", "text/secondary", "bg/sunken")]
    for k, (d, kind, icon, tint, tile) in enumerate(days):
        r = b.frame(g, name=d, dir="h", gap=12, pad=[10, 16, 10, 16], sw="fill", cross="center", fill="bg/elevated",
                    minHeight=56)
        b.text(r, d, "Body", sw="fill")
        tag = b.frame(r, name="Kind", dir="h", gap=6, pad=[6, 12, 6, 10], radius=16, cross="center", fill=tile)
        b.icon(tag, icon, 16, color=tint, weight="fill")
        b.text(tag, kind, "Subhead/Strong", tint)
        b.icon(r, "caret-down", 14, color="text/tertiary")
        if k < len(days) - 1:
            sep(b, g, 16)
    section(b, c, "Home-office days")
    g2 = group(b, c, "Home reminders")
    from common import time_field
    time_field(b, g2, "Remind me to start", "09:00", sub="if not clocked in by then", icon="bell")
    sep(b, g2, 48)
    time_field(b, g2, "Remind me to stop", "after 8h 30m", sub="or at 18:00 at the latest", icon="bell")
    return root


def reminder_prefs(b, x, y, name="Reminder preferences"):
    root, c = phone(b, name, x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Reminders")
    section(b, c, "Location")
    g = group(b, c, "Location")
    toggle_row(b, g, "Arrival", True, icon="sign-in", sub="When you reach a workplace")
    toggle_row(b, g, "Departure", True, icon="sign-out", sub="When you leave a workplace", last=True)
    section(b, c, "Safety nets")
    g2 = group(b, c, "Safety")
    toggle_row(b, g2, "Forgot to clock out", True, icon="hourglass", sub="After 10 hours of work",
               tint="break", tile="break/soft")
    toggle_row(b, g2, "Break reminder", True, icon="coffee", sub="After 6 hours without a break",
               tint="break", tile="break/soft")
    toggle_row(b, g2, "Weekly review", False, icon="calendar-check", sub="Fridays at 16:00 if days are incomplete",
               last=True)
    section(b, c, "Quiet")
    g3 = group(b, c, "Quiet")
    toggle_row(b, g3, "Merge repeated reminders", True, icon="arrows-merge", sub="Within 15 minutes",
               tint="info", tile="info/soft", last=True)
    return root


def settings(b, x, y, name="Settings"):
    root, c = phone(b, name, x, y, tab="Settings", gap=14)
    nav_title(b, c, "Settings", None)
    g = group(b, c, "Work")
    row(b, g, "Working hours", "40h · Mon–Fri", icon="clock")
    row(b, g, "Breaks", "30 min after 6h", icon="coffee", tint="break", tile="break/soft")
    row(b, g, "Workplaces", "2", icon="map-pin")
    row(b, g, "Weekly pattern", "2 home days", icon="house-line", tint="info", tile="info/soft", last=True)
    g2 = group(b, c, "App")
    row(b, g2, "Reminders", "5 on", icon="bell")
    row(b, g2, "Appearance", "Automatic", icon="paint-brush", tint="text/secondary", tile="bg/sunken")
    row(b, g2, "Apple Watch", "Connected", icon="watch", tint="text/secondary", tile="bg/sunken", last=True)
    g3 = group(b, c, "Data")
    row(b, g3, "Export", "CSV · PDF", icon="export", tint="text/secondary", tile="bg/sunken")
    row(b, g3, "Backup", "iCloud Drive", icon="database", tint="text/secondary", tile="bg/sunken")
    row(b, g3, "Privacy", "", icon="shield-check", last=True)
    b.text(c, "All data stays on this iPhone. No account, no analytics.", "Footnote", "text/secondary",
           sw="fill", align="center")
    return root


def build(b):
    b.page("iPhone · Places & Schedule")
    heading(b, "Workplaces, reminders & schedule", 0, -260,
            "Reminders are always questions, never automatic entries. Geofencing is event-driven and coarse by design.")
    g = Grid(b, 0, 0, cols=8)
    for fn, cap in [(settings, "12a · Settings"), (workplaces, "12 · Workplaces"), (add_workplace, "13 · Add workplace"),
                    (geofence, "14 · Geofence radius"), (arrival, "15 · Arrival reminder"),
                    (departure, "16 · Departure reminder"), (schedule, "17 · Home-office schedule"),
                    (reminder_prefs, "18 · Reminder preferences")]:
        x, y = g.next(cap)
        b.screens[fn.__name__] = fn(b, x, y)
