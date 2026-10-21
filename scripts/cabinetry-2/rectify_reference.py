"""Rectify the laptop screen in the reference reel to a flat 1440x900 frame.

The reel (ScreenRecording_10-20-2026 09-02-52_1.mov, repo root) films an M1
MacBook Air (16:10, 1440x900 points by default) from a locked camera, so one
homography covers every frame. The screen edges were found as transitions from
the black bezel in a per-pixel max over the hero frames, then fitted as lines;
corner points are their intersections.

Input:  output/cabinetry-2/ref/raw/f_NNNN.png (crop 1320x920 at y=1000 of the
        recording, every native frame; see docs/demos/cabinetry-2.md)
Output: output/cabinetry-2/ref/rect/r_NNNN.jpg and H.json
"""
import glob, json, os, sys
import cv2
import numpy as np

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'output', 'cabinetry-2', 'ref')
OUT_W, OUT_H = 1440, 900

# Edge samples (crop coordinates), cleaned of points where dark page content
# met the bezel.
LEFT = [(17, 240), (18, 260), (19, 280), (20, 300), (22, 320), (23, 340), (24, 360), (26, 380), (27, 400), (28, 420),
        (30, 440), (32, 460), (33, 480), (34, 500), (34, 520), (35, 540), (37, 560), (37, 580), (43, 640), (44, 660),
        (45, 680), (47, 700), (47, 720), (47, 740), (48, 760), (49, 780)]
RIGHT = [(1308, 180), (1307, 200), (1306, 220), (1304, 240), (1303, 260), (1301, 280), (1300, 300), (1298, 320),
         (1297, 340), (1296, 360), (1294, 380), (1293, 400), (1292, 420), (1290, 440), (1285, 560), (1284, 580),
         (1283, 600), (1281, 620), (1280, 640), (1279, 660), (1278, 680), (1276, 700)]
TOP = [(100, 73), (150, 74), (200, 75), (250, 75), (300, 76), (350, 76), (400, 76), (450, 77), (500, 76), (550, 76),
       (600, 77), (650, 78), (700, 78), (750, 78), (800, 78), (850, 78), (900, 78), (1200, 81)]
BOTTOM = [(100, 843), (150, 842), (550, 837), (1000, 836)]


def fit(points, vertical):
    p = np.array(points, float)
    if vertical:  # x = a*y + b
        a, b = np.polyfit(p[:, 1], p[:, 0], 1)
        return ('v', a, b)
    a, b = np.polyfit(p[:, 0], p[:, 1], 1)  # y = a*x + b
    return ('h', a, b)


def meet(v, h):
    _, av, bv = v
    _, ah, bh = h
    # x = av*y + bv ; y = ah*x + bh
    y = (ah * bv + bh) / (1 - ah * av)
    return (av * y + bv, y)


def main():
    left, right, top, bottom = fit(LEFT, True), fit(RIGHT, True), fit(TOP, False), fit(BOTTOM, False)
    src = np.float32([meet(left, top), meet(right, top), meet(right, bottom), meet(left, bottom)])
    dst = np.float32([[0, 0], [OUT_W, 0], [OUT_W, OUT_H], [0, OUT_H]])
    H = cv2.getPerspectiveTransform(src, dst)
    os.makedirs(os.path.join(REF, 'rect'), exist_ok=True)
    json.dump({'corners_crop_px': src.tolist(), 'H': H.tolist(), 'out': [OUT_W, OUT_H]},
              open(os.path.join(REF, 'H.json'), 'w'), indent=1)
    print('corners', src.round(1).tolist())
    only = sys.argv[1:]  # optional frame numbers
    for f in sorted(glob.glob(os.path.join(REF, 'raw', 'f_*.png'))):
        n = os.path.basename(f)[2:6]
        if only and n not in only:
            continue
        im = cv2.imread(f)
        r = cv2.warpPerspective(im, H, (OUT_W, OUT_H), flags=cv2.INTER_CUBIC)
        cv2.imwrite(os.path.join(REF, 'rect', f'r_{n}.jpg'), r, [cv2.IMWRITE_JPEG_QUALITY, 94])


if __name__ == '__main__':
    main()
