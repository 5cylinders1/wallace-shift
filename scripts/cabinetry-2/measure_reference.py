"""Measure every moving element of the reference reel against scroll position.

Reads the rectified frames (rectify_reference.py) and scroll.json
(reference_scroll.py) from output/cabinetry-2/ref and writes curves.json there.
Per element: per-frame readings, a 0-1 progress, and where that progress
crosses 2% and 98%, in reel seconds, raw scroll and timeline playhead (all in
viewport heights, vh).

The playhead is the raw scroll passed through ScrollTrigger-style scrub
smoothing (each scroll change restarts an expo-out catch-up of SCRUB_S
seconds). 0.8 s fits best: it makes the island's position the smoothest
function of the playhead (see fit_scrub). Timeline positions should be read in
playhead terms.

Coordinates are the rectified 1440x900 screen. The browser viewport starts at
y=88 (below Safari's toolbar and tab bar), so it is 1440x812 there.
"""
import json, os
import cv2
import numpy as np

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'output', 'cabinetry-2', 'ref')
VIEW_TOP = 88
VIEW_H = 900 - VIEW_TOP
SCRUB_S = 0.8

scroll = json.load(open(os.path.join(REF, 'scroll.json')))['frames']
T = np.array([r[1] for r in scroll])
S = np.array([r[2] for r in scroll])
_cache = {}


def gray(i):
    if i not in _cache:
        _cache[i] = cv2.cvtColor(cv2.imread(os.path.join(REF, 'rect', f'r_{i:04d}.jpg')), cv2.COLOR_BGR2GRAY).astype(np.float32)
    return _cache[i]


def bgr(i):
    return cv2.imread(os.path.join(REF, 'rect', f'r_{i:04d}.jpg')).astype(np.float32)


def scrub(duration, ease='expo'):
    """Playhead after ScrollTrigger-style smoothing of the raw scroll."""
    def e(u):
        if u >= 1:
            return 1.0
        return 1 - 2 ** (-10 * u) if ease == 'expo' else 1 - (1 - u) ** 4
    p = start = target = S[0]
    t0 = T[0]
    out = np.zeros_like(S)
    for f in range(len(S)):
        t = T[f]
        if S[f] != target:
            if duration > 0:
                p = start + (target - start) * e((t - t0) / duration)
            start, target, t0 = p, S[f], t
        p = target if duration == 0 else start + (target - start) * e((t - t0) / duration)
        out[f] = p
    return out


P = scrub(SCRUB_S)


def crossings(frames, prog):
    """Where a 0-1 progress first passes 2% and first reaches 98%."""
    prog = np.asarray(prog, float)
    fr = np.asarray(frames)
    on = np.where(prog >= 0.02)[0]
    full = np.where(prog >= 0.98)[0]
    if not len(on) or not len(full):
        return None
    a, b = int(fr[on[0]]), int(fr[full[0]])
    return {'start_frame': a, 'end_frame': b, 'start_s': round(float(T[a]), 3), 'end_s': round(float(T[b]), 3),
            'start_vh': round(float(S[a]), 3), 'end_vh': round(float(S[b]), 3),
            'start_playhead': round(float(P[a]), 3), 'end_playhead': round(float(P[b]), 3)}


def relit(ref, img, patch):
    """Scale a reference frame by the luminance ratio of an untouched wall patch,
    so the room's gradual relight does not read as change."""
    x0, x1, y0, y1 = patch
    return ref * (img[y0:y1, x0:x1].mean() / (ref[y0:y1, x0:x1].mean() + 1e-6))


def changed_rows(img, ref, x0, x1, y0, y1, thr=22, frac=0.5, step=3):
    d = np.abs(img[y0:y1, x0:x1:step] - ref[y0:y1, x0:x1:step]) > thr
    rows = np.where(d.mean(1) > frac)[0]
    return (None, None) if not len(rows) else (y0 + int(rows[0]), y0 + int(rows[-1]))


# ---------------------------------------------------------------- base units
# name: (column x0, x1, plate frame, first frame, last frame). Units left of
# x=945 sit under the hero copy, so they are read from frame 103 (hero gone)
# against frame 103; they had begun by then, so their start is an upper bound.
# U7 is read only right of the headline (x>1025). U8 stops at frame 138, after
# which the upper cabinet's lower edge enters its columns.
UNITS = {'U1': (162, 268, 103, 103, 160), 'U2': (292, 383, 103, 103, 160), 'U3': (407, 500, 103, 103, 160),
         'U4': (524, 636, 103, 103, 160), 'U5': (660, 796, 103, 103, 160), 'U6': (820, 933, 103, 103, 160),
         'U7': (1025, 1066, 96, 96, 160), 'U8': (1090, 1318, 96, 96, 138)}
FLOOR_Y = 672.0  # where units break through the floor


def base_units():
    out = {}
    for name, (x0, x1, plate, first, last) in UNITS.items():
        ref = gray(plate)
        frames = list(range(first, last + 1))
        tops = [changed_rows(gray(i), ref, x0, x1, 470, 700, thr=24, frac=0.35)[0] for i in frames]
        # a unit whose top is still at the plinth line has not started rising
        tops = [None if (t is not None and t > 640 and k < 20) else t for k, t in enumerate(tops)]
        final = float(np.median([t for t in tops[-8:] if t is not None]))
        prog = [0.0 if t is None else float(np.clip((FLOOR_Y - t) / (FLOOR_Y - final), 0, 1)) for t in tops]
        out[name] = {'x': [x0, x1], 'final_top_y': final, 'rise_px': round(FLOOR_Y - final, 1), 'frames': frames,
                     'top_y': tops, 'progress': prog, 'span': crossings(frames, prog),
                     'start_is_upper_bound': plate == 103}
    return out


# ------------------------------------------------------------- upper cabinet
def upper():
    """Bottom edge (rises into place) and top edge (reveal, then the cabinet
    extends toward the ceiling), from relit column-median profiles."""
    ref = gray(140)
    frames = list(range(144, 240))
    tops, bottoms = [], []
    for i in frames:
        g = gray(i)
        rr = relit(ref, g, (1010, 1058, 200, 420))
        prof = np.median(np.abs(g[180:500, 1100:1300] - rr[180:500, 1100:1300]), axis=1)
        on = np.where(prof > 14)[0]
        tops.append(None if not len(on) else 180 + int(on[0]))
        bottoms.append(changed_rows(g, rr, 1100, 1300, 380, 500, thr=26, frac=0.5)[1])
    start_bottom, final_bottom = 489.0, 427.0
    n_rise = 45  # later the island's arrival confuses the bottom edge
    rise = [0.0 if b is None else float(np.clip((start_bottom - b) / (start_bottom - final_bottom), 0, 1))
            for b in bottoms[:n_rise]]
    final_top = float(np.median([t for t in tops[-10:] if t is not None]))
    reveal = [0.0 if t is None else float(np.clip((final_bottom - t) / (final_bottom - final_top), 0, 1)) for t in tops]
    return {'frames': frames, 'top_y': tops, 'bottom_y': bottoms, 'start_bottom_y': start_bottom,
            'final_bottom_y': final_bottom, 'final_top_y': final_top, 'rise_progress': rise,
            'reveal_progress': reveal, 'rise_span': crossings(frames[:n_rise], rise),
            'reveal_span': crossings(frames, reveal)}


# -------------------------------------------------------------------- island
def island():
    """Left waterfall edge (first run of bright columns in a band just below the
    island top) and the width of that run: the end face seen in perspective."""
    frames = list(range(170, 412))
    xs, faces = [], []
    for i in frames:
        band = np.median(gray(i)[590:612, :], axis=0) > 150
        hit = None
        for x in range(300, 1434):
            if band[x:x + 6].all():
                e = x
                while e < 1439 and band[e + 1]:
                    e += 1
                hit = (x, e - x + 1)
                break
        xs.append(None if hit is None else hit[0])
        faces.append(None if hit is None else hit[1])
    final = float(np.median([x for x in xs[-30:] if x is not None]))
    prog = [0.0 if x is None else float(np.clip((1440 - x) / (1440 - final), 0, 1)) for x in xs]
    return {'frames': frames, 'left_x': xs, 'face_w': faces, 'final_left_x': final, 'travel_px': 1440 - final,
            'progress': prog, 'span': crossings(frames, prog)}


# ------------------------------------------------------------------ pendants
def pendants():
    """Globes found as blobs of change against the bare wall (relit)."""
    ref = gray(212)
    frames = list(range(214, 334))
    found = []
    for i in frames:
        g = gray(i)
        d = (np.abs(g - relit(ref, g, (950, 1040, 330, 410))) > 28).astype(np.uint8)
        d[:95] = 0
        d[330:] = 0
        d[:, :300] = 0
        d[:, 1060:] = 0  # the upper cabinet
        d = cv2.morphologyEx(d, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
        n, _, st, cen = cv2.connectedComponentsWithStats(d)
        found.append(sorted([[int(cen[k][0]), int(st[k][1] + st[k][3]), int(st[k][4])] for k in range(1, n) if st[k][4] > 250]))
    # drop progress from the left globe's lower edge: first seen to settled (frame 310)
    k_end = frames.index(310)
    lefts = [b[0] if len(b) == 3 else None for b in found]
    y_start, y_end = 160.0, float(lefts[k_end][1])
    prog = [0.0 if b is None else float(np.clip((b[1] - y_start) / (y_end - y_start), 0, 1)) for b in lefts]
    prog = [p if k <= k_end else 1.0 for k, p in enumerate(prog)]
    first = next(k for k, b in enumerate(found) if b)
    return {'frames': frames, 'blobs': found, 'first_seen_frame': frames[first],
            'settled_x': [b[0] for b in found[k_end]], 'drop_progress': prog, 'drop_span': crossings(frames, prog)}


# ---------------------------------------------------------------- backsplash
SPLASH_COLS = [(300, 360), (530, 620), (860, 960), (1100, 1180), (1255, 1290)]


def backsplash():
    ref = gray(212)
    frames = list(range(212, 332))
    tops = []
    for i in frames:
        g = gray(i)
        rr = relit(ref, g, (950, 1040, 330, 410))
        vals = [t for t in (changed_rows(g, rr, x0, x1, 405, 530, thr=22, frac=0.55, step=2)[0] for x0, x1 in SPLASH_COLS)
                if t is not None]
        tops.append(None if len(vals) < 3 else float(np.median(vals)))
    final = float(np.median([t for t in tops[-10:] if t is not None]))
    base = 524.0  # countertop line
    prog = [0.0 if t is None else float(np.clip((base - t) / (base - final), 0, 1)) for t in tops]
    return {'frames': frames, 'top_y': tops, 'final_top_y': final, 'progress': prog, 'span': crossings(frames, prog)}


# -------------------------------------------------------------------- relight
PATCHES = {'back_wall': (950, 1040, 330, 410), 'left_wall': (140, 185, 220, 480), 'window': (25, 75, 180, 560),
           'floor_left': (20, 110, 720, 880), 'hood_light': (660, 800, 388, 420)}


def relight():
    frames = list(range(150, 412))
    out = {'frames': frames}
    for name, (x0, x1, y0, y1) in PATCHES.items():
        L, rb = [], []
        for i in frames:
            px = bgr(i)[y0:y1, x0:x1].reshape(-1, 3).mean(0)
            L.append(round(float(gray(i)[y0:y1, x0:x1].mean()), 2))
            rb.append(round(float(px[2] / px[0]), 4))
        v = np.array(L)
        a, b = np.median(v[:10]), np.median(v[-10:])
        prog = np.clip((v - a) / (b - a + 1e-9), 0, 1)
        out[name] = {'box': [x0, x1, y0, y1], 'mean_L': L, 'red_over_blue': rb,
                     'change_pct': round(float((b - a) / a * 100), 1),
                     'red_over_blue_change_pct': round(float((np.median(rb[-10:]) - np.median(rb[:10])) / np.median(rb[:10]) * 100), 1),
                     'span': crossings(frames, prog)}
    return out


# ------------------------------------------------------------------ captions
CAPTIONS = {  # name: (clean frame, box, frames searched)
    'hero': (80, (380, 1060, 290, 690), (60, 130)),
    'c1': (150, (120, 900, 600, 810), (86, 200)),
    'c2': (200, (120, 900, 600, 810), (150, 250)),
    'c3': (300, (120, 940, 600, 810), (200, 360)),
    'c4': (380, (680, 1320, 600, 800), (310, 412)),
}
KERNEL = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))


def tophat(i):
    return cv2.morphologyEx(gray(i), cv2.MORPH_TOPHAT, KERNEL)


def captions():
    masks = {}
    for name, (f, (x0, x1, y0, y1), _) in CAPTIONS.items():
        th = tophat(f)
        m = np.zeros_like(th, bool)
        m[y0:y1, x0:x1] = th[y0:y1, x0:x1] > 60
        masks[name] = m
    excl = {}
    for name, m in masks.items():
        others = np.zeros_like(m)
        for o, mo in masks.items():
            if o != name:
                others |= cv2.dilate(mo.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
        excl[name] = m & ~others
    out = {}
    for name, (clean, _, (f0, f1)) in CAPTIONS.items():
        frames = list(range(f0, f1))
        v = np.array([float(tophat(i)[excl[name]].mean()) for i in frames])
        v = np.convolve(np.pad(v, 1, mode='edge'), np.ones(3) / 3, mode='valid')
        hi = float(np.median(v[[frames.index(clean) + k for k in range(-3, 4)]]))
        lo = float(np.percentile(v, 2))
        p = np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)
        k_clean = frames.index(clean)

        def ev(k):
            return None if k is None else {'frame': frames[k], 's': round(float(T[frames[k]]), 3),
                                           'vh': round(float(S[frames[k]]), 3), 'playhead': round(float(P[frames[k]]), 3)}
        k_in0 = max([k for k in range(k_clean) if p[k] < 0.1], default=None)
        k_in1 = None if k_in0 is None else next((k for k in range(k_in0, k_clean + 1) if p[k] > 0.9), k_clean)
        k_out1 = next((k for k in range(k_clean, len(p)) if p[k] < 0.1), None)
        k_out0 = None if k_out1 is None else max(k for k in range(k_clean, k_out1) if p[k] > 0.9)
        out[name] = {'frames': frames, 'presence': [round(float(x), 3) for x in p], 'pixels': int(excl[name].sum()),
                     'in_start': None if name == 'hero' else ev(k_in0), 'in_end': None if name == 'hero' else ev(k_in1),
                     'out_start': ev(k_out0), 'out_end': ev(k_out1)}
    return out


# -------------------------------------------------------------------- release
def release():
    """Stage offset once it unpins, tracked through the final caption."""
    tpl = gray(408)[600:770, 1040:1440]
    frames = list(range(404, 454, 2))  # the caption leaves the search area after ~5.2vh
    ups = []
    for i in frames:
        m = cv2.matchTemplate(gray(i)[150:900, 1040:1440], tpl, cv2.TM_CCOEFF_NORMED)
        _, _, _, loc = cv2.minMaxLoc(m)
        ups.append(600 - (150 + loc[1]))
    start = next(i for i, u in zip(frames, ups) if u > 0) - 2
    s0 = float(S[start])
    return {'frames': frames, 'stage_up_px': ups, 'start_frame': start, 'start_vh': round(s0, 3),
            'scroll_px_since_start': [round(float((S[i] - s0) * VIEW_H), 1) for i in frames]}


def fit_scrub(isl):
    """Smoothness of island x as a function of the playhead, per scrub duration."""
    pts = [(f, x) for f, x in zip(isl['frames'], isl['left_x']) if x is not None and 182 <= f <= 330]
    fr = np.array([f for f, _ in pts])
    X = np.array([x for _, x in pts], float)
    res = {}
    for d in (0, 0.15, 0.3, 0.45, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0):
        s_ = scrub(d)[fr]
        z = (s_ - s_.min()) / (np.ptp(s_) + 1e-9)
        c = np.polyfit(z, X, 5)
        res[str(d)] = round(float(np.sqrt(np.mean((np.polyval(c, z) - X) ** 2))), 2)
    return res


def main():
    isl = island()
    res = {'viewport': {'top_y': VIEW_TOP, 'width': 1440, 'height': VIEW_H}, 'scrub_s': SCRUB_S,
           'playhead_vh': [round(float(x), 4) for x in P], 'scrub_fit_rms_px': fit_scrub(isl),
           'base_units': base_units(), 'upper': upper(), 'island': isl, 'pendants': pendants(),
           'backsplash': backsplash(), 'relight': relight(), 'captions': captions(), 'release': release()}
    json.dump(res, open(os.path.join(REF, 'curves.json'), 'w'))

    def sp(s):
        return None if s is None else f"{s['start_playhead']:.2f}->{s['end_playhead']:.2f} (raw {s['start_vh']:.2f}->{s['end_vh']:.2f})"
    print('scrub fit', res['scrub_fit_rms_px'])
    for k, v in res['base_units'].items():
        print(k, v['rise_px'], sp(v['span']))
    print('upper rise', sp(res['upper']['rise_span']), '| reveal', sp(res['upper']['reveal_span']), res['upper']['final_top_y'])
    print('island', res['island']['final_left_x'], sp(res['island']['span']))
    print('pendants first seen', res['pendants']['first_seen_frame'], 'settled x', res['pendants']['settled_x'],
          'drop', sp(res['pendants']['drop_span']))
    print('backsplash', res['backsplash']['final_top_y'], sp(res['backsplash']['span']))
    for n in PATCHES:
        r = res['relight'][n]
        print('relight', n, r['change_pct'], '% L,', r['red_over_blue_change_pct'], '% R/B', sp(r['span']))
    for c in CAPTIONS:
        v = res['captions'][c]

        def g(e):
            return None if e is None else e['playhead']
        print(c, 'in', g(v['in_start']), '->', g(v['in_end']), 'out', g(v['out_start']), '->', g(v['out_end']))
    print('release starts', res['release']['start_vh'])


if __name__ == '__main__':
    main()
