"""Quick Cycles look-dev renders of the cutaway, before committing to a bake.

Usage: Blender -b -P scripts/water/preview.py -- <out_dir> [samples] [width] [views...]
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_house as model  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = Path(args[0]) if args else Path('output/water/preview')
samples = int(args[1]) if len(args) > 1 else 64
width = int(args[2]) if len(args) > 2 else 1280
wanted = args[3:]
out.mkdir(parents=True, exist_ok=True)

VIEWS = {
    # name: (eye, target, fov in degrees), in the engine's axes
    'hero': ((-5.5, 4.2, 35.0), (0.2, 2.6, -0.4), 30),
    'front': ((0.0, 3.0, 36.0), (-1.0, 2.4, 0.0), 26),
    'kitchen': ((-1.6, 2.1, 9.0), (-2.9, 1.5, -2.0), 38),
    'bath': ((-2.8, 5.0, 8.0), (-3.6, 4.6, -2.0), 38),
    'utility': ((-1.8, -1.0, 7.5), (-2.8, -1.5, -2.0), 38),
    'living': ((3.2, 1.9, 8.5), (3.6, 1.4, -1.5), 38),
    'bedroom': ((2.2, 5.3, 9.0), (2.4, 4.6, -1.5), 40),
    'laundry': ((2.6, -1.0, 8.0), (2.9, -1.5, -1.5), 38),
}

model.build()
scene = bpy.context.scene
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.render.resolution_x = width
scene.render.resolution_y = int(width * 0.625)
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 88

cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

for name, (eye, target, fov) in VIEWS.items():
    if wanted and name not in wanted:
        continue
    position = Vector(model.to_bl(eye))
    look = Vector(model.to_bl(target))
    cam.location = position
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (look - position).to_track_quat('-Z', 'Y')
    cam_data.lens_unit = 'FOV'
    cam_data.angle_y = math.radians(fov)
    cam_data.sensor_fit = 'VERTICAL'
    scene.render.filepath = str(out / f'{name}.jpg')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)
