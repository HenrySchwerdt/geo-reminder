"""Cover, visual directions, dark mode, UX flow diagrams and prototype links."""
from common import W, H, Grid, heading, GLASS, card
from ds import app_icon
from lib import GLASS_EFFECTS
import screens_core as core
import screens_places as places
import screens_onboarding as ob
import screens_apple as apple


def dark(b, ref):
    b.add("variable.setMode", {"ids": [ref], "collection": b.color_collection, "mode": "Dark"})


def cover(b):
    f = b.frame(None, name="Cover", x=0, y=0, w=1600, h=620, fill="bg/canvas", dir="v", gap=28,
                pad=[110, 120, 110, 120], sw="fixed", sh="fixed", radius=0)
    app_icon(b, f, 120)
    b.text(f, "Worktime", "Display/Large", fontSize=72, lineHeight=80)
    b.text(f, "Effortless, private work-time tracking for iPhone, Apple Watch and the Lock Screen.",
           "Title/2", "text/secondary", w=1100)
    r = b.frame(f, name="Facts", dir="h", gap=16)
    for t in ("iOS 26 · Liquid Glass", "41 screens & states", "Light + Dark", "Design system with tokens",
              "6 end-to-end flows"):
        p = b.frame(r, name=t, dir="h", pad=[10, 18, 10, 18], radius=22, fill="bg/elevated", stroke="separator")
        b.text(p, t, "Subhead/Strong")
    b.text(f, "Milestone 1 — product design. Source of truth: design/figcraft/src (regenerate with build.py).",
           "Footnote", "text/tertiary")


def directions(b):
    b.page("Directions")
    heading(b, "Three visual directions", 0, -260,
            "Same screen, same data. A was selected: glass only where it helps (navigation & controls), calm "
            "opaque content for legibility of numbers. See docs/design/decisions.md.")
    g = Grid(b, 0, 0, cols=3)
    x, y = g.next("A · Liquid Glass Calm — selected")
    core.today_working(b, x, y, name="Direction A · Liquid Glass Calm")
    x, y = g.next("B · Liquid Glass Vivid")
    root = core.today_working(b, x, y, name="Direction B · Liquid Glass Vivid")
    b.set(root, fills=[{"type": "linearGradient", "stops": ["#7FD3B0", "#4E7CF0", "#C77DEB"]}])
    for nm in ("Session", "Week"):
        b.set(b.first(root, name=nm, type="FRAME"), fill="#FFFFFF59", stroke="#FFFFFFB3", strokeWeight=1,
              effects=GLASS_EFFECTS)
    x, y = g.next("C · Flat Minimal (pre-iOS 26)")
    root = core.today_working(b, x, y, name="Direction C · Flat Minimal")
    b.add("variable.setMode", {"ids": [root], "collection": b.color_collection, "mode": "Exploration · Flat"})
    tb = b.first(root, name="Tab bar", type="INSTANCE")
    for nm in ("Session", "Week"):
        b.set(b.first(root, name=nm, type="FRAME"), cornerRadius=12, effects=[])
    notes = [
        ("A", "Warm neutral canvas, one deep-green accent, amber for breaks. Floating glass tab bar and toolbar "
              "buttons; content cards opaque. Highest legibility of time values, calm, unmistakably iOS 26."),
        ("B", "Expressive and eye-catching, but every surface competes. Numbers on translucent cards over "
              "saturated gradients fail contrast in places and the app starts to look like a wallpaper demo."),
        ("C", "Familiar and clean, but dated next to iOS 26 system apps; no material hierarchy between controls "
              "and content; system blue makes the product anonymous."),
    ]
    for k, (lab, t) in enumerate(notes):
        b.text(None, t, "Callout", "text/secondary", x=k * (W + 120), y=H + 40, w=W)


def dark_mode(b):
    b.page("Dark Mode")
    heading(b, "Dark appearance", 0, -260,
            "Every colour is a variable with Light and Dark values; these frames only switch the mode.")
    g = Grid(b, 0, 0, cols=6)
    for fn, cap in [(core.today_working, "Today — working"), (core.today_break, "Today — on break"),
                    (core.calendar, "Calendar"), (core.day_details, "Day details"),
                    (core.week_summary, "Weekly summary"), (places.reminder_prefs, "Reminders")]:
        x, y = g.next(cap)
        root = fn(b, x, y, name=f"Dark · {cap.split(' —')[0]}" + (f" ({cap.split('— ')[1]})" if "—" in cap else ""))
        dark(b, root)


FLOWS = [
    ("Flow 1 · First-time setup", [
        ("Install", "App Store", "sparkle"), ("Welcome", "19", "hand-waving"), ("Working hours", "20", "clock"),
        ("Location", "21 · explained first", "navigation-arrow"), ("Notifications", "22", "bell"),
        ("Workplace", "23", "buildings"), ("Ready", "24", "check-circle")]),
    ("Flow 2 · Arriving at work", [
        ("Enter geofence", "region event · may lag", "map-pin-area"),
        ("Arrival reminder", "15 · actions on Lock Screen", "bell-ringing"),
        ("Confirm clock-in", "4 · pick arrival or now", "play"), ("Active session", "2 + Live Activity 38", "timer")]),
    ("Flow 3 · Leaving work", [
        ("Exit geofence", "debounced 15 min", "map-pin-area"), ("Departure reminder", "16", "bell-ringing"),
        ("Confirm clock-out", "5 · pick left or now", "stop"), ("Daily summary", "7 · day details", "calendar-check")]),
    ("Flow 4 · Home-office day", [
        ("Scheduled reminder", "17 · 09:00 if not clocked in", "bell"), ("Start session", "2", "play"),
        ("Break", "3 · amber state", "coffee"), ("End session", "after 8h 30m prompt", "stop")]),
    ("Flow 5 · Forgotten check-in", [
        ("Open calendar", "6 · red day", "calendar-blank"), ("Select day", "30 · incomplete", "warning-circle"),
        ("Add missing entry", "9 · times + break", "calendar-plus"), ("Review impact", "balance preview", "info"),
        ("Save", "32 · toast + undo", "check-circle")]),
    ("Flow 6 · Apple Watch", [
        ("Open watch app", "33", "watch"), ("Clock in", "one tap", "play"), ("Monitor", "34 · ring + ribbon", "timer"),
        ("Clock out", "36", "stop"), ("Sync", "WatchConnectivity → iPhone", "arrows-clockwise")]),
]


def flows(b):
    b.page("Flows")
    heading(b, "UX flows", 0, -220,
            "Six journeys. Numbers refer to the captions on the screen pages; blue arrows in the Prototype tab "
            "link the same journeys between real screens.")
    y = 0
    for title, steps in FLOWS:
        b.text(None, title, "Title/2", x=0, y=y)
        x = 0
        for k, (name, sub, icon) in enumerate(steps):
            f = b.frame(None, name=f"{title} · {name}", x=x, y=y + 50, w=230, h=118, dir="v", gap=8, pad=18,
                        radius=24, sw="fixed", sh="fixed", fill="bg/elevated", stroke="separator")
            hd = b.frame(f, name="Header", dir="h", gap=8, cross="center")
            t = b.frame(hd, name="Tile", w=30, h=30, radius=9, dir="h", main="center", cross="center", sw="fixed",
                        sh="fixed", fill="accent/soft")
            b.icon(t, icon, 18, color="accent")
            b.text(hd, f"{k + 1}", "Caption", "text/tertiary")
            b.text(f, name, "Headline", w=194)
            b.text(f, sub, "Footnote", "text/secondary", w=194)
            if k < len(steps) - 1:
                b.add("node.create", {"type": "vector", "path": "M0 0 L40 0", "x": x + 240, "y": y + 109,
                                      "name": "Arrow", "props": {"fill": "none", "stroke": {"$var": "Color/text/tertiary"},
                                                                 "strokeWeight": 2, "endCap": "lineArrow"}})
            x += 290
        y += 240


def prototypes(b):
    """Click-through links for the main journeys (Prototype tab)."""
    S = b.screens

    def link(screen, text, dest, transition="smartAnimate"):
        hit = b.first(S[screen], type="TEXT", text=text)
        b.add("proto.interaction.add", {"id": hit, "action": {"type": "navigate", "dest": S[dest]},
                                        "transition": {"type": transition, **({"direction": "left"} if transition in ("push", "slideIn") else {})}, "durationMs": 300,
                                        "easing": "gentle"})

    chain = ["ob_welcome", "ob_hours", "ob_location", "ob_notifications", "ob_workplace", "ob_done"]
    ctas = ["Get started", "Continue", "Allow location", "Allow notifications", "Add workplace"]
    for a, z, t in zip(chain, chain[1:], ctas):
        link(a, t, z, "push")
    link("ob_done", "Start using Worktime", "today_off", "dissolve")
    link("today_off", "Clock in", "confirm_in")
    link("confirm_in", "Clock in at 08:44", "today_working")
    link("today_working", "Break", "today_break")
    link("today_break", "End break", "today_working")
    link("today_working", "Clock out", "confirm_out")
    link("confirm_out", "Still working", "today_working")
    link("arrival", "Clock in at 08:44", "today_working", "dissolve")
    link("departure", "Clock out at 17:29", "day_details", "dissolve")
    link("calendar", "Fix entry", "add_missed", "slideIn")
    link("st_incomplete", "Choose another time", "add_missed", "slideIn")
    link("day_details", "Studio Kreuzberg", "edit_session", "slideIn")


def build(b):
    flows(b)
    directions(b)
    dark_mode(b)
    prototypes(b)
    b.add("page.select", {"index": 0})
    cover(b)
