"""Prepare the widened hero plate from outpaint.py for the page.

The model redraws the middle of the image as well as the border, a little
smaller and shifted. So this finds where the original frame really sits in
the new view (SIFT matches on the trees, sky and lawn near the frame edges, a
RANSAC similarity transform), matches the surroundings' colour to the
original, and blends the original finished frame back into the middle
through a feathered edge. The page then draws each timelapse frame over the
plate at the printed inset with its own feather, over pixels that already
match, so no stage can show a seam.

    <venv>/bin/python scripts/painting/scene.py

Writes output/painting/plate/surround.png, public/demos/painting/
hero-surround.webp and hero-surround-mobile.webp, and prints the inset for
SCENE in src/demos/painting/Hero.tsx.
"""
import os, subprocess
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'painting')
PUBLIC = os.path.join(ROOT, 'public', 'demos', 'painting')
# Where outpaint.py placed the frame before the model moved it.
START = (276, 184, 983, 655)
# Share of the frame, at each edge, over which the original fades into the plate.
FEATHER = 0.07


def similarity(original: np.ndarray, plate: np.ndarray) -> np.ndarray:
    """The original frame's pixels to the plate's, from features outside the house."""
    x, y, w, h = START
    small = cv2.resize(original, (w, h), interpolation=cv2.INTER_AREA)
    band = np.full((h, w), 255, np.uint8)
    band[int(h * 0.12):int(h * 0.86), int(w * 0.14):int(w * 0.86)] = 0
    sift = cv2.SIFT_create(4000)
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), band)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY), None)
    good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.75 * b.distance]
    src = np.float32([np.array(k1[g.queryIdx].pt) * (original.shape[1] / w) for g in good])
    dst = np.float32([k2[g.trainIdx].pt for g in good])
    matrix, inliers = cv2.estimateAffinePartial2D(src, dst, ransacReprojThreshold=4)
    if matrix is None or inliers.sum() < 8:
        raise SystemExit('Could not place the original frame in the plate.')
    print(f'{int(inliers.sum())} of {len(good)} matches agree')
    return matrix


def main() -> None:
    plate = cv2.imread(os.path.join(WORK, 'surround.png'), cv2.IMREAD_COLOR)
    original = cv2.imread(os.path.join(WORK, 'plate', 'finished.png'), cv2.IMREAD_COLOR)
    matrix = similarity(original, plate)
    scale = float(np.hypot(matrix[0, 0], matrix[1, 0]))
    # Keep the frame square to the plate: the fitted rotation is a fraction of a degree.
    upright = np.float32([[scale, 0, matrix[0, 2]], [0, scale, matrix[1, 2]]])
    size = (plate.shape[1], plate.shape[0])
    warped = cv2.warpAffine(original, upright, size, flags=cv2.INTER_AREA)

    fh, fw = original.shape[:2]
    ramp_x = np.clip(np.minimum(np.arange(fw), fw - 1 - np.arange(fw)) / (fw * FEATHER), 0, 1)
    ramp_y = np.clip(np.minimum(np.arange(fh), fh - 1 - np.arange(fh)) / (fw * FEATHER), 0, 1)
    ramp = np.outer(ramp_y, ramp_x).astype(np.float32)
    ramp = ramp * ramp * (3 - 2 * ramp)
    alpha = cv2.warpAffine(ramp, upright, size, flags=cv2.INTER_LINEAR)[..., None]

    # Match the plate's colour to the original's where they overlap, away from the house.
    overlap = (cv2.warpAffine(np.ones((fh, fw), np.float32), upright, size) > 0.99)
    house = cv2.warpAffine(np.pad(np.ones((int(fh * 0.72), int(fw * 0.7)), np.float32),
                                  ((int(fh * 0.12), fh - int(fh * 0.12) - int(fh * 0.72)), (int(fw * 0.15), fw - int(fw * 0.15) - int(fw * 0.7)))),
                           upright, size) > 0.5
    region = overlap & ~house
    a = cv2.cvtColor(plate, cv2.COLOR_BGR2LAB).astype(np.float32)
    b = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB).astype(np.float32)
    for channel in range(3):
        pa, pb = a[..., channel][region], b[..., channel][region]
        gain = pb.std() / max(pa.std(), 1e-3)
        a[..., channel] = (a[..., channel] - pa.mean()) * gain + pb.mean()
        print(f'Lab channel {channel}: shift {pb.mean() - pa.mean():+.2f}, gain {gain:.3f}')
    matched = cv2.cvtColor(np.clip(a, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)

    result = (warped.astype(np.float32) * alpha + matched.astype(np.float32) * (1 - alpha)).round().astype(np.uint8)
    out = os.path.join(WORK, 'plate', 'surround.png')
    cv2.imwrite(out, result)
    for name, width, quality in [('hero-surround.webp', None, 80), ('hero-surround-mobile.webp', 1024, 78)]:
        args = ['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-sharp_yuv', '-metadata', 'none']
        if width:
            args += ['-resize', str(width), '0']
        subprocess.run(args + [out, '-o', os.path.join(PUBLIC, name)], check=True)
        print(name, os.path.getsize(os.path.join(PUBLIC, name)) // 1024, 'KB')
    print(f'SCENE = {{ width: {size[0]}, height: {size[1]}, x: {upright[0, 2]:.1f}, y: {upright[1, 2]:.1f}, scale: {scale:.4f} }}')


if __name__ == '__main__':
    main()
