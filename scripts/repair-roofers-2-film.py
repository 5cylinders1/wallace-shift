"""Repair the two unfinished roof planes using existing footage only.

Run with OpenCV and NumPy installed. All source/master/QA files stay in output/.
This script never calls a generation service or writes public website assets.
"""

import argparse
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/roofers-2"
SOURCE = OUT / "roof-truck-schedule-source.mp4"
DONOR = OUT / "roof-refined-source.mp4"
START = 7.65
FINISHED = 8.85

# Points are in the 1918x1080 source coordinate system. The taller plane's
# polygon excludes the projecting gable and preserves its original flashing.
PLANES = [
    dict(name="front", source=[[407, 455], [596, 453], [538, 585], [435, 589]],
         target=[[349, 456], [558, 452], [485, 591], [373, 596]],
         polygon=[[349, 456], [558, 452], [485, 591], [373, 596]]),
    dict(name="tall", source=[[582, 380], [715, 386], [601, 609], [538, 584]],
         target=[[554, 378], [674, 384], [535, 618], [485, 592]],
         polygon=[[554, 378], [674, 384], [650, 419], [683, 424],
                  [535, 618], [485, 592], [558, 452], [499, 452]]),
]


def last_frame(path):
    cap = cv2.VideoCapture(str(path))
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"Cannot read final frame from {path}")
    return frame


def track_plane(grays, polygon, target):
    """Track backward on the original plane, then smooth subpixel estimates."""
    height, width = grays[-1].shape
    mask = np.zeros((height, width), np.uint8)
    cv2.fillPoly(mask, [np.round(polygon).astype(np.int32)], 255)
    mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))
    points = cv2.goodFeaturesToTrack(grays[-1], 250, .004, 4, mask=mask)
    if points is None or len(points) < 12:
        raise RuntimeError("Too few roof tracking features")
    origin = points.copy()
    positions = [None] * len(grays)
    positions[-1] = target.copy()
    confidence = []
    for i in range(len(grays) - 2, -1, -1):
        new, status, _ = cv2.calcOpticalFlowPyrLK(
            grays[i + 1], grays[i], points, None,
            winSize=(31, 31), maxLevel=3,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, .005))
        back, reverse_status, _ = cv2.calcOpticalFlowPyrLK(
            grays[i], grays[i + 1], new, None, winSize=(31, 31), maxLevel=3)
        valid = (status[:, 0] == 1) & (reverse_status[:, 0] == 1)
        valid &= np.linalg.norm(back[:, 0] - points[:, 0], axis=1) < 1.0
        points, origin = new[valid], origin[valid]
        if len(points) < 12:
            raise RuntimeError(f"Roof tracking lost at local frame {i}")
        transform, inliers = cv2.findHomography(origin, points, cv2.RANSAC, 1.5)
        if transform is None or inliers.sum() < 10:
            raise RuntimeError(f"Unreliable roof alignment at local frame {i}")
        positions[i] = cv2.perspectiveTransform(target[None], transform)[0]
        confidence.append(int(inliers.sum()))
    positions = np.array(positions)
    times = np.linspace(-1, 0, len(grays))
    smoothed = positions.copy()
    # The known final coordinates remain an exact anchor.
    for vertex in range(4):
        for dimension in range(2):
            fitted = np.polyval(np.polyfit(times, positions[:, vertex, dimension], 3), times)
            smoothed[:, vertex, dimension] = fitted + target[vertex, dimension] - fitted[-1]
    return smoothed.astype(np.float32), min(confidence)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true", help="Only render the corrected closing frame")
    args = parser.parse_args()
    donor, final = last_frame(DONOR), last_frame(SOURCE)
    height, width = final.shape[:2]
    if (width, height) != (1918, 1080):
        raise RuntimeError("Review the plane coordinates before using a different source resolution")
    patches = []
    for plane in PLANES:
        source = np.float32(plane["source"])
        target = np.float32(plane["target"])
        polygon = np.float32(plane["polygon"])
        mapping = cv2.getPerspectiveTransform(source, target)
        texture = cv2.warpPerspective(donor, mapping, (width, height), flags=cv2.INTER_CUBIC)
        mask = np.zeros((height, width), np.float32)
        cv2.fillPoly(mask, [polygon.astype(np.int32)], 1.0)
        mask = cv2.GaussianBlur(mask, (3, 3), .6)
        patches.append(dict(plane=plane, target=target, polygon=polygon,
                            texture=texture, mask=mask))
    preview = final.astype(np.float32)
    for patch in patches:
        alpha = patch["mask"][..., None]
        preview = preview * (1 - alpha) + patch["texture"] * alpha
    cv2.imwrite(str(OUT / "roof-repair-preview.jpg"), np.clip(preview, 0, 255).astype(np.uint8))
    if args.preview:
        return

    cap = cv2.VideoCapture(str(SOURCE))
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    first = int(START * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, first)
    grays = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        grays.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    cap.release()
    tracking = {}
    for patch in patches:
        positions, confidence = track_plane(grays, patch["polygon"], patch["target"])
        patch["positions"] = positions
        tracking[patch["plane"]["name"]] = dict(minimumInliers=confidence,
                                                       firstQuad=positions[0].tolist(), lastQuad=positions[-1].tolist())

    master = OUT / "roof-completed-master.mkv"
    encoder = subprocess.Popen([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
        "-pixel_format", "bgr24", "-video_size", f"{width}x{height}", "-framerate", str(fps),
        "-i", "pipe:0", "-an", "-c:v", "ffv1", "-level", "3", str(master)], stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(str(SOURCE))
    changed_pixels_outside_roof = 0
    sample_frames = {round(t * fps): t for t in [7.65, 8.0, 8.25, 8.5, 8.85, 9.0, 9.5, 10.0]}
    yy = np.indices((height, width))[0].astype(np.float32)
    for index in range(count):
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError(f"Cannot decode source frame {index}")
        original = frame
        if index >= first:
            result = frame.astype(np.float32)
            union = np.zeros((height, width), np.float32)
            for patch in patches:
                progress = np.clip((index / fps - START) / (FINISHED - START), 0, 1)
                # Material advances up the roof, in narrow courses, before departure.
                low, high = patch["polygon"][:, 1].min(), patch["polygon"][:, 1].max()
                threshold = high + 5 - progress * (high - low + 10)
                reveal = np.clip((yy - threshold) / 3 + .5, 0, 1)
                mask = patch["mask"] * reveal
                transform = cv2.getPerspectiveTransform(patch["target"], patch["positions"][index - first])
                texture = cv2.warpPerspective(patch["texture"], transform, (width, height), flags=cv2.INTER_CUBIC)
                alpha = cv2.warpPerspective(mask, transform, (width, height), flags=cv2.INTER_LINEAR)
                union = np.maximum(union, alpha)
                result = result * (1 - alpha[..., None]) + texture * alpha[..., None]
            frame = np.clip(np.round(result), 0, 255).astype(np.uint8)
            changed_pixels_outside_roof += int(np.count_nonzero(np.any(frame != original, axis=2) & (union == 0)))
        encoder.stdin.write(frame.tobytes())
        if index in sample_frames:
            cv2.imwrite(str(OUT / f"roof-repair-{sample_frames[index]:.2f}s.jpg"), frame)
    cap.release()
    encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError("Master encoder failed")
    report = dict(source=str(SOURCE), donor=str(DONOR), master=str(master), frames=count,
                  fps=fps, replacementBegins=START, bothPlanesComplete=FINISHED,
                  tracking=tracking, changedPixelsOutsideRoofMasks=changed_pixels_outside_roof,
                  runwayCreditsSpent=0)
    (OUT / "roof-repair-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
