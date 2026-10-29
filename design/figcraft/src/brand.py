"""Logo, app icon family and README showcase boards (page "Brand")."""
import math
import os

from common import heading

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORTS = os.path.normpath(os.path.join(HERE, "..", "..", "exports"))

GREEN_TOP, GREEN_BOTTOM = "#2E8F6B", "#123F33"
AMBER = "#F2B04E"
INK = "#151715"
PAPER = "#F4F2EC"


def _arc(cx, cy, r, a0, sweep):
    a1 = a0 + sweep
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    return f"M{x0:.2f} {y0:.2f} A{r:.2f} {r:.2f} 0 {1 if sweep > 180 else 0} 1 {x1:.2f} {y1:.2f}"


# Mark geometry on a 100-unit grid
RING_C, RING_R, RING_W, SWEEP = (50, 61), 24, 10.5, 300
PIN_C, PIN_R = (50, 18), 11
PIN_TIP = PIN_C[1] + 1.75 * PIN_R          # lands on the start of the day arc


def mark(b, parent, size, arc="#1E6B4F", pin="#EFA63C", hole=PAPER, name="Mark", x=None, y=None, shadow=False):
    """The Worktime mark: a location pin that drops onto the start of a day arc.
    Arrive (pin) → the working day fills up (arc). 100-unit grid: ring r 24 / stroke 10.5 / 300°,
    pin head r 11 with a 9-unit hole, tip exactly on the arc's start."""
    s = size / 100
    f = b.frame(parent, name=name, w=size, h=size, sw="fixed", sh="fixed", x=x, y=y)
    cx, cy = RING_C
    b.vector(f, _arc(cx * s, cy * s, RING_R * s, -90, SWEEP), stroke=arc, sw=RING_W * s, name="Day arc")
    phi = math.acos(PIN_R / (PIN_TIP - PIN_C[1]))
    lx, ly = PIN_C[0] - PIN_R * math.sin(phi), PIN_C[1] + PIN_R * math.cos(phi)
    rx = PIN_C[0] + PIN_R * math.sin(phi)
    d = (f"M{50 * s:.2f} {PIN_TIP * s:.2f} L{lx * s:.2f} {ly * s:.2f} "
         f"A{PIN_R * s:.2f} {PIN_R * s:.2f} 0 1 1 {rx * s:.2f} {ly * s:.2f} Z")
    eff = [{"type": "dropShadow", "color": "#0000002E", "offset": [0, 1.5 * s], "radius": 3 * s}] if shadow else []
    b.vector(f, d, fill=pin, stroke=pin, sw=2 * s, name="Pin", effects=eff)
    b.ellipse(f, 9 * s, 9 * s, hole, x=45.5 * s, y=(PIN_C[1] - 4.5) * s, name="Pin hole")
    return f


ICONS = {
    "Default": dict(stops=["#FDFCF9", "#E7E3D8"], arc="#1E6B4F", pin="#EFA63C", hole="#FBFAF6", rim="#FFFFFF"),
    "Dark": dict(stops=["#222724", "#080908"], arc="#5CC99B", pin="#F2B04E", hole="#151816", rim="#FFFFFF59"),
    "Clear": dict(stops=["#FFFFFF59", "#FFFFFF1F"], arc="#FFFFFF", pin="#FFFFFFE6", hole="#7F978C", rim="#FFFFFF80"),
    "Mono": dict(stops=["#3A3D3B", "#1C1E1D"], arc="#E9E9E9", pin="#BDBDBD", hole="#2B2E2C", rim="#FFFFFF40"),
    "Green": dict(stops=["#2F9670", "#0F3B2F"], arc="#FFFFFF", pin="#F2B04E", hole="#226F53", rim="#FFFFFF66"),
}


def icon(b, parent, size, variant="Default", name=None, x=None, y=None):
    """App icon in the iOS 26 appearances (Default, Dark, Clear, Mono/tinted) plus a Green alternate."""
    sp = ICONS[variant]
    eff = [{"type": "innerShadow", "color": sp["rim"], "offset": [0, max(0.6, size * 0.01)],
            "radius": max(0.6, size * 0.015)}]
    if variant == "Clear":
        eff.append({"type": "glass", "refraction": 0.4, "depth": size * 0.06, "frost": 6})
    f = b.frame(parent, name=name or f"App Icon · {variant}", w=size, h=size, radius=size * 0.225, sw="fixed",
                sh="fixed", clip=True, x=x, y=y, fills=[{"type": "linearGradient", "stops": sp["stops"]}],
                effects=eff, stroke="#0000000F" if variant == "Default" else None, sweight=1)
    m = mark(b, f, size, arc=sp["arc"], pin=sp["pin"], hole=sp["hole"], shadow=size >= 60)
    b.absolute(m, 0, 0)
    return f


def wordmark(b, parent, size=64, color=INK, name="Wordmark"):
    return b.text(parent, "Worktime", "Display/Large", color, name=name, fontSize=size, lineHeight=size * 1.1,
                  letterSpacing="-3%", fontStyle="Bold")


def lockup(b, parent, size=64, color=INK, arc="#1E6B4F", hole=PAPER, name="Lockup · Horizontal"):
    f = b.frame(parent, name=name, dir="h", gap=size * 0.18, cross="center")
    mark(b, f, size * 1.5, arc=arc, hole=hole)
    wordmark(b, f, size, color)
    return f


def logo_board(b):
    f = b.frame(None, name="Logo", x=0, y=0, w=1800, dir="v", gap=64, pad=80, sw="fixed", fill="bg/canvas",
                radius=40)
    b.text(f, "Logo", "Title/1", fontSize=40, lineHeight=46)
    b.text(f, "A location pin drops onto the start of a day arc: you arrive, and your working day fills up. "
              "Place and time — the two things Worktime connects — in one calm, warm mark.", "Title/3",
           "text/secondary", w=1200, fontStyle="Regular")
    row = b.frame(f, name="Hero", dir="h", gap=48, cross="center")
    icon(b, row, 380, "Default", name="App Icon · 1024 preview")
    con = b.frame(row, name="Construction", w=380, h=380, sw="fixed", sh="fixed", radius=48, fill="bg/elevated",
                  stroke="separator", clip=True)
    s = 3.8
    for k in range(1, 10):
        b.rect(con, 1, 380, "separator", x=k * 38, y=0)
        b.rect(con, 380, 1, "separator", x=0, y=k * 38)
    b.ellipse(con, 2 * RING_R * s, 2 * RING_R * s, None, x=(RING_C[0] - RING_R) * s, y=(RING_C[1] - RING_R) * s,
              stroke={"$var": "Color/info"}, strokeWeight=1, dashes=[4, 4], name="Ring guide")
    b.ellipse(con, 2 * PIN_R * s, 2 * PIN_R * s, None, x=(PIN_C[0] - PIN_R) * s, y=(PIN_C[1] - PIN_R) * s,
              stroke={"$var": "Color/info"}, strokeWeight=1, dashes=[4, 4], name="Pin guide")
    m = mark(b, con, 380, arc="#1E6B4F", hole="#FFFFFF")
    b.absolute(m, 0, 0)
    b.set(m, opacity=0.9)
    b.text(con, "ring r24 · stroke 10.5 · 300°  |  pin r11 · tip on arc start", "Caption", "text/secondary",
           x=16, y=352)
    words = b.frame(row, name="Lockups", dir="v", gap=36)
    lockup(b, words, 64)
    st = b.frame(words, name="Lockup · App", dir="h", gap=18, cross="center")
    icon(b, st, 72, "Default", name="App Icon · lockup")
    w2 = b.frame(st, name="Text", dir="v", gap=0)
    wordmark(b, w2, 40)
    b.text(w2, "Work time, without the effort.", "Callout", "text/secondary")
    dark_ = b.frame(words, name="Lockup · On dark", dir="h", pad=[26, 34, 26, 30], radius=28, fill="#0E100F")
    lockup(b, dark_, 44, color="#F3F2ED", arc="#5CC99B", hole="#0E100F")
    b.text(f, "iOS 26 icon appearances", "Title/2")
    ap = b.frame(f, name="Appearances", dir="h", gap=36, cross="max")
    for v, bg, label in [("Default", "#E9E6DE", "Default"), ("Dark", "#000000", "Dark"),
                         ("Clear", None, "Clear (Liquid Glass)"), ("Mono", "#6E7370", "Tinted"),
                         ("Green", "#E9E6DE", "Alternate icon")]:
        cell = b.frame(ap, name=v, dir="v", gap=12, cross="center")
        bgkw = {"fill": bg} if bg else {"fills": [{"type": "linearGradient", "stops": ["#7C9C8C", "#2A3F37"]}]}
        stage_ = b.frame(cell, name="Stage", w=240, h=240, radius=36, sw="fixed", sh="fixed", clip=True,
                         dir="h", main="center", cross="center", **bgkw)
        icon(b, stage_, 160, v)
        b.text(cell, label, "Subhead", "text/secondary")
    b.text(f, "Small sizes", "Title/2")
    sz = b.frame(f, name="Sizes", dir="h", gap=28, cross="max")
    for v in ("Default", "Dark"):
        for px in (180, 120, 87, 60, 40, 29, 20):
            cell = b.frame(sz, name=f"{v} {px}", dir="v", gap=10, cross="center")
            icon(b, cell, px, v)
            b.text(cell, f"{px}", "Caption", "text/tertiary")
    b.text(f, "Clear space = pin head diameter on every side. Keep the pin amber and upright; never add a clock "
              "hand or a track behind the arc.", "Footnote", "text/secondary")
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
            if isinstance(it, tuple) and len(it) == 3:
                rel, ww, hh = it
                sh = b.frame(r, name=os.path.basename(rel), w=ww, h=hh, radius=24 if ww < 200 else 26,
                             sw="fixed", sh="fixed", clip=True,
                             effects=[{"type": "dropShadow", "color": "#00000014", "offset": [0, 10], "radius": 30}])
                img(sh, rel, ww, hh, "Widget")
            elif isinstance(it, tuple):
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
    gallery("README · Watch", y0 + 5500, [("watch/Watch · Not working.png", 290), ("watch/Watch · Working.png", 290),
                                          ("watch/Watch · Break.png", 290), ("watch/Watch · Arrival notification.png", 290),
                                          ("watch/Watch · Complications.png", 290)],
            bg="#0B0C0B", title="Apple Watch")
    gallery("README · Widgets", y0 + 6400, [("widgets/gallery/Small · Working · Light.png", 170, 170),
                                            ("widgets/gallery/Small · Break · Light.png", 170, 170),
                                            ("widgets/gallery/Small · Clock in (interactive) · Light.png", 170, 170),
                                            ("widgets/gallery/Medium · Today (interactive) · Light.png", 364, 170),
                                            ("widgets/gallery/Large · Week · Light.png", 364, 382),
                                            ], title="Widgets")
    gallery("README · Onboarding", y0 + 4600, ["iphone/onboarding/Onboarding · Welcome.png",
                                               "iphone/onboarding/Onboarding · Location.png",
                                               "iphone/places/Arrival reminder.png",
                                               "iphone/places/Geofence radius.png",
                                               "iphone/places/Home-office schedule.png"], w=290,
            title="Reminders that ask, never assume")


def app_assets(b, x=2000, y=0):
    """Source frames for the app's icon files (exported to apps/mobile/assets/images by export.py)."""
    sp = ICONS["Default"]
    f = b.frame(None, name="Asset · icon", x=x, y=y, w=1024, h=1024, fills=[{"type": "linearGradient", "stops": sp["stops"]}])
    m = mark(b, f, 1024, arc=sp["arc"], pin=sp["pin"], hole=sp["hole"], shadow=True)
    b.absolute(m, 0, 0)
    fg = b.frame(None, name="Asset · android-icon-foreground", x=x + 1100, y=y, w=1024, h=1024)
    m = mark(b, fg, 640, arc=sp["arc"], pin=sp["pin"], hole="#F4F2EC")
    b.absolute(m, 192, 192)
    b.frame(None, name="Asset · android-icon-background", x=x + 2200, y=y, w=1024, h=1024, fill="#F4F2EC")
    mono = b.frame(None, name="Asset · android-icon-monochrome", x=x + 3300, y=y, w=1024, h=1024)
    m = mark(b, mono, 640, arc="#000000", pin="#000000", hole="#FFFFFF00")
    b.absolute(m, 192, 192)
    sp_ = b.frame(None, name="Asset · splash-icon", x=x + 4400, y=y, w=512, h=512)
    m = mark(b, sp_, 512, arc=sp["arc"], pin=sp["pin"], hole="#F4F2EC")
    b.absolute(m, 0, 0)


def build(b):
    b.page("Brand")
    logo_board(b)
    app_assets(b, 2000, 0)
    if os.path.isdir(os.path.join(EXPORTS, "iphone")):
        showcase(b)
