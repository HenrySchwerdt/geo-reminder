"""Logo, app icon family and README showcase boards (page "Brand")."""
import os

from common import heading

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = os.path.normpath(os.path.join(HERE, "..", "..", "exports"))

GREEN_TOP, GREEN_BOTTOM = "#2E8F6B", "#123F33"
AMBER = "#F2B04E"
INK = "#151715"
PAPER = "#F4F2EC"


def mark(b, parent, size, arc="#FFFFFF", track="#FFFFFF38", dot=AMBER, gap=None, name="Mark", x=None, y=None):
    """The Worktime mark: a day arc (270°, clockwise from 12 o'clock) that starts at an amber
    “arrival” dot. Drawn on a 100-unit grid: ring radius 30, stroke 11, dot 15."""
    s = size / 100
    f = b.frame(parent, name=name, w=size, h=size, sw="fixed", sh="fixed", x=x, y=y)
    r, sw_ = 30 * s, 11 * s
    b.ellipse(f, 2 * r, 2 * r, None, x=50 * s - r, y=50 * s - r, name="Track", stroke=track, strokeWeight=sw_)
    b.vector(f, f"M{50*s:.2f} {20*s:.2f} A{r:.2f} {r:.2f} 0 1 1 {20*s:.2f} {50*s:.2f}", stroke=arc, sw=sw_,
             name="Day arc")
    d = 15 * s
    props = {}
    if gap:
        props = dict(stroke=gap, strokeWeight=3.5 * s, strokeAlign="outside")
    b.ellipse(f, d, d, dot, x=50 * s - d / 2, y=20 * s - d / 2, name="Arrival dot", **props)
    return f


def icon(b, parent, size, variant="Default", name=None, x=None, y=None):
    """App icon in the iOS 26 appearances: Default, Dark, Clear (tinted glass) and Mono."""
    spec = {
        "Default": dict(fills=[{"type": "linearGradient", "stops": [GREEN_TOP, GREEN_BOTTOM]}], arc="#FFFFFF",
                        track="#FFFFFF26", dot=AMBER, gap="#25785A"),
        "Dark": dict(fills=[{"type": "linearGradient", "stops": ["#1D211F", "#0A0B0A"]}], arc="#5CC99B",
                     track="#5CC99B2E", dot=AMBER, gap="#151816"),
        "Clear": dict(fills=[{"type": "linearGradient", "stops": ["#FFFFFF55", "#FFFFFF22"]}], arc="#FFFFFF",
                      track="#FFFFFF40", dot="#FFFFFFD9", gap=None),
        "Mono": dict(fills=[{"type": "linearGradient", "stops": ["#FFFFFF", "#EEECE6"]}], arc=INK,
                     track="#15171522", dot=INK, gap="#F6F5F1"),
    }[variant]
    f = b.frame(parent, name=name or f"App Icon · {variant}", w=size, h=size, radius=size * 0.225, sw="fixed",
                sh="fixed", clip=True, x=x, y=y, fills=spec["fills"],
                effects=[{"type": "innerShadow", "color": "#FFFFFF40", "offset": [0, size * 0.012],
                          "radius": size * 0.02}] + ([{"type": "glass", "refraction": 0.4, "depth": size * 0.06,
                                                       "frost": 6}] if variant == "Clear" else []),
                stroke="#FFFFFF66" if variant == "Clear" else None, sweight=max(1, size * 0.006))
    m = mark(b, f, size * 0.74, arc=spec["arc"], track=spec["track"], dot=spec["dot"], gap=spec["gap"])
    b.absolute(m, size * 0.13, size * 0.14)
    return f


def wordmark(b, parent, size=64, color=INK, name="Wordmark"):
    return b.text(parent, "Worktime", "Display/Large", color, name=name, fontSize=size, lineHeight=size * 1.1,
                  letterSpacing="-2.5%", fontStyle="Semi Bold")


def lockup(b, parent, size=64, color=INK, arc="#1E6B4F", track="#1E6B4F26", gap=None, name="Lockup · Horizontal"):
    f = b.frame(parent, name=name, dir="h", gap=size * 0.28, cross="center")
    mark(b, f, size * 1.15, arc=arc, track=track, gap=gap)
    wordmark(b, f, size, color)
    return f


def logo_board(b):
    f = b.frame(None, name="Logo", x=0, y=0, w=1800, dir="v", gap=56, pad=80, sw="fixed", fill="bg/canvas",
                radius=40)
    b.text(f, "Logo", "Title/1", fontSize=40, lineHeight=46)
    b.text(f, "A day arc that starts at an amber dot: the moment you arrive. It reads as a clock, a progress "
              "ring and a place marker at once — the three ideas of Worktime. Drawn on a 100-unit grid "
              "(ring r 30, stroke 11, dot 15), it stays legible down to 16 px.", "Callout", "text/secondary",
           w=1100)
    # hero row: big icon + construction
    row = b.frame(f, name="Mark", dir="h", gap=56, cross="center")
    icon(b, row, 360, "Default", name="App Icon · 1024 preview")
    con = b.frame(row, name="Construction", w=360, h=360, sw="fixed", sh="fixed", radius=40, fill="bg/elevated",
                  stroke="separator")
    for k in range(1, 10):
        b.rect(con, 1, 360, "separator", x=k * 36, y=0)
        b.rect(con, 360, 1, "separator", x=0, y=k * 36)
    b.ellipse(con, 216, 216, None, x=72, y=72, stroke={"$var": "Color/info"}, strokeWeight=1, dashes=[4, 4],
              name="Ring r30")
    m = mark(b, con, 360, arc="#1E6B4F", track="#1E6B4F26", gap="#FFFFFF")
    b.absolute(m, 0, 0)
    b.text(con, "r 30 · stroke 11 · dot 15 · 270°", "Caption", "text/secondary", x=16, y=332)
    words = b.frame(row, name="Lockups", dir="v", gap=40)
    lockup(b, words, 72)
    st = b.frame(words, name="Lockup · Stacked", dir="v", gap=14, cross="center")
    mark(b, st, 96, arc="#1E6B4F", track="#1E6B4F26")
    wordmark(b, st, 40)
    dark_ = b.frame(words, name="Lockup · On dark", dir="h", pad=[28, 36, 28, 36], radius=28, fill="#0E100F")
    lockup(b, dark_, 48, color="#F3F2ED", arc="#5CC99B", track="#5CC99B2E")
    # appearances
    b.text(f, "iOS 26 icon appearances", "Title/3")
    ap = b.frame(f, name="Appearances", dir="h", gap=40, cross="max")
    for v, bg in [("Default", "#E9E6DE"), ("Dark", "#000000"), ("Clear", None), ("Mono", "#D9D6CE")]:
        cell = b.frame(ap, name=v, dir="v", gap=12, cross="center")
        bgkw = {"fill": bg} if bg else {"fills": [{"type": "linearGradient", "stops": ["#6E8F80", "#2A3F37"]}]}
        stage = b.frame(cell, name="Stage", w=220, h=220, radius=32, sw="fixed", sh="fixed", clip=True,
                        dir="h", main="center", cross="center", **bgkw)
        icon(b, stage, 150, v)
        b.text(cell, {"Default": "Default", "Dark": "Dark", "Clear": "Clear (tinted glass)", "Mono": "Mono / tinted"}[v],
               "Subhead", "text/secondary")
    # sizes
    b.text(f, "Small sizes", "Title/3")
    sz = b.frame(f, name="Sizes", dir="h", gap=32, cross="max")
    for s in (180, 120, 87, 60, 40, 29, 20, 16):
        cell = b.frame(sz, name=f"{s}px", dir="v", gap=10, cross="center")
        icon(b, cell, s, "Default")
        b.text(cell, f"{s}", "Caption", "text/tertiary")
    # don'ts
    b.text(f, "Clear space = dot diameter on every side. Don't recolour the dot, rotate the arc or add a hand.",
           "Footnote", "text/secondary")
    return f


def showcase(b):
    """README banner and galleries, composed from the exported screens."""
    def img(parent, rel, w, h, name):
        path = os.path.join(EXPORTS, rel)
        b.add("image.place", {"path": path, "parent": parent, "width": w, "height": h, "name": name, "mode": "fill"})

    def shot(parent, rel, w=300):
        h = w * 852 / 393
        sh = b.frame(parent, name=os.path.basename(rel), w=w, h=h, radius=w * 0.14, sw="fixed", sh="fixed",
                     clip=True, stroke="#00000014", sweight=1,
                     effects=[{"type": "dropShadow", "color": "#0000002E", "offset": [0, 24], "radius": 60}])
        img(sh, rel, w, h, "Screen")
        return sh

    y0 = 2200
    hero = b.frame(None, name="README · Hero", x=0, y=y0, w=1800, h=900, sw="fixed", sh="fixed", clip=True,
                   fills=[{"type": "linearGradient", "stops": ["#F4F2EC", "#E3EDE6"]}])
    txt = b.frame(hero, name="Text", x=110, y=0, w=640, h=900, dir="v", gap=26, main="center", sw="fixed",
                  sh="fixed")
    lockup(b, txt, 64)
    b.text(txt, "Work time, without the effort.", "Display/Large", INK, fontSize=54, lineHeight=60, w=600)
    b.text(txt, "Gentle reminders when you arrive and leave. A record you can trust and fix. "
                "Private by design, built for iOS 26.", "Title/3", "#5D615C", w=560, fontStyle="Regular")
    chips = b.frame(txt, name="Chips", dir="h", gap=10, wrap=True, w=600, sw="fixed")
    for t in ("iPhone", "Apple Watch", "Live Activity", "Widgets", "Light & Dark"):
        c = b.frame(chips, name=t, dir="h", pad=[8, 16, 8, 16], radius=18, fill="#FFFFFF", stroke="#E3DFD6")
        b.text(c, t, "Subhead/Strong", INK)
    phones = b.frame(hero, name="Phones", x=800, y=110, w=1000, dir="h", gap=36, sw="fixed", cross="center",
                     clip=False)
    shot(phones, "iphone/core/Today · Working.png", 300)
    d = shot(phones, "iphone/dark/Dark · Today (working).png", 300)
    shot(phones, "iphone/core/Calendar · Month.png", 300)

    def gallery(name, y, items, w=280, bg="#F4F2EC", title=None):
        g = b.frame(None, name=name, x=0, y=y, w=1800, dir="v", gap=36, pad=[70, 80, 80, 80], sw="fixed",
                    fill=bg, clip=False)
        if title:
            b.text(g, title, "Title/1", INK if bg != "#0B0C0B" else "#F3F2ED")
        r = b.frame(g, name="Row", dir="h", gap=36, cross="center", clip=False)
        for it in items:
            if isinstance(it, tuple):
                rel, ww = it
                hh = ww * 248 / 208 if "watch" in rel else ww * 852 / 393
                sh = b.frame(r, name=os.path.basename(rel), w=ww, h=hh, radius=ww * 0.2 if "watch" in rel else ww * 0.14,
                             sw="fixed", sh="fixed", clip=True,
                             effects=[{"type": "dropShadow", "color": "#00000026", "offset": [0, 18], "radius": 44}])
                img(sh, rel, ww, hh, "Screen")
            else:
                shot(r, it, w)
        return g

    gallery("README · Core", y0 + 1000, ["iphone/core/Today · Not working.png", "iphone/core/Today · Working.png",
                                         "iphone/core/Today · On break.png", "iphone/core/Clock-out confirmation.png",
                                         "iphone/core/Day details.png"], w=290, title="Today, at a glance")
    gallery("README · Corrections", y0 + 1900, ["iphone/core/Calendar · Month.png", "iphone/states/State · Incomplete entry.png",
                                                "iphone/core/Add missed session.png", "iphone/core/Edit session.png",
                                                "iphone/core/Insights · Week.png"], w=290,
            title="Fix anything — and see the impact first")
    gallery("README · Dark", y0 + 2800, ["iphone/dark/Dark · Today (working).png", "iphone/dark/Dark · Calendar.png",
                                         "iphone/dark/Dark · Day details.png", "iphone/dark/Dark · Weekly summary.png",
                                         "iphone/dark/Dark · Reminders.png"], w=290, bg="#0B0C0B", title="Dark mode")
    gallery("README · Ecosystem", y0 + 3700, [("widgets/Lock Screen · Live Activity.png", 290),
                                              ("widgets/Dynamic Island.png", 290),
                                              ("widgets/Home Screen widgets.png", 290),
                                              ("watch/Watch · Working.png", 230),
                                              ("watch/Watch · Complications.png", 230)],
            title="Lock Screen, Dynamic Island, widgets & Apple Watch")
    gallery("README · Onboarding", y0 + 4600, ["iphone/onboarding/Onboarding · Welcome.png",
                                               "iphone/onboarding/Onboarding · Location.png",
                                               "iphone/places/Arrival reminder.png",
                                               "iphone/places/Geofence radius.png",
                                               "iphone/places/Home-office schedule.png"], w=290,
            title="Reminders that ask, never assume")


def build(b):
    b.page("Brand")
    logo_board(b)
    if os.path.isdir(os.path.join(EXPORTS, "iphone")):
        showcase(b)
