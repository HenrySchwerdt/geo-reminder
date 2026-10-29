"""Scale SVG path data (absolute or relative) by a factor, keeping arc flags/rotation intact."""
import re

_TOKEN = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
_ARGS = {"M": 2, "L": 2, "T": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "A": 7, "Z": 0}


def _fmt(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def scale_path(d, s, dx=0.0, dy=0.0):
    toks = _TOKEN.findall(d)
    out, i, cmd = [], 0, None
    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            out.append(t)
            i += 1
            if cmd in "Zz":
                continue
        n = _ARGS[cmd.upper()]
        args = [float(x) for x in toks[i:i + n]]
        i += n
        rel = cmd.islower()
        up = cmd.upper()
        if up == "A":
            rx, ry, rot, laf, sf, x, y = args
            vals = [rx * s, ry * s, rot, laf, sf,
                    x * s + (0 if rel else dx), y * s + (0 if rel else dy)]
            out.append(" ".join(_fmt(v) if k not in (3, 4) else str(int(v)) for k, v in enumerate(vals)))
        elif up == "H":
            out.append(_fmt(args[0] * s + (0 if rel else dx)))
        elif up == "V":
            out.append(_fmt(args[0] * s + (0 if rel else dy)))
        else:
            vals = []
            for k, v in enumerate(args):
                off = 0 if rel else (dx if k % 2 == 0 else dy)
                vals.append(_fmt(v * s + off))
            out.append(" ".join(vals))
        # implicit repeat: M becomes L
        if cmd in "Mm":
            cmd = "L" if cmd == "M" else "l"
    return " ".join(out)
