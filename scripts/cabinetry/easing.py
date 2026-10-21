"""Derive Tambour's three motion curves from cabinet hardware.

drawer   measured: the front edge of a real drawer closing (Pexels video 6631284,
         kaboompics), tracked frame by frame at 25 fps relative to the fixed
         cabinet face (see the tracking notes in docs/demos/cabinetry-motion.md).
hinge    modelled: a door pushed shut swings freely until the soft-close damper
         engages, then a spring pulls it in against viscous damping.
tambour  modelled: slats pushed from rest along a track, then coasting to a stop
         against track friction (Coulomb), slowed further on the curve.

Each normalised curve is fitted with a CSS cubic-bezier (least squares over
time), and the fit error is reported. Writes output/cabinetry/hardware/curves.json
and curves.png.
"""
import json, os
import numpy as np
import cv2
from paths import WORK

OUT = os.path.join(WORK, 'hardware')


def bezier(x1, y1, x2, y2, n=400):
    s = np.linspace(0, 1, n)
    bx = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s ** 2 * x2 + s ** 3
    by = 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s ** 2 * y2 + s ** 3
    return bx, by


def bezier_at(params, u):
    bx, by = bezier(*params)
    return np.interp(u, bx, by)


def fit(u, s, ylo=-0.2, yhi=1.2):
    """Coarse-to-fine grid search; x control points stay in [0, 1], y in [ylo, yhi]."""
    best, err = None, 1e9
    grid = np.linspace(0, 1, 21)
    ygrid = np.linspace(ylo, yhi, 29)
    for x1 in grid:
        for x2 in grid:
            for y1 in ygrid[::2]:
                for y2 in ygrid[::2]:
                    e = np.sqrt(np.mean((bezier_at((x1, y1, x2, y2), u) - s) ** 2))
                    if e < err: best, err = (x1, y1, x2, y2), e
    step = 0.05
    for _ in range(40):
        improved = False
        for i in range(4):
            for d in (-step, step):
                cand = list(best); cand[i] += d
                cand[i] = min(1, max(0, cand[i])) if i in (0, 2) else min(yhi, max(ylo, cand[i]))
                e = np.sqrt(np.mean((bezier_at(tuple(cand), u) - s) ** 2))
                if e < err: best, err, improved = tuple(cand), e, True
        if not improved: step /= 2
        if step < 1e-4: break
    return tuple(round(v, 3) for v in best), err


def normalise(t, x):
    x = (x - x[0]) / (x[-1] - x[0])
    return (t - t[0]) / (t[-1] - t[0]), x


# --- drawer: measured ---------------------------------------------------------
t, x, strength = np.load(os.path.join(OUT, 'drawer_full.npy'))
k = np.ones(5) / 5
xs = np.convolve(np.pad(x, 2, mode='edge'), k, mode='valid')           # 5-frame moving average
rest, end = np.median(xs[:50]), np.median(xs[-4:])
travel = end - rest
# onset: the last moment the drawer is still within 1.5% of rest (the hand nudges it back first)
i0 = int(np.nonzero(xs <= rest + 0.015 * travel)[0].max())
i1 = int(np.argmax(xs > rest + 0.995 * travel))
du, ds = normalise(t[i0:i1 + 1], xs[i0:i1 + 1])
drawer, drawer_err = fit(du, ds, 0.0, 1.0)
v = np.gradient(ds, du)
drawer_note = {'start_s': round(float(t[i0]), 2), 'end_s': round(float(t[i1]), 2), 'travel_px_at_683w': round(float(travel), 1),
               'peak_velocity_at': round(float(du[int(np.argmax(v))]), 2)}

# --- hinge: modelled ----------------------------------------------------------
dt = 1 / 600
theta, omega = 95.0, -160.0          # deg, deg/s: a firm push from fully open
engage = 35.0                        # assumption: damper engages ~35 deg from closed
k_spring, c_damp, friction = 60.0, 9.0, 40.0
ts, th = [0.0], [theta]
while theta > 0.05 and ts[-1] < 6:
    if theta > engage:
        acc = friction                                   # free swing: hinge friction opposes closing
    else:
        acc = -k_spring - c_damp * omega                 # spring pulls in, damper resists speed
    omega += acc * dt; omega = min(omega, -0.5)
    theta += omega * dt
    ts.append(ts[-1] + dt); th.append(theta)
hu, hs = normalise(np.array(ts), 95.0 - np.array(th))
hinge, hinge_err = fit(hu, hs, 0.0, 1.0)
hinge_note = {'duration_s': round(ts[-1], 2), 'engage_deg': engage, 'assumed': ['push 160 deg/s', 'damper engages at 35 deg', 'spring 60 deg/s^2', 'damping 9 /s']}

# --- tambour: modelled --------------------------------------------------------
pos, vel, ts2, ps = 0.0, 0.0, [0.0], [0.0]
L, push_until, push_acc = 1.0, 0.32, 3.2      # hand pushes for the first third of the travel
while ts2[-1] < 6:
    f_track = 0.9 + (0.9 if pos > 0.7 else 0.0)  # extra friction where the slats bend round the curve
    acc = (push_acc if pos < push_until else 0.0) - f_track * np.sign(vel) * (vel > 0)
    vel = max(0.0, vel + acc * dt); pos += vel * dt
    ts2.append(ts2[-1] + dt); ps.append(pos)
    if vel == 0.0 and pos > push_until: break
ru, rs = normalise(np.array(ts2), np.array(ps))
tambour, tambour_err = fit(ru, rs, 0.0, 1.0)
tambour_note = {'duration_s': round(ts2[-1], 2), 'assumed': ['push for the first 32% of travel', 'Coulomb track friction', 'double friction on the curve']}

result = {
    'drawer': {'source': 'measured, Pexels 6631284', 'cubicBezier': drawer, 'rmse': round(drawer_err, 4), **drawer_note},
    'hinge': {'source': 'modelled', 'cubicBezier': hinge, 'rmse': round(hinge_err, 4), **hinge_note},
    'tambour': {'source': 'modelled', 'cubicBezier': tambour, 'rmse': round(tambour_err, 4), **tambour_note},
}
json.dump(result, open(os.path.join(OUT, 'curves.json'), 'w'), indent=1)
print(json.dumps(result, indent=1))

# plot: data (dots) and fitted curve (line) for each
W, H, pad = 1500, 520, 40
img = np.full((H, W, 3), 255, np.uint8)
for col, (name, (u, s), params) in enumerate([('drawer (measured)', (du, ds), drawer), ('hinge (model)', (hu, hs), hinge), ('tambour (model)', (ru, rs), tambour)]):
    x0 = col * 500 + pad; w = 500 - 2 * pad; h = H - 2 * pad - 30
    cv2.rectangle(img, (x0, pad), (x0 + w, pad + h), (200, 200, 200), 1)
    cv2.putText(img, name, (x0, H - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    for uu, ss in zip(u[::max(1, len(u) // 60)], s[::max(1, len(s) // 60)]):
        cv2.circle(img, (int(x0 + uu * w), int(pad + h - ss * h)), 3, (40, 40, 220), -1)
    bx, by = bezier(*params)
    pts = np.stack([x0 + bx * w, pad + h - by * h], 1).astype(np.int32)
    cv2.polylines(img, [pts], False, (30, 120, 30), 2)
cv2.imwrite(os.path.join(OUT, 'curves.png'), img)
