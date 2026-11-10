"""Regenerates the Court Trips logo set as outlined SVGs.
Usage: python make_logo.py <Schibsted Grotesk variable .woff2/.ttf> <output dir>
Needs: fonttools, brotli (for .woff2)."""
import sys, math
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

font_path, out = sys.argv[1], sys.argv[2]
f = instancer.instantiateVariableFont(TTFont(font_path), {"wght": 900})
gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
UPM = f["head"].unitsPerEm
K = 200 / UPM                       # 1em = 200 svg units
TRACK = -0.015 * UPM
WORD_GAP = 0.02 * UPM               # extra air between the two t's
INK, BLUE, BALL, GREEN, WHITE = "#16233a", "#2d5d8c", "#dcf343", "#3a6e52", "#ffffff"
num = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
# unit paper plane, nose at (1,0): upper wing and lower fold
WING = [(1.0, 0.0), (-1.0, 0.62), (-0.42, 0.02)]
FOLD = [(1.0, 0.0), (-0.36, -0.10), (-0.60, -0.62)]

def bounds(name):
    p = BoundsPen(gs); gs[name].draw(p); return p.bounds

def layout(text, split=None):
    x, items = 0, []
    for n, ch in enumerate(text):
        g = cmap[ord(ch)]
        if n == split: x += WORD_GAP
        items.append((ch, g, x)); x += hmtx[g][0] + TRACK
    return items, x - TRACK

def bezier(p0, c, p1):
    def pt(t):
        u = 1 - t
        return (u*u*p0[0] + 2*u*t*c[0] + t*t*p1[0], u*u*p0[1] + 2*u*t*c[1] + t*t*p1[1])
    return pt

def plane_path(cx, cy, half, ang, flip_y=False):
    """Plane polygons around (cx, cy) in the caller's coordinates. flip_y for y-down space."""
    c, s = math.cos(ang), math.sin(ang)
    sg = -1 if flip_y else 1
    def poly(pts):
        return "M" + "L".join(f"{num(cx + half*(px*c - py*s))} {num(cy + sg*half*(px*s + py*c))}" for px, py in pts) + "Z"
    return poly(WING) + poly(FOLD)

items, width = layout("court" + "trıps", split=5)
ib, db = bounds(cmap[ord("i")]), bounds(cmap[0x131])
i_x = next(x for ch, g, x in items if ch == "ı")
dot_h = ib[3] - db[3]
ball_r = dot_h * 0.46
ball_cx = i_x + (db[0] + db[2]) / 2
ball_cy = db[3] + dot_h * 0.76
asc = max(bounds(cmap[ord("t")])[3], ib[3])
desc = bounds(cmap[ord("p")])[1]

# Route: sets off above "court", plane mid-flight, lands on the ball (the destination: play).
o_x = items[1][2]; ob = bounds(items[1][1])
p0 = (o_x + (ob[0] + ob[2]) / 2, ob[3] + 0.20 * UPM)
p1 = (ball_cx, ball_cy)
peak = asc + 0.40 * UPM
route = bezier(p0, ((p0[0] + p1[0]) / 2, 2 * peak - 0.5 * (p0[1] + p1[1])), p1)
T_PLANE = 0.60
PLANE = 0.21 * UPM                  # half-length
trail = [(*route(t), UPM * 0.031) for t in [n / 10 for n in range(10)] if abs(t - T_PLANE) > 0.08]
ex, ey = route(T_PLANE); ax, ay = route(T_PLANE - 0.02); bx, by = route(T_PLANE + 0.02)
plane_ang = math.atan2(by - ay, bx - ax) + math.radians(8)

PAD = 0.12 * UPM
top = peak + PLANE * 0.75 + PAD
W, H = (width + 2 * PAD) * K, (top - desc + PAD) * K
X = lambda x: (x + PAD) * K
Y = lambda y: (top - y) * K

def glyph_path(g, x, k=K, ox=PAD * K, oy=None):
    oy = top * K if oy is None else oy
    pen = SVGPathPen(gs, ntos=num)
    gs[g].draw(TransformPen(pen, (k, 0, 0, -k, ox + x * k, oy)))
    return pen.getCommands()

def wordmark(c_court, c_trips, c_flight, bg=None, flight=True):
    court = "".join(glyph_path(g, x) for ch, g, x in items[:5])
    trips = "".join(glyph_path(g, x) for ch, g, x in items[5:])
    cut = 0 if flight else (top - PAD - (ball_cy + ball_r)) * K
    extra = ""
    if flight:
        dots = "".join(f'<circle cx="{num(X(x))}" cy="{num(Y(y))}" r="{num(r*K)}"/>' for x, y, r in trail)
        extra = (f'<g fill="{c_flight}">{dots}</g>'
                 f'<path fill="{c_flight}" d="{plane_path(X(ex), Y(ey), PLANE*K, plane_ang, flip_y=True)}"/>')
    back = f'<rect y="{num(cut)}" width="100%" height="100%" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {num(cut)} {num(W)} {num(H - cut)}" role="img" aria-label="Court Trips">'
            f'<title>Court Trips</title>{back}'
            f'<path fill="{c_court}" d="{court}"/><path fill="{c_trips}" d="{trips}"/>{extra}'
            f'<circle cx="{num(X(ball_cx))}" cy="{num(Y(ball_cy))}" r="{num(ball_r*K)}" fill="{BALL}"/></svg>\n')

def mark(bg, c_c, c_t, artefact=None):
    """App icon / favicon: the 'c' and 't' of the wordmark with the ball, on a rounded square.
    artefact: None | 'route' (dotted route arcing into the ball) | 'plane' (plane flying to the ball)."""
    S = 512
    its, w = layout("ct")
    cb, tb = bounds(its[0][1]), bounds(its[1][1])
    left, right = cb[0], its[1][2] + tb[2]
    r = S * 0.075
    k = (S * 0.62 - r * 1.3) / (right - left)
    ox = (S - (right - left) * k - r * 1.3) / 2 - left * k
    glyph_h = tb[3] * k
    lift = 0.6 if artefact is None else 1.5
    oy = (S + glyph_h) / 2 + r * lift             # baseline
    c = glyph_path(its[0][1], its[0][2], k, ox, oy)
    t = glyph_path(its[1][1], its[1][2], k, ox, oy)
    bx_ = ox + (its[1][2] + tb[2]) * k + r * 0.55   # ball just off the top-right of the "t"
    by_ = oy - glyph_h - r * 0.5
    extra = ""
    if artefact:
        c_cx, c_top = ox + (cb[0] + cb[2]) / 2 * k, oy - cb[3] * k
        q0 = (c_cx - r * 0.6, c_top - r * 1.5)
        apex = by_ - r * 2.1
        rt = bezier(q0, ((q0[0] + bx_) / 2, 2 * apex - 0.5 * (q0[1] + by_)), (bx_, by_))
        if artefact == "route":
            extra = "".join(f'<circle cx="{num(x)}" cy="{num(y)}" r="{num(r*0.36)}" fill="{BALL}"/>'
                            for x, y in (rt(tt) for tt in (0.0, 0.2, 0.4, 0.6, 0.8)))
        else:
            tp = 0.52
            (x, y), (xa, ya), (xb, yb) = rt(tp), rt(tp - 0.03), rt(tp + 0.03)
            ang = math.atan2(-(yb - ya), xb - xa) + math.radians(8)
            dots = "".join(f'<circle cx="{num(px)}" cy="{num(py)}" r="{num(r*0.32)}" fill="{BALL}"/>'
                           for px, py in (rt(tt) for tt in (0.0, 0.17, 0.83)))
            extra = dots + f'<path fill="{BALL}" d="{plane_path(x, y, r*1.25, ang, flip_y=True)}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" role="img" aria-label="Court Trips">'
            f'<title>Court Trips</title><rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{bg}"/>'
            f'<path fill="{c_c}" d="{c}"/><path fill="{c_t}" d="{t}"/>{extra}'
            f'<circle cx="{num(bx_)}" cy="{num(by_)}" r="{num(r)}" fill="{BALL}"/></svg>\n')

def save(name, svg): open(f"{out}/{name}", "w").write(svg)
save("logo.svg", wordmark(BLUE, INK, BLUE))                          # primary, light backgrounds
save("logo-reversed.svg", wordmark(BALL, WHITE, BALL))               # dark backgrounds
save("logo-small.svg", wordmark(BLUE, INK, BLUE, flight=False))      # under ~200px wide
save("logo-small-reversed.svg", wordmark(BALL, WHITE, BALL, flight=False))
save("_preview-on-green.svg", wordmark(BALL, WHITE, BALL, bg=GREEN))
save("_preview-on-ink.svg", wordmark(BALL, WHITE, BALL, bg=INK))
save("mark.svg", mark(GREEN, BALL, WHITE))
save("mark-ink.svg", mark(INK, BALL, WHITE))
save("mark-route.svg", mark(GREEN, BALL, WHITE, "route"))
save("mark-plane.svg", mark(GREEN, BALL, WHITE, "plane"))
