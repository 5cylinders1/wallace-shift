"""Close-up stills of the cabinetry demo 02 kitchen, for the page sections and
material swatches. Run in background Blender on the animated scene:

    Blender -b output/cabinetry-2/blender/kitchen_render.blend -P scripts/cabinetry-2/blender_details.py

Each shot: (name, frame, eye, target, focal mm, resolution, dusk). Positions
are plan inches (x along the back wall, y into the room, z up). Cameras stay
level and use lens shift to frame high or low targets, so verticals stay
straight, as an interiors photographer would shoot. Lighting is set per shot
with blender_build.set_state (0 day ... 1 evening) after the frame's geometry
is in place. Writes output/cabinetry-2/details/<name>.png; finished shots are
skipped.
"""
import math, os, sys
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blender_animate as A  # noqa: E402
import blender_build as B  # noqa: E402

IN = 0.0254
DRAFT = os.environ.get('DETAILS_DRAFT') == '1'  # quick low-res composition check
OUT = os.path.join(HERE, '..', '..', 'output', 'cabinetry-2', 'details_draft' if DRAFT else 'details')
LAST = A.N - 1
UNITS_UP = 40  # base units, counter and faucet in place

SHOTS = [
    ('detail-island', LAST, (38, 170, 34), (94, 116, 24), 40, (1200, 1500), 0.45),
    ('detail-stack', LAST, (200, 100, 60), (249, 8, 90), 40, (1200, 1500), 0.62),
    ('detail-light', LAST, (141, 212, 56), (141, 95, 76), 40, (1200, 1500), 0.85),
    ('swatch-ink', LAST, (141, 132, 19), (141, 117, 19), 85, (900, 900), 0.3),
    ('swatch-bronze', UNITS_UP, (24, 36, 31), (18, 25.5, 30), 100, (900, 900), 0.0),
]


def P(x, y, z):
    return Vector((x * IN, -y * IN, z * IN))


def freeze_lighting():
    """Drop the light, world and material keyframes so set_state can light the shot."""
    for idb in list(bpy.data.lights) + list(bpy.data.worlds) + list(bpy.data.materials):
        for owner in (idb, getattr(idb, 'node_tree', None)):
            if owner is not None and owner.animation_data:
                owner.animation_data.action = None


def level_camera(name, eye, target, focal):
    """Yaw toward the target, no pitch; lens shift puts the target mid-frame."""
    cam = bpy.data.cameras.new(name)
    cam.lens = focal
    cam.sensor_fit = 'AUTO'
    cam.sensor_width = 36
    cam.clip_start = 0.02
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    e, t = P(*eye), P(*target)
    d = t - e
    yaw = math.atan2(d.y, d.x) - math.pi / 2
    ob.location = e
    ob.rotation_euler = (math.radians(90), 0, yaw)
    horizontal = math.hypot(d.x, d.y)
    elevation = math.atan2(d.z, horizontal)
    # shift is a fraction of the frame's larger side, which the 36 mm sensor spans
    cam.shift_y = focal * math.tan(elevation) / 36
    return ob


def main():
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.refresh_devices()
    for dev in prefs.devices:
        dev.use = dev.type == 'METAL'
    sc = bpy.context.scene
    sc.cycles.device = 'GPU'
    sc.cycles.samples = 24 if DRAFT else 320
    sc.render.resolution_percentage = 30 if DRAFT else 100
    sc.render.image_settings.file_format = 'PNG'
    os.makedirs(OUT, exist_ok=True)
    frozen = False
    for name, frame, eye, target, focal, size, dusk in SHOTS:
        path = os.path.abspath(os.path.join(OUT, f'{name}.png'))
        if os.path.exists(path):
            continue
        sc.frame_set(frame)
        if not frozen:
            freeze_lighting()
            frozen = True
        B.set_state(kitchen=True, dusk=dusk)
        sc.camera = level_camera(name, eye, target, focal)
        sc.render.resolution_x, sc.render.resolution_y = size
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('RENDERED', path, flush=True)


main()
