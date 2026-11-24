"""Export the lawn demo's imagery (Lareau Landscape & Design) for the web.

The hero's scroll timelapse frames are generated illustrations, made by
scripts/lawn/generate.py into output/lawn/<stage>.png. Every other image and
the project film come from the business's current website
(lareaulandscape.com/wp-content/uploads); this script downloads those
originals into output/lawn/source/ (ignored) once, then writes the web set
to public/demos/lawn/:

  hero-<stage>.webp, hero-<stage>-mobile.webp   the timelapse frames (overgrown, mowed, finished)
  film.mp4 / film.webm / film-mobile.mp4   the 2023 project film for "Our work", no audio
  film-poster.webp / film-poster-mobile.webp   its first frame
  <service>.webp, <service>-small.webp     service photos (3:2)
  work-<n>.webp, work-<n>-small.webp       the "Our work" gallery
  about.webp                               a crew frame from their About film
  closing.webp / closing-mobile.webp       the closing photo
  preview.jpg                              1200x630 for the lander and link previews
  logo-white.png, favicon-32.png, favicon-180.png

    python3 scripts/lawn/export.py
"""
from __future__ import annotations
import os, subprocess, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE = os.path.join(ROOT, 'output', 'lawn', 'source')
PUBLIC = os.path.join(ROOT, 'public', 'demos', 'lawn')
UPLOADS = 'http://lareaulandscape.com/wp-content/uploads/'
os.makedirs(SOURCE, exist_ok=True)
os.makedirs(PUBLIC, exist_ok=True)

FILES = {
    'film': '2023/08/Lareau2.mp4',
    'about-film': '2019/05/Lareau-Web-About-Video.mp4',
    'logo-white': '2019/04/LLD_LOGO_WHITE.png',
    'favicon': '2019/04/cropped-Lareau-Landscape-Favicon.png',
    'patio': '2019/04/paver-patio-after.jpg',
    'fireplace': '2021/08/July-2021-Lareau-Landscape-8.jpg',
    'garden': '2021/08/July-2021-Lareau-Landscape-43.jpg',
    'lantern': '2019/05/Lareau-Landscape-Spring-2019-6.jpg',
    'closing': '2019/05/Lareau-Landscape-Spring-2019-9.jpg',
    'pergola-dining': '2021/08/July-2021-Lareau-Landscape-28.jpg',
    'stone-fireplace': '2019/05/Lareau-Landscape-Spring-2019-23.jpg',
    'fire-pit': '2021/08/July-2021-Lareau-Landscape-97.jpg',
    'kitchen': '2019/05/Lareau-Landscape-Spring-2019-13.jpg',
    'backyard': '2019/05/Lareau-Landscape-Spring-2019-26.jpg',
    'bar': '2021/08/July-2021-Lareau-Landscape-83.jpg',
    'path': '2019/05/Lareau-Landscape-Spring-2019-29.jpg',
    'pergola-kitchen': '2019/05/Lareau-Landscape-Spring-2019-2_1.jpg',
}


def src(name: str) -> str:
    path = os.path.join(SOURCE, os.path.basename(FILES[name]))
    if not os.path.exists(path):
        urllib.request.urlretrieve(UPLOADS + FILES[name], path)
    return path


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def out(name: str) -> str:
    return os.path.join(PUBLIC, name)


def report(name: str) -> None:
    print(f'{name:28} {os.path.getsize(out(name)) // 1024:>6} KB')


def webp(source: str, name: str, width: int, quality: int = 80, crop: tuple[int, int, int, int] | None = None) -> None:
    args = ['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-sharp_yuv', '-metadata', 'none']
    if crop:
        args += ['-crop', *map(str, crop)]
    # Never upscale: most of the site's photos are 1,000 px wide.
    width = min(width, crop[2] if crop else size(source)[0])
    run(*args, '-resize', str(width), '0', source, '-o', out(name))
    report(name)


def size(path: str) -> tuple[int, int]:
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], check=True, capture_output=True, text=True)
    width, height = probe.stdout.strip().split(',')
    return int(width), int(height)


def crop_3x2(path: str) -> tuple[int, int, int, int]:
    """Center crop to 3:2 (cwebp's -crop is x y w h)."""
    width, height = size(path)
    if width / height > 1.5:
        w = round(height * 1.5)
        return ((width - w) // 2, 0, w, height)
    h = round(width / 1.5)
    return (0, (height - h) // 2, width, h)


# Hero timelapse: the full 1536x1024 frame at both sizes, because the page
# places its mowing passes in source coordinates; the canvas does the cropping.
for stage in ['overgrown', 'mowed', 'finished']:
    generated = os.path.join(ROOT, 'output', 'lawn', f'{stage}.png')
    webp(generated, f'hero-{stage}.webp', 1536, 80)
    webp(generated, f'hero-{stage}-mobile.webp', 1000, 78)

# Project film: full source length and loop point, audio removed, no fades.
film = src('film')
run('ffmpeg', '-v', 'error', '-y', '-i', film, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out('film.mp4'))
run('ffmpeg', '-v', 'error', '-y', '-i', film, '-an', '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', out('film.webm'))
run('ffmpeg', '-v', 'error', '-y', '-i', film, '-an', '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out('film-mobile.mp4'))
for name in ['film.mp4', 'film.webm', 'film-mobile.mp4']:
    report(name)
frame = os.path.join(SOURCE, 'film-first-frame.png')
run('ffmpeg', '-v', 'error', '-y', '-i', film, '-frames:v', '1', frame)
webp(frame, 'film-poster.webp', 1920, 78)
webp(frame, 'film-poster-mobile.webp', 1280, 76)

# A crew frame from the About film (two of the crew setting a planter bowl).
crew = os.path.join(SOURCE, 'about-crew.png')
run('ffmpeg', '-v', 'error', '-y', '-ss', '10.2', '-i', src('about-film'), '-frames:v', '1', crew)
webp(crew, 'about.webp', 1280, 80)

# Services: 3:2, two widths each.
for name, source in [('patios', 'patio'), ('fire', 'fireplace'), ('planting', 'garden'), ('lighting', 'lantern')]:
    path = src(source)
    webp(path, f'{name}.webp', 1200, 80, crop_3x2(path))
    webp(path, f'{name}-small.webp', 720, 78, crop_3x2(path))

# Our work gallery, in page order.
for index, source in enumerate(['pergola-dining', 'stone-fireplace', 'fire-pit', 'kitchen', 'backyard', 'bar', 'path', 'pergola-kitchen'], 1):
    path = src(source)
    webp(path, f'work-{index}.webp', 1000, 80)
    webp(path, f'work-{index}-small.webp', 600, 76)

closing = src('closing')
webp(closing, 'closing.webp', 2400, 76)
width, height = size(closing)
webp(closing, 'closing-mobile.webp', 1000, 76, (round(width * 0.2), 0, round(height * 0.8), height))

run('ffmpeg', '-v', 'error', '-y', '-i', frame, '-vf', 'scale=1200:-2,crop=1200:630', '-q:v', '3', out('preview.jpg'))
report('preview.jpg')

run('cp', src('logo-white'), out('logo-white.png'))
report('logo-white.png')
for px in (32, 180):
    run('sips', '-z', str(px), str(px), src('favicon'), '--out', out(f'favicon-{px}.png'))
    report(f'favicon-{px}.png')
