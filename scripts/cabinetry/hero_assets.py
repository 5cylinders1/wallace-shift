"""Export the generated hero build sequence for the web, plus the lander preview.

Reads output/cabinetry/hero/<stage>.png (made by generate_hero.py; stages were
checked to agree within about 1.5 px, so no warping is applied) and writes
public/demos/cabinetry/hero/<stage>.webp at the source 1536x1024, and
public/demos/cabinetry/preview.jpg (1200x630) from the finished kitchen.
"""
import os, subprocess
import cv2
from paths import PUBLIC, WORK

STAGES = {'framing': 82, 'roughin': 82, 'drywall': 82, 'cabinetry': 82, 'finished': 84, 'blueprint': 86, 'wireframe': 86}
OUT = os.path.join(PUBLIC, 'hero')
os.makedirs(OUT, exist_ok=True)
for stage, quality in STAGES.items():
    subprocess.run(['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-sharp_yuv', os.path.join(WORK, 'hero', f'{stage}.png'),
                    '-o', os.path.join(OUT, f'{stage}.webp')], check=True)
    print(f'hero/{stage}.webp')

finished = cv2.imread(os.path.join(WORK, 'hero', 'finished.png'))
scaled = cv2.resize(finished, (1200, 800), interpolation=cv2.INTER_AREA)
top = 96
cv2.imwrite(os.path.join(PUBLIC, 'preview.jpg'), scaled[top:top + 630], [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
print('preview.jpg')
