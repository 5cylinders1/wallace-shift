"""Keep underlayment in place in the existing roofing film, without generation.

Input is the locally repaired completed-roof master. Output and review frames
stay in ignored output/. Nothing is uploaded and no public asset is replaced.
"""

import argparse
import json
from pathlib import Path
import subprocess

import cv2
import numpy as np

cv2.setNumThreads(4)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/roofers-2"
QA = OUT / "underlayment-qa"
SOURCE = OUT / "roof-completed-master.mkv"

# Rotoscope anchors at 3.0 and 7.65 seconds, in the 1918x1080 master.
# Separate slopes and dormer cutouts keep the stonework outside the composite.
PLANES = [
    dict(name="front-left", begin=1.45, end=1.85,
         a=[[397,458],[581,455],[521,589],[419,593]],
         b=[[365,454],[565,451],[497,592],[391,597]]),
    dict(name="left-gable", begin=1.65, end=2.45,
         a=[[584,382],[699,386],[681,421],[710,426],[577,610],[524,590],[587,454],[521,454]],
         b=[[567,378],[686,383],[662,420],[696,424],[549,616],[500,593],[568,453],[504,452]]),
    dict(name="left-hip", begin=2.05, end=2.7,
         a=[[655,381],[752,328],[718,399],[700,385]],
         b=[[651,378],[748,323],[700,399],[683,383]]),
    dict(name="main", begin=1.9, end=2.7,
         a=[[756,330],[1030,335],[1202,452],[1198,472],[1074,473],[991,355],[903,477],[764,475],[718,401]],
         b=[[750,324],[1036,330],[1212,451],[1206,472],[1073,473],[980,350],[896,478],[746,475],[701,398]]),
    dict(name="rear-right", begin=2.2, end=2.8,
         a=[[1063,355],[1137,360],[1150,372],[1225,374],[1256,398],[1218,399],[1205,448]],
         b=[[1070,353],[1145,355],[1160,366],[1236,370],[1270,397],[1228,398],[1214,447]]),
    dict(name="connector", begin=2.15, end=2.85,
         a=[[1218,399],[1354,403],[1351,494],[1281,551],[1244,560],[1143,542],[1198,472]],
         b=[[1230,399],[1367,402],[1364,497],[1290,555],[1251,564],[1146,546],[1207,472]],
         hole_a=[[1245,455],[1264,464],[1269,456],[1338,458],[1335,495],[1281,546],[1251,541],[1219,530],[1219,483],[1211,478]],
         hole_b=[[1258,455],[1277,464],[1282,456],[1351,458],[1348,498],[1294,549],[1264,544],[1232,533],[1232,483],[1224,478]]),
    dict(name="garage-front", begin=2.15, end=2.85,
         a=[[1427,411],[1436,413],[1423,598],[1240,566],[1355,491]],
         b=[[1435,410],[1446,412],[1440,603],[1249,570],[1369,496]]),
    dict(name="garage-side", begin=2.3, end=2.9,
         a=[[1440,413],[1499,474],[1590,586],[1427,598]],
         b=[[1451,413],[1518,476],[1620,593],[1446,603]],
         hole_a=[[1453,473],[1480,474],[1504,479],[1531,514],[1528,561],[1480,568],[1457,514]],
         hole_b=[[1467,475],[1494,475],[1520,480],[1547,517],[1546,566],[1495,572],[1470,516]]),
]


def smoothstep(a, b, x):
    p = np.clip((x - a) / (b - a), 0, 1)
    return p * p * (3 - 2 * p)


def points_at(plane, name, t):
    # Motion is deliberately anchored through dusk as well as the workdays.
    p = np.interp(t, [1.25, 2, 3, 5.5, 7.65, 9.1], [-.35, -.18, 0, .47, 1, 1.2])
    a = np.float32(plane[name + "a"])
    b = np.float32(plane[name + "b"])
    return a + (b - a) * p


def composite(frame, t):
    if t < 1.4 or t >= 9.1:
        return frame, np.zeros(frame.shape[:2], np.float32)
    original = frame
    left, top, right, bottom = 300, 300, 1660, 625
    frame = original[top:bottom, left:right]
    height, width = frame.shape[:2]
    offset = np.float32([left, top])
    base = frame.astype(np.float32)
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(np.float32)
    diffuse = cv2.GaussianBlur(base, (9, 9), 2.0)
    luminance = cv2.cvtColor(diffuse, cv2.COLOR_BGR2GRAY)
    # Warm bare decking is selected, not dark shingles, silver ladder rails,
    # dark workwear, yellow-green vests or red helmets.
    wood = smoothstep(0, 2, hsv[..., 0]) * (1 - smoothstep(24, 29, hsv[..., 0]))
    wood *= smoothstep(9, 20, hsv[..., 1]) * (1 - smoothstep(210, 235, hsv[..., 1]))
    wood *= smoothstep(45, 70, hsv[..., 2])
    sunlit_wood = smoothstep(220, 235, hsv[..., 2]) * (1 - smoothstep(40, 65, hsv[..., 1]))
    wood = np.maximum(wood, sunlit_wood)
    # The ladder is the one neutral bright foreground object crossing the roof.
    if t > 7.2:
        ladder = np.zeros((height, width), np.uint8)
        cv2.fillPoly(ladder, [np.int32(np.float32([[1089,417],[1117,416],[1178,619],[1150,619]]) - offset)], 255)
        neutral = 1 - smoothstep(12, 40, hsv[..., 1])
        wood *= 1 - (ladder.astype(np.float32) / 255) * neutral
    # There are no people or shingles in the overnight interval. Its blue light
    # would defeat a daytime color key, so use the reviewed slope masks there.
    night = smoothstep(3.1, 3.5, t) * (1 - smoothstep(6.45, 6.85, t))
    # Keep dark flashing crisp instead of replacing it with blurred material.
    # This reference patch is bare decking throughout the overnight interval.
    reference_light = float(np.median(luminance[100:120, 490:515]))
    night_surface = smoothstep(reference_light * .37, reference_light * .65, luminance)
    selection = np.maximum(wood, night * night_surface)
    selection = cv2.GaussianBlur(selection, (3, 3), .45)
    yy = np.arange(height, dtype=np.float32)[:, None] + top
    union = np.zeros((height, width), np.float32)
    for plane in PLANES:
        polygon = points_at(plane, "", t)
        mask = np.zeros((height, width), np.uint8)
        cv2.fillPoly(mask, [np.round(polygon - offset).astype(np.int32)], 255)
        if "hole_a" in plane:
            cv2.fillPoly(mask, [np.round(points_at(plane, "hole_", t) - offset).astype(np.int32)], 0)
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
        mask = cv2.GaussianBlur(mask.astype(np.float32) / 255, (3, 3), .55)
        progress = smoothstep(plane["begin"], plane["end"], t)
        low, high = polygon[:, 1].min(), polygon[:, 1].max()
        threshold = high + 8 - progress * (high - low + 16)
        reveal = smoothstep(threshold - 3, threshold + 3, yy)
        union = np.maximum(union, mask * reveal)
    alpha = union * selection
    # Remove the plywood grain while retaining the scene's exposure/shadows.
    # The material is matte charcoal; slight illumination color follows the
    # source, including cool moonlight. Source roll/joint lines stay subdued.
    moon = smoothstep(4.2, 5.0, t) * (1 - smoothstep(6.1, 6.8, t))
    material = np.stack([luminance * (.45 + moon * .09) + 2,
                         luminance * .43 + 1,
                         luminance * (.41 - moon * .05)], axis=-1)
    result = np.rint(base * (1 - alpha[..., None]) + material * alpha[..., None])
    full = original.copy()
    full[top:bottom, left:right] = np.clip(result, 0, 255).astype(np.uint8)
    full_alpha = np.zeros(original.shape[:2], np.float32)
    full_alpha[top:bottom, left:right] = alpha
    return full, full_alpha


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(SOURCE))
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if (width, height, count) != (1918, 1080, 241):
        raise RuntimeError("This rotoscope is for the reviewed 241-frame source only")
    samples = {round(t * fps): t for t in [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3,
                                         3.5, 4.5, 5.5, 6.5, 7.25, 7.65, 8.25, 8.85, 9.5, 10]}
    master = OUT / "roof-underlayment-master.mkv"
    encoder = None
    if not args.preview:
        encoder = subprocess.Popen([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
            "-pixel_format", "bgr24", "-video_size", f"{width}x{height}", "-framerate", str(fps),
            "-i", "pipe:0", "-an", "-c:v", "ffv1", "-level", "3", str(master)], stdin=subprocess.PIPE)
    outside, truck, ending = 0, 0, 0
    for index in range(count):
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError(f"Cannot decode frame {index}")
        if args.preview and index not in samples:
            continue
        repaired, mask = composite(frame, index / fps)
        changed = np.any(repaired != frame, axis=2)
        outside += int(np.count_nonzero(changed & (mask == 0)))
        truck += int(np.count_nonzero(changed[620:, :]))
        if index / fps >= 9.1:
            ending += int(np.count_nonzero(changed))
        if encoder:
            encoder.stdin.write(repaired.tobytes())
        if index in samples:
            name = f"{samples[index]:.2f}"
            cv2.imwrite(str(QA / f"repaired-{name}.jpg"), repaired)
            cv2.imwrite(str(QA / f"mask-{name}.png"), np.uint8(mask * 255))
    cap.release()
    if encoder:
        encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError("Master encoding failed")
    report = dict(source=str(SOURCE), master=str(master), previewOnly=args.preview,
                  frames=count, fps=fps, changedPixelsOutsideMasks=outside,
                  changedPixelsInTruckAndDrivewayRegion=truck,
                  changedPixelsInCompletedEnding=ending, runwayCreditsSpent=0)
    (QA / ("preview-report.json" if args.preview else "repair-report.json")).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
