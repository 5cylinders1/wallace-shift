"""Bakes the cutaway's light into one texture per zone and exports the mesh.

Usage: Blender -b -P scripts/water/bake.py -- [--samples N] [--size N] [--zones a,b] [--out DIR] [--no-export]

The bake keeps diffuse light only (no reflections, which depend on the viewer)
and writes display-referred colour through the scene's view transform, so a
baked texel matches a Cycles render of the same room. Output goes straight to
public/demos/water/.
"""
import math
import subprocess
import sys
import time
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_house as model  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def opt(name, default=None):
    if f'--{name}' in argv:
        return argv[argv.index(f'--{name}') + 1]
    return default


SAMPLES = int(opt('samples', 256))
SIZE = int(opt('size', 2048))
ZONES = opt('zones')
# The rooms the camera gets close to get more texels.
CLOSE_UPS = {'kitchen', 'bath', 'basement'}
OUT = Path(opt('out', str(model.ROOT / 'public/demos/water')))
RAW = model.ROOT / 'output/water/baked'
EXPORT = '--no-export' not in argv
(OUT / 'baked').mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

objects = model.build()
scene = bpy.context.scene
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = False
scene.render.bake.margin = 10
scene.render.bake.margin_type = 'EXTEND'
scene.render.bake.use_selected_to_active = False


def activate(obj):
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def unwrap(obj):
    activate(obj)
    obj.data.uv_layers.new(name='bake')
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0035, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def target(obj, image):
    for slot in obj.material_slots:
        tree = slot.material.node_tree
        node = next((n for n in tree.nodes if n.name == 'bake_target'), None)
        if node is None:
            node = tree.nodes.new('ShaderNodeTexImage')
            node.name = 'bake_target'
        node.image = image
        tree.nodes.active = node


def save(image, path, fmt, quality=86):
    settings = scene.render.image_settings
    settings.file_format = fmt
    settings.color_mode = 'RGB'
    settings.quality = quality
    if fmt == 'PNG':
        settings.color_depth = '8'
    image.save_render(str(path), scene=scene)


for name, obj in objects.items():
    unwrap(obj)
    print(f'{name}: {len(obj.data.vertices)} verts, {len(obj.data.polygons)} faces', flush=True)

for name, obj in objects.items():
    if ZONES and name not in ZONES.split(','):
        continue
    started = time.time()
    activate(obj)
    size = int(SIZE * 1.5) if name in CLOSE_UPS else SIZE
    image = bpy.data.images.new(f'bake_{name}', size, size, float_buffer=True, alpha=False)
    image.colorspace_settings.name = 'Linear Rec.709'
    target(obj, image)
    bpy.ops.object.bake(type='COMBINED', pass_filter={'EMIT', 'DIRECT', 'INDIRECT', 'DIFFUSE'}, use_clear=True)
    raw = RAW / f'{name}.png'
    save(image, raw, 'PNG')
    # Full size for desktop; half size for phones, where memory is the real budget.
    subprocess.run(['cwebp', '-quiet', '-q', '86', '-m', '6', '-sharp_yuv', str(raw), '-o', str(OUT / 'baked' / f'{name}.webp')], check=True)
    subprocess.run(['cwebp', '-quiet', '-q', '80', '-m', '6', '-sharp_yuv', '-resize', '1024', '1024', str(raw), '-o', str(OUT / 'baked' / f'{name}-small.webp')], check=True)
    print(f'baked {name} in {time.time() - started:.0f}s', flush=True)

if EXPORT:
    for obj in list(scene.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / 'house.glb'),
        export_format='GLB',
        export_yup=True,
        export_apply=False,
        export_materials='NONE',
        export_normals=False,
        export_tangents=False,
        export_texcoords=True,
        export_lights=False,
        export_cameras=False,
        export_animations=False,
    )
    print('exported', OUT / 'house.glb', flush=True)
