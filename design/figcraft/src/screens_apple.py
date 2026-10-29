"""Apple Watch, Live Activity, Dynamic Island and widgets."""
from common import W, H, Grid, heading, ribbon, ring, bars, wallpaper, GLASS
from lib import GLASS_EFFECTS

WW, WH = 208, 248  # Apple Watch Series 10, 46 mm


def dark(b, ref):
    b.add("variable.setMode", {"ids": [ref], "collection": b.color_collection, "mode": "Dark"})


def glow(b, root, color, w=WW, y=-130, opacity=0.5):
    if color == "#F2B04E":
        opacity = min(opacity, 0.32)
    b.ellipse(root, w * 1.3, 220, color, x=-w * 0.15, y=y, opacity=opacity, name="Glow",
              effects=[{"type": "layerBlur", "radius": 46}])


def watch_root(b, name, x, y, title="Worktime", time="15:12", glow_color=None, title_color="accent"):
    root = b.frame(None, name=name, x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    if glow_color:
        glow(b, root, glow_color)
    top = b.frame(root, name="Header", x=16, y=10, w=WW - 32, h=22, dir="h", main="spaceBetween", cross="center",
                  sw="fixed", sh="fixed")
    b.text(top, title, "Footnote/Strong", title_color, fontSize=15, lineHeight=18)
    b.text(top, time, "Footnote/Strong", "text/primary", fontSize=15, lineHeight=18, features={"tnum": True})
    return root


def corner_btn(b, root, icon, fill, fg, left=True, y=186, size=46, name=None):
    f = b.frame(root, name=name or icon, w=size, h=size, radius=size / 2, x=16 if left else WW - 16 - size, y=y,
                sw="fixed", sh="fixed", dir="h", main="center", cross="center", fill=fill)
    b.icon(f, icon, 20, color=fg, weight="fill")
    return f


def capsule(b, parent, label, icon, fill, fg, x=None, y=None, w=None, h=44):
    f = b.frame(parent, name=label, dir="h", gap=6, h=h, radius=h / 2, main="center", cross="center", fill=fill,
                sh="fixed", sw="fill" if w is None else "fixed", w=w, x=x, y=y)
    if icon:
        b.icon(f, icon, 17, color=fg, weight="fill")
    b.text(f, label, "Headline", fg, fontSize=16)
    return f


def big_ring(b, root, frac, color, size=150, y=36, track="#FFFFFF1F", width=13, knob=True):
    import math
    r_ = ring(b, root, size, frac, color=color, track=track, width=width, name="Progress ring")
    b.set(r_, x=(WW - size) / 2, y=y)
    if knob:
        a = -math.pi / 2 + 2 * math.pi * frac
        rr = (size - width) / 2
        kx, ky = size / 2 + rr * math.cos(a), size / 2 + rr * math.sin(a)
        b.ellipse(r_, width + 5, width + 5, "#FFFFFF", x=kx - (width + 5) / 2, y=ky - (width + 5) / 2, name="Now",
                  effects=[{"type": "dropShadow", "color": "#00000080", "offset": [0, 1], "radius": 4}])
    return r_


def ring_label(b, root, lines, y, h=80):
    f = b.frame(root, name="Readout", x=0, y=y, w=WW, h=h, dir="v", gap=0, main="center", cross="center",
                sw="fixed", sh="fixed")
    for txt, style, color, kw in lines:
        b.text(f, txt, style, color, **kw)
    return f


def watch_idle(b, x, y):
    root = watch_root(b, "Watch · Not working", x, y, time="08:44", glow_color="#5CC99B")
    b.text(root, "Studio Kreuzberg", "Footnote/Strong", "text/primary", x=0, y=40, w=WW, textAlign="center",
           fontSize=15)
    b.text(root, "Arrived 08:44", "Footnote", "text/secondary", x=0, y=58, w=WW, textAlign="center", fontSize=13)
    btn = b.frame(root, name="Clock in", w=108, h=108, radius=54, x=(WW - 108) / 2, y=84, sw="fixed", sh="fixed",
                  dir="v", gap=2, main="center", cross="center", fill="#5CC99B",
                  effects=[{"type": "dropShadow", "color": "#5CC99B59", "offset": [0, 6], "radius": 22}])
    b.icon(btn, "play", 38, color="#06140E", weight="fill")
    b.text(btn, "Clock in", "Footnote/Strong", "#06140E", fontSize=14)
    b.text(root, "Today 0:00  ·  Week +6h 20m", "Caption", "text/secondary", x=0, y=212, w=WW,
           textAlign="center", fontSize=12)
    return root


def watch_active(b, x, y):
    root = watch_root(b, "Watch · Working", x, y, glow_color="#2E9C70")
    big_ring(b, root, 0.73, "accent", y=36)
    ring_label(b, root, [("WORKING", "Caption/Upper", "accent", dict(fontSize=11)),
                         ("5:50", "Numeric/Large", "text/primary", dict(fontSize=40, lineHeight=44)),
                         ("ends 17:22", "Footnote", "text/secondary", dict(fontSize=13))], y=71)
    corner_btn(b, root, "coffee", "#3A2B13", "#F2B04E", left=True, name="Break")
    corner_btn(b, root, "stop", "#2A2D2B", "#FFFFFF", left=False, name="Clock out")
    return root


def watch_break(b, x, y):
    root = watch_root(b, "Watch · Break", x, y, time="12:43", glow_color="#F2B04E", title="On break",
                      title_color="break")
    big_ring(b, root, 0.42, "break", y=36)
    ring_label(b, root, [("BREAK", "Caption/Upper", "break", dict(fontSize=11)),
                         ("12:40", "Numeric/Large", "break", dict(fontSize=40, lineHeight=44)),
                         ("of 30 min", "Footnote", "text/secondary", dict(fontSize=13))], y=71)
    capsule(b, root, "Resume work", "play", "#5CC99B", "#06140E", x=24, y=192, w=WW - 48)
    return root


def watch_confirm(b, x, y):
    root = watch_root(b, "Watch · Clock-out prompt", x, y, time="17:31")
    c = b.frame(root, name="Content", x=16, y=40, w=WW - 32, dir="v", gap=4, sw="fixed")
    b.text(c, "Leaving Studio Kreuzberg?", "Headline", fontSize=17, lineHeight=21, sw="fill")
    b.text(c, "8h 09m today · +9m", "Footnote", "accent", fontSize=13)
    acts = b.frame(root, name="Actions", x=14, y=134, w=WW - 28, dir="v", gap=6, sw="fixed")
    capsule(b, acts, "Clock out 17:29", "stop", "#F3F2ED", "#0B0C0B")
    capsule(b, acts, "Still working", None, "#232624", "#F3F2ED")
    return root


def watch_face(b, x, y):
    """Modular face with Worktime complications: corner gauges, a rectangular ribbon and an inline line."""
    root = b.frame(None, name="Watch · Complications", x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    b.text(root, "15:12", "Numeric/Large", "text/primary", x=0, y=6, w=WW, textAlign="center", fontSize=48,
           lineHeight=52)
    b.text(root, "THU 16  ·  ◷ 5:50 today", "Caption/Upper", "#FF9F0A", x=0, y=60, w=WW, textAlign="center",
           fontSize=11)
    rc = b.frame(root, name="Rectangular", x=12, y=84, w=WW - 24, h=74, dir="v", gap=6, pad=[10, 12, 10, 12],
                 radius=18, sw="fixed", sh="fixed", fill="#161816")
    hd = b.frame(rc, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center")
    b.text(hd, "WORKING", "Caption/Upper", "accent", fontSize=11)
    b.text(hd, "5:50", "Footnote/Strong", "text/primary", fontSize=14, features={"tnum": True})
    ribbon(b, rc, WW - 48, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=7)
    b.text(rc, "ends 17:22 · 2h 10m left", "Caption", "text/secondary", fontSize=11)
    row = b.frame(root, name="Circular", x=16, y=170, w=WW - 32, dir="h", main="spaceBetween", sw="fixed")
    for frac, top, lab, colr in [(0.73, "DAY", "73%", "accent"), (0.62, "BAL", "+6h", "accent"),
                                 (0.42, "BRK", "12m", "break")]:
        cell = b.frame(row, name=f"Circular {top}", w=52, h=52, radius=26, sw="fixed", sh="fixed",
                       fill="#161816", dir="v", gap=0, main="center", cross="center")
        r_ = ring(b, cell, 46, frac, color=colr, track="#FFFFFF24", width=4)
        b.absolute(r_, 3, 3)
        b.text(cell, top, "Caption", "text/secondary", fontSize=8, lineHeight=9)
        b.text(cell, lab, "Caption", "text/primary", fontSize=12, lineHeight=14, fontStyle="Semi Bold")
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


def widget(b, parent, name, w, h, fill="bg/elevated", x=None, y=None, main="spaceBetween", gap=0):
    return b.frame(parent, name=name, w=w, h=h, radius=24 if w < 200 else 26, dir="v", gap=gap, pad=16,
                   sw="fixed", sh="fixed", fill=fill, x=x, y=y, main=main,
                   effects=[{"type": "dropShadow", "color": "#00000014", "offset": [0, 4], "radius": 16}])


SEGS_NOW = [("08:47", "12:30", "work"), ("12:30", "13:05", "break"), ("13:05", "15:12", "work")]
WEEK_ROWS = [("Mon", [("08:40", "12:20", "work"), ("12:20", "12:50", "break"), ("12:50", "17:24", "work")], "8h 24m"),
             ("Tue", [("09:05", "18:30", "home")], "8h 55m"),
             ("Wed", [("08:52", "12:15", "work"), ("12:15", "13:00", "break"), ("13:00", "17:20", "work")], "7h 36m"),
             ("Thu", SEGS_NOW, "5h 50m"),
             ("Fri", [], "—")]


def w_header(b, parent, label, color="accent", right=None, right_color="text/secondary"):
    from brand import mark
    hd = b.frame(parent, name="Header", dir="h", gap=6, sw="fill", cross="center")
    mark(b, hd, 18, arc="accent", hole="bg/elevated")
    t = b.text(hd, label, "Footnote/Strong", color, sw="fill")
    if right:
        b.text(hd, right, "Footnote", right_color)
    return hd


def w_ribbon(b, parent, w, segs, now, left, right, planned="17:22", h=6):
    f = b.frame(parent, name="Timeline", dir="v", gap=5, sw="fill")
    ribbon(b, f, w, segs, now=now, planned=planned, labels=False, h=h)
    lab = b.frame(f, name="Labels", dir="h", sw="fill", main="spaceBetween")
    b.text(lab, left, "Caption", "text/tertiary", features={"tnum": True})
    b.text(lab, right, "Caption", "text/tertiary", features={"tnum": True})
    return f


def w_small_status(b, parent, state="work", x=None, y=None, name=None):
    s = widget(b, parent, name or f"Small · Status ({state})", 170, 170, x=x, y=y)
    if state == "work":
        w_header(b, s, "Working")
        t = b.frame(s, name="Readout", dir="v", gap=0)
        b.text(t, "5:50", "Display/Timer", fontSize=46, lineHeight=48)
        b.text(t, "since 08:47", "Footnote", "text/secondary")
        w_ribbon(b, s, 138, SEGS_NOW, "15:12", "08:47", "~17:22")
    elif state == "break":
        w_header(b, s, "On break", "break")
        t = b.frame(s, name="Readout", dir="v", gap=0)
        b.text(t, "12:40", "Display/Timer", "break", fontSize=40, lineHeight=48)
        b.text(t, "min. 30 min", "Footnote", "text/secondary")
        bar = b.frame(s, name="Break progress", dir="v", gap=5, sw="fill")
        tr = b.frame(bar, name="Track", w=138, h=6, radius=3, fill="bg/track", sw="fixed", sh="fixed")
        b.rect(tr, 138 * 0.42, 6, "break", radius=3, x=0, y=0)
        lab = b.frame(bar, name="Labels", dir="h", sw="fill", main="spaceBetween")
        b.text(lab, "12:30", "Caption", "text/tertiary")
        b.text(lab, "13:00", "Caption", "text/tertiary")
    else:
        w_header(b, s, "Not working", "text/secondary")
        t = b.frame(s, name="Readout", dir="v", gap=2)
        b.text(t, "0:00", "Display/Timer", "text/tertiary", fontSize=46, lineHeight=48)
        b.text(t, "Office day · 8h", "Footnote", "text/secondary")
        w_ribbon(b, s, 138, [], "08:12", "08:50", "17:20")
    return s


def w_small_clear(b, parent, x=None, y=None):
    s2 = b.frame(parent, name="Small · Balance (clear)", w=170, h=170, radius=24, dir="v", gap=4, pad=16,
                 sw="fixed", sh="fixed", main="center", cross="center", fill="#FFFFFF1F", stroke="#FFFFFF59",
                 effects=GLASS_EFFECTS, x=x, y=y)
    holder = b.frame(s2, name="Gauge", w=112, h=112, sw="fixed", sh="fixed", dir="v", main="center", cross="center")
    r_ = ring(b, holder, 112, 0.62, color="#FFFFFF", track="#FFFFFF33", width=10)
    b.absolute(r_, 0, 0)
    b.text(holder, "+6h 20m", "Headline", "#FFFFFF")
    b.text(holder, "balance", "Caption", "#FFFFFFB3")
    return s2


def w_small_action(b, parent, x=None, y=None):
    s = widget(b, parent, "Small · Clock in (interactive)", 170, 170, x=x, y=y)
    hd = b.frame(s, name="Header", dir="h", gap=6, sw="fill", cross="center")
    b.icon(hd, "buildings", 16, color="accent", weight="fill")
    b.text(hd, "Studio Kreuzberg", "Footnote/Strong", "accent", sw="fill")
    t = b.frame(s, name="Readout", dir="v", gap=2, sw="fill")
    b.text(t, "Arrived 08:44", "Headline", sw="fill")
    b.text(t, "Not clocked in yet", "Footnote", "text/secondary")
    btn = b.frame(s, name="Clock in", dir="h", gap=6, h=44, sh="fixed", sw="fill", radius=22, main="center",
                  cross="center", fill="accent")
    b.icon(btn, "play", 16, color="on-accent", weight="fill")
    b.text(btn, "Clock in", "Subhead/Strong", "on-accent")
    return s


def w_medium_today(b, parent, x=None, y=None):
    m = widget(b, parent, "Medium · Today (interactive)", 364, 170, x=x, y=y)
    top = b.frame(m, name="Top", dir="h", gap=12, sw="fill", cross="center")
    l = b.frame(top, name="Readout", dir="v", gap=0, sw="fill")
    w_header(b, l, "Working · Studio Kreuzberg")
    b.text(l, "5:50", "Display/Timer", fontSize=46, lineHeight=50)
    b.text(l, "ends ~17:22 · 2h 10m left", "Footnote", "text/secondary")
    acts = b.frame(top, name="Actions", dir="v", gap=8, w=112, sw="fixed")
    for lab, icon, fill, fg in [("Break", "coffee", "break/soft", "break"), ("Clock out", "stop", "text/primary", "bg/canvas")]:
        bt = b.frame(acts, name=lab, dir="h", gap=6, h=40, sh="fixed", radius=20, sw="fill", main="center",
                     cross="center", fill=fill)
        b.icon(bt, icon, 14, color=fg, weight="fill")
        b.text(bt, lab, "Footnote/Strong", fg)
    w_ribbon(b, m, 332, SEGS_NOW, "15:12", "06:00", "20:00")
    return m


def w_medium_week(b, parent, w=364, x=None, y=None):
    m = widget(b, parent, "Medium · Week", w, 170, x=x, y=y)
    b.set(m, layout="horizontal", gap=18, mainAlign="min")
    l = b.frame(m, name="Left", dir="v", gap=0, w=118, sw="fixed", sh="fill", main="spaceBetween")
    top = b.frame(l, name="Total", dir="v", gap=0)
    b.text(top, "This week", "Footnote/Strong", "text/secondary")
    b.text(top, "30h 41m", "Numeric/Large", fontSize=30, lineHeight=34)
    b.text(top, "of 40h", "Footnote", "text/tertiary")
    chip_ = b.frame(l, name="Balance", dir="h", gap=4, pad=[5, 10, 5, 8], radius=12, cross="center", fill="accent/soft")
    b.icon(chip_, "trend-up", 14, color="accent")
    b.text(chip_, "+6h 20m", "Footnote/Strong", "accent")
    bars(b, m, w - 32 - 136, 112, [("M", 8.4, "work"), ("T", 8.9, "home"), ("W", 7.6, "work"),
                                   ("T", 5.8, "today"), ("F", 0, "off")], target=8, maxv=10, radius=6)
    return m


def w_large_week(b, parent, w=364, x=None, y=None):
    full = parent is None
    lg = widget(b, parent, "Large · Week", w, 382 if full else 262, x=x, y=y)
    hd = b.frame(lg, name="Header", dir="h", sw="fill", main="spaceBetween", cross="center")
    left = b.frame(hd, name="Total", dir="v", gap=0)
    b.text(left, "Week 42", "Footnote/Strong", "text/secondary")
    t = b.frame(left, name="Value", dir="h", gap=6, cross="baseline")
    b.text(t, "30h 41m", "Numeric/Large", fontSize=30 if full else 24, lineHeight=34 if full else 28)
    b.text(t, "of 40h", "Footnote", "text/tertiary")
    chip_ = b.frame(hd, name="Balance", dir="h", gap=4, pad=[5, 10, 5, 8], radius=12, cross="center", fill="accent/soft")
    b.icon(chip_, "trend-up", 14, color="accent")
    b.text(chip_, "+6h 20m", "Footnote/Strong", "accent")
    rows = b.frame(lg, name="Days", dir="v", gap=20 if full else 8, sw="fill")
    for d, segs, val in WEEK_ROWS:
        today = d == "Thu"
        rr = b.frame(rows, name=d, dir="h", gap=10, sw="fill", cross="center")
        b.text(rr, d, "Footnote/Strong" if today else "Footnote", "text/primary" if today else "text/secondary", w=32)
        ribbon(b, rr, w - 146, segs, labels=False, h=8 if today else 6,
               now="15:12" if today else None, planned="17:22" if today else None)
        b.text(rr, val, "Footnote/Strong" if today else "Footnote", "text/primary" if today else "text/secondary",
               features={"tnum": True})
    if full:
        foot = b.frame(lg, name="Footer", dir="h", gap=10, sw="fill", cross="center", pad=[12, 0, 0, 0])
        st = b.frame(foot, name="Status", dir="v", gap=0, sw="fill")
        b.text(st, "Working · 5:50", "Subhead/Strong", "accent")
        b.text(st, "ends ~17:22", "Caption", "text/secondary")
        btn = b.frame(foot, name="Clock out", dir="h", gap=6, h=40, sh="fixed", radius=20, pad=[0, 16, 0, 14],
                      cross="center", fill="text/primary")
        b.icon(btn, "stop", 14, color="bg/canvas", weight="fill")
        b.text(btn, "Clock out", "Footnote/Strong", "bg/canvas")
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


def gauge(b, parent, size, frac, value, label, color="#FFFFFF", track="#FFFFFF40"):
    """accessoryCircular gauge: a 240° open arc with the value inside, as WidgetKit's Gauge draws it."""
    import math
    f = b.frame(parent, name=f"Circular · {label}", w=size, h=size, radius=size / 2, sw="fixed", sh="fixed",
                fill="#FFFFFF26", dir="v", gap=0, main="center", cross="center")
    r = size / 2 - 7
    c = size / 2
    def arc(a0, sweep):
        a1 = a0 + sweep
        x0, y0 = c + r * math.cos(math.radians(a0)), c + r * math.sin(math.radians(a0))
        x1, y1 = c + r * math.cos(math.radians(a1)), c + r * math.sin(math.radians(a1))
        return f"M{x0:.2f} {y0:.2f} A{r:.2f} {r:.2f} 0 {1 if sweep > 180 else 0} 1 {x1:.2f} {y1:.2f}"
    holder = b.frame(f, name="Arc", w=size, h=size, sw="fixed", sh="fixed")
    b.absolute(holder, 0, 0)
    b.vector(holder, arc(150, 240), stroke=track, sw=5)
    b.vector(holder, arc(150, 240 * frac), stroke=color, sw=5)
    b.text(f, value, "Footnote/Strong", "#FFFFFF", features={"tnum": True}, fontSize=14)
    b.text(f, label, "Caption", "#FFFFFFB3", fontSize=9, lineHeight=10)
    return f


def lock_accessories(b, parent):
    """accessoryInline, accessoryCircular and accessoryRectangular (vibrant rendering)."""
    col_ = b.frame(parent, name="Lock Screen accessories", dir="v", gap=14)
    b.text(col_, "Thu 16  ·  Working 5:50 · ends 17:22", "Subhead/Strong", "#FFFFFFE6", name="Inline")
    r = b.frame(col_, name="Row", dir="h", gap=12, cross="center")
    gauge(b, r, 72, 0.73, "5:50", "DAY")
    gauge(b, r, 72, 0.62, "+6h", "BAL")
    rect = b.frame(r, name="Rectangular", w=170, h=72, dir="v", gap=5, pad=[9, 12, 9, 12], radius=16,
                   sw="fixed", sh="fixed", fill="#FFFFFF26")
    hd = b.frame(rect, name="Header", dir="h", sw="fill", main="spaceBetween")
    b.text(hd, "Working", "Footnote/Strong", "#FFFFFF")
    b.text(hd, "5:50", "Footnote/Strong", "#FFFFFF", features={"tnum": True})
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
    root = b.frame(None, name="Watch · Arrival notification", x=x, y=y, w=WW, h=WH, fill="#000000", clip=True,
                   radius=46)
    dark(b, root)
    from brand import icon
    hd = b.frame(root, name="App", x=16, y=12, w=WW - 32, dir="h", gap=8, cross="center", sw="fixed")
    icon(b, hd, 26, "Default")
    b.text(hd, "Worktime", "Footnote/Strong", "text/secondary", fontSize=13, sw="fill")
    b.text(hd, "now", "Caption", "text/tertiary", fontSize=12)
    c = b.frame(root, name="Body", x=16, y=46, w=WW - 32, dir="v", gap=2, sw="fixed")
    b.text(c, "Arrived at Studio Kreuzberg", "Headline", fontSize=16, lineHeight=20, sw="fill")
    b.text(c, "Clock in from 08:44?", "Footnote", "text/secondary", fontSize=13)
    acts = b.frame(root, name="Actions", x=12, y=130, w=WW - 24, dir="v", gap=6, sw="fixed")
    capsule(b, acts, "Clock in 08:44", "play", "#5CC99B", "#06140E")
    capsule(b, acts, "Not today", None, "#232624", "#F3F2ED")
    return root


def watch_today(b, x, y):
    root = watch_root(b, "Watch · Today summary", x, y, title="Today")
    t = b.frame(root, name="Total", x=16, y=36, w=WW - 32, dir="h", gap=6, cross="baseline", sw="fixed")
    b.text(t, "5h 50m", "Numeric/Large", fontSize=30, lineHeight=34)
    b.text(t, "worked", "Footnote", "text/secondary", fontSize=13)
    rb = ribbon(b, root, WW - 32, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=7, name="Ribbon")
    b.set(rb, x=16, y=80)
    lst = b.frame(root, name="Sessions", x=12, y=100, w=WW - 24, dir="v", gap=5, sw="fixed")
    for t_, v, colr in [("08:47 – 12:30", "3h 43m", "accent"), ("Break", "35m", "break"),
                        ("13:05 – now", "2h 07m", "accent")]:
        r = b.frame(lst, name=t_, dir="h", gap=8, pad=[9, 12, 9, 10], radius=16, sw="fill", cross="center",
                    fill="#161816")
        b.rect(r, 4, 20, colr, radius=2)
        b.text(r, t_, "Footnote", "text/primary", sw="fill", fontSize=14)
        b.text(r, v, "Footnote/Strong", colr, fontSize=14)
    return root


def watch_offline(b, x, y):
    root = watch_root(b, "Watch · Offline sync", x, y, time="17:31", glow_color="#2E9C70")
    mid = b.frame(root, name="Main", x=12, y=44, w=WW - 24, dir="v", gap=8, cross="center", sw="fixed")
    cc = b.frame(mid, name="Glyph", w=56, h=56, radius=28, dir="h", main="center", cross="center", sw="fixed",
                 sh="fixed", fill="#5CC99B")
    b.icon(cc, "check", 30, color="#06140E")
    b.text(mid, "Clocked out 17:29", "Headline", fontSize=17)
    b.text(mid, "8h 09m today", "Footnote", "text/secondary", fontSize=13)
    pill_ = b.frame(root, name="Sync", x=24, y=190, w=WW - 48, h=36, dir="h", gap=6, radius=18, main="center",
                    cross="center", fill="#161816", sw="fixed", sh="fixed")
    b.icon(pill_, "arrows-clockwise", 15, color="text/secondary")
    b.text(pill_, "Waiting for iPhone", "Caption", "text/secondary", fontSize=12)
    return root


def watch_smartstack(b, x, y):
    root = b.frame(None, name="Watch · Smart Stack", x=x, y=y, w=WW, h=WH, fill="#000000", clip=True, radius=46)
    dark(b, root)
    glow(b, root, "#2E9C70", opacity=0.35)
    b.text(root, "15:12", "Numeric/Large", "text/primary", x=WW - 100, y=6, fontSize=32, lineHeight=36)
    from brand import icon
    c1 = b.frame(root, name="Widget · Working", x=10, y=50, w=WW - 20, h=96, dir="v", gap=6,
                 pad=[12, 14, 12, 14], radius=24, sw="fixed", sh="fixed", fill="#1B1E1C")
    hd = b.frame(c1, name="Header", dir="h", gap=6, cross="center", sw="fill")
    icon(b, hd, 18, "Default")
    b.text(hd, "Working", "Footnote/Strong", "accent", sw="fill", fontSize=13)
    b.text(hd, "5:50", "Numeric/Medium", "text/primary", fontSize=20, lineHeight=24)
    ribbon(b, c1, WW - 48, SEGS_NOW, now="15:12", planned="17:22", labels=False, h=7)
    b.text(c1, "ends 17:22", "Caption", "text/secondary", fontSize=12)
    c2 = b.frame(root, name="Widget · Week", x=18, y=156, w=WW - 36, h=72, dir="v", gap=2,
                 pad=[10, 14, 10, 14], radius=22, sw="fixed", sh="fixed", fill="#141614", opacity=0.75)
    b.text(c2, "This week · +6h 20m", "Caption", "accent", fontSize=12)
    b.text(c2, "30h 41m", "Headline", fontSize=17)
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
