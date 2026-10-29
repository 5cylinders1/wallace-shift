"""Put every hero stage on one plate, so the timelapse changes only the paint.

Each edit from generate.py can drift by a pixel or two and re-render the
sky, trees and lawn slightly differently. This aligns every stage to the
finished frame (SIFT matches, a RANSAC similarity transform), finds where
it really differs from the finished frame (paint, prep, masking, drop
cloths), and pastes only those parts onto the finished frame through a
feathered mask. Everything else is the finished frame's own pixels, so the
canvas transitions can never reveal a seam outside the work.

Needs numpy, Pillow and opencv-python-headless (any scratch virtualenv):

    <venv>/bin/python scripts/painting/composite.py

Writes output/painting/plate/<stage>.png and <stage>-mask.png for review.
"""
import json, os
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'painting')
OUT = os.path.join(WORK, 'plate')
os.makedirs(OUT, exist_ok=True)

STAGES = ['weathered', 'prepped', 'primed', 'painted']
# Lab distance that counts as a real change, before cleanup and feathering.
THRESHOLD = 7.0
# Stages whose paint should equal the finished frame's, so the last fade has no hue jump.
COLOR_MATCH = {'painted'}
# The house in source pixels (keep in step with HOUSE in src/demos/painting/Hero.tsx).
HOUSE = (136, 80, 1352, 868)
# Where the work happens, traced on the finished frame: the house below its
# roofline, and the foundation band where the drop cloths lie. The edits also
# re-render trees, sky and lawn slightly; outside this area the plate wins.
WORK_AREA = [
    [(136, 800), (136, 505), (258, 298), (300, 198), (925, 198), (1080, 80), (1356, 285), (1356, 800)],
    [(70, 896), (136, 800), (1356, 800), (1505, 878), (1505, 896)],
]


def read(name: str) -> np.ndarray:
    image = cv2.imread(os.path.join(WORK, f'{name}.png'), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit(f'missing output/painting/{name}.png')
    return image


def align(moving: np.ndarray, fixed: np.ndarray) -> tuple[np.ndarray, dict]:
    sift = cv2.SIFT_create(nfeatures=6000)
    kp1, d1 = sift.detectAndCompute(cv2.cvtColor(moving, cv2.COLOR_BGR2GRAY), None)
    kp2, d2 = sift.detectAndCompute(cv2.cvtColor(fixed, cv2.COLOR_BGR2GRAY), None)
    matches = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in matches if m.distance < 0.7 * n.distance]
    src = np.float32([kp1[m.queryIdx].pt for m in good])
    dst = np.float32([kp2[m.trainIdx].pt for m in good])
    matrix, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.0)
    h, w = fixed.shape[:2]
    corners = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    moved = corners @ matrix[:, :2].T + matrix[:, 2]
    shift = float(np.abs(moved - corners).max())
    report = {'matches': len(good), 'inliers': int(inliers.sum()), 'max_corner_shift_px': round(shift, 2)}
    if shift < 0.5:
        return moving, report
    warped = cv2.warpAffine(moving, matrix, (w, h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    return warped, report


def match_color(stage: np.ndarray, plate: np.ndarray) -> tuple[np.ndarray, float]:
    """Fit an affine Lab transform on the house's unmasked surfaces and apply it."""
    x0, y0, x1, y1 = HOUSE
    a = cv2.cvtColor(stage, cv2.COLOR_BGR2LAB).astype(np.float32)
    b = cv2.cvtColor(plate, cv2.COLOR_BGR2LAB).astype(np.float32)
    region_a = a[y0:y1, x0:x1].reshape(-1, 3)
    region_b = b[y0:y1, x0:x1].reshape(-1, 3)
    keep = np.sqrt(((region_a - region_b) ** 2).sum(axis=1)) < 30
    for _ in range(3):
        design = np.hstack([region_a[keep], np.ones((int(keep.sum()), 1), np.float32)])
        matrix, *_ = np.linalg.lstsq(design, region_b[keep], rcond=None)
        fitted = np.hstack([region_a, np.ones((len(region_a), 1), np.float32)]) @ matrix
        residual = np.sqrt(((fitted - region_b) ** 2).sum(axis=1))
        keep = residual < max(6.0, float(np.percentile(residual[keep], 80)))
    whole = np.hstack([a.reshape(-1, 3), np.ones((a.shape[0] * a.shape[1], 1), np.float32)]) @ matrix
    corrected = cv2.cvtColor(np.clip(whole.reshape(a.shape), 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    return corrected, float(np.median(residual[keep]))


def change_mask(stage: np.ndarray, plate: np.ndarray) -> np.ndarray:
    a = cv2.cvtColor(cv2.GaussianBlur(stage, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    b = cv2.cvtColor(cv2.GaussianBlur(plate, (5, 5), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    # OpenCV's 8-bit Lab scales L to 0..255; bring it back to 0..100.
    a[..., 0] *= 100 / 255
    b[..., 0] *= 100 / 255
    distance = np.sqrt(((a - b) ** 2).sum(axis=2))
    mask = (distance > THRESHOLD).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # Close the gaps between changed boards and fill the inside of each region.
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(mask)
    for contour in contours:
        if cv2.contourArea(contour) >= 400:
            cv2.drawContours(filled, [contour], -1, 255, thickness=cv2.FILLED)
    filled = cv2.dilate(filled, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    return cv2.GaussianBlur(filled, (0, 0), 5)


def work_area(shape: tuple[int, ...]) -> np.ndarray:
    area = np.zeros(shape[:2], np.uint8)
    for polygon in WORK_AREA:
        cv2.fillPoly(area, [np.int32(polygon)], 255)
    return cv2.GaussianBlur(area, (0, 0), 6).astype(np.float32) / 255


def main() -> None:
    plate = read('finished')
    area = work_area(plate.shape)
    cv2.imwrite(os.path.join(OUT, 'finished.png'), plate)
    report = {}
    for name in STAGES:
        aligned, stats = align(read(name), plate)
        if name in COLOR_MATCH:
            aligned, residual = match_color(aligned, plate)
            stats['color_match_median_residual'] = round(residual, 2)
        alpha = (change_mask(aligned, plate).astype(np.float32) * area).round().astype(np.uint8)
        a = (alpha.astype(np.float32) / 255)[..., None]
        composite = (aligned.astype(np.float32) * a + plate.astype(np.float32) * (1 - a)).round().astype(np.uint8)
        cv2.imwrite(os.path.join(OUT, f'{name}.png'), composite)
        cv2.imwrite(os.path.join(OUT, f'{name}-mask.png'), alpha)
        stats['changed_share'] = round(float((alpha > 127).mean()), 3)
        report[name] = stats
        print(name, stats)
    json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
