"""Export the cabinetry demo 02 renders for the web.

    PYTHONPATH=output/roofers-2/repair-python python3 scripts/cabinetry-2/export_web.py [seq] [stills] [swatches]

seq:      output/cabinetry-2/frames/{desktop,phone}/f_NNNN.png
          -> public/demos/cabinetry-2/seq/{desktop,phone}/f_NNN.webp (frames present so far)
stills:   output/cabinetry-2/details/*.png -> public/demos/cabinetry-2/<name>.webp,
          and preview.jpg (1200x630, lander card and og:image) from the last desktop frame
swatches: material swatches cut from the same CC0 scans the scene uses, tinted as
          in blender_build.py
Needs cwebp on PATH.
"""
import os, subprocess, sys
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'output', 'cabinetry-2')
PUB = os.path.join(ROOT, 'public', 'demos', 'cabinetry-2')
ASSETS = os.path.join(OUT, 'assets')


def webp(src, dst, q=74, resize=None):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ['cwebp', '-quiet', '-q', str(q), '-m', '6', '-sharp_yuv']
    if resize:
        cmd += ['-resize', str(resize[0]), str(resize[1])]
    subprocess.run(cmd + [src, '-o', dst], check=True)


def seq():
    for kind in ('desktop', 'phone'):
        folder = os.path.join(OUT, 'frames', kind)
        if not os.path.isdir(folder):
            continue
        total = 0
        names = sorted(f for f in os.listdir(folder) if f.endswith('.png'))
        for name in names:
            n = int(name[2:6])
            dst = os.path.join(PUB, 'seq', kind, f'f_{n:03d}.webp')
            src = os.path.join(folder, name)
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                webp(src, dst)
            total += os.path.getsize(dst)
        print(f'{kind}: {len(names)} frames, {total / 1e6:.1f} MB')


def stills():
    folder = os.path.join(OUT, 'details')
    if os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if name.endswith('.png'):
                webp(os.path.join(folder, name), os.path.join(PUB, name[:-4] + '.webp'), q=80)
                print('still', name)
    last = sorted(os.listdir(os.path.join(OUT, 'frames', 'desktop')))[-1]
    im = cv2.imread(os.path.join(OUT, 'frames', 'desktop', last))
    im = cv2.resize(im, (1200, 675), interpolation=cv2.INTER_AREA)[22:652]
    cv2.imwrite(os.path.join(PUB, 'preview.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    print('preview.jpg from', last)


def tint(img, sat=1.0, val=1.0):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def swatch(img, name, x, y, size, sat=1.0, val=1.0):
    crop = img[y:y + size, x:x + size]
    crop = tint(cv2.resize(crop, (600, 600), interpolation=cv2.INTER_AREA), sat, val)
    tmp = os.path.join(OUT, f'_{name}.png')
    cv2.imwrite(tmp, crop)
    webp(tmp, os.path.join(PUB, f'{name}.webp'), q=80)
    os.remove(tmp)
    print('swatch', name)


def swatches():
    oak = cv2.imread(os.path.join(ASSETS, 'oak_veneer_05', 'oak_veneer_05_rot_Diffuse_2k.jpg'))
    swatch(oak, 'swatch-oak', 520, 300, 900, sat=0.95)
    stone = cv2.imread(os.path.join(ASSETS, 'Marble014', 'Marble014_4K-JPG_Color.jpg'))
    swatch(stone, 'swatch-stone', 1400, 900, 1600)
    floor = cv2.imread(os.path.join(ASSETS, 'herringbone_parquet', 'herringbone_parquet_Diffuse_2k.jpg'))
    swatch(floor, 'swatch-floor', 300, 300, 1100, sat=0.85, val=0.62)
    # ink and bronze come from close-up renders (details/), when present
    for name in ('swatch-ink', 'swatch-bronze'):
        src = os.path.join(OUT, 'details', f'{name}.png')
        if os.path.exists(src):
            webp(src, os.path.join(PUB, f'{name}.webp'), q=80)
            print('swatch', name)


if __name__ == '__main__':
    jobs = sys.argv[1:] or ['seq', 'stills', 'swatches']
    for job in jobs:
        {'seq': seq, 'stills': stills, 'swatches': swatches}[job]()
