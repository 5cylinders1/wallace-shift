"""Export the generated build sequences for the web, plus the lander preview.

Reads output/cabinetry/hero/<stage>.png (kitchen) and hero/<room>/<stage>.png
(bath, library), made by generate_hero.py. Where align_check.py --fix saved a
<stage>.aligned.png, that version is used. Writes WebP at the source 1536x1024
to public/demos/cabinetry/hero/[<room>/]<stage>.webp, and
public/demos/cabinetry/preview.jpg (1200x630) from the finished kitchen.
"""
import os, subprocess
import cv2
from paths import PUBLIC, WORK

QUALITY = {'finished': 84, 'evening': 84, 'blueprint': 86, 'wireframe': 86}
ROOMS = {
    '': ['framing', 'roughin', 'drywall', 'cabinetry', 'finished', 'blueprint', 'wireframe'],
    'bath': ['framing', 'roughin', 'drywall', 'vanity', 'finished', 'evening', 'blueprint', 'wireframe'],
    'library': ['framing', 'drywall', 'boxes', 'cabinetry', 'finished', 'evening', 'blueprint', 'wireframe'],
}
for room, stages in ROOMS.items():
    out = os.path.join(PUBLIC, 'hero', room)
    os.makedirs(out, exist_ok=True)
    for stage in stages:
        folder = os.path.join(WORK, 'hero', room)
        aligned = os.path.join(folder, f'{stage}.aligned.png')
        src = aligned if os.path.exists(aligned) else os.path.join(folder, f'{stage}.png')
        if not os.path.exists(src):
            print(f'missing {room}/{stage}'); continue
        subprocess.run(['cwebp', '-quiet', '-q', str(QUALITY.get(stage, 82)), '-m', '6', '-sharp_yuv', src, '-o', os.path.join(out, f'{stage}.webp')], check=True)
        print(f'hero/{room + "/" if room else ""}{stage}.webp{" (aligned)" if src == aligned else ""}')

finished = cv2.imread(os.path.join(WORK, 'hero', 'finished.png'))
scaled = cv2.resize(finished, (1200, 800), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(PUBLIC, 'preview.jpg'), scaled[96:96 + 630], [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
print('preview.jpg')
