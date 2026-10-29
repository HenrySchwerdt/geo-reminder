"""Screen scaffolding and data-display helpers shared by every screen module."""
from lib import CARD_EFFECTS, GLASS_EFFECTS

W, H = 393, 852
GAP_X, GAP_Y = 120, 200
GLASS = dict(fill="glass/fill", stroke="glass/stroke", effects=GLASS_EFFECTS)


class Grid:
    """Lays out frames left-to-right in rows with a caption above each."""

    def __init__(self, b, x0=0, y0=0, cols=6, w=W, h=H):
        self.b, self.x0, self.y0, self.cols, self.w, self.h = b, x0, y0, cols, w, h
        self.i = 0

    def next(self, caption=None, w=None, h=None):
        w, h = w or self.w, h or self.h
        c, r = self.i % self.cols, self.i // self.cols
        self.i += 1
        x = self.x0 + c * (self.w + GAP_X)
        y = self.y0 + r * (self.h + GAP_Y)
        if caption:
            self.b.text(None, caption, "Headline", "text/secondary", x=x, y=y - 40)
        return x, y

    def row_break(self):
        if self.i % self.cols:
            self.i += self.cols - self.i % self.cols


def heading(b, s, x, y, sub=None):
    b.text(None, s, "Display/Large", x=x, y=y)
    if sub:
        b.text(None, sub, "Callout", "text/secondary", x=x, y=y + 50, w=1600)


def phone(b, name, x, y, tab=None, pad_top=62, pad_bottom=130, gap=16, bg="bg/canvas", status=True,
          home=True):
    """An iPhone 16 frame (393x852) with status bar, optional floating tab bar and home indicator.
    Returns (root, content) where content is a vertical auto layout column."""
    root = b.frame(None, name=name, x=x, y=y, w=W, h=H, fill=bg, clip=True)
    content = b.frame(root, name="Content", x=0, y=0, w=W, dir="v", gap=gap,
                      pad=[pad_top, 16, pad_bottom, 16], sw="fixed", sh="hug")
    if tab:
        b.inst("tabbar", root, props={"Tab": tab}, x=16, y=H - 34 - 64 - 2)
    if status:
        b.inst("status", root, x=0, y=0)
    if home:
        b.inst("home", root, x=0, y=H - 34)
    return root, content


def nav_title(b, parent, title, sub=None, actions=(), back=None):
    """iOS 26 large-title header with floating glass buttons on the right."""
    top = b.frame(parent, name="Navigation", dir="h", sw="fill", main="spaceBetween", cross="center", h=44,
                  sh="fixed")
    left = b.frame(top, name="Leading", dir="h", gap=8, cross="center")
    if back:
        glass_btn(b, left, "caret-left")
    right = b.frame(top, name="Trailing", dir="h", gap=10, cross="center")
    for a in actions:
        glass_btn(b, right, a)
    if title:
        t = b.frame(parent, name="Title", dir="v", gap=2, sw="fill")
        b.text(t, title, "Display/Large")
        if sub:
            b.text(t, sub, "Callout", "text/secondary")
    return top


def inline_nav(b, parent, title, left="caret-left", right=None, right_label=None):
    """Compact navigation bar: glass back button, centred title, trailing action."""
    top = b.frame(parent, name="Navigation", dir="h", sw="fill", main="spaceBetween", cross="center", h=44,
                  sh="fixed")
    if left:
        glass_btn(b, top, left)
    else:
        b.frame(top, name="Spacer", w=44, h=44, sw="fixed", sh="fixed")
    b.text(top, title, "Headline")
    if right_label:
        pill = b.frame(top, name="Done", dir="h", pad=[0, 16, 0, 16], h=44, sh="fixed", radius=22,
                       cross="center", fill="glass/tint", stroke="glass/stroke", effects=GLASS_EFFECTS)
        b.text(pill, right_label, "Headline", "on-accent")
    elif right:
        glass_btn(b, top, right)
    else:
        b.frame(top, name="Spacer", w=44, h=44, sw="fixed", sh="fixed")
    return top


def glass_btn(b, parent, icon, color="text/primary", weight="regular"):
    i = b.inst("iconbtn", parent)
    b.swap_icon(i, icon, weight, color=None if color == "text/primary" else color)
    return i


def card(b, parent, name="Card", gap=12, pad=20, fill="bg/elevated", dir="v", **kw):
    return b.frame(parent, name=name, dir=dir, gap=gap, pad=pad, radius=26, sw="fill", fill=fill,
                   effects=CARD_EFFECTS if fill == "bg/elevated" else None, **kw)


def group(b, parent, name="Group"):
    """Inset grouped list container (rows separated by hairlines)."""
    return b.frame(parent, name=name, dir="v", gap=0, radius=26, sw="fill", fill="bg/elevated", clip=True,
                   effects=CARD_EFFECTS)


def sep(b, parent, inset=60):
    s = b.frame(parent, name="Separator", dir="h", pad=[0, 0, 0, inset], h=0.5, sw="fill", sh="fixed")
    b.rect(s, 10, 0.5, "separator")
    b.set(b.first(s, type="RECTANGLE"), sizingH="fill")


def row(b, parent, title, value="", icon=None, tint="accent", tile="accent/soft", chevron=True,
        last=False, toggle=None, value_color=None):
    props = {"Title": title, "Value": value, "Show tile": bool(icon), "Show chevron": chevron and toggle is None}
    r = b.inst("row", parent, props=props, sizingH="fill")
    if icon:
        b.swap_icon(r, icon, color=tint)
        if tile != "accent/soft":
            b.set(b.first(r, name="Tile", type="FRAME"), fill={"$var": "Color/" + tile})
    if value_color:
        b.set(b.first(r, name="Value", type="TEXT"), fill={"$var": "Color/" + value_color})
    if toggle is not None:
        # The toggle sits where the chevron was; rows are instances, so it is placed beside them.
        b.set(b.first(r, name="Value", type="TEXT"), visible=False)
    if not last:
        sep(b, parent, 60 if icon else 16)
    return r


def toggle_row(b, parent, title, on=True, icon=None, sub=None, last=False, tint="accent", tile="accent/soft"):
    """Row with a switch, built from primitives so it can carry a subtitle."""
    r = b.frame(parent, name=f"Toggle · {title}", dir="h", gap=12, pad=[12, 16, 12, 16], sw="fill",
                cross="center", fill="bg/elevated", minHeight=56)
    if icon:
        t = b.frame(r, name="Tile", w=32, h=32, radius=9, dir="h", main="center", cross="center",
                    sw="fixed", sh="fixed", fill=tile)
        b.icon(t, icon, 18, color=tint)
    txt = b.frame(r, name="Text", dir="v", gap=2, sw="fill")
    b.text(txt, title, "Body", sw="fill")
    if sub:
        b.text(txt, sub, "Footnote", "text/secondary", sw="fill")
    b.inst("toggle", r, props={"On": "true" if on else "false"})
    if not last:
        sep(b, parent, 60 if icon else 16)
    return r


def section(b, parent, label):
    return b.inst("section", parent, props={"Label": label}, sizingH="fill")


def button(b, parent, label, style="Primary", icon=None, weight="fill", fill=True):
    i = b.inst("button", parent, props={"Style": style, "Label": label, "Show icon": bool(icon)})
    if fill:
        b.set(i, sizingH="fill")
    if icon:
        color = {"Primary": "on-accent", "Break": "break", "Destructive": "danger", "Ink": "bg/canvas"}.get(
            style, "text/primary")
        b.swap_icon(i, icon, weight, color=color)
    return i


def pill(b, parent, state, label=None):
    from ds import PILLS
    props = {"State": state, "Label": label or PILLS[state][2]}
    return b.inst("pill", parent, props=props)


def chip(b, parent, label, selected=False):
    return b.inst("chip", parent, props={"Selected": "true" if selected else "false", "Label": label})


# ---------------------------------------------------------------------------
# Data display
# ---------------------------------------------------------------------------

def hm(t):
    h, m = t.split(":")
    return int(h) + int(m) / 60


def ribbon(b, parent, w, segs, now=None, planned=None, start=6, end=20, labels=True, h=12, name="Day Ribbon",
           ticks=(6, 9, 12, 15, 18), marker_label=None):
    """The signature 'day ribbon': a horizontal timeline of work (green) and breaks (amber)."""
    total_h = h + (22 if labels else 0) + (18 if marker_label else 0)
    top = 18 if marker_label else 0
    f = b.frame(parent, name=name, w=w, h=total_h, sw="fixed", sh="fixed")
    span = end - start
    X = lambda t: (hm(t) - start) / span * w
    b.rect(f, w, h, "bg/track", radius=h / 2, x=0, y=top, name="Track")
    if planned and now:
        b.rect(f, X(planned) - X(now), h, "accent/soft", radius=h / 2, x=X(now), y=top, name="Planned")
    for a, z, kind in segs:
        color = {"work": "accent", "break": "break", "missing": "danger", "home": "info"}[kind]
        b.rect(f, max(X(z) - X(a), 3), h, color, radius=h / 2, x=X(a), y=top, name=f"{kind} {a}–{z}")
    if now:
        b.rect(f, 2, h + 8, "text/primary", radius=1, x=X(now) - 1, y=top - 4, name="Now")
    if marker_label and planned:
        b.text(f, marker_label, "Caption", "text/secondary", x=max(0, min(X(planned) - 45, w - 110)), y=0)
        b.rect(f, 2, h, "accent", radius=1, x=X(planned) - 1, y=top, name="Expected end", opacity=0.6)
    if labels:
        for t in ticks:
            x = (t - start) / span * w
            b.text(f, f"{t:02d}", "Caption", "text/tertiary", x=max(0, min(x - 7, w - 16)), y=top + h + 6,
                   features={"tnum": True})
    return f


def bars(b, parent, w, h, data, target=None, maxv=None, name="Bar Chart", labels=True, bar_w=None,
         radius=8, value_labels=False):
    """Vertical bars; data = [(label, value, kind)] where kind is work|today|missing|off|break|home."""
    maxv = maxv or max([v for _, v, _ in data] + [target or 0]) * 1.1
    lab_h = 22 if labels else 0
    f = b.frame(parent, name=name, w=w, h=h + lab_h, sw="fixed", sh="fixed")
    n = len(data)
    slot = w / n
    bw = bar_w or min(28, slot * 0.56)
    for k, (lab, v, kind) in enumerate(data):
        x = k * slot + (slot - bw) / 2
        b.rect(f, bw, h, "bg/sunken", radius=radius, x=x, y=0, name=f"{lab} track")
        if v > 0:
            bh = max(v / maxv * h, 6)
            color = {"work": "accent", "today": "accent", "missing": "danger", "off": "bg/track",
                     "break": "break", "home": "info", "over": "accent"}[kind]
            b.rect(f, bw, bh, color, radius=radius, x=x, y=h - bh, name=f"{lab} {v}h",
                   opacity=0.55 if kind == "today" else 1)
        if labels:
            b.text(f, lab, "Caption", "text/primary" if kind == "today" else "text/tertiary",
                   x=x + bw / 2 - 6 if len(lab) == 1 else x + bw / 2 - 9, y=h + 6)
    if target:
        y = h - target / maxv * h
        b.vector(f, f"M0 0 L{w} 0", stroke="text/secondary", sw=1, x=0, y=y, name="Target",
                 dashes=[3, 4])
    return f


def stat(b, parent, label, value, sub=None, color="text/primary", sw="fill"):
    s = b.frame(parent, name=label, dir="v", gap=2, sw=sw)
    b.text(s, label, "Footnote", "text/secondary")
    b.text(s, value, "Numeric/Medium", color)
    if sub:
        b.text(s, sub, "Caption", "text/tertiary")
    return s


def ring(b, parent, size, frac, color="accent", track="bg/track", width=None, name="Ring", children=None):
    """A progress ring drawn with an arc vector (frac 0..1)."""
    import math
    width = width or size * 0.12
    f = b.frame(parent, name=name, w=size, h=size, sw="fixed", sh="fixed")
    r = (size - width) / 2
    c = size / 2
    b.ellipse(f, 2 * r, 2 * r, None, x=c - r, y=c - r, stroke={"$var": "Color/" + track} if not track.startswith("#") else track,
              strokeWeight=width, name="Track")
    if frac > 0:
        a = -math.pi / 2 + 2 * math.pi * min(frac, 0.999)
        x1, y1 = c + r * math.cos(a), c + r * math.sin(a)
        large = 1 if frac > 0.5 else 0
        d = f"M{c:.2f} {c - r:.2f} A{r:.2f} {r:.2f} 0 {large} 1 {x1:.2f} {y1:.2f}"
        b.vector(f, d, stroke=color, sw=width, name="Progress")
    return f


def map_tile(b, parent, w, h, radius=20, fence=70, name="Map", pin=True, label=None, cx=None, cy=None,
             fence_color="accent"):
    """Stylised, privacy-friendly map: land, water, parks, roads and a geofence circle."""
    f = b.frame(parent, name=name, w=w, h=h, radius=radius, clip=True, fill="map/land", sw="fixed", sh="fixed")
    b.rect(f, w * 0.55, h * 0.35, "map/park", radius=18, x=-20, y=h * 0.62, name="Park")
    b.vector(f, f"M{w*0.62} -10 C {w*0.7} {h*0.3} {w*0.55} {h*0.55} {w*0.8} {h+10}", stroke="map/water",
             sw=26, name="River")
    for k, (x1, y1, x2, y2, sw_) in enumerate([(-10, h * 0.3, w + 10, h * 0.42, 9), (-10, h * 0.78, w + 10, h * 0.7, 7),
                                              (w * 0.28, -10, w * 0.36, h + 10, 9), (w * 0.86, -10, w * 0.9, h + 10, 6),
                                              (-10, h * 0.08, w + 10, h * 0.16, 5)]):
        b.vector(f, f"M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}", stroke="map/road", sw=sw_, name=f"Road {k}")
    cx = w * 0.45 if cx is None else cx
    cy = h * 0.5 if cy is None else cy
    if fence:
        b.ellipse(f, fence * 2, fence * 2, fence_color, x=cx - fence, y=cy - fence, name="Geofence",
                  opacity=0.16)
        b.ellipse(f, fence * 2, fence * 2, None, x=cx - fence, y=cy - fence, name="Geofence edge",
                  stroke={"$var": "Color/" + fence_color}, strokeWeight=1.5, dashes=[4, 4])
    if pin:
        p = b.frame(f, name="Pin", w=30, h=30, radius=15, x=cx - 15, y=cy - 15, sw="fixed", sh="fixed",
                    dir="h", main="center", cross="center", fill=fence_color, stroke="#FFFFFF", sweight=2.5,
                    effects=[{"type": "dropShadow", "color": "#00000033", "offset": [0, 3], "radius": 8}])
        b.icon(p, "buildings", 16, color="on-accent", weight="fill")
    if label:
        lab = b.frame(f, name="Label", dir="h", pad=[6, 10, 6, 10], radius=12, x=12, y=12, **GLASS)
        b.text(lab, label, "Footnote/Strong")
    return f


def scrim(b, root):
    r = b.rect(root, W, H, "scrim", x=0, y=0, name="Scrim")
    return r


def sheet(b, root, height, name="Sheet", gap=16):
    """iOS 26 floating sheet: inset from the edges, concentric with the display corners."""
    s = b.frame(root, name=name, x=8, y=H - height - 8, w=W - 16, h=height, dir="v", gap=gap,
                pad=[10, 20, 24, 20], radius=40, sw="fixed", sh="fixed", fill="bg/elevated", stroke="glass/stroke",
                effects=GLASS_EFFECTS, cross="center")
    b.rect(s, 36, 5, "bg/track", radius=3, name="Grabber")
    return s


def time_field(b, parent, label, value, sub=None, highlight=False, icon=None):
    r = b.frame(parent, name=f"Field · {label}", dir="h", gap=12, pad=[12, 16, 12, 16], sw="fill",
                cross="center", fill="bg/elevated", minHeight=56)
    if icon:
        b.icon(r, icon, 20, color="text/secondary")
    txt = b.frame(r, name="Label", dir="v", gap=2, sw="fill")
    b.text(txt, label, "Body", sw="fill")
    if sub:
        b.text(txt, sub, "Footnote", "text/secondary", sw="fill")
    v = b.frame(r, name="Value", dir="h", pad=[6, 12, 6, 12], radius=10, fill="accent/soft" if highlight else "bg/sunken")
    b.text(v, value, "Numeric/Small", "accent" if highlight else "text/primary")
    return r


def banner(b, parent, title, message, tone="danger", icon="warning-circle", action=None):
    soft = {"danger": "danger/soft", "break": "break/soft", "info": "info/soft", "accent": "accent/soft"}[tone]
    f = b.frame(parent, name=f"Banner · {title}", dir="h", gap=12, pad=16, radius=22, sw="fill", fill=soft,
                cross="min")
    b.icon(f, icon, 22, color=tone, weight="fill")
    t = b.frame(f, name="Text", dir="v", gap=4, sw="fill")
    b.text(t, title, "Subhead/Strong", tone, sw="fill")
    b.text(t, message, "Footnote", "text/primary", sw="fill")
    if action:
        b.text(t, action, "Footnote/Strong", tone)
    return f


def wallpaper(b, root, w=W, h=H):
    """Calm abstract lock-screen wallpaper (no photography)."""
    b.rect(root, w, h, "#2F4A3F", x=0, y=0, name="Wallpaper",
           fills=[{"type": "linearGradient", "stops": ["#58786A", "#2A3F37", "#16211D"]}])
    b.ellipse(root, w * 1.2, w * 1.2, "#C9A46A", x=-w * 0.4, y=h * 0.45, opacity=0.25, name="Glow",
              effects=[{"type": "layerBlur", "radius": 90}])
