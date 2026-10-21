"""Scroll position of the reference reel, read from the macOS overlay scrollbar.

The thumb (x 1431-1436 in the rectified 1440x900 frame) is 72 px on a track
that runs from about y=92 to y=900, so the document is trackLen/thumbLen = 11.2
viewports tall. Scroll in viewport heights (vh) is
    (thumbTop - TRACK_TOP) / (TRACK_LEN - THUMB_LEN) * (DOC_VH - 1).
Before the first scroll the overlay scrollbar is hidden: scroll is 0 there.
Writes output/cabinetry-2/ref/scroll.json: [frame, seconds, scroll_vh].
"""
import glob, json, os
import cv2
import numpy as np

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'output', 'cabinetry-2', 'ref')
TRACK_TOP, TRACK_BOTTOM, THUMB_LEN = 92, 900, 72
TRACK_LEN = TRACK_BOTTOM - TRACK_TOP
DOC_VH = TRACK_LEN / THUMB_LEN
LOOP_FRAME = 480  # the reel restarts here


def thumb_top(path):
    g = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2GRAY).astype(np.float32)
    on = (g[:, 1432:1436].mean(1) - g[:, 1418:1423].mean(1)) > 45
    on[:95] = False
    on[880:] = False
    ys = np.where(on)[0]
    if len(ys) < 20:
        return None
    run = max(np.split(ys, np.where(np.diff(ys) > 3)[0] + 1), key=len)
    # the thumb bottom is steadier than the top when the page behind is bright
    return float(run[-1] - THUMB_LEN + 1) if len(run) < THUMB_LEN - 4 else float(run[0])


def main():
    pts = [float(x) for x in open(os.path.join(REF, 'pts.txt')).read().split()]
    frames = sorted(glob.glob(os.path.join(REF, 'rect', 'r_*.jpg')))[:LOOP_FRAME]
    tops = [thumb_top(f) for f in frames]
    # Reject detections that break the steady descent (the island crossing the
    # right edge can masquerade as the thumb): compare with a running median.
    ok = [i for i, v in enumerate(tops) if v is not None]
    raw = list(tops)
    for i in ok:
        near = [raw[k] for k in ok if abs(k - i) <= 12 and k != i]
        if near and abs(tops[i] - float(np.median(near))) > 25:
            tops[i] = None
    known = [i for i, v in enumerate(tops) if v is not None]
    out = []
    for i, v in enumerate(tops):
        if i < known[0]:
            s = 0.0
        else:
            if v is None:  # interpolate gaps (thumb hidden behind a bright frame)
                lo = max(k for k in known if k <= i)
                hi = min((k for k in known if k >= i), default=lo)
                v = tops[lo] if hi == lo else tops[lo] + (tops[hi] - tops[lo]) * (i - lo) / (hi - lo)
            s = max(0.0, (v - TRACK_TOP) / (TRACK_LEN - THUMB_LEN) * (DOC_VH - 1))
        out.append([i, pts[i], s])
    # Scroll only moves forward in this clip; enforce that, then light smoothing
    # of the 1 px quantization (5-frame centred mean).
    vals = np.maximum.accumulate([o[2] for o in out])
    sm = np.convolve(np.pad(vals, 2, mode='edge'), np.ones(5) / 5, mode='valid')
    out = [[o[0], o[1], round(float(v), 4)] for o, v in zip(out, sm)]
    json.dump({'doc_vh': DOC_VH, 'frames': out}, open(os.path.join(REF, 'scroll.json'), 'w'))
    print(f'document {DOC_VH:.2f} viewports; first thumb at frame {known[0]}; scroll at loop {out[-1][2]:.2f} vh')


if __name__ == '__main__':
    main()
