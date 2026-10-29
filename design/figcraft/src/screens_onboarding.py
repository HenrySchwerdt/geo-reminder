"""Onboarding (6 steps) and system / edge-case states."""
from common import (W, H, Grid, heading, phone, nav_title, inline_nav, glass_btn, card, group, sep, row,
                    toggle_row, section, button, pill, chip, ribbon, map_tile, banner, time_field, GLASS)
from ds import app_icon
from lib import GLASS_EFFECTS

CW = W - 32


def dots(b, parent, k, n=6):
    d = b.frame(parent, name="Progress", dir="h", gap=6, cross="center")
    for i in range(n):
        b.rect(d, 22 if i == k else 6, 6, "text/primary" if i == k else "bg/track", radius=3)


def ob_frame(b, name, x, y, step, title, body, cta, secondary=None, illo=None):
    root, c = phone(b, name, x, y, tab=None, gap=20, pad_top=70, pad_bottom=0)
    top = b.frame(c, name="Top", dir="h", sw="fill", main="spaceBetween", cross="center", h=44, sh="fixed")
    if step > 0:
        glass_btn(b, top, "caret-left")
    else:
        b.frame(top, name="Spacer", w=44, h=44, sw="fixed", sh="fixed")
    dots(b, top, step)
    b.frame(top, name="Spacer", w=44, h=44, sw="fixed", sh="fixed")
    stage = b.frame(c, name="Illustration", dir="v", gap=12, sw="fill", h=300, sh="fixed", main="center",
                    cross="center")
    if illo:
        illo(stage)
    txt = b.frame(c, name="Text", dir="v", gap=10, sw="fill")
    b.text(txt, title, "Title/1", sw="fill")
    b.text(txt, body, "Callout", "text/secondary", sw="fill")
    foot = b.frame(root, name="Footer", x=16, y=H - 34 - 16 - (122 if secondary else 56), w=CW, dir="v", gap=10,
                   sw="fixed")
    button(b, foot, cta, "Ink")
    if secondary:
        sec = b.frame(foot, name="Secondary", dir="h", h=52, sh="fixed", sw="fill", main="center", cross="center")
        b.text(sec, secondary, "Headline", "accent")
    return root, c


def welcome(b, x, y):
    def illo(st):
        app_icon(b, st, 112)
        r = b.frame(st, name="Ribbon", dir="h", pad=[24, 0, 0, 0])
        ribbon(b, r, 260, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "17:22", "work")],
               labels=False, h=14)
    root, c = ob_frame(b, "Onboarding · Welcome", x, y, 0, "Work time, without the effort.",
                       "Worktime reminds you to clock in and out at the right moment — and keeps a record you can "
                       "trust and fix.", "Get started", illo=illo)
    pts = b.frame(c, name="Points", dir="v", gap=12, sw="fill")
    for icon, t in [("bell-ringing", "Gentle reminders when you arrive or leave"),
                    ("pencil-simple", "Every day stays editable and traceable"),
                    ("lock-simple", "Private by design — no account, no cloud")]:
        r = b.frame(pts, name=t, dir="h", gap=12, cross="center", sw="fill")
        b.icon(r, icon, 22, color="accent")
        b.text(r, t, "Subhead", sw="fill")
    return root


def hours(b, x, y):
    def illo(st):
        k = card(b, st, name="Hours", gap=16, pad=20)
        b.set(k, sizingH="fixed", width=CW)
        r = b.frame(k, name="Weekly", dir="h", sw="fill", main="spaceBetween", cross="center")
        tx = b.frame(r, name="Label", dir="v", gap=2)
        b.text(tx, "Weekly hours", "Subhead", "text/secondary")
        b.text(tx, "40h", "Numeric/Large", fontSize=40, lineHeight=44)
        stp = b.frame(r, name="Stepper", dir="h", gap=0, radius=18, fill="bg/sunken", pad=2)
        for ic in ("−", "+"):
            s = b.frame(stp, name=ic, w=48, h=36, radius=16, dir="h", main="center", cross="center", sw="fixed",
                        sh="fixed", fill="bg/elevated" if ic == "+" else None)
            b.text(s, ic, "Title/3")
        days = b.frame(k, name="Days", dir="h", gap=6, sw="fill")
        for d, on in [("M", 1), ("T", 1), ("W", 1), ("T", 1), ("F", 1), ("S", 0), ("S", 0)]:
            cc = b.frame(days, name=d, w=38, h=38, radius=19, dir="h", main="center", cross="center", sw="fixed",
                         sh="fixed", fill="text/primary" if on else "bg/sunken")
            b.text(cc, d, "Subhead/Strong", "bg/canvas" if on else "text/secondary")
        r2 = b.frame(k, name="Per day", dir="h", sw="fill", main="spaceBetween")
        b.text(r2, "8h per day · 30 min break after 6h", "Footnote", "text/secondary")
    return ob_frame(b, "Onboarding · Working hours", x, y, 1, "Your usual week",
                    "We use this to show your expected end time and overtime. You can change it any time.",
                    "Continue", illo=illo)[0]


def location(b, x, y):
    def illo(st):
        m = map_tile(b, st, CW, 230, radius=32, fence=70, label="Arrive · Leave")
    root, c = ob_frame(b, "Onboarding · Location", x, y, 2, "Reminders where you work",
                       "Allow location “Always” so iOS can wake Worktime when you arrive or leave a workplace. "
                       "We never track your route.", "Allow location", secondary="Not now", illo=illo)
    pts = b.frame(c, name="Facts", dir="v", gap=8, sw="fill")
    for icon, t in [("shield-check", "Only arrival and departure events"), ("gps-slash", "No background GPS polling")]:
        r = b.frame(pts, name=t, dir="h", gap=10, cross="center", sw="fill")
        b.icon(r, icon, 20, color="accent", weight="fill")
        b.text(r, t, "Subhead", sw="fill")
    return root


def notifications(b, x, y):
    def illo(st):
        b.inst("notif", st, props={"Title": "Arrived at Studio Kreuzberg", "Message": "Clock in now? You arrived at 08:44."})
        n2 = b.inst("notif", st, props={"Title": "Left Studio Kreuzberg?", "Message": "You've worked 8h 09m. Clock out?"})
        b.set(n2, opacity=0.6)
    return ob_frame(b, "Onboarding · Notifications", x, y, 3, "One tap to confirm",
                    "Reminders arrive as notifications with actions, so you can clock in from the Lock Screen "
                    "or your Apple Watch.", "Allow notifications", secondary="Not now", illo=illo)[0]


def workplace(b, x, y):
    def illo(st):
        srch = b.frame(st, name="Search", dir="h", gap=8, pad=[0, 14, 0, 14], h=44, sh="fixed", radius=22,
                       w=CW, sw="fixed", cross="center", fill="bg/sunken")
        b.icon(srch, "magnifying-glass", 18, color="text/secondary")
        b.text(srch, "Search address or place", "Body", "text/tertiary", sw="fill")
        g = group(b, st, "Suggestions")
        b.set(g, sizingH="fixed", width=CW)
        row(b, g, "Use current location", "", icon="navigation-arrow")
        row(b, g, "Studio Kreuzberg", "Oranienstr. 24", icon="buildings", chevron=False)
        row(b, g, "I mostly work from home", "", icon="house-line", tint="info", tile="info/soft", last=True)
    return ob_frame(b, "Onboarding · Workplace", x, y, 4, "Where do you work?",
                    "Add your office now — more places and a home-office pattern can follow later.",
                    "Add workplace", secondary="Skip for now", illo=illo)[0]


def done(b, x, y):
    def illo(st):
        cc = b.frame(st, name="Check", w=120, h=120, radius=60, dir="h", main="center", cross="center",
                     sw="fixed", sh="fixed", fill="accent/soft")
        b.icon(cc, "check-circle", 64, color="accent", weight="fill")
    root, c = ob_frame(b, "Onboarding · Ready", x, y, 5, "You're all set",
                       "Next time you arrive at Studio Kreuzberg, we'll ask if you want to clock in.",
                       "Start using Worktime", illo=illo)
    g = group(b, c, "Summary")
    for t, v in [("Working hours", "40h · Mon–Fri"), ("Workplace", "Studio Kreuzberg"), ("Reminders", "On")]:
        row(b, g, t, v, icon="check", chevron=False, last=t == "Reminders")
    return root


# ---------------------------------------------------------------------------
# System states
# ---------------------------------------------------------------------------

def empty(b, x, y):
    root, c = phone(b, "State · Empty calendar", x, y, tab="Calendar", gap=16)
    nav_title(b, c, "Calendar", None, actions=["calendar-plus"])
    st = b.frame(c, name="Empty", dir="v", gap=14, sw="fill", h=520, sh="fixed", main="center", cross="center")
    cc = b.frame(st, name="Glyph", w=88, h=88, radius=44, dir="h", main="center", cross="center", sw="fixed",
                 sh="fixed", fill="bg/sunken")
    b.icon(cc, "calendar-blank", 40, color="text/secondary")
    b.text(st, "No work days yet", "Title/2", align="center")
    b.text(st, "Your days appear here after your first clock-in. Missed a day? Add it by hand.", "Subhead",
           "text/secondary", align="center", w=280)
    btn = b.frame(st, name="Action", dir="h", w=220, sw="fixed")
    from common import button as btn_
    btn_(b, btn, "Add a past day", "Secondary", icon="calendar-plus", weight="regular")
    return root


def loading(b, x, y):
    root, c = phone(b, "State · Loading", x, y, tab="Insights", gap=14)
    nav_title(b, c, "Insights", None, actions=["export"])
    b.inst("segmented", c, props={"Selected": "Month"}, sizingH="fill")
    for hgt in (170, 130, 180):
        k = card(b, c, name="Skeleton", gap=12)
        b.rect(k, 120, 12, "bg/sunken", radius=6)
        b.rect(k, 200, 26, "bg/sunken", radius=8)
        r = b.rect(k, 10, hgt - 90, "bg/sunken", radius=12)
        b.set(r, sizingH="fill")
    return root


def permission_denied(b, x, y):
    root, c = phone(b, "State · Location denied", x, y, tab="Settings", gap=14)
    inline_nav(b, c, "Workplaces", right="plus")
    k = card(b, c, name="Denied", gap=14, pad=20)
    cc = b.frame(k, name="Glyph", w=52, h=52, radius=26, dir="h", main="center", cross="center", sw="fixed",
                 sh="fixed", fill="danger/soft")
    b.icon(cc, "gps-slash", 26, color="danger", weight="fill")
    b.text(k, "Location reminders are off", "Title/3")
    b.text(k, "Worktime needs “Always” location access to notice when you arrive or leave. Without it you can "
              "still clock in manually and use time-based reminders.", "Subhead", "text/secondary", sw="fill")
    steps = b.frame(k, name="Steps", dir="v", gap=6, pad=14, radius=16, fill="bg/sunken", sw="fill")
    for t in ("1  Open Settings › Worktime › Location", "2  Choose “Always”", "3  Turn on Precise Location"):
        b.text(steps, t, "Footnote", sw="fill")
    from common import button as btn_
    btn_(b, k, "Open Settings", "Ink", icon="arrow-up-right", weight="regular")
    btn_(b, k, "Use time-based reminders", "Secondary")
    return root


def location_unavailable(b, x, y):
    root, c = phone(b, "State · Location unavailable", x, y, tab="Today", gap=14)
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    banner(b, c, "Location temporarily unavailable", "Low Power Mode or no signal can delay arrival reminders. "
                 "We'll catch up and ask about any gap.", tone="break", icon="gps-slash")
    hero = card(b, c, name="Session", gap=16, pad=20)
    pill(b, hero, "Off")
    b.text(hero, "0:00", "Display/Timer", "text/tertiary")
    from common import button as btn_
    btn_(b, hero, "Clock in", "Primary", icon="play")
    return root


def missed_checkin(b, x, y):
    root, c = phone(b, "State · Missed check-in", x, y, tab="Today", gap=14)
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    k = card(b, c, name="Missed", gap=14, pad=20)
    hd = b.frame(k, name="Header", dir="h", gap=10, cross="center")
    b.icon(hd, "hand-waving", 22, color="break", weight="fill")
    b.text(hd, "Did you start work at 08:44?", "Headline")
    b.text(k, "You arrived at Studio Kreuzberg but didn't clock in. The notification may have been missed "
              "or delayed.", "Subhead", "text/secondary", sw="fill")
    ribbon(b, k, CW - 40, [("08:44", "11:20", "missing")], now="11:20", planned="17:15", marker_label="Ends ~17:15")
    from common import button as btn_
    acts = b.frame(k, name="Actions", dir="h", gap=10, sw="fill")
    btn_(b, acts, "From 08:44", "Primary", icon="play")
    btn_(b, acts, "From now", "Secondary")
    b.text(k, "Not working today", "Subhead/Strong", "danger", sw="fill", align="center")
    return root


def incomplete(b, x, y):
    root, c = phone(b, "State · Incomplete entry", x, y, tab="Calendar", gap=14)
    inline_nav(b, c, "Mon, 13 October", right="dots-three")
    pill(b, c, "Alert")
    k = card(b, c, name="Incomplete", gap=14, pad=20)
    b.text(k, "Clocked in 08:55 · no check-out", "Headline")
    ribbon(b, k, CW - 40, [("08:55", "17:30", "missing")], ticks=(6, 9, 12, 15, 18))
    b.text(k, "We think you left around 17:30 — that's when Worktime last noticed you at Studio Kreuzberg.",
           "Subhead", "text/secondary", sw="fill")
    from common import button as btn_
    btn_(b, k, "End at 17:30", "Primary", icon="check", weight="regular")
    btn_(b, k, "Choose another time", "Secondary")
    b.text(c, "Incomplete days don't count towards your balance until they're fixed.", "Footnote",
           "text/secondary", sw="fill", align="center")
    return root


def conflict(b, x, y):
    root, c = phone(b, "State · Conflicting entries", x, y, tab="Calendar", gap=14)
    inline_nav(b, c, "Tue, 7 October", right="dots-three")
    banner(b, c, "Two sessions overlap", "13:00–14:10 is counted twice. Choose how to resolve it.",
           icon="arrows-merge")
    k = card(b, c, name="Overlap", gap=12, pad=20)
    w = CW - 40
    from common import hm
    f = b.frame(k, name="Lanes", w=w, h=74, sw="fixed", sh="fixed")
    X = lambda t: (hm(t) - 8) / 11 * w
    b.rect(f, X("14:10") - X("08:50"), 26, "accent", radius=8, x=X("08:50"), y=0, name="Office")
    b.rect(f, X("18:00") - X("13:00"), 26, "info", radius=8, x=X("13:00"), y=36, name="Home")
    b.rect(f, X("14:10") - X("13:00"), 74, "danger", radius=6, x=X("13:00"), y=0, opacity=0.18, name="Overlap")
    lr = b.frame(k, name="Labels", dir="v", gap=4, sw="fill")
    b.text(lr, "Studio Kreuzberg  08:50 – 14:10", "Footnote", "accent")
    b.text(lr, "Home office  13:00 – 18:00", "Footnote", "info")
    g = group(b, c, "Resolve")
    row(b, g, "End office session at 13:00", "", icon="buildings")
    row(b, g, "Start home session at 14:10", "", icon="house-line", tint="info", tile="info/soft")
    row(b, g, "Merge into one 08:50 – 18:00", "", icon="arrows-merge", tint="text/secondary", tile="bg/sunken",
        last=True)
    return root


def confirmations(b, x, y):
    root, c = phone(b, "State · Saved & error", x, y, tab="Calendar", gap=14)
    inline_nav(b, c, "Tue, 14 October", right="dots-three")
    k = card(b, c, name="Summary", gap=12)
    b.text(k, "8h 11m worked", "Numeric/Large")
    ribbon(b, k, CW - 40, [("08:52", "12:15", "work"), ("12:15", "13:00", "break"), ("13:00", "17:20", "work")])
    # Delete confirmation (action sheet)
    sheet = b.frame(root, name="Delete confirmation", x=8, y=430, w=W - 16, dir="v", gap=8, sw="fixed")
    m = b.frame(sheet, name="Menu", dir="v", gap=0, radius=28, sw="fill", clip=True, **GLASS)
    hd = b.frame(m, name="Message", dir="v", gap=4, pad=16, sw="fill", cross="center")
    b.text(hd, "Delete this session?", "Footnote/Strong", "text/secondary", align="center")
    b.text(hd, "4h 20m will be removed. You can undo for 10 seconds.", "Footnote", "text/secondary",
           align="center", sw="fill")
    b.rect(m, W - 16, 0.5, "glass/stroke")
    dl = b.frame(m, name="Delete", dir="h", h=56, sh="fixed", sw="fill", main="center", cross="center")
    b.text(dl, "Delete session", "Body", "danger")
    cn = b.frame(sheet, name="Cancel", dir="h", h=56, sh="fixed", sw="fill", radius=28, main="center",
                 cross="center", fill="bg/elevated")
    b.text(cn, "Cancel", "Headline")
    # toasts
    t1 = b.frame(root, name="Toast · Saved", x=16, y=262, w=CW, dir="h", gap=10, pad=[12, 16, 12, 14], radius=24,
                 cross="center", sw="fixed", **GLASS)
    b.icon(t1, "check-circle", 22, color="accent", weight="fill")
    b.text(t1, "Session saved · balance +5h 59m", "Subhead", sw="fill")
    b.text(t1, "Undo", "Subhead/Strong", "accent")
    t2 = b.frame(root, name="Toast · Error", x=16, y=330, w=CW, dir="h", gap=10, pad=[12, 16, 12, 14], radius=24,
                 cross="center", sw="fixed", fill="danger/soft")
    b.icon(t2, "warning-circle", 22, color="danger", weight="fill")
    b.text(t2, "Couldn't save — the end is before the start.", "Subhead", "danger", sw="fill")
    return root


def build(b):
    b.page("iPhone · Onboarding")
    heading(b, "Onboarding", 0, -260,
            "Six calm steps. Permissions are explained before iOS asks, and every step can be skipped.")
    g = Grid(b, 0, 0, cols=6)
    for fn, cap in [(welcome, "19 · Welcome"), (hours, "20 · Working hours"), (location, "21 · Location permission"),
                    (notifications, "22 · Notification permission"), (workplace, "23 · Workplace setup"),
                    (done, "24 · Completion")]:
        x, y = g.next(cap)
        b.screens["ob_" + fn.__name__] = fn(b, x, y)
    b.page("iPhone · System States")
    heading(b, "System states", 0, -260,
            "Edge cases are first-class: delayed or missed geofence events, incomplete days and conflicts "
            "always end in a clear, reversible question.")
    g = Grid(b, 0, 0, cols=8)
    for fn, cap in [(empty, "25 · Empty state"), (loading, "26 · Loading"),
                    (permission_denied, "27 · Permission denied"), (location_unavailable, "28 · Location unavailable"),
                    (missed_checkin, "29 · Missed check-in"), (incomplete, "30 · Incomplete entry"),
                    (conflict, "31 · Conflicting entries"), (confirmations, "32 · Confirmation & error")]:
        x, y = g.next(cap)
        b.screens["st_" + fn.__name__] = fn(b, x, y)
