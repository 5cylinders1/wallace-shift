"""Export the Complete Painting imagery for the web.

Reads the hero plates from output/painting/plate/ (composite.py) and the
section photos from output/painting/ (generate.py), and writes WebP to
public/demos/painting/, plus:

- studio/sample.jpg, the color studio's sample house (the weathered plate);
- preview.jpg (1200x630) for link previews and the contractors lander: the
  house split down the middle, before on the left and complete on the right.

The hero frames keep the full 1536x1024 source at both sizes, because the
page places its paint passes in source coordinates; the canvas crops.

    python3 scripts/painting/export.py
"""
from __future__ import annotations
import os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'output', 'painting')
PLATE = os.path.join(WORK, 'plate')
PUBLIC = os.path.join(ROOT, 'public', 'demos', 'painting')
os.makedirs(os.path.join(PUBLIC, 'studio'), exist_ok=True)


def webp(source: str, out: str, quality: int, width: int | None = None) -> None:
    args = ['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-sharp_yuv', '-metadata', 'none']
    if width:
        args += ['-resize', str(width), '0']
    subprocess.run(args + [source, '-o', os.path.join(PUBLIC, out)], check=True)
    print(out, os.path.getsize(os.path.join(PUBLIC, out)) // 1024, 'KB')


def sips(*args: str) -> None:
    subprocess.run(['sips', *args], check=True, capture_output=True)


for stage in ['weathered', 'prepped', 'primed', 'painted', 'finished']:
    source = os.path.join(PLATE, f'{stage}.png')
    webp(source, f'hero-{stage}.webp', 82)
    webp(source, f'hero-{stage}-mobile.webp', 80, 1024)

for name, out in [('finished', 'exterior'), ('interior', 'interior'), ('cabinets', 'cabinets'), ('carpentry', 'carpentry'), ('commercial', 'commercial')]:
    source = os.path.join(PLATE if name == 'finished' else WORK, f'{name}.png')
    webp(source, f'service-{out}.webp', 80, 1200)
    webp(source, f'service-{out}-small.webp', 78, 720)

# The studio's sample house: a JPEG well under the 2 MB upload limit.
sample = os.path.join(PUBLIC, 'studio', 'sample.jpg')
sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '86', os.path.join(PLATE, 'weathered.png'), '--out', sample)
print('studio/sample.jpg', os.path.getsize(sample) // 1024, 'KB')

# Link preview: before on the left half, complete on the right, cropped to 1.905:1.
script = (
    'import sys; from PIL import Image\n'
    'a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")\n'
    'w, h = a.size; split = 745\n'
    'out = a.copy(); out.paste(b.crop((split, 0, w, h)), (split, 0))\n'
    'top = 70; out = out.crop((0, top, w, top + round(w / 1.905))).resize((1200, 630), Image.LANCZOS)\n'
    'out.save(sys.argv[3], quality=84)\n'
)
# Pillow lives in the same scratch virtualenv as composite.py; name it with PAINTING_PYTHON.
python = os.environ.get('PAINTING_PYTHON', 'python3')
subprocess.run([python, '-c', script, os.path.join(PLATE, 'weathered.png'), os.path.join(PLATE, 'finished.png'),
                os.path.join(PUBLIC, 'preview.jpg')], check=True)
print('preview.jpg', os.path.getsize(os.path.join(PUBLIC, 'preview.jpg')) // 1024, 'KB')
