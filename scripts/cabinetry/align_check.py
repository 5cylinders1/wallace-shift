"""Measure, and optionally correct, how far each build stage drifts from the finished room.

    python3 scripts/cabinetry/align_check.py bath roughin drywall vanity --fix
    python3 scripts/cabinetry/align_check.py bath framing --to roughin --fix

Every stage is matched straight to the room's finished.png on SIFT features,
using only the parts of the room that never change between stages (the window
and its surround, given per room in ANCHORS), and a similarity transform is
fitted with RANSAC. The report gives how far the image corners move. With
--fix, a stage that is off by more than 2 px is warped onto the finished frame
and saved as <stage>.aligned.png (the original stays); with --check, the
aligned versions are measured again.
"""
import os, sys
import cv2
import numpy as np
from paths import WORK

# x0, y0, x1, y1 boxes (1536x1024 space) around architecture that is the same in every stage.
ANCHORS = {
    'bath': [(600, 230, 960, 700)],
    'library': [(560, 200, 960, 640)],
}
args = sys.argv[1:]
to = args[args.index('--to') + 1] if '--to' in args else 'finished'
room, *stages = [a for i, a in enumerate(args) if not a.startswith('--') and not (i and args[i - 1] == '--to')]
fix, check = '--fix' in sys.argv, '--check' in sys.argv
folder = os.path.join(WORK, 'hero', room)
sift = cv2.SIFT_create(8000)
matcher = cv2.BFMatcher()
corners = np.float32([[0, 0], [1535, 0], [1535, 1023], [0, 1023]]).reshape(-1, 1, 2)
mask = np.zeros((1024, 1536), np.uint8)
for x0, y0, x1, y1 in ANCHORS.get(room, [(0, 0, 1536, 1024)]):
    mask[y0:y1, x0:x1] = 255

# The reference is the finished room, or with --to another (already aligned) stage.
ref_path = os.path.join(folder, f'{to}.aligned.png')
reference = cv2.imread(ref_path if os.path.exists(ref_path) else os.path.join(folder, f'{to}.png'))
kr, dr = sift.detectAndCompute(cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY), mask)

for stage in stages:
    path = os.path.join(folder, f'{stage}{".aligned" if check and os.path.exists(os.path.join(folder, f"{stage}.aligned.png")) else ""}.png')
    image = cv2.imread(path)
    ks, ds = sift.detectAndCompute(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), mask)
    pairs = [m for m, n in matcher.knnMatch(ds, dr, k=2) if m.distance < 0.8 * n.distance]
    if len(pairs) < 8:
        print(f'{stage:>10}: too few matches ({len(pairs)})'); continue
    src = np.float32([ks[m.queryIdx].pt for m in pairs]); dst = np.float32([kr[m.trainIdx].pt for m in pairs])
    m, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0, maxIters=20000, confidence=0.999)
    if m is None or not 0.9 < np.hypot(m[0, 0], m[0, 1]) < 1.1:
        print(f'{stage:>10}: no plausible fit ({int(inliers.sum()) if inliers is not None else 0}/{len(pairs)} inliers); try --to a closer stage'); continue
    h = np.vstack([m, [0, 0, 1]])
    d = float(np.abs(cv2.perspectiveTransform(corners, h) - corners).reshape(-1, 2).max())
    scale = float(np.hypot(m[0, 0], m[0, 1]))
    print(f'{os.path.basename(path):>22}: drift {d:6.1f}px  scale {scale:.4f}  shift {m[0, 2]:6.1f},{m[1, 2]:6.1f}  inliers {int(inliers.sum())}/{len(pairs)}')
    if fix and not check and d > 2:
        warped = cv2.warpAffine(image, m, (1536, 1024), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        cv2.imwrite(os.path.join(folder, f'{stage}.aligned.png'), warped)
        print(f'{"":>22}  saved {stage}.aligned.png')
