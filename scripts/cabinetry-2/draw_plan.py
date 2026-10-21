"""Dimensioned plan and back-wall elevation of the cabinetry demo 02 kitchen,
drawn from kitchen_spec, plus the NKBA checks it was designed to.

Writes output/cabinetry-2/plan-elevation.svg.
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kitchen_spec as K  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'output', 'cabinetry-2', 'plan-elevation.svg')
S = 2.3            # px per inch
INK, MUTE, ACC = '#1c1f22', '#8b9096', '#2f6f8f'


def ft(v):
    """Inches as feet-inches, e.g. 25.5 -> 2'-1 1/2"."""
    whole = int(v // 12)
    rest = v - whole * 12
    frac = {0.0: '', 0.25: ' 1/4', 0.5: ' 1/2', 0.75: ' 3/4', 0.125: ' 1/8'}.get(round(rest % 1, 3), '')
    return (f"{whole}'-" if whole else '') + f'{int(rest)}{frac}"'


class Svg:
    def __init__(self):
        self.parts = []

    def add(self, s):
        self.parts.append(s)

    def rect(self, x, y, w, h, fill='none', stroke=INK, sw=1, dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{sw}" opacity="{op}"{d}/>')

    def line(self, x1, y1, x2, y2, stroke=INK, sw=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def text(self, x, y, s, size=11, anchor='middle', fill=INK, weight=400, rot=None):
        r = f' transform="rotate({rot} {x:.1f} {y:.1f})"' if rot is not None else ''
        self.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{anchor}" fill="{fill}" '
                 f'font-weight="{weight}"{r}>{s}</text>')

    def dim_h(self, x1, x2, y, label, tick=5, size=10):
        self.line(x1, y, x2, y, MUTE)
        for x in (x1, x2):
            self.line(x, y - tick, x, y + tick, MUTE)
        self.text((x1 + x2) / 2, y - 4, label, size, fill=INK)

    def dim_v(self, x, y1, y2, label, tick=5, size=10):
        self.line(x, y1, x, y2, MUTE)
        for y in (y1, y2):
            self.line(x - tick, y, x + tick, y, MUTE)
        self.text(x + 8, (y1 + y2) / 2 + 3, label, size, anchor='start')


def plan(svg, ox, oy):
    """Top view. Plan y grows into the room (down the page)."""
    X = lambda x: ox + x * S
    Y = lambda y: oy + y * S
    svg.text(ox, oy - 62, 'PLAN', 13, 'start', weight=700)
    W, Dshow = K.PILLAR['x1'] + 30, K.CAMERA['y'] + 20
    t = K.WALL_T
    svg.rect(X(-t), Y(-t), (W + t) * S, t * S, fill='#d9d6cf', stroke='none')               # back wall
    svg.rect(X(-t), Y(0), t * S, Dshow * S, fill='#d9d6cf', stroke='none')                  # window wall
    w = K.WINDOW
    svg.rect(X(-t), Y(w['y0']), t * S, (w['y1'] - w['y0']) * S, fill='#ffffff', stroke=INK, sw=0.8)
    svg.line(X(-3), Y(w['y0']), X(-3), Y(w['y1']), ACC, 1.5)
    svg.text(X(-t) - 6, Y((w['y0'] + w['y1']) / 2), 'steel window', 10, 'middle', MUTE, rot=-90)
    p = K.PILLAR
    svg.rect(X(p['x0']), Y(0), (p['x1'] - p['x0']) * S, p['y1'] * S, fill='#d9d6cf', stroke=INK, sw=0.8)
    # run
    for code, x0, x1, kind in K.run_modules():
        svg.rect(X(x0), Y(0), (x1 - x0) * S, K.BASE_D * S, fill='#efe6d6' if kind != 'FILL' else '#e2d8c4', stroke=INK, sw=0.8)
        if kind != 'FILL':
            svg.text(X((x0 + x1) / 2), Y(K.BASE_D / 2) + 4, code, 10)
    svg.rect(X(0), Y(0), K.RUN_LEN * S, K.COUNTER_D * S, stroke=INK, sw=1.2)
    s, c = K.SINK, K.COOKTOP
    svg.rect(X(s['x_center'] - s['w'] / 2), Y(s['y_back']), s['w'] * S, s['d'] * S, fill='#ffffff', stroke=INK, sw=0.8)
    svg.text(X(s['x_center']), Y(s['y_back'] + s['d'] / 2) + 4, 'sink', 9, fill=MUTE)
    svg.rect(X(c['x_center'] - c['w'] / 2), Y(c['y_back']), c['w'] * S, c['d'] * S, fill='#2a2a2a', stroke='none', op=0.85)
    svg.text(X(c['x_center']), Y(c['y_back'] + c['d'] / 2) + 4, 'cooktop', 9, fill='#ffffff')
    h = K.HOOD
    svg.rect(X(h['x_center'] - h['w_bottom'] / 2), Y(0), h['w_bottom'] * S, h['d_bottom'] * S, stroke=MUTE, dash='4 3')
    u = K.UPPER
    svg.rect(X(u['x0']), Y(0), (u['x1'] - u['x0']) * S, (u['d'] + K.FRAME_T) * S, stroke=MUTE, dash='2 2')
    svg.text(X((u['x0'] + u['x1']) / 2), Y(6), 'wall cabinets above', 9, fill=MUTE)
    # island
    I = K.ISLAND
    svg.rect(X(I['x0']), Y(I['y_back']), I['len'] * S, I['depth'] * S, fill='#ece8df', stroke=INK, sw=1.2)
    for xx in (I['x0'], I['x1'] - I['end_t']):
        svg.rect(X(xx), Y(I['y_back']), I['end_t'] * S, I['depth'] * S, fill='#cfc6b2', stroke='none')
    for k in range(0, int(I['len'] - 4), 4):
        svg.line(X(I['x0'] + 2 + k), Y(I['y_front']) - 1, X(I['x0'] + 2 + k), Y(I['y_front']) - 5, MUTE, 0.6)
    svg.text(X(I['x_center']), Y(I['y_back'] + I['depth'] / 2) + 4, 'island, waterfall ends', 10)
    f = K.FRIDGE_DRAWERS
    svg.rect(X(f['x0']), Y(I['y_back']), (f['x1'] - f['x0']) * S, 24 * S, stroke=ACC, dash='3 2')
    svg.text(X((f['x0'] + f['x1']) / 2), Y(I['y_back'] + 28) + 2, 'fridge drawers', 8, fill=ACC)
    svg.text(X(I['x_center']), Y(I['y_front']) + 14, 'fluted face to camera', 9, fill=MUTE)
    for x in K.PENDANTS['xs']:
        svg.add(f'<circle cx="{X(x):.1f}" cy="{Y(K.PENDANTS["y"]):.1f}" r="{K.PENDANTS["globe_d"] / 2 * S:.1f}" '
                f'fill="none" stroke="{ACC}" stroke-dasharray="3 2"/>')
    # camera and its field of view
    cx, cy = K.CAMERA['x'], K.CAMERA['y']
    half = math.atan(K.CAMERA['sensor_w_mm'] / 2 / K.CAMERA['focal_mm'])
    for sgn in (-1, 1):
        svg.line(X(cx), Y(cy), X(cx + sgn * math.tan(half) * cy), Y(0), ACC, 0.8, '5 4')
    svg.add(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="4" fill="{ACC}"/>')
    svg.text(X(cx) + 8, Y(cy) + 4, f'camera, {K.CAMERA["z"]:.0f}" high, level', 10, 'start', ACC)
    svg.text(X(p['x1']) + 6, Y(p['y1'] + 14), 'fridge + freezer columns', 9, 'start', MUTE)
    svg.text(X(p['x1']) + 6, Y(p['y1'] + 14) + 12, 'on the pantry wall →', 9, 'start', MUTE)
    # dimensions
    run = K.run_modules()
    ydim = Y(0) - 18
    for code, x0, x1, kind in run:
        svg.dim_h(X(x0), X(x1), ydim, f'{x1 - x0:g}"', 3, 8)
    svg.dim_h(X(0), X(K.RUN_LEN), ydim - 16, f'run {ft(K.RUN_LEN)}')
    svg.dim_v(X(I['x1']) + 16, Y(K.COUNTER_D), Y(I['y_back']), f'aisle {AISLE_LABEL}')
    svg.text(X(K.RUN_LEN) - 4, Y(K.COUNTER_D) + 13, f'counter {K.COUNTER_D:g}" deep', 9, 'end', MUTE)
    svg.dim_v(X(I['x1']) + 16, Y(I['y_back']), Y(I['y_front']), f'{I["depth"]:g}"')
    svg.dim_h(X(I['x0']), X(I['x1']), Y(I['y_front']) + 28, f'island {ft(I["len"])}')
    svg.dim_v(X(-t) - 22, Y(0), Y(cy), f'{ft(cy)}', 4)


AISLE_LABEL = f'{K.AISLE:g}"'


def elevation(svg, ox, oy):
    """Back wall, looking from the camera. Elevation z grows up the page."""
    X = lambda x: ox + x * S
    Z = lambda z: oy - z * S
    svg.text(ox, Z(K.CEILING) - 22, 'BACK-WALL ELEVATION', 13, 'start', weight=700)
    svg.line(X(-10), Z(0), X(K.PILLAR['x1'] + 10), Z(0), INK, 1.5)
    svg.line(X(-10), Z(K.CEILING), X(K.PILLAR['x1'] + 10), Z(K.CEILING), MUTE, 1, '6 4')
    svg.rect(X(K.PILLAR['x0']), Z(K.CEILING), (K.PILLAR['x1'] - K.PILLAR['x0']) * S, K.CEILING * S, fill='#e6e2da', stroke=INK, sw=0.8)
    fw = K.FRAME_W
    for code, x0, x1, kind in K.run_modules():
        svg.rect(X(x0), Z(K.TOE_H), (x1 - x0) * S, (K.TOE_H) * S, fill='#3a3530', stroke='none')
        svg.rect(X(x0), Z(K.BOX_TOP), (x1 - x0) * S, (K.BOX_TOP - K.TOE_H) * S, fill='#efe6d6', stroke=INK, sw=0.8)
        if kind == 'FILL':
            continue
        z = K.BOX_TOP - fw
        for h, okind in K.OPENINGS[kind]:
            if okind == 'doors':
                xm = (x0 + x1) / 2
                svg.rect(X(x0 + fw), Z(z), (xm - x0 - fw) * S, h * S, stroke=INK, sw=0.6)
                svg.rect(X(xm), Z(z), (x1 - fw - xm) * S, h * S, stroke=INK, sw=0.6)
            else:
                svg.rect(X(x0 + fw), Z(z), (x1 - x0 - 2 * fw) * S, h * S, stroke=INK, sw=0.6)
            z -= h + fw
        svg.text(X((x0 + x1) / 2), Z(-6), code, 9, fill=MUTE)
    svg.rect(X(0), Z(K.COUNTER_TOP), K.RUN_LEN * S, K.COUNTER_T * S, fill='#d8cdb6', stroke=INK, sw=0.8)
    b = K.BACKSPLASH
    for i in range(b['slabs']):
        L = K.RUN_LEN / b['slabs']
        svg.rect(X(i * L), Z(b['z1']), L * S, (b['z1'] - b['z0']) * S, fill='#f3ede1', stroke=MUTE, sw=0.6)
    svg.text(X(K.RUN_LEN / 2), Z((b['z0'] + b['z1']) / 2) + 4, f'quartzite, {b["slabs"]} slabs book-matched on the hood centre line', 9, fill=MUTE)
    u, st = K.UPPER, K.STACKER
    w = (u['x1'] - u['x0']) / u['boxes']
    for i in range(u['boxes']):
        x0 = u['x0'] + i * w
        svg.rect(X(x0), Z(u['z1']), w * S, (u['z1'] - u['z0']) * S, fill='#efe6d6', stroke=INK, sw=0.8)
        svg.line(X(x0 + w / 2), Z(u['z1'] - fw), X(x0 + w / 2), Z(u['z0'] + fw), INK, 0.6)
        svg.rect(X(x0), Z(st['z1']), w * S, (st['z1'] - st['z0']) * S, fill='#e9f0f2', stroke=INK, sw=0.8)
    h = K.HOOD
    xc = h['x_center']
    pts = [(xc - h['w_bottom'] / 2, h['z_bottom']), (xc + h['w_bottom'] / 2, h['z_bottom']),
           (xc + h['w_bottom'] / 2, h['z_bottom'] + h['band_h']), (xc + h['w_top'] / 2, K.CEILING),
           (xc - h['w_top'] / 2, K.CEILING), (xc - h['w_bottom'] / 2, h['z_bottom'] + h['band_h'])]
    svg.add('<polygon points="' + ' '.join(f'{X(a):.1f},{Z(z):.1f}' for a, z in pts) + f'" fill="#f1eee8" stroke="{INK}" stroke-width="0.8"/>')
    svg.text(X(xc), Z(95), 'plaster hood', 9, fill=MUTE)
    I = K.ISLAND
    svg.rect(X(I['x0']), Z(K.COUNTER_TOP), I['len'] * S, K.COUNTER_TOP * S, stroke=ACC, dash='5 3')
    svg.text(X(I['x_center']), Z(18), 'island in front (dashed)', 9, fill=ACC)
    p = K.PENDANTS
    for x in p['xs']:
        r = p['globe_d'] / 2
        svg.add(f'<circle cx="{X(x):.1f}" cy="{Z(p["bottom_z"] + r):.1f}" r="{r * S:.1f}" fill="none" stroke="{ACC}" stroke-dasharray="3 2"/>')
        svg.line(X(x), Z(p['bottom_z'] + 2 * r), X(x), Z(K.CEILING), ACC, 0.6, '3 2')
    # height dimensions on the right
    xr = X(K.PILLAR['x1']) + 18
    levels = [(K.TOE_H, '4 1/2" toe'), (K.COUNTER_TOP, '36" counter'), (b['z1'], '58" splash / wall cab'),
              (h['z_bottom'], '66" hood (30" over cooktop)'), (p['bottom_z'], '72" pendants (36" over island)'),
              (u['z1'], '94" wall cab top'), (st['z1'], '106" stacker top'), (K.CEILING, f'{ft(K.CEILING)} ceiling')]
    for z, label in levels:
        svg.line(xr - 8, Z(z), xr, Z(z), MUTE)
        svg.text(xr + 6, Z(z) + 3, label, 9, 'start')
    ydim = Z(0) + 26
    for code, x0, x1, kind in K.run_modules():
        if kind != 'FILL':
            svg.dim_h(X(x0), X(x1), ydim, f'{x1 - x0:g}"', 3, 8)


def checks():
    """NKBA kitchen planning checks, every number from the spec."""
    sink, cook = K.SINK, K.COOKTOP
    s0, s1 = sink['x_center'] - sink['w'] / 2, sink['x_center'] + sink['w'] / 2
    c0, c1 = cook['x_center'] - cook['w'] / 2, cook['x_center'] + cook['w'] / 2
    dw = next((x0, x1) for code, x0, x1, kind in K.run_modules() if kind == 'DW')
    tri_sink = (sink['x_center'], sink['y_back'] + sink['d'] / 2)
    tri_cook = (cook['x_center'], cook['y_back'] + cook['d'] / 2)
    fd = K.FRIDGE_DRAWERS
    tri_fridge = ((fd['x0'] + fd['x1']) / 2, K.ISLAND['y_back'])
    legs = [math.dist(a, b) / 12 for a, b in ((tri_sink, tri_cook), (tri_cook, tri_fridge), (tri_fridge, tri_sink))]
    return [
        ('Work aisle, run to island', f'{K.AISLE:g}"', '≥ 42" one cook, ≥ 48" two cooks'),
        ('Counter height / depth', f'{K.COUNTER_TOP:g}" / {K.COUNTER_D:g}"', '36" high'),
        ('Cooktop landing each side', f'{c0 - s1:g}" and {K.RUN_LEN - c1:g}"', '≥ 12" and ≥ 15"'),
        ('Sink landing each side', f'{s0:g}" and {c0 - s1:g}"', '≥ 24" and ≥ 18"'),
        ('Dishwasher to sink edge', f'{dw[0] - s1 + 3:g}" (next cabinet)', '≤ 36"'),
        ('Hood over cooktop', f'{K.HOOD["z_bottom"] - K.COUNTER_TOP:g}" up, {K.HOOD["w_bottom"]:g}" wide over {cook["w"]:g}"',
         '24-36" up, ≥ cooktop width'),
        ('Wall cabinets over counter', f'{K.UPPER["z0"] - K.COUNTER_TOP:g}"', '≥ 15-18"'),
        ('Pendants over island', f'{K.PENDANTS["bottom_z"] - K.COUNTER_TOP:g}"', '30-36"'),
        ('Work triangle: sink, cooktop, fridge drawers',
         ' + '.join(f"{l:.1f}'" for l in legs) + f" = {sum(legs):.1f}'", "legs 4-9', total ≤ 26'"),
    ]


def main():
    svg = Svg()
    W, H = 1900, 1340
    svg.add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            'font-family="-apple-system, Helvetica, Arial, sans-serif">')
    svg.add(f'<rect width="{W}" height="{H}" fill="#fbfaf7"/>')
    svg.text(40, 40, 'Cabinetry demo 02: kitchen plan and elevation', 18, 'start', weight=700)
    svg.text(40, 60, 'Inches. Rift white oak inset cabinetry, quartzite counters and backsplash, fluted island. '
             'Same configuration and scale as the reference, measured from its camera.', 11, 'start', MUTE)
    plan(svg, 80, 140)
    elevation(svg, 80, 1250)
    x0, y0 = 1400, 150
    svg.text(x0, y0 - 10, 'NKBA CHECKS', 13, 'start', weight=700)
    rows = checks()
    for k, (what, ours, rule) in enumerate(rows):
        y = y0 + 18 + k * 34
        svg.text(x0, y, what, 11, 'start', weight=600)
        svg.text(x0, y + 14, f'{ours}   (guideline {rule})', 10, 'start', MUTE)
    svg.text(x0, y0 + 18 + len(rows) * 34 + 6, 'All pass. Full-height fridge and freezer stand on the pantry wall', 10, 'start')
    svg.text(x0, y0 + 18 + len(rows) * 34 + 20, 'right of the pillar, outside the camera frame.', 10, 'start')
    svg.add('</svg>')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w').write('\n'.join(svg.parts))
    print('wrote', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
