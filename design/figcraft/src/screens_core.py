"""Core iPhone screens: Today (3 states), confirmations, calendar, day details, editing, insights."""
from common import (W, H, Grid, heading, phone, nav_title, inline_nav, glass_btn, card, group, sep, row,
                    toggle_row, section, button, pill, chip, ribbon, bars, stat, ring, scrim, sheet,
                    time_field, banner, GLASS)
from lib import CARD_EFFECTS

CW = W - 32          # content width
IW = CW - 40         # inner width of a card with 20 pt padding

WORK_SEGS = [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")]
WEEK = [("M", 8.4, "work"), ("T", 8.9, "work"), ("W", 7.6, "work"), ("T", 5.8, "today"), ("F", 0, "off")]


def week_card(b, parent, title="This week", total="30h 41m", of="of 40h", today_idx=3):
    c = card(b, parent, name="Week", gap=14)
    head = b.frame(c, name="Header", dir="h", sw="fill", main="spaceBetween", cross="max")
    l = b.frame(head, name="Total", dir="v", gap=2)
    b.text(l, title, "Footnote", "text/secondary")
    t = b.frame(l, name="Value", dir="h", gap=6, cross="baseline")
    b.text(t, total, "Numeric/Large")
    b.text(t, of, "Subhead", "text/secondary")
    r = b.frame(head, name="Balance", dir="v", gap=2, cross="max")
    b.text(r, "Balance", "Footnote", "text/secondary")
    b.text(r, "+6h 20m", "Numeric/Medium", "accent")
    bars(b, c, IW, 64, WEEK, target=8, maxv=10)
    return c


def today_working(b, x, y, name="Today · Working"):
    root, c = phone(b, name, x, y, tab="Today")
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    hero = card(b, c, name="Session", gap=16, pad=20)
    top = b.frame(hero, name="Status", dir="h", sw="fill", main="spaceBetween", cross="center")
    pill(b, top, "Working", "Working · Studio Kreuzberg")
    timer = b.frame(hero, name="Timer", dir="v", gap=4, sw="fill")
    t = b.frame(timer, name="Elapsed", dir="h", gap=0, cross="baseline")
    b.text(t, "5:50", "Display/Timer")
    b.text(t, ":12", "Numeric/Large", "text/tertiary")
    b.text(timer, "Since 08:47 · 35 min break", "Subhead", "text/secondary")
    ribbon(b, hero, IW, WORK_SEGS, now="15:12", planned="17:22", marker_label="Ends ~17:22")
    stats = b.frame(hero, name="Stats", dir="h", gap=12, sw="fill")
    stat(b, stats, "Remaining", "2h 10m")
    stat(b, stats, "Expected end", "17:22")
    stat(b, stats, "Today", "73%", color="accent")
    acts = b.frame(hero, name="Actions", dir="h", gap=10, sw="fill")
    button(b, acts, "Break", "Break", icon="coffee")
    button(b, acts, "Clock out", "Ink", icon="stop")
    week_card(b, c)
    return root


def today_off(b, x, y, name="Today · Not working"):
    root, c = phone(b, name, x, y, tab="Today")
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    hero = card(b, c, name="Session", gap=16, pad=20)
    pill(b, hero, "Off")
    timer = b.frame(hero, name="Timer", dir="v", gap=4, sw="fill")
    b.text(timer, "0:00", "Display/Timer", "text/tertiary")
    b.text(timer, "Office day · 8h planned · usually 08:50–17:20", "Subhead", "text/secondary", sw="fill")
    ribbon(b, hero, IW, [], now="08:12", planned="17:20", marker_label="Planned end 17:20")
    near = b.frame(hero, name="Nearby", dir="h", gap=10, pad=[12, 14, 12, 14], radius=16, sw="fill",
                   cross="center", fill="accent/soft")
    b.icon(near, "navigation-arrow", 18, color="accent", weight="fill")
    b.text(near, "We'll remind you when you arrive at Studio Kreuzberg.", "Footnote", "accent", sw="fill")
    button(b, hero, "Clock in", "Primary", icon="play")
    week_card(b, c, total="24h 53m")
    return root


def today_break(b, x, y, name="Today · On break"):
    root, c = phone(b, name, x, y, tab="Today")
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    hero = card(b, c, name="Session", gap=16, pad=20)
    pill(b, hero, "Break", "On break · since 12:30")
    timer = b.frame(hero, name="Timer", dir="v", gap=4, sw="fill")
    t = b.frame(timer, name="Elapsed", dir="h", gap=0, cross="baseline")
    b.text(t, "0:12", "Display/Timer", "break")
    b.text(t, ":40", "Numeric/Large", "text/tertiary")
    b.text(timer, "Break · 3h 43m worked so far", "Subhead", "text/secondary")
    ribbon(b, hero, IW, [("08:47", "12:30", "work"), ("12:30", "12:43", "break")], now="12:43",
           planned="17:22", marker_label="Ends ~17:22")
    hint = b.frame(hero, name="Hint", dir="h", gap=10, pad=[12, 14, 12, 14], radius=16, sw="fill",
                   cross="center", fill="break/soft")
    b.icon(hint, "timer", 18, color="break", weight="fill")
    b.text(hint, "30 min minimum reached at 13:00 — your end time moves with your break.", "Footnote",
           "break", sw="fill")
    acts = b.frame(hero, name="Actions", dir="h", gap=10, sw="fill")
    button(b, acts, "End break", "Primary", icon="play")
    week_card(b, c)
    return root


def confirm_in(b, x, y, name="Clock-in confirmation"):
    root, c = phone(b, name, x, y, tab="Today")
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    hero = card(b, c, name="Session", gap=16, pad=20)
    pill(b, hero, "Off")
    b.text(hero, "0:00", "Display/Timer", "text/tertiary")
    scrim(b, root)
    s = sheet(b, root, 420)
    ic = b.frame(s, name="Icon", w=56, h=56, radius=28, dir="h", main="center", cross="center", sw="fixed",
                 sh="fixed", fill="accent/soft")
    b.icon(ic, "buildings", 28, color="accent", weight="fill")
    hd = b.frame(s, name="Header", dir="v", gap=4, cross="center", sw="fill")
    b.text(hd, "Clock in at Studio Kreuzberg?", "Title/2", align="center", sw="fill")
    b.text(hd, "You arrived at 08:44. Pick the time your work started.", "Subhead", "text/secondary",
           align="center", sw="fill")
    opts = b.frame(s, name="Start time", dir="h", gap=8, sw="fill")
    for lab, val, sel in [("Arrived", "08:44", True), ("Now", "08:47", False), ("Other", "…", False)]:
        o = b.frame(opts, name=lab, dir="v", gap=2, pad=[10, 8, 10, 8], radius=18, sw="fill", cross="center",
                    fill="accent" if sel else "bg/sunken")
        b.text(o, val, "Numeric/Medium", "on-accent" if sel else "text/primary")
        b.text(o, lab, "Caption", "on-accent" if sel else "text/secondary")
    button(b, s, "Clock in at 08:44", "Primary", icon="play")
    button(b, s, "Not working today", "Secondary")
    return root


def confirm_out(b, x, y, name="Clock-out confirmation"):
    root, c = phone(b, name, x, y, tab="Today")
    nav_title(b, c, "Today", "Thursday, 16 October", actions=["calendar-plus"])
    hero = card(b, c, name="Session", gap=16, pad=20)
    pill(b, hero, "Working", "Working · Studio Kreuzberg")
    b.text(hero, "8:09", "Display/Timer")
    scrim(b, root)
    s = sheet(b, root, 470)
    hd = b.frame(s, name="Header", dir="v", gap=4, cross="center", sw="fill")
    b.text(hd, "Clock out at 17:31?", "Title/2", align="center", sw="fill")
    b.text(hd, "You left Studio Kreuzberg at 17:29.", "Subhead", "text/secondary", align="center", sw="fill")
    sm = b.frame(s, name="Summary", dir="v", gap=14, pad=18, radius=24, sw="fill", fill="bg/sunken")
    st = b.frame(sm, name="Stats", dir="h", gap=12, sw="fill")
    stat(b, st, "Worked", "8h 09m")
    stat(b, st, "Breaks", "35m")
    stat(b, st, "Overtime", "+9m", color="accent")
    ribbon(b, sm, CW - 16 - 36, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "17:31", "work")],
           labels=True, ticks=(8, 12, 16, 20))
    opts = b.frame(s, name="End time", dir="h", gap=8, sw="fill")
    for lab, val, sel in [("Left", "17:29", False), ("Now", "17:31", True), ("Other", "…", False)]:
        o = b.frame(opts, name=lab, dir="v", gap=2, pad=[10, 8, 10, 8], radius=18, sw="fill", cross="center",
                    fill="text/primary" if sel else "bg/sunken")
        b.text(o, val, "Numeric/Medium", "bg/canvas" if sel else "text/primary")
        b.text(o, lab, "Caption", "bg/canvas" if sel else "text/secondary")
    button(b, s, "Clock out at 17:31", "Ink", icon="stop")
    button(b, s, "Still working", "Secondary")
    return root


# October 2025: the 1st is a Wednesday. hours per day, None = weekend/future
OCT = {1: 8.2, 2: 8.6, 3: 7.9, 6: 8.4, 7: 8.1, 8: 9.2, 9: 8.0, 10: 6.5, 13: "missing", 14: 8.5, 15: 8.9,
       16: "today"}


def calendar(b, x, y, name="Calendar · Month"):
    root, c = phone(b, name, x, y, tab="Calendar", gap=14)
    nav_title(b, c, "Calendar", None, actions=["calendar-plus"])
    mon = b.frame(c, name="Month bar", dir="h", sw="fill", main="spaceBetween", cross="center")
    glass_btn(b, mon, "caret-left")
    mt = b.frame(mon, name="Month", dir="v", gap=0, cross="center")
    b.text(mt, "October 2025", "Headline")
    b.text(mt, "106h 10m · balance +6h 20m", "Footnote", "text/secondary")
    glass_btn(b, mon, "caret-right")
    grid = b.frame(c, name="Month grid", dir="v", gap=6, sw="fill")
    wk = b.frame(grid, name="Weekdays", dir="h", gap=5.5, sw="fill")
    for d in "MTWTFSS":
        cell = b.frame(wk, name=d, w=46, dir="h", main="center", sw="fixed")
        b.text(cell, d, "Caption", "text/tertiary")
    day = -1  # Monday 29 Sep .. ; Oct 1 is Wednesday -> two leading blanks
    cells = [None, None] + list(range(1, 32))
    while len(cells) % 7:
        cells.append(None)
    for r in range(len(cells) // 7):
        line = b.frame(grid, name=f"Week {r + 1}", dir="h", gap=5.5, sw="fill")
        for k in range(7):
            d = cells[r * 7 + k]
            if d is None:
                b.frame(line, name="Blank", w=46, h=54, sw="fixed", sh="fixed")
                continue
            v = OCT.get(d)
            weekend = k >= 5
            if v == "today":
                st, hrs = "Today", "5.8"
            elif v == "missing":
                st, hrs = "Missing", "!"
            elif d == 14:
                st, hrs = "Selected", "8.5"
            elif isinstance(v, float):
                st, hrs = "Default", f"{v:.1f}"
            elif weekend and d < 16:
                st, hrs = "Off", "–"
            else:
                st, hrs = "Future", "–"
            b.inst("day", line, props={"State": st, "Day": str(d), "Hours": hrs})
    legend = b.frame(c, name="Legend", dir="h", gap=16, sw="fill", cross="center")
    for lab, colr in [("Logged", "accent"), ("Needs attention", "danger"), ("Weekend", "bg/track")]:
        l = b.frame(legend, name=lab, dir="h", gap=6, cross="center")
        b.ellipse(l, 8, 8, colr)
        b.text(l, lab, "Caption", "text/secondary")
    banner(b, c, "Monday, 13 October has no check-out", "Clocked in 08:55 at Studio Kreuzberg.",
           action="Fix entry")
    return root


def day_details(b, x, y, name="Day details"):
    root, c = phone(b, name, x, y, tab="Calendar", gap=14)
    inline_nav(b, c, "Tue, 14 October", right="dots-three")
    sm = card(b, c, name="Summary", gap=16)
    st = b.frame(sm, name="Stats", dir="h", gap=12, sw="fill")
    stat(b, st, "Worked", "8h 32m")
    stat(b, st, "Breaks", "45m")
    stat(b, st, "Balance", "+32m", color="accent")
    ribbon(b, sm, IW, [("08:52", "12:15", "work"), ("12:15", "13:00", "break"), ("13:00", "17:41", "work")],
           ticks=(6, 9, 12, 15, 18))
    section(b, c, "Sessions")
    g = group(b, c, "Sessions")
    for title, sub, val, icon, tint, tile in [
        ("Studio Kreuzberg", "08:52 – 12:15 · reminder", "3h 23m", "buildings", "accent", "accent/soft"),
        ("Lunch break", "12:15 – 13:00", "45m", "coffee", "break", "break/soft"),
        ("Studio Kreuzberg", "13:00 – 17:41 · edited", "4h 41m", "buildings", "accent", "accent/soft"),
    ]:
        r = b.frame(g, name=f"Session · {title}", dir="h", gap=12, pad=[12, 16, 12, 16], sw="fill",
                    cross="center", fill="bg/elevated", minHeight=60)
        t = b.frame(r, name="Tile", w=32, h=32, radius=9, dir="h", main="center", cross="center", sw="fixed",
                    sh="fixed", fill=tile)
        b.icon(t, icon, 18, color=tint, weight="fill")
        tx = b.frame(r, name="Text", dir="v", gap=2, sw="fill")
        b.text(tx, title, "Body")
        b.text(tx, sub, "Footnote", "text/secondary")
        b.text(r, val, "Numeric/Small")
        b.icon(r, "caret-right", 16, color="text/tertiary")
        if title != "Studio Kreuzberg" or "edited" not in sub:
            sep(b, g, 60)
    section(b, c, "History")
    h = card(b, c, name="History", gap=10, pad=16)
    for when, what in [("15 Oct, 09:02", "Check-out changed 18:02 → 17:41"),
                       ("14 Oct, 17:41", "Clocked out from departure reminder")]:
        hr = b.frame(h, name=when, dir="h", gap=10, sw="fill", cross="min")
        b.icon(hr, "clock-counter-clockwise", 18, color="text/secondary")
        tx = b.frame(hr, name="Text", dir="v", gap=1, sw="fill")
        b.text(tx, what, "Subhead", sw="fill")
        b.text(tx, when, "Caption", "text/secondary")
    return root


def edit_session(b, x, y, name="Edit session"):
    root, c = phone(b, name, x, y, tab=None, gap=14)
    inline_nav(b, c, "Edit session", left="x", right_label="Save")
    g = group(b, c, "Times")
    time_field(b, g, "Starts", "08:52", sub="Tue, 14 October", icon="sign-in")
    sep(b, g, 48)
    time_field(b, g, "Ends", "17:20", sub="was 17:41", highlight=True, icon="sign-out")
    sep(b, g, 48)
    time_field(b, g, "Workplace", "Studio Kreuzberg", icon="buildings")
    section(b, c, "Breaks")
    g2 = group(b, c, "Breaks")
    time_field(b, g2, "Lunch break", "12:15 – 13:00", sub="45 min", icon="coffee")
    sep(b, g2, 48)
    add = b.frame(g2, name="Add break", dir="h", gap=10, pad=[14, 16, 14, 16], sw="fill", cross="center",
                  fill="bg/elevated")
    b.icon(add, "plus", 20, color="accent")
    b.text(add, "Add break", "Body", "accent")
    imp = card(b, c, name="Impact", gap=10, pad=16, fill="accent/soft")
    hr = b.frame(imp, name="Header", dir="h", gap=8, cross="center")
    b.icon(hr, "info", 18, color="accent", weight="fill")
    b.text(hr, "What changes", "Subhead/Strong", "accent")
    for lab, a, z in [("Worked", "8h 32m", "8h 11m"), ("Day balance", "+32m", "+11m"), ("Total balance", "+6h 20m", "+5h 59m")]:
        r = b.frame(imp, name=lab, dir="h", sw="fill", main="spaceBetween")
        b.text(r, lab, "Subhead")
        b.text(r, f"{a}  →  {z}", "Numeric/Small")
    b.text(c, "The original times are kept in the day's history.", "Footnote", "text/secondary", sw="fill",
           align="center")
    button(b, c, "Delete session", "Destructive", icon="trash", weight="regular")
    return root


def add_missed(b, x, y, name="Add missed session"):
    root, c = phone(b, name, x, y, tab=None, gap=14)
    inline_nav(b, c, "Add work day", left="x", right_label="Add")
    banner(b, c, "Monday, 13 October", "You clocked in at 08:55 but no check-out was recorded.",
           tone="break", icon="warning")
    seg = b.frame(c, name="Kind", dir="h", gap=8, sw="fill")
    chip(b, seg, "Office", True)
    chip(b, seg, "Home office")
    chip(b, seg, "Other")
    g = group(b, c, "Times")
    time_field(b, g, "Date", "Mon, 13 Oct", icon="calendar-blank")
    sep(b, g, 48)
    time_field(b, g, "Starts", "08:55", icon="sign-in")
    sep(b, g, 48)
    time_field(b, g, "Ends", "17:30", highlight=True, icon="sign-out")
    sep(b, g, 48)
    time_field(b, g, "Break", "30 min", sub="Default for days over 6h", icon="coffee")
    # wheel picker for the highlighted field
    wheel = card(b, c, name="Time wheel", gap=0, pad=[8, 20, 8, 20], cross="center")
    w = b.frame(wheel, name="Wheel", w=IW, h=150, sw="fixed", sh="fixed")
    b.rect(w, IW, 34, "bg/sunken", radius=10, x=0, y=58, name="Selection")
    for k, (hh, mm) in enumerate([("15", "20"), ("16", "25"), ("17", "30"), ("18", "35"), ("19", "40")]):
        y0 = 4 + k * 29
        dist = abs(k - 2)
        colr = "text/primary" if dist == 0 else "text/tertiary"
        size = 22 if dist == 0 else (19 if dist == 1 else 16)
        b.text(w, hh, "Numeric/Medium", colr, x=IW / 2 - 60, y=y0 + (22 - size) / 2, fontSize=size,
               opacity=1 if dist < 2 else 0.5)
        b.text(w, mm, "Numeric/Medium", colr, x=IW / 2 + 30, y=y0 + (22 - size) / 2, fontSize=size,
               opacity=1 if dist < 2 else 0.5)
    imp = b.frame(c, name="Impact", dir="h", gap=10, pad=16, radius=22, sw="fill", fill="accent/soft", cross="center")
    b.icon(imp, "check-circle", 20, color="accent", weight="fill")
    b.text(imp, "Adds 8h 05m · balance becomes +6h 25m", "Subhead/Strong", "accent", sw="fill")
    return root


def week_summary(b, x, y, name="Insights · Week"):
    root, c = phone(b, name, x, y, tab="Insights", gap=14)
    nav_title(b, c, "Insights", None, actions=["export"])
    b.inst("segmented", c, props={"Selected": "Week"}, sizingH="fill")
    hd = b.frame(c, name="Range", dir="h", sw="fill", main="spaceBetween", cross="center")
    b.text(hd, "13 – 19 October", "Headline")
    b.text(hd, "Week 42", "Subhead", "text/secondary")
    tot = card(b, c, name="Total", gap=16)
    tt = b.frame(tot, name="Value", dir="h", gap=8, cross="baseline")
    b.text(tt, "38h 40m", "Numeric/Large", fontSize=40, lineHeight=44)
    b.text(tt, "of 40h", "Callout", "text/secondary")
    bars(b, tot, IW, 140, [("M", 8.6, "work"), ("T", 8.5, "work"), ("W", 8.9, "work"), ("T", 8.2, "work"),
                           ("F", 4.4, "today"), ("S", 0, "off"), ("S", 0, "off")], target=8, maxv=10, value_labels=True)
    lg = b.frame(tot, name="Legend", dir="h", gap=14, cross="center")
    for lab, colr in [("Worked", "accent"), ("In progress", "accent/soft")]:
        l = b.frame(lg, name=lab, dir="h", gap=6, cross="center")
        b.ellipse(l, 8, 8, colr)
        b.text(l, lab, "Caption", "text/secondary")
    l = b.frame(lg, name="Target", dir="h", gap=6, cross="center")
    b.vector(l, "M0 0 L14 0", stroke="text/secondary", sw=1, dashes=[3, 3])
    b.text(l, "8h target", "Caption", "text/secondary")
    two = b.frame(c, name="Stats", dir="h", gap=12, sw="fill")
    for lab, val, sub, colr in [("Avg. start", "08:51", "earliest 08:39", "text/primary"),
                                ("Avg. end", "17:29", "latest 18:05", "text/primary")]:
        s = card(b, two, name=lab, gap=4, pad=16)
        b.text(s, lab, "Footnote", "text/secondary")
        b.text(s, val, "Numeric/Medium", colr)
        b.text(s, sub, "Caption", "text/tertiary")
    pl = card(b, c, name="Places", gap=12, pad=16)
    b.text(pl, "Where you worked", "Subhead/Strong")
    split = b.frame(pl, name="Split", dir="h", gap=3, sw="fill", h=10, sh="fixed")
    b.rect(split, 10, 10, "accent", radius=5, name="Office")
    b.rect(split, 10, 10, "info", radius=5, name="Home")
    b.set(b.first(split, name="Office"), sizingH="fill")
    b.set(b.first(split, name="Home"), width=110)
    lr = b.frame(pl, name="Labels", dir="h", sw="fill", main="spaceBetween")
    b.text(lr, "Office · 3 days · 26h 00m", "Footnote", "text/secondary")
    b.text(lr, "Home · 12h 40m", "Footnote", "text/secondary")
    return root


def month_insights(b, x, y, name="Insights · Month"):
    root, c = phone(b, name, x, y, tab="Insights", gap=14)
    nav_title(b, c, "Insights", None, actions=["export"])
    b.inst("segmented", c, props={"Selected": "Month"}, sizingH="fill")
    tot = card(b, c, name="Month", gap=14)
    hd = b.frame(tot, name="Header", dir="h", sw="fill", main="spaceBetween", cross="max")
    l = b.frame(hd, name="Total", dir="v", gap=2)
    b.text(l, "October", "Footnote", "text/secondary")
    t = b.frame(l, name="Value", dir="h", gap=6, cross="baseline")
    b.text(t, "106h 10m", "Numeric/Large")
    b.text(t, "of 112h so far", "Subhead", "text/secondary")
    ring(b, hd, 52, 0.95, width=7)
    # heat strip of workdays
    strip = b.frame(tot, name="Workdays", dir="h", gap=4, sw="fill", wrap=True)
    vals = [8.2, 8.6, 7.9, None, None, 8.4, 8.1, 9.2, 8.0, 6.5, None, None, -1, 8.5, 8.9, 5.8, 0, None, None,
            0, 0, 0, 0, 0, None, None, 0, 0, 0, 0, 0]
    for v in vals:
        if v is None:
            continue
        if v == -1:
            colr, op = "danger", 1
        elif v == 0:
            colr, op = "bg/sunken", 1
        else:
            colr, op = "accent", max(0.35, min(1, (v - 5) / 4))
        b.rect(strip, 10, 26, colr, radius=4, opacity=op)
    b.text(tot, "Each bar is a workday · darker = longer", "Caption", "text/tertiary")
    bal = card(b, c, name="Balance", gap=10)
    hr = b.frame(bal, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center")
    b.text(hr, "Overtime balance", "Subhead/Strong")
    b.text(hr, "+6h 20m", "Numeric/Medium", "accent")
    lw, lh = IW, 70
    pts = [0.8, 1.1, 0.9, 1.6, 2.0, 2.4, 2.1, 3.0, 3.4, 3.2, 4.1, 4.6, 5.2, 5.0, 5.8, 6.3]
    mx = 7
    d = " ".join(("M" if k == 0 else "L") + f"{k / (len(pts) - 1) * lw:.1f} {lh - v / mx * lh:.1f}"
                 for k, v in enumerate(pts))
    ch = b.frame(bal, name="Line", w=lw, h=lh, sw="fixed", sh="fixed")
    area = d + f" L{lw:.1f} {lh} L0 {lh} Z"
    b.vector(ch, area, fill="accent/soft", name="Area")
    b.vector(ch, d, stroke="accent", sw=2.5, name="Balance line")
    b.ellipse(ch, 9, 9, "accent", x=lw - 4.5, y=lh - pts[-1] / mx * lh - 4.5, stroke="#FFFFFF", strokeWeight=2)
    lr = b.frame(bal, name="Axis", dir="h", sw="fill", main="spaceBetween")
    b.text(lr, "1 Oct", "Caption", "text/tertiary")
    b.text(lr, "16 Oct", "Caption", "text/tertiary")
    g = group(b, c, "Highlights")
    row(b, g, "Longest day", "9h 12m", icon="trend-up")
    row(b, g, "Home-office days", "5", icon="house-line", tint="info", tile="info/soft")
    row(b, g, "Corrections", "3", icon="pencil-simple", tint="break", tile="break/soft", last=True)
    return root


def build(b):
    b.page("iPhone · Core")
    heading(b, "iPhone · Core", 0, -260,
            "Today is the main surface: one glance answers “am I working, for how long, what can I do, how is my day going”.")
    g = Grid(b, 0, 0, cols=6)
    for fn, cap in [(today_off, "1 · Today — not working"), (today_working, "2 · Today — working"),
                    (today_break, "3 · Today — on break"), (confirm_in, "4 · Clock-in confirmation"),
                    (confirm_out, "5 · Clock-out confirmation"), (calendar, "6 · Calendar"),
                    (day_details, "7 · Day details"), (edit_session, "8 · Edit session"),
                    (add_missed, "9 · Add missed work day"), (week_summary, "10 · Weekly summary"),
                    (month_insights, "11 · Monthly insights")]:
        x, y = g.next(cap)
        b.screens[fn.__name__] = fn(b, x, y)
