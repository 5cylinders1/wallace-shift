"""Export the generated Trawsome imagery for the web.

Reads output/lawn/<name>.png (made by generate.py) and writes WebP to
public/demos/lawn/, plus preview.jpg (1200x630) for the contractors lander
and link previews. The hero stages keep the full 1536x1024 frame at both
sizes, because the page places its mowing passes in source coordinates;
the canvas does the cropping.

    python3 scripts/lawn/export.py
"""
from __future__ import annotations
import os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'lawn')
PUBLIC = os.path.join(ROOT, 'public', 'demos', 'lawn')
os.makedirs(PUBLIC, exist_ok=True)


def webp(name: str, out: str, quality: int, width: int | None = None, crop: tuple[int, int, int, int] | None = None) -> None:
    args = ['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-sharp_yuv', '-metadata', 'none']
    if crop:
        args += ['-crop', *map(str, crop)]
    if width:
        args += ['-resize', str(width), '0']
    subprocess.run(args + [os.path.join(WORK, f'{name}.png'), '-o', os.path.join(PUBLIC, out)], check=True)
    print(out, os.path.getsize(os.path.join(PUBLIC, out)) // 1024, 'KB')


for stage in ['overgrown', 'mowed', 'finished']:
    webp(stage, f'hero-{stage}.webp', 80)
    webp(stage, f'hero-{stage}-mobile.webp', 78, 1000)

for name in ['edge', 'beds', 'leaves']:
    webp(name, f'{name}.webp', 80, 1200)
    webp(name, f'{name}-small.webp', 78, 720)

# 1200x630 link preview: the finished yard, cropped to 1.905:1 around the house.
preview = os.path.join(PUBLIC, 'preview.jpg')
subprocess.run(['sips', '-c', '806', '1536', '--cropOffset', '120', '0', os.path.join(WORK, 'finished.png'), '--out', preview], check=True, capture_output=True)
subprocess.run(['sips', '-z', '630', '1200', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', preview, '--out', preview], check=True, capture_output=True)
print('preview.jpg', os.path.getsize(preview) // 1024, 'KB')
