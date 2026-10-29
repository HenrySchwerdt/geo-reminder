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


def widget(b, parent, name, w, h, fill="bg/elevated", x=None, y=None):
    return b.frame(parent, name=name, w=w, h=h, radius=26, dir="v", gap=8, pad=16, sw="fixed", sh="fixed",
                   fill=fill, x=x, y=y,
                   effects=[{"type": "dropShadow", "color": "#0000001A", "offset": [0, 6], "radius": 20}])


SEGS_NOW = [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")]
WEEK_ROWS = [("Mon", [("08:40", "12:20", "work"), ("12:20", "12:50", "break"), ("12:50", "17:24", "work")], "8h 24m"),
             ("Tue", [("09:05", "18:30", "home")], "8h 55m"),
             ("Wed", [("08:52", "12:15", "work"), ("12:15", "13:00", "break"), ("13:00", "17:20", "work")], "7h 36m"),
             ("Thu", SEGS_NOW, "5h 50m"),
             ("Fri", [], "—")]


def w_small_status(b, parent, state="work", x=None, y=None, name=None):
    spec = {"work": ("Working", "Working", "5:50", "ends ~17:22", "text/primary"),
            "break": ("Break", "On break", "0:12", "since 12:30", "break"),
            "off": ("Off", "Not working", "0:00", "office day · 8h", "text/tertiary")}[state]
    s = widget(b, parent, name or f"Small · Status ({state})", 170, 170, x=x, y=y)
    b.inst("pill", s, props={"State": spec[0], "Label": spec[1]})
    b.text(s, spec[2], "Numeric/Large", spec[4], fontSize=40, lineHeight=44)
    b.text(s, spec[3], "Footnote", "text/secondary")
    segs = SEGS_NOW if state == "work" else ([("08:47", "12:30", "work"), ("12:30", "12:43", "break")]
                                              if state == "break" else [])
    ribbon(b, s, 138, segs, now={"work": "15:12", "break": "12:43", "off": "08:12"}[state], planned="17:22",
           labels=False, h=8)
    return s


def w_small_clear(b, parent, x=None, y=None):
    s2 = b.frame(parent, name="Small · Balance (clear)", w=170, h=170, radius=26, dir="v", gap=6, pad=16,
                 sw="fixed", sh="fixed", main="center", cross="center", fill="#FFFFFF1F", stroke="#FFFFFF59",
                 effects=GLASS_EFFECTS, x=x, y=y)
    ring(b, s2, 84, 0.62, color="#FFFFFF", track="#FFFFFF33", width=9)
    b.text(s2, "+6h 20m", "Headline", "#FFFFFF")
    b.text(s2, "balance · clear style", "Caption", "#FFFFFFB3")
    return s2


def w_small_action(b, parent, x=None, y=None):
    s = widget(b, parent, "Small · Clock in (interactive)", 170, 170, x=x, y=y)
    b.set(s, mainAlign="spaceBetween")
    hd = b.frame(s, name="Header", dir="h", gap=6, cross="center")
    b.icon(hd, "buildings", 16, color="accent", weight="fill")
    b.text(hd, "Studio Kreuzberg", "Caption", "text/secondary")
    b.text(s, "Arrived 08:44", "Headline", sw="fill")
    btn = b.frame(s, name="Clock in", dir="h", gap=6, h=44, sh="fixed", sw="fill", radius=22, main="center",
                  cross="center", fill="accent")
    b.icon(btn, "play", 16, color="on-accent", weight="fill")
    b.text(btn, "Clock in", "Subhead/Strong", "on-accent")
    return s


def w_medium_today(b, parent, x=None, y=None):
    m = widget(b, parent, "Medium · Today (interactive)", 364, 170, x=x, y=y)
    b.set(m, gap=10)
    top = b.frame(m, name="Top", dir="h", sw="fill", main="spaceBetween", cross="center")
    b.inst("pill", top, props={"State": "Working", "Label": "Working · Studio Kreuzberg"})
    b.text(top, "5:50", "Numeric/Medium")
    ribbon(b, m, 332, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=8)
    b.text(m, "Ends ~17:22 · 2h 10m left · balance +6h 20m", "Caption", "text/secondary")
    acts = b.frame(m, name="Actions", dir="h", gap=8, sw="fill")
    for lab, icon, fill, fg in [("Break", "coffee", "break/soft", "break"), ("Clock out", "stop", "text/primary", "bg/canvas")]:
        bt = b.frame(acts, name=lab, dir="h", gap=6, h=38, sh="fixed", radius=19, sw="fill", main="center",
                     cross="center", fill=fill)
        b.icon(bt, icon, 14, color=fg, weight="fill")
        b.text(bt, lab, "Footnote/Strong", fg)
    return m


def w_medium_week(b, parent, w=364, x=None, y=None):
    m = widget(b, parent, "Medium · Week", w, 170, x=x, y=y)
    b.set(m, layout="horizontal", gap=16)
    l = b.frame(m, name="Left", dir="v", gap=4, w=120, sw="fixed", sh="fill")
    b.text(l, "This week", "Footnote", "text/secondary")
    b.text(l, "30h 41m", "Numeric/Medium")
    b.text(l, "of 40h", "Caption", "text/tertiary")
    b.frame(l, name="Spacer", sw="fill", sh="fill")
    btn = b.frame(l, name="Clock out", dir="h", gap=6, h=34, sh="fixed", radius=17, pad=[0, 12, 0, 12],
                  cross="center", fill="text/primary")
    b.icon(btn, "stop", 14, color="bg/canvas", weight="fill")
    b.text(btn, "Clock out", "Footnote/Strong", "bg/canvas")
    bars(b, m, w - 32 - 136, 108, [("M", 8.4, "work"), ("T", 8.9, "work"), ("W", 7.6, "work"),
                                   ("T", 5.8, "today"), ("F", 0, "off")], target=8, maxv=10)
    return m


def w_large_week(b, parent, w=364, x=None, y=None):
    lg = widget(b, parent, "Large · Week", w, 382 if parent is None else 262, x=x, y=y)
    b.set(lg, gap=10)
    hd = b.frame(lg, name="Header", dir="h", sw="fill", main="spaceBetween")
    b.text(hd, "Week 42", "Headline")
    b.text(hd, "+6h 20m", "Headline", "accent")
    if parent is None:
        tot = b.frame(lg, name="Total", dir="h", gap=6, cross="baseline")
        b.text(tot, "30h 41m", "Numeric/Large")
        b.text(tot, "of 40h", "Subhead", "text/secondary")
    for d, segs, val in WEEK_ROWS:
        rr = b.frame(lg, name=d, dir="h", gap=10, sw="fill", cross="center")
        b.text(rr, d, "Footnote/Strong", w=34)
        ribbon(b, rr, w - 150, segs, labels=False, h=8)
        b.text(rr, val, "Footnote", "text/secondary", features={"tnum": True})
    if parent is None:
        b.frame(lg, name="Spacer", sw="fill", sh="fill")
        btn = b.frame(lg, name="Clock out", dir="h", gap=6, h=40, sh="fixed", sw="fill", radius=20,
                      main="center", cross="center", fill="text/primary")
        b.icon(btn, "stop", 14, color="bg/canvas", weight="fill")
        b.text(btn, "Clock out · 5:50 today", "Subhead/Strong", "bg/canvas")
    else:
        b.text(lg, "Tap a day to open it in Worktime.", "Caption", "text/tertiary")
    return lg


def widgets(b, x, y):
    root = b.frame(None, name="Home Screen widgets", x=x, y=y, w=W, h=H, fill="#1C2A25", clip=True)
    wallpaper(b, root)
    b.inst("status", root, x=0, y=0)
    dark(b, b.first(root, name="iOS/Status Bar", type="INSTANCE"))
    col_ = b.frame(root, name="Widgets", x=14, y=70, w=W - 28, dir="v", gap=18, sw="fixed")
    row_ = b.frame(col_, name="Small", dir="h", gap=18, sw="fill")
    w_small_status(b, row_)
    w_small_clear(b, row_)
    w_medium_week(b, col_, w=W - 28)
    w_large_week(b, col_, w=W - 28)
    b.inst("home", root, x=0, y=H - 34)
    return root


# ---------------------------------------------------------------------------
# Widget gallery: every family on its own, light and dark
# ---------------------------------------------------------------------------

def stage(b, name, x, y, w, h, darkbg=False):
    f = b.frame(None, name=name, x=x, y=y, w=w, h=h, sw="fixed", sh="fixed", clip=True, radius=36,
                fills=[{"type": "linearGradient", "stops": ["#58786A", "#2A3F37"] if darkbg else ["#E9E6DE", "#DCE6DF"]}],
                dir="h", gap=24, pad=32, cross="center", wrap=True)
    return f


def lock_accessories(b, parent):
    """accessoryCircular, accessoryRectangular and accessoryInline (vibrant, monochrome)."""
    col_ = b.frame(parent, name="Lock Screen accessories", dir="v", gap=14)
    b.text(col_, "Thursday 16  ·  ◷ Working 5:50", "Subhead/Strong", "#FFFFFFE6", name="Inline")
    r = b.frame(col_, name="Row", dir="h", gap=12, cross="center")
    for frac, lab in [(0.73, "73%"), (0.62, "+6h")]:
        c = b.frame(r, name=f"Circular {lab}", w=72, h=72, radius=36, sw="fixed", sh="fixed", fill="#FFFFFF26",
                    dir="h", main="center", cross="center")
        rg = ring(b, c, 62, frac, color="#FFFFFF", track="#FFFFFF40", width=6)
        b.absolute(rg, 5, 5)
        b.text(c, lab, "Footnote/Strong", "#FFFFFF")
    rect = b.frame(r, name="Rectangular", w=170, h=72, dir="v", gap=5, pad=[10, 12, 10, 12], radius=16,
                   sw="fixed", sh="fixed", fill="#FFFFFF26")
    b.text(rect, "Working · 5:50", "Footnote/Strong", "#FFFFFF")
    ribbon(b, rect, 146, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=6)
    b.text(rect, "ends ~17:22", "Caption", "#FFFFFFCC")
    return col_


def controls(b, parent):
    """iOS 18+ Control Center / Lock Screen controls (ControlWidget)."""
    col_ = b.frame(parent, name="Controls", dir="h", gap=14, cross="center")
    for on in (False, True):
        c = b.frame(col_, name=f"Control 1×1 · {'Working' if on else 'Off'}", w=72, h=72, radius=36, sw="fixed",
                    sh="fixed", dir="h", main="center", cross="center",
                    fill="#5CC99B" if on else "#FFFFFF33")
        b.icon(c, "stop" if on else "play", 28, color="#06140E" if on else "#FFFFFF", weight="fill")
    wide = b.frame(col_, name="Control 2×1", w=160, h=72, radius=36, sw="fixed", sh="fixed", dir="h", gap=10,
                   pad=[0, 16, 0, 12], cross="center", fill="#FFFFFF33")
    ic = b.frame(wide, name="Icon", w=48, h=48, radius=24, sw="fixed", sh="fixed", dir="h", main="center",
                 cross="center", fill="#F2B04E")
    b.icon(ic, "coffee", 22, color="#1E1405", weight="fill")
    t = b.frame(wide, name="Text", dir="v", gap=0)
    b.text(t, "Break", "Subhead/Strong", "#FFFFFF")
    b.text(t, "Start", "Caption", "#FFFFFFB3")
    return col_


def standby(b, x, y):
    f = b.frame(None, name="StandBy", x=x, y=y, w=852, h=393, fill="#000000", clip=True, radius=48, dir="h",
                gap=24, pad=28, sw="fixed", sh="fixed")
    dark(b, f)
    left = b.frame(f, name="Clock", dir="v", gap=0, sw="fill", sh="fill", main="center", cross="center",
                   radius=32, fill="#111311")
    b.text(left, "15:12", "Display/Timer", "text/primary", fontSize=120, lineHeight=124)
    b.text(left, "Thursday 16 October", "Headline", "text/secondary")
    right = b.frame(f, name="Worktime", dir="v", gap=14, sw="fill", sh="fill", main="center", pad=28, radius=32,
                    fill="#111311")
    b.inst("pill", right, props={"State": "Working", "Label": "Working · Studio Kreuzberg"})
    b.text(right, "5:50", "Display/Timer", "accent", fontSize=96, lineHeight=100)
    ribbon(b, right, 330, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=10)
    b.text(right, "Ends ~17:22 · 2h 10m left", "Subhead", "text/secondary")
    return f


def widget_gallery(b):
    b.page("Widgets")
    heading(b, "Widgets", 0, -260,
            "Every WidgetKit family Worktime supports, light and dark. Live counting uses timer text; buttons are "
            "App Intents. iOS 26 also renders them tinted or clear, so state never relies on colour alone.")
    y = 0
    for mode in ("Light", "Dark"):
        b.text(None, mode, "Title/2", x=0, y=y - 50)
        x = 0
        for fn, w, label in [
                (lambda xx: w_small_status(b, None, "off", xx, y), 170, "Small · Not working"),
                (lambda xx: w_small_status(b, None, "work", xx, y), 170, "Small · Working"),
                (lambda xx: w_small_status(b, None, "break", xx, y), 170, "Small · Break"),
                (lambda xx: w_small_action(b, None, xx, y), 170, "Small · Clock in (interactive)"),
                (lambda xx: w_medium_today(b, None, xx, y), 364, "Medium · Today (interactive)"),
                (lambda xx: w_medium_week(b, None, 364, xx, y), 364, "Medium · Week"),
                (lambda xx: w_large_week(b, None, 364, xx, y), 364, "Large · Week")]:
            r = fn(x)
            b.set(r, name=f"{label} · {mode}")
            if mode == "Dark":
                dark(b, r)
            x += w + 40
        y += 382 + 140
    # Lock screen accessories + controls on a wallpaper stage
    st = stage(b, "Lock Screen accessories & Controls", 0, y, 1100, 240, darkbg=True)
    lock_accessories(b, st)
    controls(b, st)
    b.text(None, "Lock Screen accessories (inline, circular, rectangular) and Control Center controls", "Headline",
           "text/secondary", x=0, y=y - 40)
    cl = stage(b, "Clear & tinted", 1160, y, 420, 240, darkbg=True)
    w_small_clear(b, cl)
    b.text(None, "Clear (iOS 26)", "Headline", "text/secondary", x=1160, y=y - 40)
    b.text(None, "StandBy", "Headline", "text/secondary", x=0, y=y + 320)
    standby(b, 0, y + 360)


# ---------------------------------------------------------------------------
# More watch screens
# ---------------------------------------------------------------------------

def watch_notification(b, x, y):
    root, c = watch_frame(b, "Watch · Arrival notification", x, y, time="08:44")
    b.text(c, "Arrived at Studio Kreuzberg", "Headline", fontSize=16, w=WW - 28)
    b.text(c, "Clock in now?", "Footnote", "text/secondary", fontSize=14)
    b.frame(c, name="Spacer", sw="fill", sh="fill")
    watch_btn(b, c, "Clock in 08:44", "play", "accent", "on-accent")
    watch_btn(b, c, "Not today", "x", "bg/sunken", "text/primary")
    return root


def watch_today(b, x, y):
    root, c = watch_frame(b, "Watch · Today summary", x, y)
    tot = b.frame(c, name="Total", dir="h", gap=6, cross="baseline")
    b.text(tot, "5h 50m", "Numeric/Medium", fontSize=24, lineHeight=28)
    b.text(tot, "today", "Footnote", "text/secondary", fontSize=13)
    for t, v, colr in [("08:47 – 12:30", "3h 43m", "accent"), ("Break 12:30", "35m", "break"),
                       ("13:05 – now", "2h 07m", "accent")]:
        r = b.frame(c, name=t, dir="h", gap=8, pad=[8, 10, 8, 10], radius=14, sw="fill", cross="center",
                    fill="#1C1C1E")
        b.rect(r, 4, 22, colr, radius=2)
        b.text(r, t, "Footnote", "text/primary", sw="fill", fontSize=13)
        b.text(r, v, "Footnote/Strong", colr, fontSize=13)
    b.text(c, "Week +6h 20m", "Footnote/Strong", "accent", fontSize=13)
    return root


def watch_offline(b, x, y):
    root, c = watch_frame(b, "Watch · Offline sync", x, y, time="17:31")
    mid = b.frame(c, name="Main", dir="v", gap=8, sw="fill", sh="fill", main="center", cross="center")
    cc = b.frame(mid, name="Glyph", w=52, h=52, radius=26, dir="h", main="center", cross="center", sw="fixed",
                 sh="fixed", fill="accent/soft")
    b.icon(cc, "check-circle", 30, color="accent", weight="fill")
    b.text(mid, "Clocked out 17:29", "Headline", fontSize=16)
    b.text(mid, "Saved on Apple Watch. Syncs when your iPhone is nearby.", "Footnote", "text/secondary",
           w=WW - 40, textAlign="center", fontSize=13)
    pill_ = b.frame(c, name="Sync", dir="h", gap=6, pad=[6, 12, 6, 12], radius=14, cross="center", fill="#1C1C1E")
    b.icon(pill_, "arrows-clockwise", 14, color="text/secondary")
    b.text(pill_, "1 change waiting", "Caption", "text/secondary", fontSize=12)
    return root


def watch_smartstack(b, x, y):
    root = b.frame(None, name="Watch · Smart Stack", x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    b.text(root, "15:12", "Numeric/Large", "text/primary", x=WW - 96, y=8, fontSize=30, lineHeight=34)
    for k, (title, body, colr) in enumerate([("WORKTIME", "Working · 5:50", "accent"),
                                             ("WORKTIME", "Week +6h 20m", "accent")]):
        card_ = b.frame(root, name=f"Widget {k + 1}", x=10, y=56 + k * 92, w=WW - 20, h=84 if k == 0 else 76,
                        dir="v", gap=4, pad=[10, 12, 10, 12], radius=20, sw="fixed", sh="fixed",
                        fill="#1C1C1E", opacity=1 if k == 0 else 0.55)
        b.text(card_, title, "Caption", colr, fontSize=11)
        b.text(card_, body, "Headline", fontSize=15)
        if k == 0:
            ribbon(b, card_, WW - 44, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=7)
    return root


def build(b):
    b.page("Apple Watch")
    heading(b, "Apple Watch", 0, -260,
            "Glanceable and one-tap. The watch never edits history — corrections happen on iPhone.")
    g = Grid(b, 0, 0, cols=9, w=WW, h=WH)
    g.h = WH
    for fn, cap in [(watch_idle, "33 · Main — not working"), (watch_active, "34 · Active session"),
                    (watch_break, "35 · Break"), (watch_confirm, "36 · Clock-out prompt"),
                    (watch_face, "37 · Complications"), (watch_notification, "37a · Arrival notification"),
                    (watch_today, "37b · Today summary"), (watch_smartstack, "37c · Smart Stack widget"),
                    (watch_offline, "37d · Offline / sync")]:
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
    widget_gallery(b)
