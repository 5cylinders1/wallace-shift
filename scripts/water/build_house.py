"""Models the Riffle cutaway house for baking.

Run inside background Blender (see docs/demos/water.md). Geometry is written
in the live engine's axes (three.js: +x right, +y up, +z toward the viewer) and
converted once on the way into Blender. Everything is procedural and CC0 by
construction: no downloaded meshes or textures.

Each room is its own "zone", baked to its own texture so close-ups get texels
where the camera actually goes. Metals and glass the camera gets close to are
not here: the live engine draws them, with real reflections.
"""
import json
import math
import random
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
L = json.loads((ROOT / 'src/demos/water/engine/layout.json').read_text())
CUT, BACK = L['cut'], L['backWall']
LV = L['levels']
HL, HR = L['house']['left'], L['house']['right']
WALL = L['wall']
FX = L['fixtures']
rng = random.Random(11)


def to_bl(p):
    return (p[0], -p[2], p[1])


class Zone:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []
        self.mats = []
        self.smooth = []
        self.slots = {}

    def slot(self, mat):
        if mat not in self.slots:
            self.slots[mat] = len(self.slots)
        return self.slots[mat]

    def add(self, verts, faces, mat, smooth=False):
        base = len(self.verts)
        self.verts.extend(to_bl(v) for v in verts)
        slot = self.slot(mat)
        for face in faces:
            self.faces.append([i + base for i in face])
            self.mats.append(slot)
            self.smooth.append(smooth)


ZONES = {name: Zone(name) for name in ['shell', 'basement', 'kitchen', 'living', 'bath', 'bedroom']}

BOX_FACES = {
    'bottom': (0, 1, 2, 3),
    'top': (4, 7, 6, 5),
    'back': (0, 4, 5, 1),
    'front': (2, 6, 7, 3),
    'left': (0, 3, 7, 4),
    'right': (1, 5, 6, 2),
}


def box(zone, mat, x0, x1, y0, y1, z0, z1, drop=()):
    """Axis-aligned box. drop names faces nobody will ever see, to save texels."""
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    z0, z1 = min(z0, z1), max(z0, z1)
    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1),
        (x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = [face for key, face in BOX_FACES.items() if key not in drop]
    ZONES[zone].add(verts, faces, mat)


def soft(zone, mat, x0, x1, y0, y1, z0, z1, r=0.02, segs=2):
    """A box with rounded edges: upholstery, appliances, anything hand-made."""
    bm = bmesh.new()
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    z0, z1 = min(z0, z1), max(z0, z1)
    r = min(r, (x1 - x0) * 0.49, (y1 - y0) * 0.49, (z1 - z0) * 0.49)
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = Vector((
            (x0 + x1) / 2 + v.co.x * (x1 - x0),
            (y0 + y1) / 2 + v.co.y * (y1 - y0),
            (z0 + z1) / 2 + v.co.z * (z1 - z0),
        ))
    bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=r, segments=segs, profile=0.6, affect='EDGES', clamp_overlap=True)
    verts = [tuple(v.co) for v in bm.verts]
    bm.verts.index_update()
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    ZONES[zone].add(verts, faces, mat, smooth=True)


def lathe(zone, mat, profile, cx, cz, segs=28, y=0.0, sx=1.0, sz=1.0):
    """Revolve [(radius, height)] around the y axis."""
    verts, faces = [], []
    rows = len(profile)
    for r, h in profile:
        for s in range(segs):
            a = s / segs * math.tau
            verts.append((cx + r * math.cos(a) * sx, y + h, cz + r * math.sin(a) * sz))
    for i in range(rows - 1):
        for s in range(segs):
            a, b = i * segs + s, i * segs + (s + 1) % segs
            faces.append([a, a + segs, b + segs, b])
    ZONES[zone].add(verts, faces, mat, smooth=True)


def cyl_y(zone, mat, cx, cz, r, y0, y1, segs=20):
    lathe(zone, mat, [(0.0001, y0), (r, y0), (r, y1), (0.0001, y1)], cx, cz, segs)


def cyl_x(zone, mat, y, z, r, x0, x1, segs=16):
    verts, faces = [], []
    for x in (x0, x1):
        for s in range(segs):
            a = s / segs * math.tau
            verts.append((x, y + r * math.cos(a), z + r * math.sin(a)))
    for s in range(segs):
        faces.append([s, (s + 1) % segs, segs + (s + 1) % segs, segs + s])
    faces.append(list(range(segs))[::-1])
    faces.append(list(range(segs, 2 * segs)))
    ZONES[zone].add(verts, faces, mat, smooth=False)


def cyl_z(zone, mat, x, y, r, z0, z1, segs=20):
    verts, faces = [], []
    for z in (z0, z1):
        for s in range(segs):
            a = s / segs * math.tau
            verts.append((x + r * math.cos(a), y + r * math.sin(a), z))
    for s in range(segs):
        faces.append([s, (s + 1) % segs, segs + (s + 1) % segs, segs + s])
    faces.append(list(range(segs))[::-1])
    faces.append(list(range(segs, 2 * segs)))
    ZONES[zone].add(verts, faces, mat, smooth=False)


def ball(zone, mat, cx, cy, cz, rx, ry=None, rz=None, segs=14, rows=9):
    ry = rx if ry is None else ry
    rz = rx if rz is None else rz
    profile = []
    for i in range(rows + 1):
        t = i / rows * math.pi
        profile.append((max(math.sin(t), 0.0001), -math.cos(t)))
    verts, faces = [], []
    for r, h in profile:
        for s in range(segs):
            a = s / segs * math.tau
            verts.append((cx + r * math.cos(a) * rx, cy + h * ry, cz + r * math.sin(a) * rz))
    for i in range(rows):
        for s in range(segs):
            a, b = i * segs + s, i * segs + (s + 1) % segs
            faces.append([a, a + segs, b + segs, b])
    ZONES[zone].add(verts, faces, mat, smooth=True)


def poly(zone, mat, verts, faces, smooth=False, face=None, outward=False):
    """Free-form faces. face= turns each toward a direction; outward= suits convex solids."""
    centre = [sum(v[i] for v in verts) / len(verts) for i in range(3)]
    fixed = []
    for f in faces:
        a, b, c = (Vector(verts[i]) for i in f[:3])
        normal = (b - a).cross(c - b)
        if face is not None:
            want = Vector(face)
        elif outward:
            want = Vector(verts[f[0]]) - Vector(centre)
        else:
            want = normal
        fixed.append(list(f) if normal.dot(want) >= 0 else list(f)[::-1])
    ZONES[zone].add(verts, fixed, mat, smooth)


# ---------------------------------------------------------------- materials


def nodes_of(mat):
    return mat.node_tree.nodes, mat.node_tree.links


def new_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, _ = nodes_of(mat)
    return mat, next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')


def world_uv(mat, axes='auto', scale=1.0):
    """World-space texture coordinates, so joined meshes never need real UVs."""
    nodes, links = nodes_of(mat)
    geo = nodes.new('ShaderNodeNewGeometry')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], sep.inputs[0])

    def combine(a, b):
        node = nodes.new('ShaderNodeCombineXYZ')
        links.new(sep.outputs[a], node.inputs[0])
        links.new(sep.outputs[b], node.inputs[1])
        return node.outputs[0]

    if axes == 'xy':
        result = combine('X', 'Y')
    elif axes == 'xz':
        result = combine('X', 'Z')
    elif axes == 'yz':
        result = combine('Y', 'Z')
    else:
        nsep = nodes.new('ShaderNodeSeparateXYZ')
        links.new(geo.outputs['True Normal'], nsep.inputs[0])

        def is_axis(socket):
            abs_node = nodes.new('ShaderNodeMath')
            abs_node.operation = 'ABSOLUTE'
            links.new(socket, abs_node.inputs[0])
            gt = nodes.new('ShaderNodeMath')
            gt.operation = 'GREATER_THAN'
            links.new(abs_node.outputs[0], gt.inputs[0])
            gt.inputs[1].default_value = 0.6
            return gt.outputs[0]

        wall = nodes.new('ShaderNodeMix')
        wall.data_type = 'VECTOR'
        links.new(is_axis(nsep.outputs['X']), wall.inputs[0])
        links.new(combine('X', 'Z'), wall.inputs[4])
        links.new(combine('Y', 'Z'), wall.inputs[5])
        final = nodes.new('ShaderNodeMix')
        final.data_type = 'VECTOR'
        links.new(is_axis(nsep.outputs['Z']), final.inputs[0])
        links.new(wall.outputs[1], final.inputs[4])
        links.new(combine('X', 'Y'), final.inputs[5])
        result = final.outputs[1]
    if scale != 1.0:
        mul = nodes.new('ShaderNodeVectorMath')
        mul.operation = 'SCALE'
        links.new(result, mul.inputs[0])
        mul.inputs['Scale'].default_value = scale
        return mul.outputs[0]
    return result


def mix_rgb(mat, fac, a, b):
    nodes, links = nodes_of(mat)
    mix = nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    links.new(fac, mix.inputs[0])
    for index, value in ((6, a), (7, b)):
        if isinstance(value, (tuple, list)):
            mix.inputs[index].default_value = (*value[:3], 1)
        else:
            links.new(value, mix.inputs[index])
    return mix.outputs[2]


def noise(mat, uv, scale=4.0, detail=6.0, rough=0.55, stretch=None):
    nodes, links = nodes_of(mat)
    tex = nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = scale
    tex.inputs['Detail'].default_value = detail
    tex.inputs['Roughness'].default_value = rough
    if stretch:
        mapping = nodes.new('ShaderNodeMapping')
        links.new(uv, mapping.inputs['Vector'])
        mapping.inputs['Scale'].default_value = (*stretch, 1)
        links.new(mapping.outputs[0], tex.inputs['Vector'])
    else:
        links.new(uv, tex.inputs['Vector'])
    return tex.outputs[0]


def ramp(mat, fac, stops):
    nodes, links = nodes_of(mat)
    node = nodes.new('ShaderNodeValToRGB')
    cr = node.color_ramp
    while len(cr.elements) > 1:
        cr.elements.remove(cr.elements[-1])
    cr.elements[0].position = stops[0][0]
    cr.elements[0].color = (*stops[0][1], 1)
    for pos, col in stops[1:]:
        el = cr.elements.new(pos)
        el.color = (*col, 1)
    links.new(fac, node.inputs['Fac'])
    return node.outputs[0]


def bump(mat, height, strength=0.2, distance=0.02):
    nodes, links = nodes_of(mat)
    node = nodes.new('ShaderNodeBump')
    node.inputs['Strength'].default_value = strength
    node.inputs['Distance'].default_value = distance
    links.new(height, node.inputs['Height'])
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    links.new(node.outputs[0], bsdf.inputs['Normal'])


def brick(mat, uv, c1, c2, mortar, scale=1.0, w=0.5, h=0.25, gap=0.01, offset=0.5, smooth=0.1):
    nodes, links = nodes_of(mat)
    tex = nodes.new('ShaderNodeTexBrick')
    tex.offset = offset
    tex.inputs['Color1'].default_value = (*c1, 1)
    tex.inputs['Color2'].default_value = (*c2, 1)
    tex.inputs['Mortar'].default_value = (*mortar, 1)
    tex.inputs['Scale'].default_value = scale
    tex.inputs['Mortar Size'].default_value = gap
    tex.inputs['Mortar Smooth'].default_value = smooth
    tex.inputs['Brick Width'].default_value = w
    tex.inputs['Row Height'].default_value = h
    links.new(uv, tex.inputs['Vector'])
    return tex


def poche(mat, color_socket):
    """Whatever the section knife cuts through reads as solid ink, as on a drawing."""
    nodes, links = nodes_of(mat)
    geo = nodes.new('ShaderNodeNewGeometry')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], sep.inputs[0])
    lt = nodes.new('ShaderNodeMath')
    lt.operation = 'LESS_THAN'
    links.new(sep.outputs['Y'], lt.inputs[0])
    lt.inputs[1].default_value = -CUT + 0.002
    return mix_rgb(mat, lt.outputs[0], color_socket, (0.012, 0.014, 0.016))


def set_color(mat, socket_or_tuple):
    nodes, links = nodes_of(mat)
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    if isinstance(socket_or_tuple, (tuple, list)):
        bsdf.inputs['Base Color'].default_value = (*socket_or_tuple[:3], 1)
    else:
        links.new(socket_or_tuple, bsdf.inputs['Base Color'])


MATS = {}


def define(name):
    def wrap(fn):
        MATS[name] = fn
        return fn
    return wrap


def flat(name, color, rough=0.6):
    def fn():
        mat, bsdf = new_mat(name)
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Roughness'].default_value = rough
        return mat
    MATS[name] = fn


def glow(name, color, strength):
    def fn():
        mat, bsdf = new_mat(name)
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
        return mat
    MATS[name] = fn


@define('plaster')
def _():
    mat, _b = new_mat('plaster')
    uv = world_uv(mat)
    n = noise(mat, uv, 2.5, 7, 0.55)
    col = mix_rgb(mat, n, (0.74, 0.70, 0.63), (0.80, 0.76, 0.69))
    set_color(mat, poche(mat, col))
    bump(mat, n, 0.06, 0.02)
    return mat


@define('plaster_warm')
def _():
    mat, _b = new_mat('plaster_warm')
    uv = world_uv(mat)
    n = noise(mat, uv, 2.2, 7, 0.55)
    col = mix_rgb(mat, n, (0.56, 0.46, 0.36), (0.62, 0.51, 0.40))
    set_color(mat, poche(mat, col))
    bump(mat, n, 0.05, 0.02)
    return mat


@define('ceiling')
def _():
    mat, _b = new_mat('ceiling')
    n = noise(mat, world_uv(mat), 3, 5, 0.5)
    set_color(mat, poche(mat, mix_rgb(mat, n, (0.72, 0.69, 0.63), (0.78, 0.75, 0.69))))
    return mat


@define('oak')
def _():
    mat, _b = new_mat('oak')
    uv = world_uv(mat, 'xy')
    tex = brick(mat, uv, (0.33, 0.205, 0.11), (0.25, 0.15, 0.08), (0.05, 0.03, 0.018), scale=1.0, w=1.6, h=0.145, gap=0.004, offset=0.4, smooth=0.0)
    grain = noise(mat, uv, 3.0, 8, 0.6, stretch=(0.7, 20))
    col = mix_rgb(mat, grain, tex.outputs['Color'], (0.40, 0.26, 0.15))
    set_color(mat, poche(mat, col))
    bump(mat, grain, 0.08, 0.01)
    return mat


@define('concrete')
def _():
    mat, _b = new_mat('concrete')
    uv = world_uv(mat)
    a = noise(mat, uv, 1.2, 8, 0.6)
    b = noise(mat, uv, 18, 6, 0.6)
    col = mix_rgb(mat, a, (0.34, 0.33, 0.30), (0.46, 0.45, 0.41))
    col = mix_rgb(mat, b, col, (0.39, 0.38, 0.35))
    set_color(mat, poche(mat, col))
    bump(mat, b, 0.1, 0.01)
    return mat


@define('block')
def _():
    mat, _b = new_mat('block')
    uv = world_uv(mat)
    tex = brick(mat, uv, (0.58, 0.56, 0.52), (0.50, 0.48, 0.45), (0.27, 0.26, 0.24), scale=1.0, w=0.40, h=0.20, gap=0.006, offset=0.5, smooth=0.1)
    n = noise(mat, uv, 22, 5, 0.6)
    col = mix_rgb(mat, n, tex.outputs['Color'], (0.47, 0.45, 0.42))
    set_color(mat, poche(mat, col))
    bump(mat, tex.outputs['Fac'], 0.25, 0.012)
    return mat


@define('structure')
def _():
    mat, _b = new_mat('structure')
    set_color(mat, poche(mat, (0.3, 0.29, 0.27)))
    return mat


@define('siding')
def _():
    mat, _b = new_mat('siding')
    uv = world_uv(mat, 'yz')
    tex = brick(mat, uv, (0.038, 0.036, 0.034), (0.03, 0.028, 0.026), (0.008, 0.008, 0.008), scale=1.0, w=9.0, h=0.18, gap=0.006, offset=0.0, smooth=0.0)
    set_color(mat, poche(mat, tex.outputs['Color']))
    return mat


@define('roof')
def _():
    mat, _b = new_mat('roof')
    uv = world_uv(mat, 'xy')
    tex = brick(mat, uv, (0.06, 0.065, 0.07), (0.055, 0.06, 0.065), (0.015, 0.015, 0.018), scale=1.0, w=30.0, h=0.42, gap=0.012, offset=0.0, smooth=0.3)
    n = noise(mat, uv, 2.0, 5, 0.5)
    col = mix_rgb(mat, n, tex.outputs['Color'], (0.075, 0.08, 0.085))
    set_color(mat, poche(mat, col))
    return mat


@define('soil')
def _():
    mat, _b = new_mat('soil')
    nodes, links = nodes_of(mat)
    geo = nodes.new('ShaderNodeNewGeometry')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], sep.inputs[0])
    uv = world_uv(mat)
    warp = noise(mat, uv, 1.1, 5, 0.55)
    add = nodes.new('ShaderNodeMath')
    links.new(sep.outputs['Z'], add.inputs[0])
    wm = nodes.new('ShaderNodeMath')
    wm.operation = 'MULTIPLY'
    links.new(warp, wm.inputs[0])
    wm.inputs[1].default_value = 0.42
    links.new(wm.outputs[0], add.inputs[1])
    remap = nodes.new('ShaderNodeMapRange')
    links.new(add.outputs[0], remap.inputs['Value'])
    remap.inputs['From Min'].default_value = -4.6
    remap.inputs['From Max'].default_value = 0.6
    col = ramp(mat, remap.outputs[0], [
        (0.0, (0.13, 0.105, 0.08)), (0.30, (0.20, 0.145, 0.10)), (0.52, (0.33, 0.225, 0.135)),
        (0.80, (0.26, 0.175, 0.11)), (0.93, (0.085, 0.06, 0.042)), (1.0, (0.045, 0.034, 0.024)),
    ])
    grit = noise(mat, uv, 34, 7, 0.65)
    col = mix_rgb(mat, ramp(mat, grit, [(0.42, (0.6, 0.6, 0.6)), (0.62, (0, 0, 0))]), col, (0.06, 0.045, 0.032))
    vor = nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 9
    links.new(uv, vor.inputs['Vector'])
    stones = ramp(mat, vor.outputs['Distance'], [(0.0, (1, 1, 1)), (0.09, (1, 1, 1)), (0.13, (0, 0, 0))])
    col = mix_rgb(mat, stones, col, (0.38, 0.33, 0.27))
    set_color(mat, col)
    bump(mat, grit, 0.5, 0.02)
    return mat


@define('gravel')
def _():
    mat, _b = new_mat('gravel')
    nodes, links = nodes_of(mat)
    uv = world_uv(mat)
    vor = nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 26
    links.new(uv, vor.inputs['Vector'])
    col = ramp(mat, vor.outputs['Distance'], [(0.0, (0.52, 0.50, 0.46)), (0.32, (0.32, 0.30, 0.27)), (0.52, (0.04, 0.038, 0.034))])
    set_color(mat, col)
    bump(mat, vor.outputs['Distance'], 0.8, 0.03)
    return mat


@define('lawn')
def _():
    mat, _b = new_mat('lawn')
    uv = world_uv(mat, 'xy')
    a = noise(mat, uv, 90, 6, 0.7)
    b = noise(mat, uv, 1.6, 5, 0.5)
    col = mix_rgb(mat, a, (0.05, 0.085, 0.035), (0.13, 0.20, 0.07))
    col = mix_rgb(mat, b, col, (0.09, 0.125, 0.05))
    set_color(mat, col)
    bump(mat, a, 0.9, 0.03)
    return mat


@define('asphalt')
def _():
    mat, _b = new_mat('asphalt')
    uv = world_uv(mat)
    a = noise(mat, uv, 120, 5, 0.8)
    set_color(mat, mix_rgb(mat, a, (0.018, 0.018, 0.02), (0.06, 0.06, 0.062)))
    bump(mat, a, 0.6, 0.01)
    return mat


@define('paving')
def _():
    mat, _b = new_mat('paving')
    uv = world_uv(mat, 'xy')
    tex = brick(mat, uv, (0.22, 0.21, 0.19), (0.19, 0.18, 0.165), (0.06, 0.055, 0.05), scale=1.0, w=1.0, h=1.0, gap=0.008, offset=0.0, smooth=0.0)
    n = noise(mat, uv, 30, 5, 0.6)
    set_color(mat, mix_rgb(mat, n, tex.outputs['Color'], (0.17, 0.165, 0.15)))
    return mat


@define('cabinet')
def _():
    mat, _b = new_mat('cabinet')
    n = noise(mat, world_uv(mat), 8, 5, 0.5)
    set_color(mat, mix_rgb(mat, n, (0.050, 0.083, 0.066), (0.060, 0.095, 0.075)))
    return mat


@define('stone')
def _():
    mat, _b = new_mat('stone')
    uv = world_uv(mat)
    nodes, links = nodes_of(mat)
    wave = nodes.new('ShaderNodeTexWave')
    wave.inputs['Scale'].default_value = 3.2
    wave.inputs['Distortion'].default_value = 9
    wave.inputs['Detail'].default_value = 5
    links.new(uv, wave.inputs['Vector'])
    vein = ramp(mat, wave.outputs['Fac'], [(0.0, (1, 1, 1)), (0.1, (0, 0, 0))])
    set_color(mat, mix_rgb(mat, vein, (0.74, 0.71, 0.66), (0.40, 0.37, 0.33)))
    return mat


@define('zellige')
def _():
    mat, _b = new_mat('zellige')
    uv = world_uv(mat, 'xz')
    tex = brick(mat, uv, (0.70, 0.67, 0.60), (0.56, 0.53, 0.46), (0.25, 0.23, 0.20), scale=1.0, w=0.10, h=0.10, gap=0.0025, offset=0.0, smooth=0.0)
    set_color(mat, tex.outputs['Color'])
    return mat


@define('bath_tile')
def _():
    mat, _b = new_mat('bath_tile')
    uv = world_uv(mat)
    tex = brick(mat, uv, (0.33, 0.35, 0.32), (0.27, 0.30, 0.27), (0.10, 0.10, 0.095), scale=1.0, w=0.60, h=0.15, gap=0.004, offset=0.5, smooth=0.0)
    set_color(mat, poche(mat, tex.outputs['Color']))
    bump(mat, tex.outputs['Fac'], 0.3, 0.004)
    return mat


@define('bath_floor')
def _():
    mat, _b = new_mat('bath_floor')
    uv = world_uv(mat, 'xy')
    tex = brick(mat, uv, (0.16, 0.16, 0.15), (0.13, 0.13, 0.125), (0.04, 0.04, 0.04), scale=1.0, w=0.40, h=0.40, gap=0.005, offset=0.0, smooth=0.0)
    set_color(mat, poche(mat, tex.outputs['Color']))
    return mat


@define('laundry_tile')
def _():
    mat, _b = new_mat('laundry_tile')
    uv = world_uv(mat, 'xy')
    tex = brick(mat, uv, (0.42, 0.40, 0.36), (0.36, 0.34, 0.31), (0.12, 0.11, 0.10), scale=1.0, w=0.45, h=0.45, gap=0.005, offset=0.0, smooth=0.0)
    set_color(mat, poche(mat, tex.outputs['Color']))
    return mat


@define('walnut')
def _():
    mat, _b = new_mat('walnut')
    uv = world_uv(mat)
    grain = noise(mat, uv, 4, 8, 0.6, stretch=(0.7, 16))
    set_color(mat, mix_rgb(mat, grain, (0.11, 0.06, 0.035), (0.20, 0.115, 0.065)))
    return mat


@define('oak_furn')
def _():
    mat, _b = new_mat('oak_furn')
    uv = world_uv(mat)
    grain = noise(mat, uv, 4, 8, 0.6, stretch=(0.7, 16))
    set_color(mat, mix_rgb(mat, grain, (0.40, 0.27, 0.15), (0.54, 0.38, 0.22)))
    return mat


@define('beam')
def _():
    mat, _b = new_mat('beam')
    uv = world_uv(mat)
    grain = noise(mat, uv, 3, 8, 0.6, stretch=(16, 0.7))
    set_color(mat, poche(mat, mix_rgb(mat, grain, (0.20, 0.12, 0.065), (0.30, 0.19, 0.105))))
    return mat


@define('sofa')
def _():
    mat, _b = new_mat('sofa')
    uv = world_uv(mat)
    n = noise(mat, uv, 170, 3, 0.6)
    set_color(mat, mix_rgb(mat, n, (0.42, 0.36, 0.28), (0.53, 0.47, 0.38)))
    bump(mat, n, 0.3, 0.004)
    return mat


@define('linen')
def _():
    mat, _b = new_mat('linen')
    uv = world_uv(mat)
    n = noise(mat, uv, 150, 3, 0.6)
    w = noise(mat, uv, 5, 4, 0.5)
    set_color(mat, mix_rgb(mat, n, (0.68, 0.66, 0.60), (0.80, 0.78, 0.72)))
    bump(mat, w, 0.25, 0.05)
    return mat


@define('wool')
def _():
    mat, _b = new_mat('wool')
    uv = world_uv(mat, 'xy')
    n = noise(mat, uv, 80, 4, 0.7)
    set_color(mat, mix_rgb(mat, n, (0.16, 0.10, 0.075), (0.27, 0.19, 0.14)))
    bump(mat, n, 0.6, 0.008)
    return mat


@define('rug')
def _():
    mat, _b = new_mat('rug')
    uv = world_uv(mat, 'xy')
    n = noise(mat, uv, 90, 4, 0.7)
    band = brick(mat, uv, (0.50, 0.44, 0.36), (0.46, 0.40, 0.33), (0.13, 0.13, 0.15), scale=1.0, w=9, h=0.42, gap=0.01, offset=0.0, smooth=0.5)
    set_color(mat, mix_rgb(mat, n, band.outputs['Color'], (0.40, 0.35, 0.28)))
    bump(mat, n, 0.5, 0.008)
    return mat


@define('art')
def _():
    mat, _b = new_mat('art')
    uv = world_uv(mat)
    n = noise(mat, uv, 2.8, 4, 0.4, stretch=(1, 2.6))
    set_color(mat, ramp(mat, n, [
        (0.28, (0.04, 0.08, 0.10)), (0.46, (0.10, 0.20, 0.24)), (0.56, (0.62, 0.56, 0.44)), (0.70, (0.32, 0.17, 0.08)),
    ]))
    return mat


flat('white', (0.74, 0.74, 0.72), 0.4)
flat('paper', (0.72, 0.70, 0.64), 0.7)
flat('porcelain', (0.80, 0.80, 0.78), 0.25)
flat('steel', (0.30, 0.31, 0.31), 0.4)
flat('steel_dark', (0.11, 0.115, 0.12), 0.4)
flat('black', (0.012, 0.012, 0.013), 0.5)
flat('iron', (0.035, 0.034, 0.033), 0.7)
flat('brass', (0.44, 0.30, 0.10), 0.4)
flat('terracotta', (0.33, 0.17, 0.10), 0.8)
flat('leaf', (0.035, 0.075, 0.04), 0.6)
flat('card', (0.34, 0.25, 0.16), 0.8)
flat('wicker', (0.34, 0.23, 0.12), 0.8)
flat('poche', (0.012, 0.014, 0.016), 0.8)
glow('sky', (0.20, 0.33, 0.56), 1.1)
glow('bulb', (1.0, 0.70, 0.40), 5.5)
glow('shade', (1.0, 0.70, 0.42), 2.2)
glow('strip', (1.0, 0.76, 0.50), 8)
glow('tube', (0.95, 0.93, 0.86), 7)
glow('halo', (1.0, 0.80, 0.58), 3.2)


# ---------------------------------------------------------------- the building

Y_B, C_B = LV['basementFloor'], LV['basementCeiling']
Y_G, C_G = LV['groundFloor'], LV['groundCeiling']
Y_U = LV['upperFloor']
EAVE, RIDGE = LV['eave'], LV['ridge']
PL = L['plinth']


def roof_y(x, offset=0.0):
    half = HR
    return RIDGE + offset - (abs(x) / half) * (RIDGE - EAVE)


def build_site():
    z = 'shell'
    left, right, bottom, back = PL['left'], PL['right'], PL['bottom'], PL['back']
    curb, walk = L['street']['curb'], L['street']['walk']
    # Soil: wrap the foundation, leave the basement hollow. Tops are lawn or paving.
    trench = 0.72
    box(z, 'soil', left, HL - trench, bottom, -0.07, back, CUT, drop=('bottom',))
    box(z, 'soil', HR + trench, right, bottom, -0.07, back, CUT, drop=('bottom',))
    box(z, 'soil', HL - trench, HR + trench, bottom, Y_B - 0.5, back, CUT, drop=('bottom', 'top'))
    # Backfill against the foundation, the gravel a real footing drain sits in.
    box(z, 'gravel', HL - trench, HL - WALL * 0.2, Y_B - 0.5, -0.07, BACK - 0.4, CUT, drop=('bottom', 'top', 'back'))
    box(z, 'gravel', HR + WALL * 0.2, HR + trench, Y_B - 0.5, -0.07, BACK - 0.4, CUT, drop=('bottom', 'top', 'back'))
    box(z, 'soil', HL - trench, HR + trench, Y_B - 0.5, -0.07, back, BACK - 0.4, drop=('bottom', 'front'))
    # Footings
    box(z, 'concrete', HL - 0.22, HL + 0.34, Y_B - 0.32, Y_B - 0.02, BACK - 0.3, CUT, drop=('bottom',))
    box(z, 'concrete', HR - 0.34, HR + 0.22, Y_B - 0.32, Y_B - 0.02, BACK - 0.3, CUT, drop=('bottom',))
    box(z, 'concrete', HL, HR, Y_B - 0.5, Y_B - 0.1, BACK - 0.3, CUT, drop=('bottom', 'back'))
    # Grade: lawn front and back, path, curb, street.
    box(z, 'lawn', walk, HL - 0.02, -0.07, 0.0, back, CUT, drop=('bottom',))
    box(z, 'lawn', HR + 0.02, right, -0.07, 0.0, back, CUT, drop=('bottom',))
    box(z, 'lawn', HL, HR, -0.07, 0.0, back, BACK - 0.3, drop=('bottom',))
    box(z, 'paving', curb, walk, -0.09, 0.015, back, CUT, drop=('bottom',))
    box(z, 'concrete', curb - 0.18, curb, -0.34, 0.03, back, CUT, drop=('bottom',))
    box(z, 'asphalt', left, curb - 0.18, -0.2, -0.08, back, CUT, drop=('bottom',))
    # Water main in the street: a real iron pipe, cut by the same knife as the house.
    m = L['main']
    ring = 28
    verts, faces = [], []
    r0, r1 = m['radius'], m['radius'] + 0.045
    for zz in (back + 0.01, CUT + 0.002):
        for s in range(ring):
            a = s / ring * math.tau
            verts.append((m['x'] + r1 * math.cos(a), m['y'] + r1 * math.sin(a), zz))
    for s in range(ring):
        a = s / ring * math.tau
        verts.append((m['x'] + r0 * math.cos(a), m['y'] + r0 * math.sin(a), CUT + 0.002))
    for s in range(ring):
        n = (s + 1) % ring
        faces.append([ring + s, ring + n, 2 * ring + n, 2 * ring + s])
    poly(z, 'iron', verts, faces, face=(0, 0, 1))


def build_structure():
    z = 'shell'
    w = WALL
    # Foundation
    box(z, 'concrete', HL, HL + w, Y_B - 0.1, 0.42, BACK - w, CUT, drop=('bottom', 'right', 'top'))
    box(z, 'concrete', HR - w, HR, Y_B - 0.1, 0.42, BACK - w, CUT, drop=('bottom', 'left', 'top'))
    box(z, 'concrete', HL, HR, Y_B - 0.1, 0.42, BACK - w, BACK, drop=('bottom', 'front', 'top'))
    # Slab / floors as seen in section
    box(z, 'structure', HL, HR, C_B, Y_G, BACK, CUT, drop=('top', 'bottom', 'back'))
    box(z, 'structure', HL, HR, C_G, Y_U, BACK, CUT, drop=('top', 'bottom', 'back'))
    # Above grade: siding on the outside, plaster faces are added per room.
    box(z, 'siding', HL, HL + 0.02, 0.42, EAVE, BACK - w, CUT)
    box(z, 'siding', HR - 0.02, HR, 0.42, EAVE, BACK - w, CUT)
    box(z, 'structure', HL, HL + w, 0.42, EAVE, CUT - 0.002, CUT, drop=('back', 'bottom', 'top'))
    box(z, 'structure', HR - w, HR, 0.42, EAVE, CUT - 0.002, CUT, drop=('back', 'bottom', 'top'))
    # Roof: two sloped slabs with an eave overhang, a cut at the gable.
    over = 0.5
    th = 0.3
    xe = HR + over
    ye = RIDGE - (xe / HR) * (RIDGE - EAVE)
    zb, zf = BACK - 0.55, CUT
    for sign in (-1, 1):
        verts = [
            (0, RIDGE + th, zb), (sign * xe, ye + th, zb), (sign * xe, ye + th, zf), (0, RIDGE + th, zf),
            (0, RIDGE, zb), (sign * xe, ye, zb), (sign * xe, ye, zf), (0, RIDGE, zf),
        ]
        poly(z, 'roof', verts, [[0, 1, 2, 3], [7, 6, 5, 4], [3, 2, 6, 7], [1, 0, 4, 5], [2, 1, 5, 6]], outward=True)
    # Back gable wall closes the vault (dark from outside, never seen from in front).
    poly(z, 'siding', [(HL, EAVE, BACK - w), (HR, EAVE, BACK - w), (0, RIDGE, BACK - w)], [[0, 1, 2]], face=(0, 0, -1))


def room_shell(zone, x0, x1, y0, y1, floor, wall='plaster', ceiling='ceiling', back_wall=None, left_wall=None, right_wall=None, vault=False):
    """The inside faces of one room. The front stays open: that is the section."""
    z0, z1 = BACK, CUT
    box(zone, floor, x0, x1, y0 - 0.02, y0, z0, z1, drop=('bottom', 'back', 'left', 'right'))
    if not vault:
        box(zone, ceiling, x0, x1, y1, y1 + 0.02, z0, z1, drop=('top', 'back', 'left', 'right'))
        box(zone, back_wall or wall, x0, x1, y0, y1, z0 - 0.02, z0, drop=('back', 'left', 'right', 'top', 'bottom', ))
    left_top = roof_y(x0) if vault else y1
    right_top = roof_y(x1) if vault else y1
    box(zone, left_wall or wall, x0 - 0.02, x0, y0, left_top, z0, z1, drop=('left', 'top', 'bottom', 'back'))
    box(zone, right_wall or wall, x1, x1 + 0.02, y0, right_top, z0, z1, drop=('right', 'top', 'bottom', 'back'))


def baseboards(zone, x0, x1, y0, z0=BACK, z1=CUT, back=True):
    h, t = 0.11, 0.016
    if back:
        box(zone, 'white', x0, x1, y0, y0 + h, z0, z0 + t, drop=('back', 'bottom'))
    box(zone, 'white', x0, x0 + t, y0, y0 + h, z0, z1, drop=('left', 'bottom', 'back'))
    box(zone, 'white', x1 - t, x1, y0, y0 + h, z0, z1, drop=('right', 'bottom', 'back'))


def partition(zone, x0, x1, y0, y1):
    """Interior wall in section: ink where cut, invisible elsewhere."""
    box(zone, 'poche', x0, x1, y0, y1, CUT - 0.001, CUT, drop=('back', 'top', 'bottom', 'left', 'right'))


def window(zone, x0, x1, y0, y1, z=BACK, mullion=1):
    box(zone, 'sky', x0, x1, y0, y1, z, z + 0.006, drop=('back', 'left', 'right', 'top', 'bottom'))
    t, d = 0.05, 0.07
    box(zone, 'black', x0 - t, x0, y0 - t, y1 + t, z, z + d, drop=('back',))
    box(zone, 'black', x1, x1 + t, y0 - t, y1 + t, z, z + d, drop=('back',))
    box(zone, 'black', x0, x1, y1, y1 + t, z, z + d, drop=('back',))
    box(zone, 'black', x0, x1, y0 - t, y0, z, z + d, drop=('back',))
    for i in range(1, mullion + 1):
        x = x0 + (x1 - x0) * i / (mullion + 1)
        box(zone, 'black', x - 0.015, x + 0.015, y0, y1, z, z + 0.04, drop=('back',))


def pendant(zone, x, y, z, ceiling, r=0.085):
    cyl_y(zone, 'black', x, z, 0.006, y + r, ceiling, 6)
    ball(zone, 'bulb', x, y, z, r, segs=16, rows=10)


def table_lamp(zone, x, y, z, h=0.42):
    cyl_y(zone, 'brass', x, z, 0.07, y, y + 0.02, 14)
    cyl_y(zone, 'brass', x, z, 0.012, y, y + h, 8)
    lathe(zone, 'shade', [(0.0001, y + h + 0.17), (0.075, y + h + 0.17), (0.115, y + h - 0.03), (0.0001, y + h - 0.03)], x, z, 22)


def snake_plant(zone, x, y, z, height=0.8, blades=13):
    lathe(zone, 'terracotta', [(0.0001, y), (0.125, y), (0.17, y + 0.28), (0.155, y + 0.28), (0.0001, y + 0.22)], x, z, 22)
    for i in range(blades):
        a = rng.random() * math.tau
        r0 = rng.random() * 0.1
        bx, bz = x + r0 * math.cos(a), z + r0 * math.sin(a)
        h = height * (0.55 + rng.random() * 0.5)
        lean = 0.05 + rng.random() * 0.14
        wid = 0.024 + rng.random() * 0.016
        twist = rng.random() * math.tau
        cx, cz = math.cos(twist) * wid, math.sin(twist) * wid
        verts, faces = [], []
        steps = 6
        for s in range(steps + 1):
            t = s / steps
            yy = y + 0.25 + h * t
            taper = 1 - t ** 3
            ox, oz = math.cos(a) * lean * t * t, math.sin(a) * lean * t * t
            verts.append((bx + ox - cx * taper, yy, bz + oz - cz * taper))
            verts.append((bx + ox + cx * taper, yy, bz + oz + cz * taper))
        for s in range(steps):
            faces.append([s * 2, s * 2 + 1, s * 2 + 3, s * 2 + 2])
        poly(zone, 'leaf', verts, faces, smooth=True, face=(0, 0.2, 1))


def books(zone, x0, x1, y, z0, z1, h=0.24):
    palette = ['paper', 'walnut', 'cabinet', 'wool', 'black', 'linen', 'terracotta']
    x = x0
    while x < x1 - 0.05:
        w = 0.02 + rng.random() * 0.03
        hh = h * (0.72 + rng.random() * 0.28)
        box(zone, rng.choice(palette), x, x + w, y, y + hh, z0, z1 - rng.random() * 0.03, drop=('bottom', 'back'))
        x += w + 0.002


def stairs(zone, x_start, x_end, y0, y1, z0, z1, mat='oak_furn', riser='plaster'):
    """A straight flight rising from x_start to x_end, closed below."""
    steps = max(int(round(abs(y1 - y0) / 0.19)), 2)
    dx = (x_end - x_start) / steps
    dy = (y1 - y0) / steps
    for i in range(steps):
        xa, xb = x_start + dx * i, x_start + dx * (i + 1)
        ya = y0 + dy * (i + 1)
        box(zone, riser, xa, xa + 0.015 * (1 if dx > 0 else -1), y0 + dy * i, ya, z0, z1, drop=('back', 'bottom', 'top'))
        box(zone, mat, xa, xb + 0.015 * (1 if dx < 0 else -1), ya - 0.03, ya, z0, z1 + 0.012, drop=('back', 'bottom'))
        # Stringer face, stepped.
        box(zone, 'plaster', xa, xb, y0, ya - 0.03, z1 - 0.004, z1, drop=('back', 'bottom', 'top', 'left', 'right'))
    # Handrail on brackets, following the pitch.
    n = 10
    for i in range(n + 1):
        t = i / n
        x = x_start + (x_end - x_start) * t
        y = y0 + (y1 - y0) * t
        cyl_y(zone, 'black', x, z1 - 0.03, 0.009, y, y + 0.9, 6)
    length_x = x_end - x_start
    length_y = y1 - y0
    rail = [(x_start, y0 + 0.9), (x_end, y1 + 0.9)]
    verts = []
    for (rx, ry) in rail:
        for dz, dyy in ((-0.022, 0.02), (0.022, 0.02), (0.022, -0.02), (-0.022, -0.02)):
            verts.append((rx, ry + dyy, z1 - 0.03 + dz))
    poly(zone, 'walnut', verts, [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], outward=True)
    _ = (length_x, length_y)


def build_utility():
    zone = 'basement'
    x0, x1 = L['rooms']['utility']['x']
    room_shell(zone, x0, x1, Y_B, C_B, 'concrete', wall='block', ceiling='structure')
    partition(zone, 0.6, 0.8, Y_B, C_B)
    # Joists above: this is a basement.
    for i in range(int((x1 - x0) / 0.42) + 1):
        x = x0 + 0.1 + i * 0.42
        if x < x1 - 0.04:
            box(zone, 'beam', x, x + 0.05, C_B - 0.2, C_B, BACK, CUT, drop=('top', 'back'))
    # Fluorescent batten
    box(zone, 'steel_dark', -3.45, -1.75, C_B - 0.26, C_B - 0.2, -1.65, -1.5, drop=('top',))
    box(zone, 'tube', -3.42, -1.78, C_B - 0.285, C_B - 0.26, -1.62, -1.53, drop=('top',))
    # Water heater: enamel jacket, flue, and floor pan.
    h = FX['heater']
    cyl_y(zone, 'paper', h['x'], h['z'], h['radius'] + 0.06, Y_B, Y_B + 0.04, 26)
    lathe(zone, 'porcelain', [(0.0001, Y_B + 0.05), (h['radius'], Y_B + 0.05), (h['radius'], Y_B + h['height'] - 0.05), (h['radius'] - 0.05, Y_B + h['height']), (0.0001, Y_B + h['height'])], h['x'], h['z'], 32)
    cyl_y(zone, 'steel', h['x'], h['z'], 0.05, Y_B + h['height'], C_B - 0.2, 12)
    box(zone, 'steel_dark', h['x'] - 0.12, h['x'] + 0.12, Y_B + 0.12, Y_B + 0.34, h['z'] + h['radius'] - 0.02, h['z'] + h['radius'] + 0.04, drop=('back',))
    # Electrical panel and a shelf of the usual things.
    box(zone, 'steel', -0.04, 0.5, -1.35, -0.55, BACK, BACK + 0.09, drop=('back',))
    box(zone, 'oak_furn', -5.85, -5.0, -1.0, -0.96, BACK, BACK + 0.32, drop=('back',))
    box(zone, 'card', -5.75, -5.4, -0.96, -0.72, BACK + 0.03, BACK + 0.3, drop=('back', 'bottom'))
    box(zone, 'card', -5.33, -5.06, -0.96, -0.78, BACK + 0.04, BACK + 0.28, drop=('back', 'bottom'))
    # Floor drain near the tanks
    cyl_y(zone, 'black', -1.1, -0.9, 0.08, Y_B, Y_B + 0.004, 18)


def washer(zone, x, z, w=0.68, d=0.68, h=0.86, dryer=False):
    y = Y_B + 0.02
    soft(zone, 'white', x - w / 2, x + w / 2, y + 0.03, y + h, z - d, z, 0.02, 2)
    box(zone, 'black', x - w / 2 + 0.03, x + w / 2 - 0.03, y, y + 0.04, z - d + 0.04, z - 0.04, drop=('bottom',))
    cy = y + h * 0.46
    ring = 0.235
    cyl_z(zone, 'steel', x, cy, ring, z, z + 0.018, 34)
    cyl_z(zone, 'black' if not dryer else 'steel_dark', x, cy, ring - 0.035, z + 0.018, z + 0.024, 34)
    box(zone, 'steel_dark', x - w / 2 + 0.05, x + w / 2 - 0.05, y + h - 0.12, y + h - 0.04, z, z + 0.006, drop=('back',))
    cyl_z(zone, 'steel', x + w / 2 - 0.11, y + h - 0.08, 0.026, z + 0.006, z + 0.024, 16)


def build_laundry():
    zone = 'basement'
    x0, x1 = L['rooms']['laundry']['x']
    room_shell(zone, x0, x1, Y_B, C_B, 'laundry_tile', wall='plaster')
    baseboards(zone, x0, x1, Y_B)
    # The stair is boxed in behind the machines, so this wall steps forward.
    wall_z = FX['washer']['z'] - 0.72
    box(zone, 'plaster', 2.2, x1, Y_B, C_B, wall_z - 0.02, wall_z, drop=('back', 'bottom', 'top'))
    box(zone, 'plaster', 2.2 - 0.02, 2.2, Y_B, C_B, BACK, wall_z, drop=('left', 'bottom', 'top', 'back', 'front'))
    washer(zone, FX['washer']['x'], FX['washer']['z'])
    washer(zone, FX['dryer']['x'], FX['dryer']['z'], dryer=True)
    # Counter and shelf over the machines, with baskets and towels
    box(zone, 'oak_furn', 2.45, 4.25, Y_B + 0.92, Y_B + 0.96, wall_z, FX['washer']['z'] + 0.02)
    box(zone, 'oak_furn', 2.6, 4.2, Y_B + 1.62, Y_B + 1.66, wall_z, wall_z + 0.3)
    lathe(zone, 'wicker', [(0.0001, Y_B + 0.96), (0.16, Y_B + 0.96), (0.19, Y_B + 1.2), (0.17, Y_B + 1.2), (0.0001, Y_B + 1.05)], 2.85, wall_z + 0.3, 20)
    soft(zone, 'linen', 3.35, 3.92, Y_B + 0.96, Y_B + 1.05, wall_z + 0.05, wall_z + 0.42, 0.04)
    soft(zone, 'wool', 3.38, 3.88, Y_B + 1.05, Y_B + 1.13, wall_z + 0.07, wall_z + 0.4, 0.035)
    for i, x in enumerate((2.75, 3.15, 3.55)):
        box(zone, 'white' if i != 1 else 'card', x, x + 0.26, Y_B + 1.66, Y_B + 1.9, wall_z + 0.04, wall_z + 0.26, drop=('bottom', 'back'))
    # Utility sink on the left of the room
    soft(zone, 'porcelain', 1.15, 1.8, Y_B + 0.55, Y_B + 0.86, BACK + 0.02, BACK + 0.55, 0.02)
    box(zone, 'steel', 1.2, 1.24, Y_B, Y_B + 0.55, BACK + 0.05, BACK + 0.09, drop=('bottom',))
    box(zone, 'steel', 1.71, 1.75, Y_B, Y_B + 0.55, BACK + 0.05, BACK + 0.09, drop=('bottom',))
    box(zone, 'steel', 1.2, 1.24, Y_B, Y_B + 0.55, BACK + 0.46, BACK + 0.5, drop=('bottom',))
    box(zone, 'steel', 1.71, 1.75, Y_B, Y_B + 0.55, BACK + 0.46, BACK + 0.5, drop=('bottom',))
    pendant(zone, 3.3, C_B - 0.55, -0.45, C_B)
    pendant(zone, 1.5, C_B - 0.5, -1.4, C_B, r=0.07)


def cabinet_run(zone, x0, x1, y0, height, z_back, depth, door=0.55, gap=0.004, handle=True, up=False):
    box(zone, 'cabinet', x0, x1, y0, y0 + height, z_back, z_back + depth - 0.02, drop=('back', 'bottom') if not up else ('back',))
    count = max(int(round((x1 - x0) / door)), 1)
    w = (x1 - x0) / count
    for i in range(count):
        a = x0 + i * w + gap
        b = x0 + (i + 1) * w - gap
        box(zone, 'cabinet', a, b, y0 + gap, y0 + height - gap, z_back + depth - 0.02, z_back + depth, drop=('back',))
        if handle:
            hx = a + 0.05 if i % 2 else b - 0.05
            yy = (y0 + height - 0.13) if not up else (y0 + 0.13)
            cyl_y(zone, 'brass', hx, z_back + depth + 0.012, 0.0055, yy - 0.06, yy + 0.06, 6)


def build_kitchen():
    zone = 'kitchen'
    x0, x1 = L['rooms']['kitchen']['x']
    room_shell(zone, x0, x1, Y_G, C_G, 'oak')
    partition(zone, 1.0, 1.2, Y_G, C_G)
    baseboards(zone, x0, x1, Y_G, back=False)
    d = 0.62
    toe = 0.1
    bh = 0.78
    top = Y_G + toe + bh
    sink_x = FX['kitchenSink']['x']
    dw = FX['dishwasher']
    fr = FX['fridge']
    # Base run, with a dishwasher gap and range.
    box(zone, 'black', -5.7, 0.0, Y_G, Y_G + toe, BACK, BACK + d - 0.06, drop=('back', 'bottom'))
    cabinet_run(zone, -5.7, dw['x'] - dw['width'] / 2, Y_G + toe, bh, BACK, d)
    # Dishwasher: a stainless door, not a cabinet front, so it reads at a glance.
    dx0, dx1 = dw['x'] - dw['width'] / 2, dw['x'] + dw['width'] / 2
    box(zone, 'steel', dx0 + 0.003, dx1 - 0.003, Y_G + toe, top, BACK, BACK + d - 0.005, drop=('back', 'bottom'))
    box(zone, 'steel_dark', dx0 + 0.04, dx1 - 0.04, top - 0.13, top - 0.1, BACK + d - 0.005, BACK + d + 0.022, drop=('back',))
    # Range
    rx0, rx1 = dx1 + 0.006, dx1 + 0.76
    box(zone, 'steel_dark', rx0, rx1, Y_G + toe, top, BACK, BACK + d, drop=('back', 'bottom'))
    box(zone, 'black', rx0 + 0.06, rx1 - 0.06, Y_G + 0.22, top - 0.22, BACK + d, BACK + d + 0.005, drop=('back',))
    box(zone, 'steel', rx0 + 0.05, rx1 - 0.05, top - 0.17, top - 0.15, BACK + d, BACK + d + 0.03, drop=('back',))
    cabinet_run(zone, rx1 + 0.006, 0.0, Y_G + toe, bh, BACK, d)
    # Counter: stone, with the basin cut in as a darker recess.
    box(zone, 'stone', -5.72, 0.0, top, top + 0.035, BACK, BACK + d + 0.025, drop=('back',))
    box(zone, 'steel_dark', sink_x - 0.4, sink_x + 0.4, top + 0.035, top + 0.0365, BACK + 0.14, BACK + 0.56, drop=('back', 'bottom'))
    box(zone, 'black', rx0 + 0.01, rx1 - 0.01, top + 0.035, top + 0.042, BACK + 0.05, BACK + d - 0.04, drop=('bottom', 'back'))
    # Backsplash the height of the window sill, then plaster.
    box(zone, 'zellige', -5.72, 0.0, top + 0.035, top + 0.72, BACK, BACK + 0.012, drop=('back', 'bottom'))
    # Window over the sink
    window(zone, sink_x - 0.95, sink_x + 0.95, top + 0.3, C_G - 0.32, BACK + 0.012, mullion=2)
    # Uppers either side
    cabinet_run(zone, -5.7, sink_x - 1.1, top + 0.72, C_G - 0.02 - (top + 0.72), BACK, 0.34, door=0.5, up=True)
    box(zone, 'strip', -5.65, sink_x - 1.15, top + 0.706, top + 0.718, BACK + 0.12, BACK + 0.15, drop=('top', 'back'))
    # Plaster hood over the range
    hx0, hx1 = rx0 - 0.02, rx1 + 0.02
    verts = [(hx0, top + 0.72, BACK), (hx1, top + 0.72, BACK), (hx1, top + 0.72, BACK + 0.5), (hx0, top + 0.72, BACK + 0.5),
             (hx0 + 0.14, C_G - 0.02, BACK), (hx1 - 0.14, C_G - 0.02, BACK), (hx1 - 0.14, C_G - 0.02, BACK + 0.28), (hx0 + 0.14, C_G - 0.02, BACK + 0.28)]
    poly(zone, 'plaster', verts, [[3, 2, 6, 7], [0, 3, 7, 4], [2, 1, 5, 6], [0, 1, 2, 3]], outward=True)
    box(zone, 'strip', hx0 + 0.1, hx1 - 0.1, top + 0.705, top + 0.72, BACK + 0.2, BACK + 0.3, drop=('top',))
    # Open oak shelves between hood and fridge, with crockery
    sx0, sx1 = rx1 + 0.12, -0.05
    if sx1 > sx0:
        for shelf_y in (top + 0.82, top + 1.22):
            box(zone, 'oak_furn', sx0, sx1, shelf_y, shelf_y + 0.035, BACK, BACK + 0.26, drop=('back',))
        for i in range(3):
            lathe(zone, 'porcelain', [(0.0001, top + 0.855), (0.05, top + 0.855), (0.058, top + 0.96), (0.05, top + 0.96), (0.0001, top + 0.87)], sx0 + 0.1 + i * 0.14, BACK + 0.13, 16)
    # Fridge
    fx0, fx1 = fr['x'] - fr['width'] / 2, fr['x'] + fr['width'] / 2
    soft(zone, 'steel', fx0, fx1, Y_G, Y_G + 2.08, BACK + 0.02, BACK + 0.72, 0.012, 1)
    box(zone, 'black', fr['x'] - 0.004, fr['x'] + 0.004, Y_G + 0.06, Y_G + 2.06, BACK + 0.719, BACK + 0.722, drop=('back',))
    cyl_y(zone, 'steel_dark', fr['x'] - 0.05, BACK + 0.75, 0.012, Y_G + 0.9, Y_G + 1.5, 8)
    cyl_y(zone, 'steel_dark', fr['x'] + 0.05, BACK + 0.75, 0.012, Y_G + 0.9, Y_G + 1.5, 8)
    # Slim dining table well forward, so nothing hides the sink wall.
    tx0, tx1, tz0, tz1 = -1.5, 0.75, 0.55, 1.45
    ty = Y_G + 0.74
    soft(zone, 'walnut', tx0, tx1, ty, ty + 0.04, tz0, tz1, 0.012, 1)
    for sx, sz in ((tx0 + 0.08, tz0 + 0.08), (tx1 - 0.08, tz0 + 0.08), (tx0 + 0.08, tz1 - 0.08), (tx1 - 0.08, tz1 - 0.08)):
        cyl_y(zone, 'black', sx, sz, 0.016, Y_G, ty, 8)
    for x in (-0.95, -0.38, 0.2):
        pendant(zone, x, C_G - 0.72, (tz0 + tz1) / 2, C_G, r=0.075)
        # Chairs on the far side only: the near side stays clear for the camera.
        cz = tz0 - 0.22
        soft(zone, 'oak_furn', x - 0.21, x + 0.21, Y_G + 0.43, Y_G + 0.47, cz - 0.2, cz + 0.2, 0.012, 1)
        soft(zone, 'oak_furn', x - 0.21, x + 0.21, Y_G + 0.66, Y_G + 0.78, cz - 0.22, cz - 0.195, 0.008, 1)
        for sx, sz in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
            cyl_y(zone, 'black', x + sx, cz + sz, 0.011, Y_G, Y_G + 0.43, 6)
        for sx in (-0.17, 0.17):
            cyl_y(zone, 'black', x + sx, cz - 0.21, 0.008, Y_G + 0.47, Y_G + 0.7, 6)
    lathe(zone, 'porcelain', [(0.0001, ty + 0.04), (0.09, ty + 0.04), (0.16, ty + 0.11), (0.145, ty + 0.11), (0.0001, ty + 0.06)], -0.38, (tz0 + tz1) / 2, 22)
    for dx, dz in ((-0.05, 0.02), (0.05, 0.04), (0.0, -0.05)):
        ball(zone, 'terracotta', -0.38 + dx, ty + 0.115, (tz0 + tz1) / 2 + dz, 0.042, segs=10, rows=7)
    # Lived in: a jar and a plant by the window, a soap dispenser.
    lathe(zone, 'terracotta', [(0.0001, top + 0.035), (0.06, top + 0.035), (0.075, top + 0.16), (0.066, top + 0.16), (0.0001, top + 0.05)], sink_x - 0.72, BACK + 0.2, 16)
    box(zone, 'stone', -5.72, -5.68, Y_G + toe, top, BACK, BACK + d, drop=('back',))


def build_living():
    zone = 'living'
    x0, x1 = L['rooms']['living']['x']
    room_shell(zone, x0, x1, Y_G, C_G, 'oak', wall='plaster_warm', back_wall='plaster_warm')
    baseboards(zone, x0, x1, Y_G)
    # Stair on the back wall, rising to the left.
    stairs(zone, x1 - 0.1, 1.75, Y_G, Y_U, BACK, BACK + 0.95)
    # Sofa, facing out of the section.
    sx, sz, sw = 3.65, -0.72, 2.3
    seat = Y_G + 0.38
    box(zone, 'black', sx - sw / 2 + 0.08, sx - sw / 2 + 0.12, Y_G, Y_G + 0.14, sz - 0.4, sz + 0.2, drop=('bottom',))
    box(zone, 'black', sx + sw / 2 - 0.12, sx + sw / 2 - 0.08, Y_G, Y_G + 0.14, sz - 0.4, sz + 0.2, drop=('bottom',))
    soft(zone, 'sofa', sx - sw / 2, sx + sw / 2, Y_G + 0.13, seat - 0.11, sz - 0.5, sz + 0.34, 0.05, 3)
    soft(zone, 'sofa', sx - sw / 2, sx + sw / 2, Y_G + 0.2, Y_G + 0.8, sz - 0.5, sz - 0.28, 0.07, 3)
    soft(zone, 'sofa', sx - sw / 2, sx - sw / 2 + 0.22, Y_G + 0.2, Y_G + 0.62, sz - 0.5, sz + 0.34, 0.07, 3)
    soft(zone, 'sofa', sx + sw / 2 - 0.22, sx + sw / 2, Y_G + 0.2, Y_G + 0.62, sz - 0.5, sz + 0.34, 0.07, 3)
    cw = (sw - 0.44) / 3
    for i in range(3):
        a = sx - sw / 2 + 0.22 + i * cw
        soft(zone, 'sofa', a + 0.004, a + cw - 0.004, seat - 0.11, seat + 0.03, sz - 0.28, sz + 0.36, 0.05, 3)
        soft(zone, 'sofa', a + 0.012, a + cw - 0.012, seat + 0.02, Y_G + 0.84, sz - 0.3, sz - 0.1, 0.07, 3)
    soft(zone, 'wool', sx + 0.52, sx + 0.92, seat + 0.03, seat + 0.42, sz - 0.1, sz + 0.02, 0.05, 3)
    soft(zone, 'linen', sx - 0.86, sx - 0.46, seat + 0.03, seat + 0.42, sz - 0.1, sz + 0.02, 0.05, 3)
    # Rug and low walnut table
    box(zone, 'rug', 1.95, 5.5, Y_G, Y_G + 0.012, -0.6, CUT - 0.12, drop=('bottom',))
    tx, tz = 3.6, 1.1
    soft(zone, 'walnut', tx - 0.62, tx + 0.62, Y_G + 0.3, Y_G + 0.345, tz - 0.36, tz + 0.36, 0.012, 1)
    for sx2, sz2 in ((-0.54, -0.28), (0.54, -0.28), (-0.54, 0.28), (0.54, 0.28)):
        cyl_y(zone, 'black', tx + sx2, tz + sz2, 0.012, Y_G, Y_G + 0.3, 6)
    books(zone, tx - 0.42, tx - 0.05, Y_G + 0.345, tz - 0.14, tz + 0.09, h=0.03)
    lathe(zone, 'porcelain', [(0.0001, Y_G + 0.345), (0.05, Y_G + 0.345), (0.09, Y_G + 0.44), (0.082, Y_G + 0.44), (0.0001, Y_G + 0.37)], tx + 0.28, tz - 0.04, 16)
    # Floor lamp: the warm key of the room
    lx, lz = 5.3, -0.95
    cyl_y(zone, 'black', lx, lz, 0.13, Y_G, Y_G + 0.018, 18)
    cyl_y(zone, 'black', lx, lz, 0.012, Y_G, Y_G + 1.55, 8)
    lathe(zone, 'shade', [(0.0001, Y_G + 1.78), (0.14, Y_G + 1.78), (0.2, Y_G + 1.5), (0.0001, Y_G + 1.5)], lx, lz, 24)
    # Art and a credenza on the kitchen partition
    box(zone, 'walnut', x0, x0 + 0.42, Y_G, Y_G + 0.68, 0.0, 1.9, drop=('left', 'bottom'))
    box(zone, 'black', x0, x0 + 0.02, Y_G + 1.05, Y_G + 2.15, 0.25, 1.6, drop=('left',))
    box(zone, 'art', x0 + 0.02, x0 + 0.024, Y_G + 1.09, Y_G + 2.11, 0.29, 1.56, drop=('left', 'top', 'bottom', 'back', 'front'))
    table_lamp(zone, x0 + 0.21, Y_G + 0.68, 0.32, h=0.34)
    snake_plant(zone, 5.65, Y_G, 0.65, height=1.05)


def build_bath():
    zone = 'bath'
    x0, x1 = L['rooms']['bath']['x']
    room_shell(zone, x0, x1, Y_U, EAVE + 2.4, 'bath_floor', wall='plaster', vault=True)
    partition(zone, -1.2, -1.0, Y_U, roof_y(-1.1))
    # Back wall follows the roof: tile to shoulder height, plaster above.
    top = 5.35
    box(zone, 'bath_tile', x0, x1, Y_U, top, BACK - 0.02, BACK, drop=('back', 'left', 'right', 'top', 'bottom'))
    poly(zone, 'plaster', [(x0, top, BACK), (x1, top, BACK), (x1, roof_y(x1), BACK), (x0, roof_y(x0), BACK)], [[0, 1, 2, 3]], face=(0, 0, 1))
    # Vaulted ceiling
    poly(zone, 'ceiling', [(x0, roof_y(x0) - 0.002, BACK), (x1, roof_y(x1) - 0.002, BACK), (x1, roof_y(x1) - 0.002, CUT), (x0, roof_y(x0) - 0.002, CUT)], [[0, 1, 2, 3]], face=(0, -1, 0))
    for i in range(int((CUT - BACK - 0.5) / 0.9) + 1):
        z = BACK + 0.4 + i * 0.9
        ya, yb = roof_y(x0) - 0.0, roof_y(x1) - 0.0
        d = 0.11
        verts = [(x0, ya, z), (x1, yb, z), (x1, yb, z + 0.08), (x0, ya, z + 0.08),
                 (x0, ya - d, z), (x1, yb - d, z), (x1, yb - d, z + 0.08), (x0, ya - d, z + 0.08)]
        poly(zone, 'beam', verts, [[4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7]], outward=True)
    # Walk-in shower: tiled alcove left of a low curb. Glass and fittings are live.
    box(zone, 'bath_tile', x0, x0 + 1.72, Y_U, top, BACK, BACK + 0.012, drop=('back', 'bottom', 'top'))
    box(zone, 'bath_tile', x0, x0 + 0.012, Y_U, top, BACK, -0.65, drop=('left', 'bottom'))
    box(zone, 'bath_floor', x0, x0 + 1.72, Y_U, Y_U + 0.05, BACK, -0.65, drop=('bottom', 'back', 'left'))
    box(zone, 'steel_dark', x0 + 0.72, x0 + 1.0, Y_U + 0.05, Y_U + 0.054, -2.2, -1.92, drop=('bottom',))
    # Niche in the shower wall
    box(zone, 'stone', x0 + 0.4, x0 + 1.15, Y_U + 1.3, Y_U + 1.32, BACK + 0.012, BACK + 0.1, drop=('back',))
    for i, x in enumerate((x0 + 0.52, x0 + 0.72, x0 + 0.9)):
        cyl_y(zone, 'paper' if i != 1 else 'black', x, BACK + 0.055, 0.032, Y_U + 1.32, Y_U + 1.5 + i * 0.02, 12)
    # Wall-hung toilet
    t = FX['toilet']
    ball(zone, 'porcelain', t['x'], Y_U + 0.36, t['z'] + 0.12, 0.19, 0.14, 0.26, 20, 12)
    box(zone, 'porcelain', t['x'] - 0.18, t['x'] + 0.18, Y_U + 0.25, Y_U + 0.9, BACK, BACK + 0.16, drop=('back', 'bottom'))
    soft(zone, 'steel', t['x'] - 0.09, t['x'] + 0.09, Y_U + 0.74, Y_U + 0.84, BACK + 0.16, BACK + 0.172, 0.004, 1)
    # Floating walnut vanity, vessel sink, round mirror with a halo
    v = FX['vanity']
    vy = Y_U + 0.5
    box(zone, 'walnut', v['x'] - 0.72, v['x'] + 0.72, vy, vy + 0.32, BACK, BACK + 0.52, drop=('back',))
    for i in range(2):
        a = v['x'] - 0.72 + i * 0.72
        box(zone, 'walnut', a + 0.006, a + 0.714, vy + 0.008, vy + 0.312, BACK + 0.52, BACK + 0.535, drop=('back',))
        cyl_x(zone, 'brass', vy + 0.26, BACK + 0.55, 0.007, a + 0.26, a + 0.46, 6)
    box(zone, 'stone', v['x'] - 0.74, v['x'] + 0.74, vy + 0.32, vy + 0.35, BACK, BACK + 0.54, drop=('back',))
    lathe(zone, 'porcelain', [(0.0001, vy + 0.35), (0.14, vy + 0.35), (0.21, vy + 0.47), (0.195, vy + 0.47), (0.12, vy + 0.385), (0.0001, vy + 0.38)], v['x'], BACK + 0.31, 26)
    cyl_z(zone, 'halo', v['x'], Y_U + 1.56, 0.42, BACK, BACK + 0.012, 40)
    cyl_z(zone, 'steel', v['x'], Y_U + 1.56, 0.4, BACK + 0.012, BACK + 0.022, 40)
    # Towel on a bar, plant on the floor.
    box(zone, 'linen', v['x'] + 0.86, v['x'] + 1.14, Y_U + 0.75, Y_U + 1.38, BACK + 0.014, BACK + 0.05, drop=('back',))
    cyl_x(zone, 'black', Y_U + 1.38, BACK + 0.05, 0.009, v['x'] + 0.8, v['x'] + 1.2, 6)
    snake_plant(zone, -1.55, Y_U, 0.65, height=0.72, blades=9)
    box(zone, 'wool', -4.0, -2.05, Y_U, Y_U + 0.012, -1.8, -0.4, drop=('bottom',))
    # High window
    window(zone, -4.25, -3.35, top + 0.15, top + 0.72, BACK + 0.004, mullion=0)


def build_bedroom():
    zone = 'bedroom'
    x0, x1 = L['rooms']['bedroom']['x']
    room_shell(zone, x0, x1, Y_U, EAVE + 2.4, 'oak', wall='plaster', vault=True)
    baseboards(zone, x0, x1, Y_U)
    # Back wall under the vault, with the stairwell boxed in on the right.
    poly(zone, 'plaster', [(x0, Y_U, BACK), (x1, Y_U, BACK), (x1, roof_y(x1), BACK), (0.0, RIDGE, BACK), (x0, roof_y(x0), BACK)], [[0, 1, 2, 3, 4]], face=(0, 0, 1))
    head_z = -1.9
    box(zone, 'plaster', 2.15, x1, Y_U, EAVE + 1.0, head_z - 0.02, head_z, drop=('back', 'bottom', 'top', 'right'))
    box(zone, 'plaster', 2.13, 2.15, Y_U, EAVE + 1.0, BACK, head_z, drop=('bottom', 'top', 'back', 'front', 'left'))
    # Vault, both sides of the ridge
    poly(zone, 'ceiling', [(x0, roof_y(x0) - 0.002, BACK), (0, RIDGE - 0.002, BACK), (0, RIDGE - 0.002, CUT), (x0, roof_y(x0) - 0.002, CUT)], [[0, 1, 2, 3]], face=(0, -1, 0))
    poly(zone, 'ceiling', [(0, RIDGE - 0.002, BACK), (x1, roof_y(x1) - 0.002, BACK), (x1, roof_y(x1) - 0.002, CUT), (0, RIDGE - 0.002, CUT)], [[0, 1, 2, 3]], face=(0, -1, 0))
    box(zone, 'beam', -0.08, 0.08, RIDGE - 0.26, RIDGE - 0.02, BACK, CUT, drop=('top', 'back'))
    for i in range(int((CUT - BACK - 0.5) / 0.9) + 1):
        z = BACK + 0.4 + i * 0.9
        for xa, xb in ((x0, 0.0), (0.0, x1)):
            ya, yb = roof_y(xa), roof_y(xb)
            d = 0.11
            verts = [(xa, ya, z), (xb, yb, z), (xb, yb, z + 0.08), (xa, ya, z + 0.08),
                     (xa, ya - d, z), (xb, yb - d, z), (xb, yb - d, z + 0.08), (xa, ya - d, z + 0.08)]
            poly(zone, 'beam', verts, [[4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7]], outward=True)
    # Bed, headboard against the stair box
    bx, bw = 4.05, 1.9
    bz0, bz1 = head_z, head_z + 2.25
    box(zone, 'oak_furn', bx - bw / 2 - 0.5, bx + bw / 2 + 0.5, Y_U + 0.0, Y_U + 1.05, head_z, head_z + 0.06, drop=('back', 'bottom'))
    soft(zone, 'walnut', bx - bw / 2, bx + bw / 2, Y_U + 0.1, Y_U + 0.3, bz0 + 0.06, bz1, 0.015, 1)
    soft(zone, 'linen', bx - bw / 2 + 0.03, bx + bw / 2 - 0.03, Y_U + 0.28, Y_U + 0.55, bz0 + 0.08, bz1 - 0.03, 0.09, 3)
    soft(zone, 'wool', bx - bw / 2 + 0.01, bx + bw / 2 - 0.01, Y_U + 0.53, Y_U + 0.6, bz1 - 0.72, bz1 - 0.1, 0.03, 2)
    for side in (-1, 1):
        soft(zone, 'linen', bx + side * 0.45 - 0.37, bx + side * 0.45 + 0.37, Y_U + 0.54, Y_U + 0.76, bz0 + 0.1, bz0 + 0.52, 0.09, 3)
    box(zone, 'black', bx - 0.62, bx + 0.62, Y_U + 1.32, Y_U + 2.12, head_z, head_z + 0.03, drop=('back',))
    box(zone, 'art', bx - 0.58, bx + 0.58, Y_U + 1.36, Y_U + 2.08, head_z + 0.03, head_z + 0.033, drop=('back', 'left', 'right', 'top', 'bottom'))
    # Nightstands and lamps
    for nx in (bx - bw / 2 - 0.4, bx + bw / 2 + 0.4):
        box(zone, 'walnut', nx - 0.26, nx + 0.26, Y_U + 0.14, Y_U + 0.54, head_z + 0.06, head_z + 0.5, drop=('back', 'bottom'))
        table_lamp(zone, nx, Y_U + 0.54, head_z + 0.26, h=0.3)
    # Window with sheer curtains
    window(zone, -0.45, 1.6, Y_U + 0.85, Y_U + 2.3, BACK + 0.004, mullion=2)
    for x_start, x_end in ((-0.68, -0.28), (1.45, 1.86)):
        verts, faces = [], []
        steps = 16
        for s in range(steps + 1):
            t = s / steps
            x = x_start + (x_end - x_start) * t
            zz = BACK + 0.14 + math.sin(t * math.pi * 7) * 0.035
            verts.append((x, Y_U + 0.03, zz))
            verts.append((x, Y_U + 2.52, zz))
        for s in range(steps):
            faces.append([s * 2, s * 2 + 2, s * 2 + 3, s * 2 + 1])
        poly(zone, 'linen', verts, faces, smooth=True, face=(0, 0, 1))
    cyl_x(zone, 'black', Y_U + 2.52, BACK + 0.14, 0.012, -0.8, 2.0, 8)
    # Reading chair and a low bookcase on the bath partition
    cx, cz = 0.75, 0.35
    soft(zone, 'wool', cx - 0.38, cx + 0.38, Y_U + 0.2, Y_U + 0.42, cz - 0.36, cz + 0.36, 0.06, 3)
    soft(zone, 'wool', cx - 0.38, cx + 0.38, Y_U + 0.3, Y_U + 0.86, cz - 0.42, cz - 0.24, 0.06, 3)
    for sx3, sz3 in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)):
        cyl_y(zone, 'walnut', cx + sx3, cz + sz3, 0.014, Y_U, Y_U + 0.2, 6)
    box(zone, 'rug', 1.95, 5.95, Y_U, Y_U + 0.012, -0.5, CUT - 0.12, drop=('bottom',))
    box(zone, 'oak_furn', x0, x0 + 0.32, Y_U, Y_U + 1.45, -0.9, 0.9, drop=('left', 'bottom'))
    for shelf in range(3):
        y = Y_U + 0.1 + shelf * 0.46
        box(zone, 'walnut', x0 + 0.32, x0 + 0.325, y + 0.02, y + 0.42, -0.84, 0.84, drop=('left', 'top', 'bottom', 'back', 'front'))
    table_lamp(zone, x0 + 0.17, Y_U + 1.45, 0.45, h=0.26)


def build_all():
    build_site()
    build_structure()
    build_utility()
    build_laundry()
    build_kitchen()
    build_living()
    build_bath()
    build_bedroom()


# ---------------------------------------------------------------- scene assembly

LIGHTS = [
    # name, kind, position (three axes), power W, colour, size
    ('kitchen_pend1', 'POINT', (-0.95, 2.42, 1.0), 13, (1.0, 0.70, 0.42), 0.08),
    ('kitchen_pend2', 'POINT', (-0.38, 2.42, 1.0), 13, (1.0, 0.70, 0.42), 0.08),
    ('kitchen_pend3', 'POINT', (0.2, 2.42, 1.0), 13, (1.0, 0.70, 0.42), 0.08),
    ('kitchen_wall', 'POINT', (-3.2, 2.7, -1.2), 26, (1.0, 0.78, 0.56), 0.5),
    ('kitchen_wall2', 'POINT', (-1.0, 2.7, -1.2), 20, (1.0, 0.78, 0.56), 0.5),
    ('kitchen_fill', 'AREA', (-2.4, 3.1, 0.2), 48, (1.0, 0.80, 0.60), 4.0),
    ('living_lamp', 'POINT', (5.3, 2.0, -0.95), 55, (1.0, 0.66, 0.38), 0.18),
    ('living_fill', 'AREA', (3.4, 3.1, 0.6), 34, (1.0, 0.78, 0.56), 3.0),
    ('living_table', 'POINT', (1.41, 1.6, 0.32), 14, (1.0, 0.66, 0.38), 0.1),
    ('bath_key', 'AREA', (-3.4, 6.0, -0.9), 62, (1.0, 0.86, 0.72), 2.2),
    ('bath_mirror', 'POINT', (-2.5, 5.0, -2.45), 10, (1.0, 0.78, 0.56), 0.15),
    ('bath_shower', 'POINT', (-5.0, 5.3, -1.1), 6, (1.0, 0.88, 0.76), 0.3),
    ('bed_lamp1', 'POINT', (2.75, 4.55, -1.65), 18, (1.0, 0.64, 0.36), 0.1),
    ('bed_lamp2', 'POINT', (5.35, 4.55, -1.65), 18, (1.0, 0.64, 0.36), 0.1),
    ('bed_fill', 'AREA', (2.5, 6.6, 0.3), 60, (1.0, 0.78, 0.58), 4.0),
    ('utility_tube', 'AREA', (-2.6, -0.2, -1.5), 40, (0.98, 0.93, 0.82), 1.7),
    ('utility_key', 'POINT', (-3.0, -0.55, -1.2), 34, (1.0, 0.86, 0.68), 0.35),
    ('utility_key2', 'POINT', (-0.7, -0.55, -0.6), 16, (1.0, 0.82, 0.62), 0.3),
    ('utility_fill', 'AREA', (-3.0, -0.25, 1.2), 22, (0.82, 0.86, 0.95), 3.0),
    ('laundry_pend', 'POINT', (3.3, -0.5, -0.45), 22, (1.0, 0.72, 0.46), 0.09),
    ('laundry_pend2', 'POINT', (1.5, -0.45, -1.4), 10, (1.0, 0.72, 0.46), 0.07),
    ('laundry_fill', 'AREA', (3.4, 0.0, 0.8), 13, (1.0, 0.80, 0.62), 3.0),
]


def set_up_world(strength=1.0):
    world = bpy.data.worlds.new('dusk')
    world.use_nodes = True
    nt = world.node_tree
    nodes, links = nt.nodes, nt.links
    bg = next(n for n in nodes if n.type == 'BACKGROUND')
    coord = nodes.new('ShaderNodeTexCoord')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(coord.outputs['Generated'], sep.inputs[0])
    rmp = nodes.new('ShaderNodeValToRGB')
    cr = rmp.color_ramp
    cr.elements[0].position = 0.42
    cr.elements[0].color = (0.10, 0.17, 0.27, 1)
    cr.elements[1].position = 0.92
    cr.elements[1].color = (0.012, 0.028, 0.06, 1)
    maprange = nodes.new('ShaderNodeMapRange')
    maprange.inputs['From Min'].default_value = -1
    links.new(sep.outputs['Z'], maprange.inputs['Value'])
    links.new(maprange.outputs[0], rmp.inputs['Fac'])
    links.new(rmp.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    bpy.context.scene.world = world


def assemble():
    scene = bpy.context.scene
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    built = {name: fn() for name, fn in MATS.items()}
    objects = {}
    for name, zone in ZONES.items():
        mesh = bpy.data.meshes.new(f'zone_{name}')
        mesh.from_pydata(zone.verts, [], zone.faces)
        mesh.update()
        by_slot = sorted(zone.slots.items(), key=lambda kv: kv[1])
        for key, _slot in by_slot:
            mesh.materials.append(built[key])
        mesh.polygons.foreach_set('material_index', zone.mats)
        mesh.polygons.foreach_set('use_smooth', zone.smooth)
        mesh.update()
        obj = bpy.data.objects.new(f'zone_{name}', mesh)
        scene.collection.objects.link(obj)
        objects[name] = obj
    for name, kind, pos, power, col, size in LIGHTS:
        light = bpy.data.lights.new(name, kind)
        light.energy = power
        light.color = col
        if kind == 'AREA':
            light.shape = 'RECTANGLE'
            light.size = size
            light.size_y = size * 0.75
        else:
            light.shadow_soft_size = size
        obj = bpy.data.objects.new(name, light)
        obj.location = to_bl(pos)
        scene.collection.objects.link(obj)
    set_up_world(0.65)
    moon = bpy.data.lights.new('moon', 'SUN')
    moon.energy = 0.7
    moon.color = (0.62, 0.74, 1.0)
    moon.angle = math.radians(18)
    moon_obj = bpy.data.objects.new('moon', moon)
    moon_obj.rotation_euler = (math.radians(62), 0, math.radians(-24))
    scene.collection.objects.link(moon_obj)
    # A low, wide glow across the cut soil, as if lit from the street.
    glow_light = bpy.data.lights.new('soil_glow', 'AREA')
    glow_light.energy = 340
    glow_light.color = (1.0, 0.86, 0.72)
    glow_light.shape = 'RECTANGLE'
    glow_light.size = 22
    glow_light.size_y = 1.6
    glow_obj = bpy.data.objects.new('soil_glow', glow_light)
    glow_obj.location = to_bl((-2.0, -3.4, 8.0))
    glow_obj.rotation_euler = (math.radians(100), 0, 0)
    scene.collection.objects.link(glow_obj)
    return objects


def set_up_cycles(samples=128):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = 'GPU'
    except Exception as error:  # falls back to CPU on machines without Metal
        print('GPU unavailable:', error)
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 4
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 0
    scene.cycles.volume_bounces = 0
    scene.cycles.sample_clamp_indirect = 8
    scene.view_settings.view_transform = 'AgX'
    looks = [item.identifier for item in scene.view_settings.bl_rna.properties['look'].enum_items]
    wanted = next((name for name in looks if 'Medium High' in name), 'None')
    try:
        scene.view_settings.look = wanted
    except TypeError:
        pass
    scene.view_settings.exposure = 0.55


def build():
    build_all()
    objects = assemble()
    set_up_cycles()
    return objects
