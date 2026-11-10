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

def bounds(name):
    p = BoundsPen(gs); gs[name].draw(p); return p.bounds

def layout(text, split=None):
    x, items = 0, []
    for n, ch in enumerate(text):
        g = cmap[ord(ch)]
        if n == split: x += WORD_GAP
        items.append((ch, g, x)); x += hmtx[g][0] + TRACK
    return items, x - TRACK

items, width = layout("court" + "trıps", split=5)
ib, db = bounds(cmap[ord("i")]), bounds(cmap[0x131])
i_x = next(x for ch, g, x in items if ch == "ı")
dot_h = ib[3] - db[3]
ball_r = dot_h * 0.46
ball_cx = i_x + (db[0] + db[2]) / 2
ball_cy = db[3] + dot_h * 0.76
asc = max(bounds(cmap[ord("t")])[3], ib[3])
desc = bounds(cmap[ord("p")])[1]

# Flight path: leaves the ball, climbs over "ps", ends at the paper plane.
s_x = items[-1][2]; sb = bounds(items[-1][1])
px0, py0 = ball_cx, ball_cy
px1, py1 = s_x + sb[0] + (sb[2] - sb[0]) * 0.62, asc + 0.34 * UPM
ctrl = (px0 + (px1 - px0) * 0.30, py1 + 0.03 * UPM)   # quadratic control: quick lift, then levels out
def path_pt(t):
    u = 1 - t
    return (u*u*px0 + 2*u*t*ctrl[0] + t*t*px1, u*u*py0 + 2*u*t*ctrl[1] + t*t*py1)
N = 5
trail = [(*path_pt(0.20 + 0.60 * n / (N - 1)), UPM * 0.031) for n in range(N)]
ex, ey = path_pt(1.0); bx, by = path_pt(0.9)
plane_ang = math.atan2(ey - by, ex - bx) + math.radians(24)
PLANE = 0.21 * UPM                  # half-length
# unit paper plane, nose at (1,0): upper wing and lower fold
WING = [(1.0, 0.0), (-1.0, 0.62), (-0.42, 0.02)]
FOLD = [(1.0, 0.0), (-0.36, -0.10), (-0.60, -0.62)]

PAD = 0.12 * UPM
plane_top = ey + PLANE * 0.9
top = plane_top + PAD
W, H = (width + 2 * PAD) * K, (top - desc + PAD) * K
X = lambda x: (x + PAD) * K
Y = lambda y: (top - y) * K

def glyph_path(g, x, k=K, ox=PAD * K, oy=None):
    oy = top * K if oy is None else oy
    pen = SVGPathPen(gs, ntos=num)
    gs[g].draw(TransformPen(pen, (k, 0, 0, -k, ox + x * k, oy)))
    return pen.getCommands()

def plane_svg(color):
    c, s = math.cos(plane_ang), math.sin(plane_ang)
    def poly(pts):
        return "M" + "L".join(f"{num(X(ex + PLANE*(px*c - py*s)))} {num(Y(ey + PLANE*(px*s + py*c)))}" for px, py in pts) + "Z"
    return f'<path fill="{color}" d="{poly(WING)}{poly(FOLD)}"/>'

def wordmark(c_court, c_trips, c_flight, bg=None, flight=True):
    court = "".join(glyph_path(g, x) for ch, g, x in items[:5])
    trips = "".join(glyph_path(g, x) for ch, g, x in items[5:])
    cut = 0 if flight else (top - PAD - (ball_cy + ball_r)) * K
    extra = ""
    if flight:
        dots = "".join(f'<circle cx="{num(X(x))}" cy="{num(Y(y))}" r="{num(r*K)}"/>' for x, y, r in trail)
        extra = f'<g fill="{c_flight}">{dots}</g>' + plane_svg(c_flight)
    back = f'<rect y="{num(cut)}" width="100%" height="100%" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {num(cut)} {num(W)} {num(H - cut)}" role="img" aria-label="Court Trips">'
            f'<title>Court Trips</title>{back}'
            f'<path fill="{c_court}" d="{court}"/><path fill="{c_trips}" d="{trips}"/>{extra}'
            f'<circle cx="{num(X(ball_cx))}" cy="{num(Y(ball_cy))}" r="{num(ball_r*K)}" fill="{BALL}"/></svg>\n')

def mark(bg, c_c, c_t):
    """App icon / favicon: the 'c' and 't' of the wordmark with the ball, on a rounded square."""
    S = 512
    its, w = layout("ct")
    cb, tb = bounds(its[0][1]), bounds(its[1][1])
    left, right = cb[0], its[1][2] + tb[2]
    r = S * 0.075
    k = (S * 0.62 - r * 1.3) / (right - left)
    ox = (S - (right - left) * k - r * 1.3) / 2 - left * k
    glyph_h = tb[3] * k
    oy = (S + glyph_h) / 2 + r * 0.6           # baseline
    c = glyph_path(its[0][1], its[0][2], k, ox, oy)
    t = glyph_path(its[1][1], its[1][2], k, ox, oy)
    bx_ = ox + (its[1][2] + tb[2]) * k + r * 0.55   # ball just off the top-right of the "t"
    by_ = oy - glyph_h - r * 0.5
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" role="img" aria-label="Court Trips">'
            f'<title>Court Trips</title><rect width="{S}" height="{S}" rx="{S*0.22:.0f}" fill="{bg}"/>'
            f'<path fill="{c_c}" d="{c}"/><path fill="{c_t}" d="{t}"/>'
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
