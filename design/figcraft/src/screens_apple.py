"""Apple Watch, Live Activity, Dynamic Island and widgets."""
from common import W, H, Grid, heading, ribbon, ring, bars, wallpaper, GLASS
from lib import GLASS_EFFECTS

WW, WH = 208, 248  # Apple Watch Series 10, 46 mm


def dark(b, ref):
    b.add("variable.setMode", {"ids": [ref], "collection": b.color_collection, "mode": "Dark"})


def watch_frame(b, name, x, y, title="Worktime", time="15:12"):
    root = b.frame(None, name=name, x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    c = b.frame(root, name="Content", x=0, y=0, w=WW, h=WH, dir="v", gap=6, pad=[10, 14, 12, 14], sw="fixed",
                sh="fixed")
    top = b.frame(c, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center", h=24, sh="fixed")
    b.text(top, title, "Footnote/Strong", "accent", fontSize=15, lineHeight=18)
    b.text(top, time, "Footnote/Strong", "text/primary", fontSize=15, lineHeight=18, features={"tnum": True})
    return root, c


def watch_btn(b, parent, label, icon, fill, fg, w=None):
    f = b.frame(parent, name=label, dir="h", gap=6, h=44, radius=22, sw="fill" if w is None else "fixed",
                w=w, sh="fixed", main="center", cross="center", fill=fill)
    b.icon(f, icon, 18, color=fg, weight="fill")
    if label:
        b.text(f, label, "Headline", fg, fontSize=16)
    return f


def watch_idle(b, x, y):
    root, c = watch_frame(b, "Watch · Not working", x, y, time="08:44")
    b.text(c, "Today 0:00", "Footnote", "text/secondary", fontSize=14)
    mid = b.frame(c, name="Main", dir="v", gap=2, sw="fill", sh="fill", main="center")
    b.text(mid, "Studio", "Title/2", fontSize=24)
    b.text(mid, "Kreuzberg", "Title/2", fontSize=24)
    b.text(mid, "Arrived 08:44", "Footnote", "text/secondary", fontSize=14)
    watch_btn(b, c, "Clock in", "play", "accent", "on-accent")
    return root


def watch_active(b, x, y):
    root, c = watch_frame(b, "Watch · Working", x, y)
    mid = b.frame(c, name="Main", dir="h", gap=10, sw="fill", sh="fill", cross="center")
    ring(b, mid, 64, 0.73, width=8, track="bg/track")
    tx = b.frame(mid, name="Text", dir="v", gap=0)
    b.text(tx, "5:50", "Numeric/Large", fontSize=34, lineHeight=38)
    b.text(tx, "Ends ~17:22", "Footnote", "text/secondary", fontSize=13)
    ribbon(b, c, WW - 28, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
           now="15:12", planned="17:22", labels=False, h=8)
    acts = b.frame(c, name="Actions", dir="h", gap=8, sw="fill")
    watch_btn(b, acts, "", "coffee", "break/soft", "break", w=56)
    watch_btn(b, acts, "Stop", "stop", "bg/sunken", "text/primary")
    return root


def watch_break(b, x, y):
    root, c = watch_frame(b, "Watch · Break", x, y, time="12:43")
    b.text(c, "On break", "Footnote/Strong", "break", fontSize=14)
    mid = b.frame(c, name="Main", dir="v", gap=0, sw="fill", sh="fill", main="center")
    b.text(mid, "0:12:40", "Numeric/Large", "break", fontSize=38, lineHeight=42)
    b.text(mid, "3h 43m worked today", "Footnote", "text/secondary", fontSize=14)
    watch_btn(b, c, "End break", "play", "accent", "on-accent")
    return root


def watch_confirm(b, x, y):
    root, c = watch_frame(b, "Watch · Clock-out prompt", x, y, time="17:31")
    b.text(c, "Left Studio Kreuzberg", "Headline", fontSize=16, w=WW - 28)
    b.text(c, "8h 09m today · +9m", "Footnote", "text/secondary", fontSize=14)
    watch_btn(b, c, "Clock out 17:29", "stop", "text/primary", "bg/canvas")
    watch_btn(b, c, "Still working", "briefcase", "bg/sunken", "text/primary")
    return root


def watch_face(b, x, y):
    """A modular watch face showing the complication families."""
    root = b.frame(None, name="Watch · Complications", x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    b.text(root, "THU 16", "Footnote/Strong", "#FF9F0A", x=18, y=14, fontSize=13)
    b.text(root, "15:12", "Numeric/Large", "text/primary", x=WW - 92, y=8, fontSize=30, lineHeight=34)
    # rectangular complication
    rc = b.frame(root, name="Rectangular", x=12, y=58, w=WW - 24, h=78, dir="v", gap=6, pad=[10, 12, 10, 12],
                 radius=16, sw="fixed", sh="fixed", fill="#1C1C1E")
    hd = b.frame(rc, name="Header", dir="h", gap=6, cross="center")
    b.icon(hd, "clock", 14, color="accent", weight="fill")
    b.text(hd, "WORKING · 5:50", "Caption", "accent", fontSize=12)
    ribbon(b, rc, WW - 48, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
           now="15:12", planned="17:22", labels=False, h=8)
    b.text(rc, "Ends ~17:22 · 2h 10m left", "Caption", "text/secondary", fontSize=12)
    # circular complications
    row = b.frame(root, name="Circular", x=12, y=150, w=WW - 24, dir="h", main="spaceBetween", sw="fixed")
    for frac, lab, colr in [(0.73, "73%", "accent"), (0.62, "+6h", "accent"), (0.0, "", "break")]:
        cell = b.frame(row, name=f"Circular {lab or 'action'}", w=54, h=54, radius=27, sw="fixed", sh="fixed",
                       fill="#1C1C1E", dir="h", main="center", cross="center")
        if lab:
            r = ring(b, cell, 46, frac, color=colr, track="bg/track", width=5)
            b.set(r, absolute=True)
            b.set(r, x=4, y=4)
            b.text(cell, lab, "Caption", "text/primary", fontSize=12, fontStyle="Semi Bold")
        else:
            b.icon(cell, "play", 22, color="accent", weight="fill")
    b.text(root, "Rectangular · gauge · balance · action", "Caption", "text/tertiary", x=0, y=220, w=WW,
           textAlign="center", fontSize=9, lineHeight=12)
    return root


# ---------------------------------------------------------------------------
# Lock Screen, Live Activity, Dynamic Island, widgets
# ---------------------------------------------------------------------------

def live_activity(b, parent, state="work", w=W - 16):
    brk = state == "break"
    la = b.frame(parent, name="Live Activity" + (" · Break" if brk else ""), w=w, dir="v", gap=12,
                 pad=[16, 18, 16, 18], radius=28, sw="fixed", fill="#1B1D1BD9", stroke="#FFFFFF1F",
                 effects=GLASS_EFFECTS)
    top = b.frame(la, name="Top", dir="h", gap=10, sw="fill", cross="center")
    from ds import app_icon
    app_icon(b, top, 26)
    tx = b.frame(top, name="Text", dir="v", gap=0, sw="fill")
    b.text(tx, "On break" if brk else "Working · Studio Kreuzberg", "Footnote/Strong", "break" if brk else "accent")
    b.text(tx, "since 12:30" if brk else "since 08:47 · ends ~17:22", "Caption", "text/secondary")
    b.text(top, "0:12" if brk else "5:50", "Numeric/Large", "break" if brk else "text/primary", fontSize=34,
           lineHeight=38)
    segs = [("08:47", "12:30", "work"), ("12:30", "12:43", "break")] if brk else \
        [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")]
    ribbon(b, la, w - 36, segs, now="12:43" if brk else "15:12", planned="17:22", labels=False, h=8)
    acts = b.frame(la, name="Actions", dir="h", gap=8, sw="fill")
    for lab, icon, fill, fg in ([("End break", "play", "accent", "on-accent")] if brk else
                                [("Break", "coffee", "break/soft", "break"), ("Clock out", "stop", "text/primary", "bg/canvas")]):
        bt = b.frame(acts, name=lab, dir="h", gap=6, h=40, sh="fixed", radius=20, sw="fill", main="center",
                     cross="center", fill=fill)
        b.icon(bt, icon, 16, color=fg, weight="fill")
        b.text(bt, lab, "Subhead/Strong", fg)
    return la


def lock_live(b, x, y):
    root = b.frame(None, name="Lock Screen · Live Activity", x=x, y=y, w=W, h=H, fill="#1C2A25", clip=True)
    dark(b, root)
    wallpaper(b, root)
    b.inst("status", root, x=0, y=0)
    clock = b.frame(root, name="Clock", x=0, y=86, w=W, dir="v", gap=0, cross="center", sw="fixed")
    b.text(clock, "Thursday 16 October", "Headline", "#FFFFFFCC")
    b.text(clock, "15:12", "Display/Timer", "#FFFFFF", fontSize=96, lineHeight=100)
    # lock screen widgets row
    wr = b.frame(root, name="Lock Screen widgets", x=40, y=232, w=W - 80, dir="h", gap=10, main="center", sw="fixed")
    circ = b.frame(wr, name="Circular", w=60, h=60, radius=30, sw="fixed", sh="fixed", fill="#FFFFFF26",
                   dir="h", main="center", cross="center")
    r = ring(b, circ, 52, 0.73, color="#FFFFFF", track="#FFFFFF40", width=5)
    b.set(r, absolute=True)
    b.set(r, x=4, y=4)
    b.text(circ, "73%", "Caption", "#FFFFFF", fontStyle="Semi Bold")
    rect = b.frame(wr, name="Rectangular", w=160, h=60, dir="v", gap=4, pad=[8, 12, 8, 12], radius=16,
                   sw="fixed", sh="fixed", fill="#FFFFFF26")
    b.text(rect, "Week 30h 41m", "Footnote/Strong", "#FFFFFF")
    b.text(rect, "Balance +6h 20m", "Caption", "#FFFFFFCC")
    stack = b.frame(root, name="Activities", x=8, y=540, w=W - 16, dir="v", gap=10, sw="fixed")
    live_activity(b, stack)
    b.inst("home", root, x=0, y=H - 34)
    return root


def island(b, x, y):
    """Dynamic Island: compact, minimal and expanded presentations on one board."""
    root = b.frame(None, name="Dynamic Island", x=x, y=y, w=W, h=H, fill="bg/canvas", clip=True, dir="v",
                   gap=28, pad=[40, 16, 40, 16], sw="fixed", sh="fixed", cross="center")
    b.text(root, "Compact", "Footnote/Strong", "text/secondary")
    comp = b.frame(root, name="Compact", w=250, h=37, radius=19, dir="h", pad=[0, 14, 0, 10], main="spaceBetween",
                   cross="center", sw="fixed", sh="fixed", fill="#000000")
    l = b.frame(comp, name="Leading", dir="h", gap=6, cross="center")
    b.ellipse(l, 8, 8, "#5CC99B")
    b.icon(l, "buildings", 16, color="#5CC99B", weight="fill")
    b.text(comp, "5:50", "Subhead/Strong", "#5CC99B", features={"tnum": True})
    b.text(root, "Compact · break", "Footnote/Strong", "text/secondary")
    comp2 = b.frame(root, name="Compact · Break", w=250, h=37, radius=19, dir="h", pad=[0, 14, 0, 10],
                    main="spaceBetween", cross="center", sw="fixed", sh="fixed", fill="#000000")
    b.icon(comp2, "coffee", 16, color="#F2B04E", weight="fill")
    b.text(comp2, "0:12", "Subhead/Strong", "#F2B04E", features={"tnum": True})
    b.text(root, "Minimal (shared with another activity)", "Footnote/Strong", "text/secondary")
    mn = b.frame(root, name="Minimal", dir="h", gap=8, cross="center")
    b.rect(mn, 150, 37, "#000000", radius=19)
    m = b.frame(mn, name="Minimal", w=37, h=37, radius=19, dir="h", main="center", cross="center", sw="fixed",
                sh="fixed", fill="#000000")
    b.icon(m, "clock", 18, color="#5CC99B", weight="fill")
    b.text(root, "Expanded (long-press)", "Footnote/Strong", "text/secondary")
    ex = b.frame(root, name="Expanded", w=W - 22, dir="v", gap=12, pad=[18, 22, 20, 22], radius=44, sw="fixed",
                 fill="#000000")
    dark(b, ex)
    top = b.frame(ex, name="Top", dir="h", sw="fill", main="spaceBetween", cross="center")
    l = b.frame(top, name="Leading", dir="h", gap=8, cross="center")
    b.icon(l, "buildings", 20, color="accent", weight="fill")
    b.text(l, "Studio Kreuzberg", "Subhead/Strong", "text/primary")
    b.text(top, "5:50:12", "Numeric/Medium", "accent")
    ribbon(b, ex, W - 66, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
           now="15:12", planned="17:22", labels=False, h=8)
    acts = b.frame(ex, name="Actions", dir="h", gap=8, sw="fill")
    for lab, icon, fill, fg in [("Break", "coffee", "break/soft", "break"), ("Clock out", "stop", "text/primary", "bg/canvas")]:
        bt = b.frame(acts, name=lab, dir="h", gap=6, h=40, sh="fixed", radius=20, sw="fill", main="center",
                     cross="center", fill=fill)
        b.icon(bt, icon, 16, color=fg, weight="fill")
        b.text(bt, lab, "Subhead/Strong", fg)
    b.text(root, "Live Activities end after 8 hours on the island and stay up to 12 hours on the Lock Screen; "
                 "long days hand over to the widget and a reminder.", "Footnote", "text/secondary", w=W - 60,
           textAlign="center")
    return root


def widget(b, parent, name, w, h, fill="bg/elevated"):
    return b.frame(parent, name=name, w=w, h=h, radius=26, dir="v", gap=8, pad=16, sw="fixed", sh="fixed",
                   fill=fill, effects=[{"type": "dropShadow", "color": "#0000001A", "offset": [0, 6], "radius": 20}])


def widgets(b, x, y):
    root = b.frame(None, name="Home Screen widgets", x=x, y=y, w=W, h=H, fill="#1C2A25", clip=True)
    wallpaper(b, root)
    b.inst("status", root, x=0, y=0)
    dark(b, b.first(root, name="iOS/Status Bar", type="INSTANCE"))
    col_ = b.frame(root, name="Widgets", x=14, y=70, w=W - 28, dir="v", gap=18, sw="fixed")
    row_ = b.frame(col_, name="Small", dir="h", gap=18, sw="fill")
    # small: status
    s = widget(b, row_, "Small · Status", 170, 170)
    hd = b.frame(s, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center")
    b.inst("pill", hd, props={"State": "Working", "Label": "Working"})
    b.text(s, "5:50", "Numeric/Large", fontSize=40, lineHeight=44)
    b.text(s, "ends ~17:22", "Footnote", "text/secondary")
    ribbon(b, s, 138, [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")],
           now="15:12", planned="17:22", labels=False, h=8)
    # small: balance ring, tinted/clear (iOS 26) appearance
    s2 = b.frame(row_, name="Small · Clear", w=170, h=170, radius=26, dir="v", gap=6, pad=16, sw="fixed",
                 sh="fixed", main="center", cross="center", fill="#FFFFFF1F", stroke="#FFFFFF59",
                 effects=GLASS_EFFECTS)
    r = ring(b, s2, 84, 0.62, color="#FFFFFF", track="#FFFFFF33", width=9)
    b.text(s2, "+6h 20m", "Headline", "#FFFFFF")
    b.text(s2, "balance · clear style", "Caption", "#FFFFFFB3")
    # medium: week
    m = widget(b, col_, "Medium · Week", W - 28, 170)
    b.set(m, layout="horizontal", gap=16)
    l = b.frame(m, name="Left", dir="v", gap=4, w=120, sw="fixed", sh="fill")
    b.text(l, "This week", "Footnote", "text/secondary")
    b.text(l, "30h 41m", "Numeric/Medium")
    b.text(l, "of 40h", "Caption", "text/tertiary")
    sp = b.frame(l, name="Spacer", sw="fill", sh="fill")
    btn = b.frame(l, name="Clock out", dir="h", gap=6, h=34, sh="fixed", radius=17, pad=[0, 12, 0, 12],
                  cross="center", fill="text/primary")
    b.icon(btn, "stop", 14, color="bg/canvas", weight="fill")
    b.text(btn, "Clock out", "Footnote/Strong", "bg/canvas")
    bars(b, m, W - 28 - 32 - 136, 108, [("M", 8.4, "work"), ("T", 8.9, "work"), ("W", 7.6, "work"),
                                        ("T", 5.8, "today"), ("F", 0, "off")], target=8, maxv=10)
    # large: days list
    lg = widget(b, col_, "Large · Days", W - 28, 262)
    b.set(lg, gap=10)
    hd = b.frame(lg, name="Header", dir="h", sw="fill", main="spaceBetween")
    b.text(hd, "Week 42", "Headline")
    b.text(hd, "+6h 20m", "Headline", "accent")
    for d, segs, val in [("Mon", [("08:40", "12:20", "work"), ("12:20", "12:50", "break"), ("12:50", "17:24", "work")], "8h 24m"),
                         ("Tue", [("09:05", "18:30", "home")], "8h 55m"),
                         ("Wed", [("08:52", "12:15", "work"), ("12:15", "13:00", "break"), ("13:00", "17:20", "work")], "7h 36m"),
                         ("Thu", [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")], "5h 50m"),
                         ("Fri", [], "—")]:
        rr = b.frame(lg, name=d, dir="h", gap=10, sw="fill", cross="center")
        b.text(rr, d, "Footnote/Strong", w=34)
        ribbon(b, rr, 214, segs, labels=False, h=8)
        b.text(rr, val, "Footnote", "text/secondary", features={"tnum": True})
    b.text(lg, "Tap a day to open it in Worktime.", "Caption", "text/tertiary")
    b.inst("home", root, x=0, y=H - 34)
    return root


def build(b):
    b.page("Apple Watch")
    heading(b, "Apple Watch", 0, -260,
            "Glanceable and one-tap. The watch never edits history — corrections happen on iPhone.")
    g = Grid(b, 0, 0, cols=5, w=WW, h=WH)
    g.h = WH
    for fn, cap in [(watch_idle, "33 · Main — not working"), (watch_active, "34 · Active session"),
                    (watch_break, "35 · Break"), (watch_confirm, "36 · Clock-out prompt"),
                    (watch_face, "37 · Complications")]:
        x, y = g.next(cap)
        b.screens[fn.__name__] = fn(b, x, y)
    b.page("Live Activity & Widgets")
    heading(b, "Live Activity, Dynamic Island & widgets", 0, -260,
            "Interactive buttons use App Intents. Nothing here needs background execution: the timer is a system "
            "text timer and the ribbon updates on events.")
    g = Grid(b, 0, 0, cols=3)
    for fn, cap in [(lock_live, "38 · Lock Screen Live Activity"), (island, "39 · Dynamic Island"),
                    (widgets, "40 · Home Screen widgets")]:
        x, y = g.next(cap)
        b.screens[fn.__name__] = fn(b, x, y)
