"""Keyframe the cabinetry demo 02 build, from the measured reference timing.

Run inside Blender after blender_build.build() (blender_build.py's
`build_and_animate()` does both), or in background Blender on the saved file.

One timeline covers the 3D motion. The site maps scroll to it: the playhead
(viewport heights of scroll, after scrub smoothing) runs from P0 to P1 across
frames 0..N-1; before P0 it shows frame 0, after P1 the last frame. Windows
below are in playhead vh and follow docs/demos/cabinetry-2.md (timing sheet),
remapped to this kitchen's parts.
"""
import json, math, os, sys
import bpy

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else \
    '/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/cabinetry-2'
sys.path.insert(0, HERE)
import kitchen_spec as K  # noqa: E402

IN = 0.0254
P0, P1, N = 0.40, 3.75, 128

# Base units rise through the floor, outside in: ends first, the cooktop base
# under the hood last (the reference does the same with its centre units).
BASE = {
    'F1': (0.42, 0.82), 'B1': (0.42, 0.82), 'B9': (0.44, 0.86), 'F2': (0.44, 0.86),
    'B2': (0.47, 0.90), 'B8': (0.50, 0.92), 'B3': (0.55, 0.98), 'B7': (0.58, 1.02),
    'B4': (0.64, 1.10), 'B6': (0.67, 1.14), 'B5': (0.72, 1.22),
}
BASE_DROP_IN = 38.0
COUNTER = (1.20, 1.50)               # stone laid left to right
UPPER_RISE = (1.32, 1.67, 15.0)      # rises 15" into place ...
UPPER_REVEAL = (1.32, 1.92)          # ... while it reveals upward from its bottom edge
STACK_REVEAL = (1.92, 2.29)          # then the glass stackers extend to the ceiling line
ISLAND = (1.52, 3.31, 210.0)         # slides in from the right (starts clear of the frame, back corner included)
PENDANT_DROP = (2.44, 3.38, 35.0)    # drop from above the frame, riding on the island
BACKSPLASH = (2.58, 3.38, 24.0)      # rises out of the counter line
RELIGHT = {                          # staggered, as measured (window and walls first, lamps last)
    'sun': (1.40, 3.30), 'world': (1.97, 3.31), 'fill': (1.80, 3.40),
    'pendants': (3.00, 3.60), 'leds': (3.20, 3.70),
}


def frame(p):
    return (p - P0) / (P1 - P0) * (N - 1)


CURVES = {}  # (id name, data path, index) -> (interpolation, easing)


def key(target, path, values, ease='EASE_OUT', interp='QUAD', index=-1):
    """values: [(playhead, value), ...] keyed on target.path. The curve shape is
    recorded and applied in finish_curves(): Blender's automatic easing would
    pick ease-in for these interpolation types."""
    for p, v in values:
        if index >= 0:
            getattr(target, path)[index] = v
        elif path.startswith('['):
            target[path[2:-2]] = v
        else:
            setattr(target, path, v)
        target.keyframe_insert(data_path=path, index=index, frame=frame(p))
    try:
        full = target.path_from_id(path)
    except Exception:
        full = path
    CURVES[(target.id_data.name, full, index)] = (interp, ease)


def finish_curves():
    ids = list(bpy.data.objects) + list(bpy.data.lights) + list(bpy.data.materials) + list(bpy.data.worlds)
    ids += [m.node_tree for m in bpy.data.materials if m.node_tree] + [w.node_tree for w in bpy.data.worlds if w.node_tree]
    n = 0
    for idb in ids:
        ad = getattr(idb, 'animation_data', None)
        if not ad or not ad.action:
            continue
        for fc in fcurves(ad.action):
            spec = CURVES.get((idb.name, fc.data_path, fc.array_index)) or CURVES.get((idb.name, fc.data_path, -1))
            if fc.data_path == 'hide_render':
                spec = ('CONSTANT', 'AUTO')
            if not spec:
                continue
            for kp in fc.keyframe_points:
                kp.interpolation, kp.easing = spec
            n += 1
    return n


def fcurves(action):
    """F-curves of an action (Blender 5 keeps them in layered channel bags)."""
    if hasattr(action, 'fcurves') and action.fcurves is not None:
        try:
            return list(action.fcurves)
        except Exception:
            pass
    out = []
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                out.extend(bag.fcurves)
    return out


def hold_hidden_until(ob, p_show):
    """Hide a group (and its children) until playhead p_show."""
    for o in [ob] + list(ob.children_recursive):
        for p, hidden in ((P0 - 0.2, True), (p_show, False)):
            o.hide_render = hidden
            o.keyframe_insert('hide_render', frame=frame(p))


def animate():
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 0, N - 1
    for ob in bpy.data.objects:  # drop old keyframes but keep drivers (the reveal clip)
        if ob.animation_data:
            ob.animation_data.action = None
    obj = bpy.data.objects

    # base units
    for code, (a, b) in BASE.items():
        root = obj[f'Base {code}']
        z = root.location.z
        key(root, 'location', [(a, z - BASE_DROP_IN * IN), (b, z)], index=2)

    # counter: laid left to right (the cutter's +X face is the edge)
    cc = obj['Cutter counter']
    key(cc, 'location', [(COUNTER[0], -0.3), (COUNTER[1], (K.RUN_LEN + 4) * IN)], ease='EASE_IN_OUT', interp='SINE', index=0)
    # the faucet is a curve (no Boolean): it appears as the wipe passes it
    t = math.acos(1 - 2 * ((K.FAUCET['x'] + 2) / (K.RUN_LEN + 4))) / math.pi   # inverse of the sine ease
    p_faucet = COUNTER[0] + t * (COUNTER[1] - COUNTER[0])
    for name in ('Faucet spout', 'Faucet lever'):
        hold_hidden_until(obj[name], p_faucet)

    # wall cabinets: rise and reveal; stackers extend
    up = obj['Uppers']
    a, b, dz = UPPER_RISE
    key(up, 'location', [(a, up.location.z - dz * IN), (b, up.location.z)], index=2)
    u, st = K.UPPER, K.STACKER
    key(obj['Cutter upper'], 'location', [(UPPER_REVEAL[0], (u['z0'] - dz) * IN), (UPPER_REVEAL[1], (u['z1'] + 0.05) * IN)],
        ease='EASE_IN_OUT', interp='SINE', index=2)
    key(obj['Cutter stack'], 'location', [(STACK_REVEAL[0], u['z1'] * IN), (STACK_REVEAL[1], (K.CROWN['z1'] + 0.5) * IN)],
        ease='EASE_IN_OUT', interp='SINE', index=2)

    # island (pendants ride on it)
    isl = obj['Island']
    a, b, dx = ISLAND
    key(isl, 'location', [(a, isl.location.x + dx * IN), (b, isl.location.x)], index=0)

    # pendants: drop pivots and cords
    a, b, dz = PENDANT_DROP
    for i in range(len(K.PENDANTS['xs'])):
        drop = obj[f'Pendant {i + 1} drop']
        cord = obj[f'Pendant {i + 1} cord']
        z = drop.location.z
        key(drop, 'location', [(a, z + dz * IN), (b, z)], ease='EASE_OUT', interp='LINEAR', index=2)
        rest = cord['rest_len_in']
        key(cord, 'scale', [(a, max(0.02, (rest - dz) / rest)), (b, 1.0)], ease='EASE_OUT', interp='LINEAR', index=2)

    # backsplash: hidden in the empty room, then rises out of the counter line
    bs = obj['Backsplash']
    a, b, dz = BACKSPLASH
    key(bs, 'location', [(a, bs.location.z - dz * IN), (b, bs.location.z)], ease='EASE_OUT', interp='LINEAR', index=2)
    hold_hidden_until(bs, a - 0.05)

    # relight, staggered
    sun = obj['Sun'].data
    key(sun, 'energy', [(RELIGHT['sun'][0], 3.2), (RELIGHT['sun'][1], 0.0)], ease='EASE_IN_OUT', interp='SINE')
    world = sc.world.node_tree
    bg = world.nodes['BG'].inputs['Strength']
    key(bg, 'default_value', [(RELIGHT['world'][0], 1.0), (RELIGHT['world'][1], 0.28)], ease='EASE_IN_OUT', interp='SINE')
    tint = next(i for i in world.nodes['DUSK_TINT'].inputs if i.name == 'Factor' and i.type == 'VALUE')
    key(tint, 'default_value', [(RELIGHT['world'][0], 0.0), (RELIGHT['world'][1], 1.0)], ease='EASE_IN_OUT', interp='SINE')
    fill = obj['Fill'].data
    import blender_build as B  # noqa: E402  (module import defines functions only)
    key(fill, 'energy', [(RELIGHT['fill'][0], B.FILL_W), (RELIGHT['fill'][1], B.FILL_W * 0.18)], ease='EASE_IN_OUT', interp='SINE')
    for ch in range(3):
        key(fill, 'color', [(RELIGHT['fill'][0], B.kelvin(6200)[ch]), (RELIGHT['fill'][1], B.kelvin(9000)[ch])],
            ease='EASE_IN_OUT', interp='SINE', index=ch)
    a, b = RELIGHT['pendants']
    for i in range(len(K.PENDANTS['xs'])):
        key(obj[f'Pendant {i + 1} lamp'].data, 'energy', [(a, 0.0), (b, 9.0)], ease='EASE_IN_OUT', interp='SINE')
    gain = bpy.data.materials['Opal glass'].node_tree.nodes['GLOW_GAIN'].inputs[1]
    key(gain, 'default_value', [(a, 0.0), (b, 0.55)], ease='EASE_IN_OUT', interp='SINE')
    a, b = RELIGHT['leds']
    key(bpy.data.materials['led_under'].node_tree.nodes['Emission'].inputs['Strength'], 'default_value',
        [(a, 0.0), (b, 2.5)], ease='EASE_IN_OUT', interp='SINE')
    key(bpy.data.materials['led_stack'].node_tree.nodes['Emission'].inputs['Strength'], 'default_value',
        [(a, 0.0), (b, 2.5)], ease='EASE_IN_OUT', interp='SINE')

    print('curves shaped:', finish_curves())
    sc.frame_set(0)
    seq = {'frames': N, 'playhead_start_vh': P0, 'playhead_end_vh': P1}
    out = os.path.join(HERE, '..', '..', 'output', 'cabinetry-2', 'blender', 'sequence.json')
    json.dump(seq, open(out, 'w'), indent=1)
    print('animated', N, 'frames; playhead', P0, '->', P1)


if __name__ == '__main__':
    animate()
