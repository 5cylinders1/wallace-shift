"""Render a still of the cabinetry demo 02 kitchen in background Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b output/cabinetry-2/blender/kitchen.blend \\
        -P scripts/cabinetry-2/blender_render.py -- --kitchen 0 --dusk 0 --out PATH.png [--res 1920 1080] [--samples 384]

A separate process, so long renders never block the interactive Blender.
"""
import argparse, os, sys
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blender_build as B  # noqa: E402  (module import only defines functions)

ap = argparse.ArgumentParser()
ap.add_argument('--kitchen', type=int, default=1)
ap.add_argument('--dusk', type=float, default=0.0)
ap.add_argument('--out', required=True, help='file (stills) or folder (--anim)')
ap.add_argument('--res', type=int, nargs=2, default=[1920, 1080])
ap.add_argument('--samples', type=int, default=384)
ap.add_argument('--exposure', type=float, default=None)
ap.add_argument('--anim', action='store_true', help='render animation frames as keyed (no set_state)')
ap.add_argument('--frames', default=None, help='comma list or start:end[:step], with --anim')
ap.add_argument('--camera', default='Desktop camera')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:])

prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'METAL'
prefs.refresh_devices()
for d in prefs.devices:
    d.use = d.type == 'METAL'
sc = bpy.context.scene
sc.cycles.device = 'GPU'
sc.cycles.samples = a.samples
sc.render.resolution_x, sc.render.resolution_y = a.res
if a.exposure is not None:
    sc.view_settings.exposure = a.exposure
sc.camera = bpy.data.objects[a.camera]
sc.render.image_settings.file_format = 'PNG'
if not a.anim:
    B.set_state(kitchen=bool(a.kitchen), dusk=a.dusk)
    sc.render.filepath = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(sc.render.filepath), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', sc.render.filepath)
else:
    if a.frames and ':' in a.frames:
        parts = [int(x) for x in a.frames.split(':')]
        frames = list(range(parts[0], parts[1] + 1, parts[2] if len(parts) > 2 else 1))
    elif a.frames:
        frames = [int(x) for x in a.frames.split(',')]
    else:
        frames = list(range(sc.frame_start, sc.frame_end + 1))
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    for f in frames:
        path = os.path.join(out, f'f_{f:04d}.png')
        if os.path.exists(path):  # resumable: skip finished frames
            continue
        sc.frame_set(f)
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('RENDERED', path, flush=True)
