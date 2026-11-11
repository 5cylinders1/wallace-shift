"""
Builds the Dopps Chiropractic spine in background Blender and exports it for the web.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/dopps/build_spine.py -- \
        glb=public/demos/dopps/spine.glb renders=<dir> samples=48

Everything is modelled from code, in centimetres, then scaled to metres on export:
24 presacral vertebrae with their own proportions (atlas ring, axis with dens, bifid
cervical spines, long downward thoracic spines, hatchet lumbar spines), 23 discs, a
fused sacrum with foramina, the coccyx, the spinal cord with cauda equina, a pair of
nerve roots at every level and both sciatic nerves. Each vertebra is built from simple
primitives, fused by voxel remeshing, smoothed and decimated, so it reads as bone, not
as a kit of parts. Ambient occlusion is baked into vertex colours with Cycles.

Every object carries extras (label, region, kind) so the site can pick and highlight it.
Anterior faces -Y in Blender, which is +Z (toward the default camera) in glTF.
"""

import bpy
import bmesh
import json
import math
import os
import sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opts = dict(a.split('=', 1) for a in argv if '=' in a)
GLB = opts.get('glb', '/tmp/spine.glb')
RENDERS = opts.get('renders', '')
SAMPLES = int(opts.get('samples', '48'))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
collection = scene.collection

# ---------------------------------------------------------------- helpers

def loft(bm, rings, caps=True):
    verts = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rings[0])
    for a, b in zip(verts, verts[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps:
        bm.faces.new(verts[0])
        bm.faces.new(list(reversed(verts[-1])))


def tube(bm, pts, radii, n=12, squash=(1.0, 1.0), ref=None, caps=True):
    """Sweep a circle along pts with parallel transport, so long paths don't twist."""
    rings, u = [], None
    for k, p in enumerate(pts):
        if k == 0:
            t = pts[1] - pts[0]
        elif k == len(pts) - 1:
            t = pts[-1] - pts[-2]
        else:
            t = pts[k + 1] - pts[k - 1]
        t = t.normalized()
        if u is None:
            r = ref if ref is not None else Vector((0, 0, 1))
            if abs(t.dot(r)) > 0.95:
                r = Vector((1, 0, 0))
            u = t.cross(r).normalized()
        else:
            u = (u - t * u.dot(t)).normalized()
        v = t.cross(u).normalized()
        rings.append([p + (u * math.cos(2 * math.pi * i / n) * squash[0] + v * math.sin(2 * math.pi * i / n) * squash[1]) * radii[k] for i in range(n)])
    loft(bm, rings, caps)


def seg(bm, p0, p1, r0, r1, steps=3, squash=(1.0, 1.0), n=12):
    """A tapered rod with rounded ends (the ends round off further when remeshed)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    pts = [p0 - d * r0 * 0.5] + [p0.lerp(p1, k / steps) for k in range(steps + 1)] + [p1 + d * r1 * 0.5]
    rad = [r0 * 0.55] + [r0 + (r1 - r0) * k / steps for k in range(steps + 1)] + [r1 * 0.55]
    tube(bm, pts, rad, n=n, squash=squash)


def blob(bm, center, size, segments=(14, 9)):
    m = Matrix.Translation(Vector(center)) @ Matrix.Diagonal((*size, 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=segments[0], v_segments=segments[1], radius=1.0, matrix=m)


def superellipse(rx, ry, n, p=2.4):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        out.append((rx * math.copysign(abs(c) ** (2 / p), c), ry * math.copysign(abs(s) ** (2 / p), s)))
    return out


def body_ring(w, d, z, scale=1.0, n=28):
    """Kidney-shaped vertebral body section: flatter at the back, with a notch for the canal."""
    pts = []
    rx, ry = w / 2 * scale, d / 2 * scale
    for x, y in superellipse(rx, ry, n):
        if y > 0:
            y = y * 0.82 - 0.2 * d * scale * math.exp(-(x / (0.3 * w * scale)) ** 2) * (y / ry)
        pts.append(Vector((x, y, z)))
    return pts


def catmull(points, sub=4):
    p = [points[0]] + list(points) + [points[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(points[-1])
    return out


def new_object(name, bm, matrix=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    collection.objects.link(ob)
    if matrix is not None:
        ob.matrix_world = matrix
    return ob


def apply_modifiers(ob):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph))
    old = ob.data
    ob.modifiers.clear()
    ob.data = mesh
    bpy.data.meshes.remove(old)


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def organic(ob, voxel, target, smooth=8, cutters=()):
    """Fuse overlapping primitives into one bone surface, then bring it down to a web budget."""
    rm = ob.modifiers.new('remesh', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = voxel
    sm = ob.modifiers.new('smooth', 'SMOOTH')
    sm.factor = 0.5
    sm.iterations = smooth
    apply_modifiers(ob)
    for cutter in cutters:
        bo = ob.modifiers.new('hole', 'BOOLEAN')
        bo.operation = 'DIFFERENCE'
        bo.object = cutter
        bo.solver = 'EXACT'
        apply_modifiers(ob)
    if cutters:
        sm = ob.modifiers.new('smooth', 'SMOOTH')
        sm.factor = 0.4
        sm.iterations = 2
        apply_modifiers(ob)
    current = tris(ob)
    if current > target:
        dm = ob.modifiers.new('decimate', 'DECIMATE')
        dm.ratio = target / current
        apply_modifiers(ob)
    smooth_shade(ob)


def smooth_shade(ob):
    for poly in ob.data.polygons:
        poly.use_smooth = True


def tag(ob, label, region, kind):
    ob['label'] = label
    ob['region'] = region
    ob['kind'] = kind


# ---------------------------------------------------------------- proportions (cm)

def specs():
    out = [('C1', 'cervical', dict(atlas=True, w=1.8, d=1.6, h=1.0))]
    out.append(('C2', 'cervical', dict(w=1.8, d=1.6, h=2.0, dens=True, canal_w=2.2, canal_d=1.4, ped_len=0.55, ped_r=0.34, lam_r=0.3,
                                         sp_len=2.0, sp_angle=18, sp_r=(0.45, 0.32), bifid=True, tp_len=1.2, tp_back=-0.1, tp_up=0.0, tp_r=0.3, art=0.3)))
    for i in range(3, 8):
        k = i - 3
        out.append((f'C{i}', 'cervical', dict(w=1.7 + 0.08 * k, d=1.5 + 0.04 * k, h=1.4 + 0.03 * k, canal_w=2.3, canal_d=1.3, ped_len=0.5, ped_r=0.28, lam_r=0.24,
                                               sp_len=2.9 if i == 7 else 1.5 + 0.15 * k, sp_angle=22 if i == 7 else 18,
                                               sp_r=(0.38, 0.3) if i == 7 else (0.3, 0.2), bifid=i < 7,
                                               tp_len=1.3 + 0.08 * k, tp_back=-0.35, tp_up=0.05, tp_r=0.28, art=0.25)))
    for k in range(1, 13):
        f = (k - 1) / 11
        mid = math.exp(-((k - 7) / 3.0) ** 2)
        out.append((f'T{k}', 'thoracic', dict(w=2.4 + 1.4 * f, d=2.0 + 1.0 * f, h=1.7 + 0.65 * f, canal_w=1.7, canal_d=1.5,
                                               ped_len=0.8 + 0.2 * f, ped_r=0.36 + 0.12 * f, lam_r=0.32 + 0.08 * f,
                                               sp_len=2.9 + 1.2 * mid - 0.2 * f, sp_angle=(25 + 35 * mid) if k < 11 else 25 - 5 * (k - 11),
                                               sp_r=(0.42 + 0.1 * f, 0.26), sp_squash=(0.55, 1.1),
                                               tp_len=2.1 - 0.6 * f, tp_back=1.2 - 0.7 * f, tp_up=0.35, tp_r=0.42, art=0.3)))
    tps = [2.3, 2.7, 3.1, 2.8, 2.6]
    for k in range(1, 6):
        f = (k - 1) / 4
        out.append((f'L{k}', 'lumbar', dict(w=4.0 + 1.0 * f, d=3.0 + 0.5 * f, h=2.5 + 0.15 * f, canal_w=2.2 + 0.3 * f, canal_d=1.5,
                                             ped_len=1.0, ped_r=0.55 + 0.1 * f, lam_r=0.5,
                                             sp_len=2.6 - 0.4 * f, sp_angle=4, sp_r=(0.95, 0.8), sp_squash=(0.38, 1.0),
                                             tp_len=tps[k - 1], tp_back=0.25, tp_up=0.1, tp_r=0.42 if k < 5 else 0.6, art=0.45)))
    return out


def disc_height(upper):
    if upper.startswith('C'):
        return 0.5
    if upper.startswith('T'):
        return 0.45 + 0.35 * (int(upper[1:]) - 1) / 11
    return 0.9 + 0.06 * int(upper[1:])


SACRUM = [  # body w, d, h; wing half-span from the midline
    (4.6, 3.0, 2.3, 5.2), (3.6, 2.4, 2.0, 4.5), (2.8, 1.9, 1.8, 3.6), (2.1, 1.5, 1.6, 2.6), (1.5, 1.2, 1.4, 1.6),
]
COCCYX = [(1.6, 0.9, 0.9), (1.2, 0.7, 0.75), (0.9, 0.55, 0.6), (0.6, 0.45, 0.5)]

# ---------------------------------------------------------------- the curve

# Sagittal profile, top (C1) to bottom (coccyx tip): cervical lordosis, thoracic
# kyphosis, lumbar lordosis, then the sacrum curving back and the coccyx forward.
PROFILE = [(-1.0, 70), (-2.2, 66), (-3.0, 62), (-1.8, 57), (0.5, 52), (2.8, 45), (3.6, 38), (2.4, 31),
           (0.0, 25), (-2.6, 19), (-3.8, 14), (-2.4, 9), (0.8, 5), (3.6, 0), (3.2, -4), (0.8, -7)]


class Curve:
    def __init__(self, total):
        pts = [Vector((0.0, y, z)) for y, z in PROFILE]
        dense = catmull(pts, 40)
        length = sum((b - a).length for a, b in zip(dense, dense[1:]))
        k = total / length
        self.pts = [Vector((0.0, p.y * k, p.z * k)) for p in dense]
        self.acc = [0.0]
        for a, b in zip(self.pts, self.pts[1:]):
            self.acc.append(self.acc[-1] + (b - a).length)

    def at(self, s):
        s = max(0.0, min(s, self.acc[-1] - 1e-6))
        lo, hi = 0, len(self.acc) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.acc[mid] <= s:
                lo = mid
            else:
                hi = mid
        t = (s - self.acc[lo]) / (self.acc[hi] - self.acc[lo])
        pos = self.pts[lo].lerp(self.pts[hi], t)
        tangent = (self.pts[hi] - self.pts[lo]).normalized()  # points down the spine
        return pos, tangent

    def frame(self, s):
        pos, tangent = self.at(s)
        up = -tangent
        theta = math.atan2(-up.y, up.z)
        return Matrix.Translation(pos) @ Matrix.Rotation(theta, 4, 'X')


# ---------------------------------------------------------------- vertebrae

def arch_points(sp):
    d, h = sp['d'], sp['h']
    pr = sp['ped_r']
    px = sp['canal_w'] / 2 + pr * 0.7
    z0 = h * 0.12
    yb = d / 2 * 0.82
    y1 = yb + sp['ped_len']
    apex = Vector((0.0, y1 + sp['canal_d'] * 0.85, z0 - sp.get('lam_drop', h * 0.15)))
    return px, z0, yb, y1, apex


def build_atlas(bm):
    cy, rx, ry = 0.85, 1.9, 1.75
    ring = [Vector((rx * math.sin(a), cy - ry * math.cos(a), 0.0)) for a in [2 * math.pi * i / 22 for i in range(23)]]
    for p, q in zip(ring, ring[1:]):
        seg(bm, p, q, 0.32, 0.32, steps=1, n=10)
    for sx in (-1, 1):
        blob(bm, (sx * 1.7, 0.55, 0.0), (0.75, 0.95, 0.6))
        seg(bm, (sx * 1.9, 0.6, 0.0), (sx * 3.6, 0.45, -0.1), 0.45, 0.35)
    blob(bm, (0.0, cy + ry + 0.15, 0.0), (0.45, 0.35, 0.35))
    blob(bm, (0.0, cy - ry - 0.05, 0.0), (0.4, 0.3, 0.4))


def build_vertebra(bm, sp):
    w, d, h = sp['w'], sp['d'], sp['h']
    zs, sc = [-h / 2, -h * 0.38, 0.0, h * 0.38, h / 2], [0.97, 0.97, 0.9, 0.97, 0.97]
    loft(bm, [body_ring(w, d, z, s) for z, s in zip(zs, sc)])
    px, z0, yb, y1, apex = arch_points(sp)
    pr, lr = sp['ped_r'], sp['lam_r']
    for sx in (-1, 1):
        seg(bm, (sx * px * 0.92, yb - pr * 0.8, z0), (sx * px, y1, z0), pr, pr * 0.9)
        seg(bm, (sx * px, y1, z0), apex, lr, lr * 0.9, squash=(0.7, 2.6))
    ang = math.radians(sp['sp_angle'])
    tip = apex + Vector((0.0, sp['sp_len'] * math.cos(ang), -sp['sp_len'] * math.sin(ang)))
    r0, r1 = sp['sp_r']
    seg(bm, apex - Vector((0.0, 0.15, 0.0)), tip, r0, r1, steps=4, squash=sp.get('sp_squash', (0.6, 1.0)))
    if sp.get('bifid'):
        for sx in (-1, 1):
            seg(bm, tip - Vector((0.0, 0.3, 0.0)), tip + Vector((sx * 0.35, 0.25, -0.1)), r1 * 1.1, r1 * 0.9, steps=2)
    for sx in (-1, 1):
        base = Vector((sx * px, y1 - 0.1, z0))
        end = Vector((sx * (px + sp['tp_len']), y1 - 0.1 + sp['tp_back'], z0 + sp['tp_up']))
        seg(bm, base, end, sp['tp_r'], sp['tp_r'] * 0.75, squash=(1.0, 0.8))
        a = sp['art']
        seg(bm, (sx * px, y1, z0), (sx * px * 1.02, y1 + 0.15, z0 + h * 0.45 + a), pr * 0.75, pr * 0.6, steps=2)
        seg(bm, (sx * px * 0.95, y1 + sp['canal_d'] * 0.35, z0), (sx * px * 0.9, y1 + sp['canal_d'] * 0.5, z0 - h * 0.5 - a), pr * 0.75, pr * 0.6, steps=2)
    if sp.get('dens'):
        seg(bm, (0.0, 0.0, h * 0.3), (0.0, 0.05, h / 2 + 1.6), 0.55, 0.4, steps=4)


def canal_center(sp):
    if sp.get('atlas'):
        return Vector((0.0, 1.35, 0.0))
    px, z0, yb, y1, apex = arch_points(sp)
    return Vector((0.0, (yb + apex.y) / 2, z0))


def foramen(sp):
    """Where a nerve root leaves, just behind the body, beside the pedicle, at the disc below."""
    if sp.get('atlas'):
        return Vector((1.9, 0.9, -0.6))
    px, z0, yb, y1, apex = arch_points(sp)
    return Vector((px + 0.15, yb + sp['ped_len'] * 0.35, -sp['h'] / 2))


# ---------------------------------------------------------------- build

levels = specs()
order = []  # (kind, name, height)
for i, (name, region, sp) in enumerate(levels):
    order.append(('vertebra', name, sp['h']))
    if name == 'C1':
        order.append(('gap', 'C1-C2', 0.25))
    elif i + 1 < len(levels):
        order.append(('disc', f'{name}-{levels[i + 1][0]}', disc_height(name)))
order.append(('disc', 'L5-S1', 1.1))
sacrum_h = sum(s[2] for s in SACRUM) - 0.1 * (len(SACRUM) - 1)
coccyx_h = sum(c[2] for c in COCCYX)
order += [('sacrum', 'Sacrum', sacrum_h), ('gap', 'S-Co', 0.25), ('coccyx', 'Coccyx', coccyx_h)]

total = sum(item[2] for item in order)
curve = Curve(total)
centers, cursor = {}, 0.0
for kind, name, height in order:
    centers[name] = (cursor + height / 2, height)
    cursor += height

spec_by = {name: (region, sp) for name, region, sp in levels}
objects = {'bone': [], 'disc': [], 'nerve': []}
frames = {}

# Presacral vertebrae
for name, region, sp in levels:
    s, _ = centers[name]
    frames[name] = curve.frame(s)
    bm = bmesh.new()
    if sp.get('atlas'):
        build_atlas(bm)
    else:
        build_vertebra(bm, sp)
    ob = new_object(name, bm, frames[name])
    voxel = {'cervical': 0.07, 'thoracic': 0.09, 'lumbar': 0.11}[region]
    target = {'cervical': 1400, 'thoracic': 1800, 'lumbar': 2400}[region] + (400 if name == 'C2' else 0)
    organic(ob, voxel, target)
    tag(ob, name, region, 'vertebra')
    objects['bone'].append(ob)

# Discs
for kind, name, height in order:
    if kind != 'disc':
        continue
    upper, lower = name.split('-')
    s, h = centers[name]
    m = curve.frame(s)
    up = spec_by[upper][1]
    low = spec_by[lower][1] if lower in spec_by else {'w': SACRUM[0][0], 'd': SACRUM[0][1]}
    w, d = (up['w'] + low['w']) / 2 * 0.96, (up['d'] + low['d']) / 2 * 0.96
    bm = bmesh.new()
    zs, sc = [-h / 2, -h * 0.3, 0.0, h * 0.3, h / 2], [0.93, 1.0, 1.04, 1.0, 0.93]
    loft(bm, [body_ring(w, d, z, k) for z, k in zip(zs, sc)])
    ob = new_object(f'disc_{name}', bm, m)
    smooth_shade(ob)
    region = 'lumbar' if upper.startswith('L') else 'thoracic' if upper.startswith('T') else 'cervical'
    tag(ob, f'{upper}–{lower} disc', region, 'disc')
    objects['disc'].append(ob)

# Sacrum: one curved, triangular shield lofted along the sacral curve (alae at the top,
# tapering to the apex), with the S1 endplate, superior facets and median crest added,
# then four pairs of foramina drilled through.
SAC_RINGS = [(0.00, 9.4, 4.0), (0.14, 9.8, 3.7), (0.30, 8.4, 3.1), (0.46, 6.6, 2.6),
             (0.62, 5.0, 2.1), (0.78, 3.6, 1.7), (0.92, 2.5, 1.3), (1.00, 1.8, 1.0)]
s_top = centers['Sacrum'][0] - sacrum_h / 2
m_s1 = curve.frame(s_top + SACRUM[0][2] / 2)
inv = m_s1.inverted()


def sac_frame(t):
    return inv @ curve.frame(s_top + t * sacrum_h)


bm = bmesh.new()
rings = []
for t, w, d in SAC_RINGS:
    m = sac_frame(t)
    rings.append([m @ Vector((x, y + 0.25 * d, 0.0)) for x, y in superellipse(w / 2, d / 2, 36, 2.3)])
loft(bm, rings)
top = sac_frame(0.0)
blob(bm, top @ Vector((0.0, -0.1, 0.25)), (2.35, 1.55, 0.55))
for sx in (-1, 1):
    seg(bm, top @ Vector((sx * 1.7, 1.5, 0.0)), top @ Vector((sx * 1.85, 1.9, 1.3)), 0.5, 0.38, steps=2)
for t, size in ((0.22, 0.38), (0.4, 0.34), (0.58, 0.3), (0.74, 0.26)):
    m = sac_frame(t)
    d = next(dd for tt, ww, dd in SAC_RINGS if tt >= t)
    blob(bm, m @ Vector((0.0, 0.25 * d + d / 2 + 0.15, 0.0)), (size, size * 0.9, size * 1.3))
cutters = []
for k, t in enumerate((0.22, 0.42, 0.6, 0.76)):
    m = m_s1 @ sac_frame(t)
    for sx in (-1, 1):
        cb = bmesh.new()
        bmesh.ops.create_cone(cb, cap_ends=True, segments=16, radius1=0.45 - 0.07 * k, radius2=0.45 - 0.07 * k, depth=10.0,
                              matrix=m @ Matrix.Translation((sx * (2.3 - 0.35 * k), 0.0, 0.0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
        cutters.append(new_object(f'cut_{k}_{sx}', cb))
sacrum = new_object('Sacrum', bm, m_s1)
organic(sacrum, 0.12, 5200, cutters=cutters)
for c in cutters:
    bpy.data.objects.remove(c)
tag(sacrum, 'Sacrum', 'sacral', 'vertebra')
objects['bone'].append(sacrum)
frames['Sacrum'] = m_s1

# Coccyx: four small fused segments curling forward.
co_top = centers['Coccyx'][0] - coccyx_h / 2
m_co = curve.frame(co_top + COCCYX[0][2] / 2)
inv = m_co.inverted()
bm = bmesh.new()
cursor = co_top
for w, d, h in COCCYX:
    m = inv @ curve.frame(cursor + h / 2)
    part = bmesh.new()
    blob(part, (0.0, 0.0, 0.0), (w / 2, d / 2, h / 2 + 0.08))
    bmesh.ops.transform(part, matrix=m, verts=part.verts)
    mesh = bpy.data.meshes.new('tmp')
    part.to_mesh(mesh)
    part.free()
    bm.from_mesh(mesh)
    bpy.data.meshes.remove(mesh)
    cursor += h
coccyx = new_object('Coccyx', bm, m_co)
organic(coccyx, 0.06, 900)
tag(coccyx, 'Coccyx', 'sacral', 'vertebra')
objects['bone'].append(coccyx)

# Spinal cord: through each canal from C1, tapering to the conus at L1–L2, then the
# cauda equina as a thinner bundle down into the sacrum.
presacral = [name for name, _, _ in levels]
path, radius = [], []
for name in presacral:
    region, sp = spec_by[name]
    path.append(frames[name] @ canal_center(sp))
    r = {'cervical': 0.5, 'thoracic': 0.42, 'lumbar': 0.34}[region]
    if name in ('C5', 'C6'):
        r = 0.56
    if name in ('T11', 'T12'):
        r = 0.48
    if name == 'L1':
        r = 0.3
    if name in ('L2', 'L3', 'L4', 'L5'):
        r = 0.32
    radius.append(r)
path.append(frames['Sacrum'] @ Vector((0.0, SACRUM[0][1] / 2 + 0.45, 0.0)))
radius.append(0.26)
path.append(frames['Sacrum'] @ Vector((0.0, SACRUM[0][1] / 2 + 0.3, -3.5)))
radius.append(0.18)
smooth = catmull(path, 4)
r_smooth = []
for i in range(len(smooth)):
    t = i / (len(smooth) - 1) * (len(radius) - 1)
    a = int(math.floor(t))
    b = min(a + 1, len(radius) - 1)
    r_smooth.append(radius[a] + (radius[b] - radius[a]) * (t - a))
bm = bmesh.new()
tube(bm, smooth, r_smooth, n=12)
cord = new_object('SpinalCord', bm)
smooth_shade(cord)
tag(cord, 'Spinal cord', 'all', 'cord')
objects['nerve'].append(cord)


def root(name, region, frame, start, exit_, direction, radius, n=8):
    pts = [frame @ start, frame @ exit_, frame @ (exit_ + direction * 0.45), frame @ (exit_ + direction)]
    pts = catmull(pts, 4)
    rad = [radius * (1.0 - 0.45 * i / (len(pts) - 1)) for i in range(len(pts))]
    bm = bmesh.new()
    tube(bm, pts, rad, n=n)
    ob = new_object(name, bm)
    smooth_shade(ob)
    return ob


# A pair of nerve roots below each vertebra, named for the root that exits there
# (cervical roots exit above their vertebra, so C8 leaves between C7 and T1).
for i, name in enumerate(presacral):
    region, sp = spec_by[name]
    nxt = presacral[i + 1] if i + 1 < len(presacral) else 'S1'
    if region == 'cervical':
        root_name = f'C{int(name[1:]) + 1}'
        direction = Vector((3.0, -1.0, -1.6))
        r = 0.17
    elif region == 'thoracic':
        root_name = name
        direction = Vector((1.5, 0.3, -0.8))
        r = 0.1
    else:
        root_name = name
        direction = Vector((2.2, -1.4, -4.2))
        r = 0.22
    c = canal_center(sp)
    f = foramen(sp)
    for sx, side in ((-1, 'L'), (1, 'R')):
        start = Vector((sx * 0.25, c.y, -sp['h'] / 2))
        exit_ = Vector((sx * f.x, f.y, f.z))
        d = Vector((sx * direction.x, direction.y, direction.z))
        ob = root(f'root_{root_name}_{side}', region, frames[name], start, exit_, d, r)
        tag(ob, f'{root_name} nerve root', region, 'nerve')
        ob['level'] = f'{name}–{nxt}'
        objects['nerve'].append(ob)

# Sacral roots S1–S4 leave through the foramina, and with L4–L5 they gather into the
# sciatic nerve on each side, which runs down toward the back of the thigh.
for k, t in enumerate((0.22, 0.42, 0.6, 0.76)):
    m = m_s1 @ sac_frame(t)
    d = next(dd for tt, ww, dd in SAC_RINGS if tt >= t)
    for sx, side in ((-1, 'L'), (1, 'R')):
        start = Vector((sx * 0.2, 0.25 * d + 0.4, 0.0))
        exit_ = Vector((sx * (2.3 - 0.35 * k), -d / 2 + 0.1, 0.0))
        dvec = Vector((sx * (2.6 - 0.3 * k), -1.6, -2.4 - 0.4 * k))
        ob = root(f'root_S{k + 1}_{side}', 'sacral', m, start, exit_, dvec, 0.2 - 0.02 * k)
        tag(ob, f'S{k + 1} nerve root', 'sacral', 'nerve')
        objects['nerve'].append(ob)

m_s1 = frames['Sacrum']
for sx, side in ((-1, 'L'), (1, 'R')):
    pts = [Vector((sx * 3.4, -2.2, -3.0)), Vector((sx * 4.4, -2.4, -6.0)), Vector((sx * 5.6, -1.4, -10.0)),
           Vector((sx * 6.4, 0.2, -15.0)), Vector((sx * 6.8, 1.2, -21.0))]
    pts = catmull([m_s1 @ p for p in pts], 5)
    rad = [0.55 - 0.1 * i / (len(pts) - 1) for i in range(len(pts))]
    bm = bmesh.new()
    tube(bm, pts, rad, n=10)
    ob = new_object(f'sciatic_{side}', bm)
    smooth_shade(ob)
    tag(ob, 'Sciatic nerve', 'sacral', 'nerve')
    objects['nerve'].append(ob)

# ---------------------------------------------------------------- materials


def socket(sockets, identifier):
    return next(s for s in sockets if s.identifier == identifier)


def material(name, color, roughness, coat=0.0, subsurface=0.0):
    mat = bpy.data.materials.new(name)
    try:
        mat.use_nodes = True
    except AttributeError:
        pass
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    for key, value in (('Coat Weight', coat), ('Subsurface Weight', subsurface)):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    attr = nodes.new('ShaderNodeVertexColor')
    attr.layer_name = 'ao'
    mix = nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    socket(mix.inputs, 'Factor_Float').default_value = 1.0
    socket(mix.inputs, 'A_Color').default_value = (*color, 1.0)
    links.new(attr.outputs['Color'], socket(mix.inputs, 'B_Color'))
    links.new(socket(mix.outputs, 'Result_Color'), bsdf.inputs['Base Color'])
    return mat


mats = {
    'bone': material('bone', (0.86, 0.80, 0.70), 0.5, subsurface=0.08),
    'disc': material('disc', (0.52, 0.66, 0.76), 0.32, coat=0.4),
    'nerve': material('nerve', (0.93, 0.74, 0.40), 0.4, coat=0.2),
}
everything = [ob for group in objects.values() for ob in group]
for group, obs in objects.items():
    for ob in obs:
        ob.data.materials.clear()
        ob.data.materials.append(mats[group])
        attr = ob.data.color_attributes.new(name='ao', type='BYTE_COLOR', domain='POINT')
        ob.data.color_attributes.active_color = attr
        ob.data.color_attributes.render_color_index = ob.data.color_attributes.active_color_index

# ---------------------------------------------------------------- ambient occlusion bake

world = bpy.data.worlds.new('world')
scene.world = world
try:
    world.use_nodes = True
except AttributeError:
    pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.05, 0.06, 0.07, 1.0)
bg.inputs['Strength'].default_value = 0.6
world.light_settings.distance = 2.5

scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.device = 'CPU'
scene.render.bake.target = 'VERTEX_COLORS'
for ob in bpy.context.view_layer.objects:
    ob.select_set(False)
for ob in everything:
    ob.select_set(True)
bpy.context.view_layer.objects.active = everything[0]
bpy.ops.object.bake(type='AO')

# ---------------------------------------------------------------- look-dev renders

if RENDERS:
    os.makedirs(RENDERS, exist_ok=True)
    for angle, (energy, rot) in {'key': (3.5, (0.9, 0.2, -0.6)), 'rim': (2.0, (1.2, 0.0, 2.6)), 'fill': (0.8, (1.4, 0.0, 1.2))}.items():
        sun = bpy.data.lights.new(angle, 'SUN')
        sun.energy = energy
        sun.angle = math.radians(12)
        ob = bpy.data.objects.new(angle, sun)
        ob.rotation_euler = rot
        collection.objects.link(ob)
    target = bpy.data.objects.new('target', None)
    collection.objects.link(target)
    target.location = (0.0, 0.0, 30.0)
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_data)
    collection.objects.link(cam)
    constraint = cam.constraints.new('TRACK_TO')
    constraint.target = target
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 760, 1100
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    views = {
        'side': ((140.0, 0.0, 30.0), 96.0, (0.0, 0.0, 30.0)),
        'back34': ((90.0, 110.0, 40.0), 96.0, (0.0, 0.0, 30.0)),
        'front': ((0.0, -140.0, 30.0), 96.0, (0.0, 0.0, 30.0)),
        'lumbar': ((40.0, 60.0, 14.0), 26.0, (0.0, 0.0, 10.0)),
        'neck': ((30.0, 45.0, 64.0), 20.0, (0.0, 0.0, 62.0)),
    }
    for view, (loc, scale, look) in views.items():
        cam.location = loc
        cam_data.ortho_scale = scale
        target.location = look
        scene.render.filepath = os.path.join(RENDERS, f'{view}.png')
        bpy.ops.render.render(write_still=True)
    for name in ('key', 'rim', 'fill', 'cam', 'target'):
        bpy.data.objects.remove(bpy.data.objects[name])

# ---------------------------------------------------------------- export (centimetres to metres)

scale = Matrix.Scale(0.01, 4)
for ob in everything:
    ob.data.transform(scale)
    ob.matrix_world = Matrix.Translation(ob.matrix_world.translation * 0.01) @ ob.matrix_world.to_quaternion().to_matrix().to_4x4()

props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
kwargs = dict(filepath=GLB, export_format='GLB')
wanted = {
    'use_selection': False, 'export_apply': True, 'export_yup': True, 'export_extras': True,
    'export_texcoords': False, 'export_normals': True, 'export_cameras': False, 'export_lights': False,
    'export_draco_mesh_compression_enable': True, 'export_draco_mesh_compression_level': 6,
    'export_draco_position_quantization': 14, 'export_draco_normal_quantization': 10,
    'export_draco_color_quantization': 8, 'export_materials': 'EXPORT',
}
for key, value in wanted.items():
    if key in props:
        kwargs[key] = value
if 'export_vertex_color' in props:
    kwargs['export_vertex_color'] = 'ACTIVE'
elif 'export_colors' in props:
    kwargs['export_colors'] = True
if 'export_all_vertex_colors' in props:
    kwargs['export_all_vertex_colors'] = False
os.makedirs(os.path.dirname(os.path.abspath(GLB)), exist_ok=True)
bpy.ops.export_scene.gltf(**kwargs)

summary = {
    'objects': len(everything),
    'triangles': sum(tris(ob) for ob in everything),
    'bone_tris': {ob.name: tris(ob) for ob in objects['bone']},
    'spine_length_cm': round(total, 1),
    'glb_bytes': os.path.getsize(GLB),
    'export_kwargs': sorted(k for k in kwargs if k != 'filepath'),
}
print('SPINE_SUMMARY ' + json.dumps(summary))
