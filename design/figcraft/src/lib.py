"""Tiny builder that turns Python calls into a FigCraft command script.

Every helper appends one or more FigCraft commands to ``B.steps`` and returns a
``{"$ref": name}`` reference that later steps can use as a parent or target.
The whole script is executed by ``figcraft-cli run`` as one undo step.
"""
import json
import os
import re

from svgpath import scale_path

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Design tokens
# ---------------------------------------------------------------------------

# name: (light, dark)
COLORS = {
    "bg/canvas": ("#F4F2EC", "#0B0C0B"),
    "bg/elevated": ("#FFFFFF", "#181A18"),
    "bg/sunken": ("#ECE9E2", "#222522"),
    "bg/track": ("#E4E1D9", "#2C302C"),
    "text/primary": ("#151715", "#F3F2ED"),
    "text/secondary": ("#5D615C", "#A7ABA5"),
    "text/tertiary": ("#8A8E88", "#73776F"),
    "separator": ("#E3DFD6", "#2A2D2A"),
    "accent": ("#1E6B4F", "#5CC99B"),
    "accent/soft": ("#DDEBE3", "#16362A"),
    "on-accent": ("#FFFFFF", "#06140E"),
    "break": ("#B06F14", "#F2B04E"),
    "break/soft": ("#F6E8D2", "#3A2B13"),
    "danger": ("#BE3A2C", "#FF6B5D"),
    "danger/soft": ("#F7E0DC", "#3C1B17"),
    "info": ("#3559A6", "#8CAAF2"),
    "info/soft": ("#E1E8F6", "#1B2640"),
    "glass/fill": ("#FFFFFF66", "#26292680"),
    "glass/stroke": ("#FFFFFFD9", "#FFFFFF2E"),
    "glass/tint": ("#1E6B4FE0", "#5CC99BD9"),
    "scrim": ("#15171566", "#00000099"),
    "map/land": ("#E9EDE4", "#1A1E1B"),
    "map/road": ("#FFFFFF", "#2C312D"),
    "map/water": ("#CFE0E6", "#16262C"),
    "map/park": ("#D7E8D3", "#18291C"),
}

# name: (family, style, size, line height, letter spacing, extra)
TYPE = {
    "Display/Timer": ("Inter Display", "Semi Bold", 64, 68, "-2%", {"features": {"tnum": True}}),
    "Display/Large": ("Inter Display", "Bold", 34, 41, "-1%", {}),
    "Title/1": ("Inter Display", "Bold", 28, 34, "-0.5%", {}),
    "Title/2": ("Inter Display", "Semi Bold", 22, 28, "-0.5%", {}),
    "Title/3": ("Inter", "Semi Bold", 20, 25, "-0.5%", {}),
    "Headline": ("Inter", "Semi Bold", 17, 22, "-0.5%", {}),
    "Body": ("Inter", "Regular", 17, 22, "-0.5%", {}),
    "Callout": ("Inter", "Regular", 16, 21, "-0.5%", {}),
    "Subhead": ("Inter", "Regular", 15, 20, "-0.3%", {}),
    "Subhead/Strong": ("Inter", "Semi Bold", 15, 20, "-0.3%", {}),
    "Footnote": ("Inter", "Regular", 13, 18, "0%", {}),
    "Footnote/Strong": ("Inter", "Semi Bold", 13, 18, "0%", {}),
    "Caption": ("Inter", "Medium", 12, 16, "0%", {}),
    "Caption/Upper": ("Inter", "Semi Bold", 12, 16, "4%", {"textCase": "upper"}),
    "Numeric/Large": ("Inter Display", "Semi Bold", 28, 32, "-1%", {"features": {"tnum": True}}),
    "Numeric/Medium": ("Inter", "Semi Bold", 20, 24, "-0.5%", {"features": {"tnum": True}}),
    "Numeric/Small": ("Inter", "Medium", 15, 20, "0%", {"features": {"tnum": True}}),
}

SPACE = {"xxs": 2, "xs": 4, "s": 8, "m": 12, "l": 16, "xl": 20, "xxl": 24, "3xl": 32, "4xl": 40}
RADIUS = {"xs": 6, "s": 10, "m": 14, "l": 20, "card": 26, "sheet": 38, "capsule": 999}

GLASS_EFFECTS = [
    {"type": "glass", "refraction": 0.55, "depth": 14, "frost": 8, "dispersion": 0.25, "lightIntensity": 0.7},
    {"type": "dropShadow", "color": "#00000014", "offset": [0, 8], "radius": 24},
]
CARD_EFFECTS = [
    {"type": "dropShadow", "color": "#0000000A", "offset": [0, 1], "radius": 2},
    {"type": "dropShadow", "color": "#0000000D", "offset": [0, 8], "radius": 24},
]

# SF Symbols to use in the real app for each icon drawn here (documented in design-system.md).
SF = {
    "house": "house", "calendar-blank": "calendar", "chart-bar": "chart.bar", "gear-six": "gearshape",
    "play": "play.fill", "pause": "pause.fill", "stop": "stop.fill", "coffee": "cup.and.saucer",
    "map-pin": "mappin", "buildings": "building.2", "house-line": "house.lodge", "clock": "clock",
    "clock-counter-clockwise": "clock.arrow.circlepath", "plus": "plus", "pencil-simple": "pencil",
    "trash": "trash", "check": "checkmark", "check-circle": "checkmark.circle", "x": "xmark",
    "caret-right": "chevron.right", "caret-left": "chevron.left", "caret-down": "chevron.down",
    "bell": "bell", "bell-ringing": "bell.badge", "navigation-arrow": "location", "warning": "exclamationmark.triangle",
    "warning-circle": "exclamationmark.circle", "info": "info.circle", "arrow-right": "arrow.right",
    "sign-in": "arrow.right.to.line", "sign-out": "rectangle.portrait.and.arrow.right", "timer": "timer",
    "hourglass": "hourglass", "calendar-plus": "calendar.badge.plus", "calendar-check": "calendar.badge.checkmark",
    "sliders-horizontal": "slider.horizontal.3", "moon": "moon", "sun": "sun.max", "export": "square.and.arrow.up",
    "lock-simple": "lock", "shield-check": "checkmark.shield", "map-trifold": "map", "crosshair": "scope",
    "magnifying-glass": "magnifyingglass", "briefcase": "briefcase", "laptop": "laptopcomputer",
    "sparkle": "sparkle", "arrows-clockwise": "arrow.triangle.2.circlepath", "arrow-counter-clockwise": "arrow.uturn.backward",
    "cloud-slash": "icloud.slash", "database": "externaldrive", "download-simple": "arrow.down.to.line",
    "paint-brush": "paintbrush", "watch": "applewatch", "device-mobile": "iphone", "circle-notch": "progress.indicator",
    "dots-three": "ellipsis", "list-bullets": "list.bullet", "question": "questionmark.circle",
    "battery-full": "battery.100", "wifi-high": "wifi", "cell-signal-full": "cellularbars", "flag": "flag",
    "target": "target", "airplane": "airplane", "first-aid": "cross.case", "gps-slash": "location.slash",
    "map-pin-area": "mappin.and.ellipse", "user": "person", "arrows-merge": "arrow.triangle.merge",
    "copy": "doc.on.doc", "calendar-x": "calendar.badge.exclamationmark", "chart-line-up": "chart.line.uptrend.xyaxis",
    "trend-up": "arrow.up.right", "arrow-up-right": "arrow.up.right", "hand-waving": "hand.wave", "key": "key",
}


def icon_path(name, weight="regular", size=24):
    with open(os.path.join(HERE, "icons", weight, name + ".svg")) as f:
        d = " ".join(re.findall(r' d="([^"]+)"', f.read()))
    return scale_path(d, size / 256)


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------


def col(c):
    """A literal hex colour or a token name bound as a variable."""
    if c is None:
        return "none"
    if c.startswith("#"):
        return c
    return {"$var": "Color/" + c}


class Builder:
    def __init__(self):
        self.steps = []
        self.n = 0
        self.comp = {}    # component key -> ref
        self.tstyle = {}  # text style name -> ref
        self.estyle = {}  # effect style name -> ref
        self.icons = {}   # (name, weight) -> component ref

    # -- plumbing ----------------------------------------------------------
    def ref(self, prefix="n"):
        self.n += 1
        return f"{prefix}{self.n}"

    def add(self, command, params, name=None):
        step = {"command": command, "params": params}
        if name is None:
            name = self.ref()
        step["as"] = name
        self.steps.append(step)
        return {"$ref": name}

    def first(self, root, **flt):
        """A reference to the first layer under ``root`` matching node.find filters."""
        r = self.add("node.find", dict(root=root, limit=1, **flt))
        return {"$ref": r["$ref"], "field": "ids/0"}

    def set(self, ids, **props):
        if not isinstance(ids, list):
            ids = [ids]
        return self.add("node.set", {"ids": ids, "props": props})

    def save(self, path):
        with open(path, "w") as f:
            json.dump(self.steps, f, indent=0)

    # -- pages -------------------------------------------------------------
    def page(self, name, first=False):
        if first:
            self.add("page.rename", {"name": name})
            return None
        p = self.add("page.add", {"name": name})
        self.add("page.select", {"id": p})
        return p

    # -- primitives ----------------------------------------------------------
    def frame(self, parent=None, name=None, dir=None, gap=None, pad=None, fill=None, radius=None,
              w=None, h=None, sw=None, sh=None, main=None, cross=None, x=None, y=None,
              stroke=None, sweight=1, effects=None, clip=None, wrap=None, **extra):
        props = {"fill": col(fill)}
        if dir:
            props["layout"] = {"v": "vertical", "h": "horizontal"}[dir]
            props["gap"] = gap or 0
            if pad is not None:
                props["padding"] = pad
            if main:
                props["mainAlign"] = main
            if cross:
                props["crossAlign"] = cross
            if wrap:
                props["wrap"] = True
                props["crossGap"] = gap or 0
        if radius is not None:
            props["cornerRadius"] = radius
            props["cornerSmoothing"] = 0.6
        if stroke:
            props["stroke"] = col(stroke) if isinstance(stroke, str) else stroke
            props["strokeWeight"] = sweight
            props["strokeAlign"] = "inside"
        if effects:
            props["effects"] = effects
        if clip is not None:
            props["clip"] = clip
        props.update(extra)
        params = {"type": "frame", "props": props}
        if parent is not None:
            params["parent"] = parent
        if name:
            params["name"] = name
        if w is not None:
            params["width"] = w
        if h is not None:
            params["height"] = h
        if x is not None:
            params["x"] = x
        if y is not None:
            params["y"] = y
        r = self.add("node.create", params)
        siz = {}
        if sw:
            siz["sizingH"] = sw
        if sh:
            siz["sizingV"] = sh
        if dir and sh is None and h is None:
            siz["sizingV"] = "hug"
        if dir and sw is None and w is None:
            siz["sizingH"] = "hug"
        if siz:
            self.set(r, **siz)
        return r

    def text(self, parent, s, style="Body", color="text/primary", sw=None, align=None, name=None,
             x=None, y=None, w=None, **extra):
        props = {"fill": col(color), "textStyle": self.tstyle[style]}
        if align:
            props["textAlign"] = align
        props.update(extra)
        params = {"type": "text", "parent": parent, "text": s, "props": props}
        if name:
            params["name"] = name
        if x is not None:
            params["x"] = x
        if y is not None:
            params["y"] = y
        r = self.add("node.create", params)
        if sw == "fill":
            self.set(r, sizingH="fill", textAutoResize="height")
        elif w is not None:
            self.set(r, width=w, textAutoResize="height")
        return r

    def rect(self, parent, w, h, fill, radius=0, x=None, y=None, name=None, **extra):
        props = {"fill": col(fill), "cornerRadius": radius}
        props.update(extra)
        params = {"type": "rectangle", "parent": parent, "width": w, "height": h, "props": props}
        if x is not None:
            params["x"] = x
        if y is not None:
            params["y"] = y
        if name:
            params["name"] = name
        return self.add("node.create", params)

    def ellipse(self, parent, w, h, fill, x=None, y=None, name=None, **extra):
        props = {"fill": col(fill)}
        props.update(extra)
        params = {"type": "ellipse", "parent": parent, "width": w, "height": h, "props": props}
        if x is not None:
            params["x"] = x
        if y is not None:
            params["y"] = y
        if name:
            params["name"] = name
        return self.add("node.create", params)

    def vector(self, parent, d, fill=None, stroke=None, sw=2, x=0, y=0, name=None, **extra):
        props = {"fill": col(fill)}
        if stroke:
            props["stroke"] = col(stroke)
            props["strokeWeight"] = sw
            props["strokeCap"] = "round"
            props["strokeJoin"] = "round"
        props.update(extra)
        params = {"type": "vector", "parent": parent, "path": d, "x": x, "y": y, "props": props}
        if name:
            params["name"] = name
        return self.add("node.create", params)

    def absolute(self, r, x, y):
        self.set(r, absolute=True)
        self.set(r, x=x, y=y)
        return r

    # -- icons -------------------------------------------------------------
    def define_icon(self, name, weight, parent, x, y):
        key = (name, weight)
        f = self.frame(parent, name=f"Icon/{name}" + ("" if weight == "regular" else f"/{weight}"),
                       w=24, h=24, x=x, y=y)
        v = self.vector(f, icon_path(name, weight), fill="text/primary", name="Glyph")
        self.set(v, constraints={"horizontal": "scale", "vertical": "scale"})
        c = self.add("component.create", {"ids": [f]})
        self.icons[key] = c
        return c

    def icon(self, parent, name, size=24, color="text/primary", weight="regular"):
        c = self.icons[(name, weight)]
        i = self.add("instance.create", {"component": c, "parent": parent})
        if size != 24:
            self.set(i, width=size, height=size)
        if color != "text/primary":
            self.set(self.first(i, type="VECTOR"), fill=col(color))
        return i

    # -- components ----------------------------------------------------------
    def inst(self, key, parent=None, props=None, x=None, y=None, **nodeprops):
        params = {"component": self.comp[key]}
        if parent is not None:
            params["parent"] = parent
        if x is not None:
            params["x"] = x
        if y is not None:
            params["y"] = y
        i = self.add("instance.create", params)
        if props:
            self.add("instance.setProperties", {"ids": [i], "properties": props})
        if nodeprops:
            self.set(i, **nodeprops)
        return i

    def swap_icon(self, inst, name, weight="regular", color=None, layer="Icon"):
        target = self.first(inst, name=layer, type="INSTANCE")
        self.add("instance.swap", {"ids": [target], "component": self.icons[(name, weight)]})
        if color:
            self.set(self.first(inst, name="Glyph", type="VECTOR"), fill=col(color))
