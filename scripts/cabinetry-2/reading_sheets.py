"""Review sheets for the reference reading: an annotated contact sheet of key
frames and a timing chart of every element against the timeline playhead.

Reads output/cabinetry-2/ref/{rect/, scroll.json, curves.json} and writes
reading-contact-sheet.jpg and reading-timing.svg next to them.
"""
import json, os
import cv2
import numpy as np

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'output', 'cabinetry-2', 'ref')
C = json.load(open(os.path.join(REF, 'curves.json')))
SC = json.load(open(os.path.join(REF, 'scroll.json')))['frames']
P = np.array(C['playhead_vh'])
S = np.array([r[2] for r in SC])
T = np.array([r[1] for r in SC])

# ------------------------------------------------------------ contact sheet
# frame, title, note, arrows [(x0, y0, x1, y1)] in rectified 1440x900 coords
KEYS = [
    (80, 'Hero', 'Empty room, locked camera. Centred serif headline over the plate.', []),
    (98, 'Hero out, caption 1 in', 'Crossfade in place with blur; no slide, no camera move.', []),
    (112, 'Base units rise through the floor', 'Outside-in stagger: ends first, units under the hood last.',
     [(215, 640, 215, 585), (1000, 640, 1000, 590), (1200, 660, 1200, 610)]),
    (128, 'Run completes', 'Each unit rises ~150 px (its full height), clipped at the floor.',
     [(590, 650, 590, 600), (730, 650, 730, 600)]),
    (166, 'Upper cabinet arrives', 'Appears 62 px below its spot and rises into place.', [(1190, 500, 1190, 445)]),
    (190, 'Island enters from the right', 'Wide waterfall end face: true 3D perspective, not a flat layer.',
     [(1400, 600, 1250, 600)]),
    (222, 'Caption 2 to 3; pendants appear', 'Pendants drop from under the header while travelling with the island.',
     [(905, 120, 905, 175), (820, 600, 680, 600)]),
    (262, 'Backsplash rises; pendants descend', 'Marble wipes up from the counter line; globes still lit dim.',
     [(640, 520, 640, 450), (700, 600, 590, 600)]),
    (300, 'Island and pendants land', 'Dusk relight: walls cool and dim, pendants glow warm.', []),
    (334, 'Caption 3 to 4', 'Caption swaps to the right side as the island frees it.', []),
    (380, 'Final state, hold', 'Right-aligned "Supper at eight" and a green CTA. ~0.75 vh of dead scroll.', []),
    (444, 'Release', 'Stage unpins and scrolls 1:1 into the dark next section.', [(720, 420, 720, 300)]),
]


def contact_sheet():
    W, H, LAB = 640, 400, 74
    tiles = []
    for f, title, note, arrows in KEYS:
        im = cv2.imread(os.path.join(REF, 'rect', f'r_{f:04d}.jpg'))
        for x0, y0, x1, y1 in arrows:
            cv2.arrowedLine(im, (x0, y0), (x1, y1), (40, 220, 255), 5, cv2.LINE_AA, tipLength=0.35)
        im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
        lab = np.full((LAB, W, 3), 22, np.uint8)
        cv2.putText(lab, title, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(lab, note, (10, 46), cv2.FONT_HERSHEY_SIMPLEX, 0.43, (210, 210, 210), 1, cv2.LINE_AA)
        meta = f'frame {f}   playhead {P[f]:.2f} vh   raw scroll {S[f]:.2f} vh   reel {T[f]:.2f} s'
        cv2.putText(lab, meta, (10, 66), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (90, 210, 255), 1, cv2.LINE_AA)
        tiles.append(np.vstack([im, lab]))
    rows = [np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]
    sheet = np.vstack(rows)
    head = np.full((56, sheet.shape[1], 3), 14, np.uint8)
    cv2.putText(head, 'Reference reading: Hartleigh & Vane scroll hero (screen rectified to 1440x900, camera colour cast left in)',
                (14, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(os.path.join(REF, 'reading-contact-sheet.jpg'), np.vstack([head, sheet]), [cv2.IMWRITE_JPEG_QUALITY, 88])


# ------------------------------------------------------------ timing chart
def series(frames, values, valid=None):
    pts = []
    for k, f in enumerate(frames):
        v = values[k]
        if v is None or (valid is not None and valid[k] is None):
            continue
        pts.append((float(P[f]), float(v)))
    return pts


def glow_curve():
    """Brightness of the three globes (top 5% of pixels around each blob)."""
    pd = C['pendants']
    out = []
    for f, blobs in zip(pd['frames'], pd['blobs']):
        if len(blobs) != 3:
            continue
        g = cv2.cvtColor(cv2.imread(os.path.join(REF, 'rect', f'r_{f:04d}.jpg')), cv2.COLOR_BGR2GRAY)
        vals = []
        for cx, by, _ in blobs:
            win = g[max(0, by - 50):by, max(0, cx - 22):cx + 22].ravel()
            vals.append(np.percentile(win, 95))
        out.append((float(P[f]), float(np.mean(vals))))
    v = np.array([b for _, b in out])
    lo, hi = np.percentile(v, 5), np.percentile(v, 95)
    return [(a, float(np.clip((b - lo) / (hi - lo), 0, 1))) for a, b in out]


def relight_curve(name, invert=False):
    r = C['relight']
    v = np.array(r[name]['mean_L'])
    a, b = np.median(v[:10]), np.median(v[-10:])
    p = (v - a) / (b - a)
    return [(float(P[f]), float(np.clip(x, 0, 1))) for f, x in zip(r['frames'], p)]


def timing_chart():
    bu, cap = C['base_units'], C['captions']

    def sp(s):
        return (s['start_playhead'], s['end_playhead'])
    up = C['upper']
    rows = [
        ('Hero copy out', 'cap', (0.20, 0.39), series(cap['hero']['frames'], cap['hero']['presence'])),
        ('01 Scribed to the wall', 'cap', (0.31, 1.53), series(cap['c1']['frames'], cap['c1']['presence'])),
    ]
    for k in ('U1', 'U2', 'U3', 'U6', 'U7', 'U8', 'U4', 'U5'):
        v = bu[k]
        rows.append((f'Base {k}', 'unit', sp(v['span']), series(v['frames'], v['progress'], v['top_y'])))
    rows += [
        ('Upper: rises 62 px', 'upper', sp(up['rise_span']), series(up['frames'][:45], up['rise_progress'], up['bottom_y'][:45])),
        ('Upper: reveals, extends up', 'upper', sp(up['reveal_span']), series(up['frames'], up['reveal_progress'], up['top_y'])),
        ('02 One slab, folded', 'cap', (1.44, 2.54), series(cap['c2']['frames'], cap['c2']['presence'])),
        ('Island slides in (1120 px)', 'island', sp(C['island']['span']),
         series(C['island']['frames'], C['island']['progress'], C['island']['left_x'])),
        ('03 Warmed by degrees', 'cap', (2.41, 3.70), series(cap['c3']['frames'], cap['c3']['presence'])),
        ('Pendants drop (with island)', 'pend', (2.44, 3.38),
         series(C['pendants']['frames'], C['pendants']['drop_progress'])),
        ('Pendant glow', 'light', (2.9, 3.9), glow_curve()),
        ('Backsplash rises', 'splash', sp(C['backsplash']['span']),
         series(C['backsplash']['frames'], C['backsplash']['progress'], C['backsplash']['top_y'])),
        ('Back wall dims and cools', 'light', sp(C['relight']['back_wall']['span']), relight_curve('back_wall')),
        ('Left wall brightens', 'light', sp(C['relight']['left_wall']['span']), relight_curve('left_wall')),
        ('04 Supper at eight + CTA', 'cap', (3.70, 4.66), series(cap['c4']['frames'], cap['c4']['presence'])),
        ('Hold (nothing moves)', 'hold', (3.91, 4.66), []),
        ('Release: stage scrolls 1:1', 'release', (4.66, 5.4), []),
    ]
    colours = {'cap': '#8a8f98', 'unit': '#3f6b4f', 'upper': '#5b7d5f', 'island': '#2f5d8a', 'pend': '#b07a2a',
               'light': '#c79a3c', 'splash': '#7d6aa8', 'hold': '#cfd3d8', 'release': '#444a52'}
    X0, X1, VMAX = 250, 1370, 5.4
    RH, TOP = 30, 70
    W, Hh = 1400, TOP + RH * len(rows) + 70
    x = lambda v: X0 + (X1 - X0) * v / VMAX
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{Hh}" viewBox="0 0 {W} {Hh}" '
           'font-family="-apple-system, Helvetica, Arial, sans-serif">',
           f'<rect width="{W}" height="{Hh}" fill="#fbfaf7"/>',
           '<text x="20" y="30" font-size="17" font-weight="600" fill="#15181b">Reference timing, measured against the timeline playhead</text>',
           '<text x="20" y="52" font-size="12" fill="#4b5157">Playhead = scroll in viewport heights after scrub smoothing (~0.8 s expo catch-up). '
           'Bars: 2%–98% of each motion. Lines: the measured progress curve. Pin ends at 4.66 vh.</text>']
    for v in np.arange(0, VMAX + 0.01, 0.5):
        out.append(f'<line x1="{x(v):.1f}" y1="{TOP - 6}" x2="{x(v):.1f}" y2="{TOP + RH * len(rows)}" stroke="#e3e1db" stroke-width="1"/>')
        out.append(f'<text x="{x(v):.1f}" y="{TOP + RH * len(rows) + 18}" font-size="11" fill="#4b5157" text-anchor="middle">{v:.1f}</text>')
    out.append(f'<text x="{(X0 + X1) / 2:.0f}" y="{TOP + RH * len(rows) + 40}" font-size="12" fill="#4b5157" text-anchor="middle">'
               'playhead (viewport heights of scroll)</text>')
    for k, (label, kind, (a, b), pts) in enumerate(rows):
        y = TOP + RH * k
        out.append(f'<text x="{X0 - 10}" y="{y + RH * 0.62:.1f}" font-size="12" fill="#15181b" text-anchor="end">{label}</text>')
        out.append(f'<rect x="{x(a):.1f}" y="{y + 5}" width="{max(2, x(b) - x(a)):.1f}" height="{RH - 10}" fill="{colours[kind]}" '
                   f'opacity="{0.25 if pts else 0.6}" rx="1"/>')
        if pts:
            pl = ' '.join(f'{x(p):.1f},{y + RH - 5 - (RH - 10) * v:.1f}' for p, v in sorted(pts))
            out.append(f'<polyline points="{pl}" fill="none" stroke="{colours[kind]}" stroke-width="1.6"/>')
    out.append('</svg>')
    open(os.path.join(REF, 'reading-timing.svg'), 'w').write('\n'.join(out))


if __name__ == '__main__':
    contact_sheet()
    timing_chart()
    print('wrote reading-contact-sheet.jpg and reading-timing.svg')
