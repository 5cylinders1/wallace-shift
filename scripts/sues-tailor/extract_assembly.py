#!/usr/bin/env python3
"""Extract aligned bridal assembly layers from the existing Higgsfield image.

No API calls or additional generation. Requires Pillow and the cwebp executable.
Run from any directory: python3 scripts/sues-tailor/extract_assembly.py
The source must remain 640 × 1086; mask coordinates intentionally match it.
"""
from argparse import ArgumentParser
from hashlib import sha256
from pathlib import Path
import json
import shutil
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageFilter

REPO = Path(__file__).resolve().parents[2]
parser = ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=REPO / 'public/demos/best-tailor/media/final-fitting.webp')
parser.add_argument('--output', type=Path, default=REPO / 'public/demos/best-tailor/media/assembly')
parser.add_argument('--review-output', type=Path, default=REPO / 'docs/review/sues-tailor/assembly')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
args.review_output.mkdir(parents=True, exist_ok=True)
if not shutil.which('cwebp'):
    raise SystemExit('cwebp is required for verified lossless RGBA encoding.')
src = Image.open(args.source).convert('RGBA')
W, H = src.size
if (W, H) != (640, 1086):
    raise SystemExit(f'Expected the aligned 640 × 1086 source, got {W} × {H}.')
S = 4

def bezier(start,*segments):
    points=[start]
    p=start
    for a,b,c in segments:
        for i in range(1,41):
            t=i/40; u=1-t
            points.append((u*u*u*p[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*c[0],u*u*u*p[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*c[1]))
        p=c
    return points

def mask(points,expand=0):
    m=Image.new('L',(W*S,H*S))
    ImageDraw.Draw(m).polygon([(round(x*S),round(y*S)) for x,y in points], fill=255)
    if expand: m=m.filter(ImageFilter.MaxFilter(expand*2*S+1))
    return m.resize((W,H),Image.Resampling.LANCZOS)

# Trace garment, not the dress form. All points are in the source photograph's coordinates.
outline=bezier((247.5,249.0),
 ((271,244.5),(372,245.0),(396,249.0)),
 ((401,253),(405,262),(403,280)),
 ((401,304),(387.5,336),(387.5,359)),
 ((387,382),(409,435),(419,490)),
 ((435,570),(449,663),(467,770)),
 ((484,859),(506,943),(528.2,991.7)),
 ((512,1002),(488,1011),(465,1016)),
 ((450,1019),(435,1016.5),(419.4,1014.4)),
 ((420,1017),(420,1019),(420.5,1020.5)),
 ((399,1026),(374,1020.5),(350,1021)),
 ((325,1020),(311,1025),(290,1023)),
 ((262,1019),(239,1022),(213,1020)),
 ((211,1019),(210,1016),(210,1013.4)),
 ((184,1010),(151,1003),(137.2,992.1)),
 ((148,962),(165,894),(178,822)),
 ((196,725),(215,610),(231,516)),
 ((243,443),(256,398),(263.5,374)),
 ((269,354),(263,332),(257,310)),
 ((252,291),(247,270),(247.5,249.0)))
body=mask(outline)
leftstrap=mask([(244.6,196.0),(249.2,194.2),(258.7,249.3),(251.0,249.3)])
rightstrap=mask([(402.0,197.2),(407.0,198.1),(400.2,252.5),(393.9,249.1)])
straps=ImageChops.lighter(leftstrap,rightstrap)
full=ImageChops.lighter(body,straps)

waist=bezier((0,361),((200,361),(259,361),(266,361)),((300,364),(354,364),(388,361)),((430,361),(500,361),(640,361)))
bodice_region=mask([(0,0),(640,0),(640,361)]+list(reversed(waist)),expand=1)
skirt_region=mask(waist+[(640,H),(0,H)],expand=1)
left_edge=bezier((296,361),((290,458),(267,583),(253,730)),((239,855),(225,945),(212,1025)))
right_edge=bezier((353,361),((365,477),(385,620),(396,765)),((405,891),(416,967),(421,1025)))
center_region=mask(left_edge+[(212,H),(421,H)]+list(reversed(right_edge)),expand=1)
left_region=mask([(0,361)]+left_edge+[(212,H),(0,H)],expand=1)
right_region=mask([(640,361),(640,H),(421,H)]+list(reversed(right_edge)),expand=1)
regions={'straps':straps,
 'bodice':ImageChops.multiply(body,bodice_region),
 'skirt-left':ImageChops.multiply(ImageChops.multiply(body,skirt_region),left_region),
 'skirt-center':ImageChops.multiply(ImageChops.multiply(body,skirt_region),center_region),
 'skirt-right':ImageChops.multiply(ImageChops.multiply(body,skirt_region),right_region)}

ORDER = ['skirt-left', 'skirt-right', 'skirt-center', 'bodice', 'straps']

def clear_invisible(image):
    """Clear only fully transparent RGB; every visible source pixel is intact."""
    image = image.copy()
    invisible = image.getchannel('A').point(lambda a: 255 if a == 0 else 0)
    image.paste((0, 0, 0, 0), (0, 0), invisible)
    return image


def save_exact_webp(image, name):
    image = clear_invisible(image)
    destination = args.output / f'{name}.webp'
    with tempfile.TemporaryDirectory(prefix='sues-assembly-') as temporary:
        intermediate = Path(temporary) / f'{name}.png'
        image.save(intermediate)
        subprocess.run(['cwebp', '-quiet', '-lossless', '-exact', '-q', '100',
                        str(intermediate), '-o', str(destination)], check=True)
    decoded = Image.open(destination).convert('RGBA')
    if decoded.size != image.size or decoded.tobytes() != image.tobytes():
        raise AssertionError(f'{name}: encoded image changed RGBA pixels')
    provenance = {
        'prompt': 'Derived from the existing Higgsfield GPT Image 2 final-fitting.webp photograph. '
                  'Source generation used 6.5 credits on 2026-11-17; this extraction used 0 additional credits. '
                  f'Asset: {name}. Source pixels preserved with a transparent silhouette and garment partition mask. '
                  'Exact generation prompt and source history: src/demos/best-tailor/assets.md. '
                  'Reproduce with scripts/sues-tailor/extract_assembly.py. No new image generation.',
        'source': '/demos/best-tailor/media/final-fitting.webp',
        'sourceSha256': sha256(args.source.read_bytes()).hexdigest(),
        'generated': False,
    }
    destination.with_suffix('.webp.json').write_text(json.dumps(provenance, indent=2) + '\n')
    return image

layers = {}
for name, alpha in regions.items():
    layer = src.copy()
    layer.putalpha(alpha)
    layers[name] = save_exact_webp(layer, name)

assembled = Image.new('RGBA', (W, H))
for name in ORDER:
    assembled.alpha_composite(layers[name])
assembled = save_exact_webp(assembled, 'assembled')

# Verify there are no transparent hairline gaps in the assembled interior.
reconstructed_alpha = assembled.getchannel('A')
missing = sum(1 for actual, expected in zip(reconstructed_alpha.getdata(), full.getdata())
              if expected == 255 and actual < 250)
if missing:
    raise AssertionError(f'{missing} opaque source pixels have assembly gaps')

font = ImageFont.load_default(size=17)
small = ImageFont.load_default(size=13)
ink = '#4b242b'
ground = '#f7f3eb'

def smooth(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def progress_pose(name, progress):
    """Storyboard proposal only. App controls its actual choreography."""
    choreography = {
        'skirt-left': (-132, 36, 0.0, 0.55),
        'skirt-right': (132, 36, 0.0, 0.55),
        'skirt-center': (0, 85, 0.0, 0.55),
        'bodice': (0, -48, 0.30, 0.78),
        'straps': (0, -105, 0.58, 0.96),
    }
    x, y, begin, end = choreography[name]
    remaining = 1 - smooth((progress - begin) / (end - begin))
    return round(x * remaining), round(y * remaining)


# Five explicit frames demonstrate physical layer movement, not crossfades.
frame_size = (900, 1150)
cell_size = (288, 368)
story = Image.new('RGB', (cell_size[0] * 5, 438), ground)
draw = ImageDraw.Draw(story)
draw.text((16, 12), 'PROPOSAL · Scroll-driven garment assembly', fill=ink, font=font)
for index, progress in enumerate([0, 0.25, 0.5, 0.75, 1]):
    frame = Image.new('RGBA', frame_size, ground)
    for name in ORDER:
        x, y = progress_pose(name, progress)
        frame.alpha_composite(layers[name], (130 + x, 15 + y))
    frame = frame.convert('RGB').resize(cell_size, Image.Resampling.LANCZOS)
    story.paste(frame, (index * cell_size[0], 42))
    draw.text((index * cell_size[0] + 14, 414), f'{round(progress * 100)}% scroll', fill=ink, font=small)
story.save(args.review_output / 'assembly-storyboard-proposal.jpg', quality=94)

# Individual transparent layers and final result on a contrasting inspection ground.
contact = Image.new('RGB', (1920, 610), ground)
draw = ImageDraw.Draw(contact)
items = [('Aligned composite', assembled)] + [(n.replace('-', ' ').title(), layers[n])
         for n in ['straps', 'bodice', 'skirt-left', 'skirt-center', 'skirt-right']]
for index, (label, image) in enumerate(items):
    tile = Image.new('RGBA', (W, H), '#292c2a')
    tile.alpha_composite(image)
    contact.paste(tile.convert('RGB').resize((320, 543), Image.Resampling.LANCZOS), (index * 320, 45))
    draw.text((index * 320 + 12, 12), label, font=font, fill=ink)
draw.text((12, 590), 'Aligned 640 × 1086 source coordinates. Original silk pixels, transparent masks, no new generation.', font=small, fill=ink)
contact.save(args.review_output / 'assembly-contact-sheet.jpg', quality=94)

asset_names = list(regions) + ['assembled']
files = {name: args.output / f'{name}.webp' for name in asset_names}
manifest = {
    'version': 1,
    'source': '/demos/best-tailor/media/final-fitting.webp',
    'sourceSha256': sha256(args.source.read_bytes()).hexdigest(),
    'sourceAttribution': {
        'provider': 'Higgsfield', 'model': 'GPT Image 2',
        'generationDate': '2026-11-17', 'originalGenerationCredits': 6.5,
        'additionalGenerationCredits': 0,
        'originalTriptych': '/demos/best-tailor/media/bridal-triptych.webp',
        'promptRecord': 'src/demos/best-tailor/assets.md',
        'disclosure': 'Illustrative AI-generated gown; not Sue’s actual work.'
    },
    'width': W, 'height': H,
    'format': 'WebP lossless RGBA; -exact encoding verified byte for byte',
    'coordinateSystem': 'Every layer uses the original full 640 × 1086 source canvas. No independent cropping or resizing.',
    'assemblyOrder': ORDER,
    'fallback': 'assembled.webp',
    'layers': {name: {'file': f'{name}.webp', 'alphaBounds': list(regions[name].getbbox()),
                      'bytes': files[name].stat().st_size,
                      'sha256': sha256(files[name].read_bytes()).hexdigest()}
               for name in regions},
    'fallbackBytes': files['assembled'].stat().st_size,
    'totalAssetBytes': sum(p.stat().st_size for p in files.values()),
    'validation': {'exactLosslessDecode': True, 'opaqueSourcePixelsWithAlphaGaps': missing},
    'extraction': '4× supersampled hand-traced silhouette, source-pixel partitions, 2px internal overlaps. Fully invisible RGB cleared for file size.',
    'limitations': ['Original source is 640px wide.',
                   'Waist and skirt partitions are visual assembly masks, not verified physical sewing patterns.',
                   'The assembled fallback is the exact composited five-layer image.'],
    'reproduce': 'python3 scripts/sues-tailor/extract_assembly.py',
    'storyboard': 'docs/review/sues-tailor/assembly/assembly-storyboard-proposal.jpg'
}
(args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'assets': {p.name: p.stat().st_size for p in files.values()},
                  'totalBytes': manifest['totalAssetBytes'], 'validation': manifest['validation'],
                  'storyboard': str(args.review_output / 'assembly-storyboard-proposal.jpg')}, indent=2))
