"""Build the cabinetry demo 02 kitchen in Blender (Cycles), from kitchen_spec.

Run inside Blender (the Blender MCP does this):
    exec(compile(open(PATH).read(), PATH, 'exec'), {'__name__': '__main__'})
It clears the current file's objects and materials, builds the room, the run,
wall cabinets, island and pendants, lights it, sets the locked camera and
saves output/cabinetry-2/blender/kitchen.blend.

Every cabinet module, the wall cabinets, island, pendant group and backsplash
sit under their own empty, so the Phase 3 animation can move whole units.
set_state(kitchen=..., dusk=...) switches between the empty room and the
finished kitchen, and between day (0) and dusk (1).
"""
import math, os, random, sys
import bpy, bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else \
    '/Users/matthewwallace/Repos/WallaceShiftLogoSite/scripts/cabinetry-2'
sys.path.insert(0, HERE)
import importlib, kitchen_spec as K  # noqa: E402
importlib.reload(K)

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ASSETS = os.path.join(ROOT, 'output', 'cabinetry-2', 'assets')
BLEND = os.path.join(ROOT, 'output', 'cabinetry-2', 'blender', 'kitchen.blend')
IN = 0.0254
random.seed(7)


# ------------------------------------------------------------------ basics
def P(x, y, z):
    """Plan inches (y into the room) to Blender metres (room toward -Y)."""
    return Vector((x * IN, -y * IN, z * IN))


def clear():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.curves,
                 bpy.data.images, bpy.data.node_groups, bpy.data.worlds):
        for d in list(coll):
            if d.users == 0 or coll in (bpy.data.materials, bpy.data.images, bpy.data.worlds):
                try:
                    coll.remove(d)
                except Exception:
                    pass
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def collection(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in (parent or bpy.context.scene.collection).children:
        (parent or bpy.context.scene.collection).children.link(c)
    return c


def empty(name, loc, coll):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.2
    e.location = loc
    coll.objects.link(e)
    return e


def world_offset(parent):
    """World translation of an empty chain (parents here never rotate or scale)."""
    off = Vector((0, 0, 0))
    while parent is not None:
        off += parent.location
        parent = parent.parent
    return off


def link(obj, coll, parent=None):
    """Link obj (placed in world space) into coll, optionally under parent."""
    coll.objects.link(obj)
    if parent is not None:
        link_parent(obj, parent)
    return obj


def link_parent(child, parent):
    child.location = child.location - world_offset(parent)
    child.parent = parent


def bevel(obj, width_in=0.06, segments=2):
    m = obj.modifiers.new('Bevel', 'BEVEL')
    m.width = width_in * IN
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.harden_normals = True
    return obj


def box(name, x0, x1, y0, y1, z0, z1, mat, coll, parent=None, bev=0.06):
    """Axis-aligned box from plan inches. Mesh is in metres around its centre."""
    lo, hi = P(min(x0, x1), max(y0, y1), min(z0, z1)), P(max(x0, x1), min(y0, y1), max(z0, z1))
    c = (lo + hi) / 2
    s = hi - lo
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = c
    ob.data.materials.append(mat)
    if bev:
        bevel(ob, bev)
    return link(ob, coll, parent)


def cylinder(name, x, y, z0, z1, r, mat, coll, parent=None, verts=32, axis='Z'):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r * IN, radius2=r * IN, depth=(z1 - z0) * IN)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = P(x, y, (z0 + z1) / 2)
    ob.data.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return link(ob, coll, parent)


def sphere(name, x, y, z, r, mat, coll, parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=r * IN)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = P(x, y, z)
    ob.data.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return link(ob, coll, parent)


def tube(name, pts_in, r, mat, coll, parent=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r * IN
    cu.bevel_resolution = 6
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts_in) - 1)
    for bp, p in zip(sp.bezier_points, pts_in):
        bp.co = P(*p)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(mat)
    return link(ob, coll, parent)


# ---------------------------------------------------------------- materials
def nodes_of(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    return nt, out


def principled(nt):
    return nt.nodes.new('ShaderNodeBsdfPrincipled')


def img(nt, path, non_color=False):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(path, check_existing=True)
    if non_color:
        n.image.colorspace_settings.name = 'Non-Color'
    n.projection = 'BOX'
    n.projection_blend = 0.15
    return n


def mapping(nt, size_m, rot_z=0.0, rot_y=0.0, mirror_x=False, random_offset=True):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    s = 1.0 / size_m
    mp.inputs['Scale'].default_value = (-s if mirror_x else s, s, s)
    mp.inputs['Rotation'].default_value = (0, rot_y, rot_z)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    if random_offset:
        oi = nt.nodes.new('ShaderNodeObjectInfo')
        mul = nt.nodes.new('ShaderNodeVectorMath')
        mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = (7.3, 3.1, 5.7)
        cmb = nt.nodes.new('ShaderNodeCombineXYZ')
        nt.links.new(oi.outputs['Random'], cmb.inputs[0])
        nt.links.new(oi.outputs['Random'], cmb.inputs[1])
        nt.links.new(oi.outputs['Random'], cmb.inputs[2])
        nt.links.new(cmb.outputs[0], mul.inputs[0])
        nt.links.new(mul.outputs[0], mp.inputs['Location'])
    return mp


def remap(nt, src, lo, hi):
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['To Min'].default_value = lo
    mr.inputs['To Max'].default_value = hi
    nt.links.new(src, mr.inputs['Value'])
    return mr.outputs['Result']


def pbr(name, folder, prefix, size_m, hsv=(0.5, 1.0, 1.0), rough=(0.4, 0.8), normal=0.4,
        rot_z=0.0, mirror_x=False, random_offset=True, coat=0.0, maps=None, mottle=None):
    maps = maps or {'color': 'Diffuse', 'rough': 'Rough'}
    mat = bpy.data.materials.new(name)
    nt, out = nodes_of(mat)
    bs = principled(nt)
    mp = mapping(nt, size_m, rot_z=rot_z, mirror_x=mirror_x, random_offset=random_offset)

    def path(key):
        return os.path.join(ASSETS, folder, prefix.format(maps[key]))
    c = img(nt, path('color'))
    hs = nt.nodes.new('ShaderNodeHueSaturation')
    hs.inputs['Hue'].default_value, hs.inputs['Saturation'].default_value, hs.inputs['Value'].default_value = hsv
    r = img(nt, path('rough'), True)
    # Bump from the colour map's luminance: tangent-space normal maps need UVs,
    # which box-projected boxes don't have.
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = normal
    bump.inputs['Distance'].default_value = 0.002
    for t in (c, r):
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
    nt.links.new(c.outputs['Color'], hs.inputs['Color'])
    base = hs.outputs['Color']
    if mottle:  # soft, large-scale tonal drift (limewash, plaster) so walls never read as flat CG
        scale_m, lo, hi = mottle
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = 1.0 / scale_m
        nz.inputs['Detail'].default_value = 4.0
        nz.inputs['Roughness'].default_value = 0.55
        tc2 = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc2.outputs['Object'], nz.inputs['Vector'])
        mul, ma, mb, mf, mout = mix_rgb(nt, 'MULTIPLY')
        mf.default_value = 1.0
        v = remap(nt, nz.outputs['Fac'], lo, hi)
        cmb = nt.nodes.new('ShaderNodeCombineColor')
        for k in range(3):
            nt.links.new(v, cmb.inputs[k])
        nt.links.new(base, ma)
        nt.links.new(cmb.outputs[0], mb)
        base = mout
    nt.links.new(base, bs.inputs['Base Color'])
    nt.links.new(remap(nt, r.outputs['Color'], *rough), bs.inputs['Roughness'])
    nt.links.new(c.outputs['Color'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    if coat:
        bs.inputs['Coat Weight'].default_value = coat
        bs.inputs['Coat Roughness'].default_value = 0.3
    nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    return mat


def flat(name, rgb, rough=0.5, metallic=0.0, coat=0.0, noise=0.0):
    mat = bpy.data.materials.new(name)
    nt, out = nodes_of(mat)
    bs = principled(nt)
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    if coat:
        bs.inputs['Coat Weight'].default_value = coat
    if noise:  # break up perfectly even roughness, which reads as CG
        tx = nt.nodes.new('ShaderNodeTexNoise')
        tx.inputs['Scale'].default_value = 40.0
        tx.inputs['Detail'].default_value = 6.0
        tc = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc.outputs['Object'], tx.inputs['Vector'])
        nt.links.new(remap(nt, tx.outputs['Fac'], rough - noise, rough + noise), bs.inputs['Roughness'])
    nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    return mat


def emission(name, rgb, strength):
    mat = bpy.data.materials.new(name)
    nt, out = nodes_of(mat)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*rgb, 1)
    em.inputs['Strength'].default_value = strength
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return mat


def shadow_clear(mat, tint=(1, 1, 1)):
    """Let shadow rays pass (window glass, opal globes) so light gets through."""
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    src = out.inputs['Surface'].links[0].from_socket
    lp = nt.nodes.new('ShaderNodeLightPath')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    tr.inputs['Color'].default_value = (*tint, 1)
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Shadow Ray'], mx.inputs['Fac'])
    nt.links.new(src, mx.inputs[1])
    nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])


def kelvin(k):
    """Approximate linear RGB of a black body (good enough for warm lamps)."""
    t = k / 100.0
    r = 255 if t <= 66 else 329.7 * (t - 60) ** -0.1332
    g = 99.47 * math.log(t) - 161.12 if t <= 66 else 288.12 * (t - 60) ** -0.0755
    b = 255 if t >= 66 else (0 if t <= 19 else 138.52 * math.log(t - 10) - 305.04)
    srgb = [max(0, min(255, c)) / 255 for c in (r, g, b)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


def make_materials():
    M = {}
    M['wall'] = pbr('Limewash', 'beige_wall_001', 'beige_wall_001_{}_2k.jpg', 2.4, hsv=(0.5, 0.55, 1.22),
                    rough=(0.75, 0.95), normal=0.3, mottle=(1.2, 0.78, 1.1))
    M['ceiling'] = pbr('Ceiling', 'beige_wall_001', 'beige_wall_001_{}_2k.jpg', 2.4, hsv=(0.5, 0.45, 1.25),
                       rough=(0.8, 0.95), normal=0.2)
    M['floor'] = pbr('Smoked oak herringbone', 'herringbone_parquet', 'herringbone_parquet_{}_2k.jpg', 2.6,
                     hsv=(0.5, 0.85, 0.55), rough=(0.22, 0.45), normal=0.5, random_offset=False, mottle=(1.4, 0.9, 1.05))
    M['oak_v'] = pbr('Rift oak (vertical)', 'oak_veneer_05', 'oak_veneer_05_rot_{}_2k.jpg', 1.0, hsv=(0.5, 0.95, 1.0),
                     rough=(0.38, 0.55), normal=0.25, coat=0.15)
    M['oak_h'] = pbr('Rift oak (horizontal)', 'oak_veneer_05', 'oak_veneer_05_{}_2k.jpg', 1.0, hsv=(0.5, 0.95, 1.0),
                     rough=(0.38, 0.55), normal=0.25, coat=0.15)
    marble = {'color': 'Color', 'rough': 'Roughness'}
    for key, mirror in (('stone', False), ('stone_m', True)):
        M[key] = pbr('Quartzite' + (' mirrored' if mirror else ''), 'Marble014', 'Marble014_4K-JPG_{}.jpg', 2.8,
                     hsv=(0.5, 1.0, 1.0), rough=(0.2, 0.34), normal=0.12, mirror_x=mirror, random_offset=False,
                     maps=marble)
    M['ink'] = flat('Warm ink paint', (0.026, 0.021, 0.018), rough=0.4, coat=0.1, noise=0.06)
    M['toe'] = flat('Toe kick', (0.008, 0.007, 0.006), rough=0.7)
    M['interior'] = flat('Carcass interior', (0.05, 0.035, 0.022), rough=0.6)
    M['bronze'] = flat('Blackened bronze', (0.06, 0.042, 0.028), rough=0.32, metallic=1.0, noise=0.05)
    M['brass'] = flat('Aged brass', (0.42, 0.29, 0.13), rough=0.33, metallic=1.0, noise=0.06)
    M['steel'] = flat('Window steel', (0.012, 0.012, 0.012), rough=0.42, coat=0.25)
    M['cord'] = flat('Cloth cord', (0.01, 0.01, 0.01), rough=0.8)
    M['cooktop'] = flat('Black glass', (0.004, 0.004, 0.004), rough=0.04)
    M['sink'] = flat('Brushed steel', (0.55, 0.55, 0.55), rough=0.3, metallic=1.0)

    glass = bpy.data.materials.new('Window glass')
    nt, out = nodes_of(glass)
    bs = principled(nt)
    bs.inputs['Transmission Weight'].default_value = 1.0
    bs.inputs['Roughness'].default_value = 0.0
    bs.inputs['IOR'].default_value = 1.5
    nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    shadow_clear(glass, (0.92, 0.95, 0.95))
    M['glass'] = glass
    M['cab_glass'] = M['glass']

    # Opal globe: milky translucent shell with a warm glow driven by the dusk state.
    opal = bpy.data.materials.new('Opal glass')
    nt, out = nodes_of(opal)
    tl = nt.nodes.new('ShaderNodeBsdfTranslucent')
    tl.inputs['Color'].default_value = (0.9, 0.88, 0.84, 1)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.12
    fr = nt.nodes.new('ShaderNodeFresnel')
    fr.inputs['IOR'].default_value = 1.5
    m1 = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fr.outputs[0], m1.inputs['Fac'])
    nt.links.new(tl.outputs[0], m1.inputs[1])
    nt.links.new(gl.outputs[0], m1.inputs[2])
    em = nt.nodes.new('ShaderNodeEmission')
    em.name = 'GLOW'
    em.inputs['Color'].default_value = (*kelvin(2600), 1)
    em.inputs['Strength'].default_value = 0.0
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.35
    core = remap(nt, lw.outputs['Facing'], 1.9, 0.12)   # hot centre, soft rim
    gain = nt.nodes.new('ShaderNodeMath')
    gain.name = 'GLOW_GAIN'
    gain.operation = 'MULTIPLY'
    gain.inputs[1].default_value = 0.0
    nt.links.new(core, gain.inputs[0])
    nt.links.new(gain.outputs[0], em.inputs['Strength'])
    ad = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(m1.outputs[0], ad.inputs[0])
    nt.links.new(em.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out.inputs['Surface'])
    shadow_clear(opal, (0.85, 0.8, 0.7))
    M['opal'] = opal

    for key, k, s in (('led_hood', 2700, 6.0), ('led_under', 2700, 0.0), ('led_stack', 2700, 0.0)):
        M[key] = emission(key, kelvin(k), s)
    return M


# ------------------------------------------------------------- architecture
def build_room(M, coll):
    W, D, H, T = K.ROOM['x1'], K.ROOM['y1'], K.CEILING, K.WALL_T
    box('Floor', -T, W, -T, D, -1, 0, M['floor'], coll, bev=0)
    box('Ceiling', -T, W, -T, D, H, H + 1, M['ceiling'], coll, bev=0)
    box('Back wall', -T, W, -T, 0, 0, H, M['wall'], coll, bev=0)
    box('Right wall', W, W + T, -T, D, 0, H, M['wall'], coll, bev=0)
    box('Front wall', -T, W, D, D + T, 0, H, M['wall'], coll, bev=0)
    w = K.WINDOW  # window wall at x=0 with one tall opening
    box('Window wall (back)', -T, 0, 0, w['y0'], 0, H, M['wall'], coll, bev=0)
    box('Window wall (front)', -T, 0, w['y1'], D, 0, H, M['wall'], coll, bev=0)
    box('Window wall (below)', -T, 0, w['y0'], w['y1'], 0, w['z0'], M['wall'], coll, bev=0)
    box('Window wall (above)', -T, 0, w['y0'], w['y1'], w['z1'], H, M['wall'], coll, bev=0)
    box('Window sill', -T, 1.0, w['y0'], w['y1'], w['z0'] - 1.5, w['z0'], M['stone'], coll, bev=0.1)
    p = K.PILLAR
    box('Pillar', p['x0'], p['x1'], 0, p['y1'], 0, H, M['wall'], coll, bev=0.15)
    # baseboards where wall meets floor in view
    box('Baseboard (window wall)', 0, 0.75, 0, D, 0, 5, M['wall'], coll, bev=0.05)
    box('Baseboard (pillar)', p['x0'] - 0.75, p['x1'] + 0.75, p['y1'], p['y1'] + 0.75, 0, 5, M['wall'], coll, bev=0.05)
    # steel window: frame, mullions, transoms, glass
    fx0, fx1 = -4.0, -2.0
    f, m = w['frame'], w['mullion']
    box('Window frame (back)', fx0, fx1, w['y0'], w['y0'] + f, w['z0'], w['z1'], M['steel'], coll, bev=0.03)
    box('Window frame (front)', fx0, fx1, w['y1'] - f, w['y1'], w['z0'], w['z1'], M['steel'], coll, bev=0.03)
    box('Window frame (sill)', fx0, fx1, w['y0'], w['y1'], w['z0'], w['z0'] + f, M['steel'], coll, bev=0.03)
    box('Window frame (head)', fx0, fx1, w['y0'], w['y1'], w['z1'] - f, w['z1'], M['steel'], coll, bev=0.03)
    for i in range(1, w['cols']):
        yy = w['y0'] + (w['y1'] - w['y0']) * i / w['cols']
        box(f'Window mullion {i}', fx0, fx1, yy - m / 2, yy + m / 2, w['z0'], w['z1'], M['steel'], coll, bev=0.03)
    for j in range(1, w['rows']):
        zz = w['z0'] + (w['z1'] - w['z0']) * j / w['rows']
        box(f'Window transom {j}', fx0, fx1, w['y0'], w['y1'], zz - m / 2, zz + m / 2, M['steel'], coll, bev=0.03)
    box('Window glass', -3.1, -2.9, w['y0'], w['y1'], w['z0'], w['z1'], M['glass'], coll, bev=0)
    for k, (x, z) in enumerate(K.OUTLETS + [(40.0, 16.0), (150.0, 16.0), (240.0, 16.0)]):
        box(f'Rough-in box {k + 1}', x - 1.1, x + 1.1, 0, 0.12, z - 1.9, z + 1.9, M['toe'], coll, bev=0.02)
    build_hood(M, coll)


def build_hood(M, coll):
    h = K.HOOD
    xc, zb, band = h['x_center'], h['z_bottom'], h['band_h']
    box('Hood band', xc - h['w_bottom'] / 2, xc + h['w_bottom'] / 2, 0, h['d_bottom'], zb, zb + band, M['wall'], coll, bev=0.2)
    # tapered chimney: bottom (set back 3/4") to the ceiling
    wb, db, wt, dt = h['w_bottom'] - 1.5, h['d_bottom'] - 0.75, h['w_top'], h['d_top']
    z0, z1 = zb + band, K.CEILING
    vs = [P(xc - wb / 2, 0, z0), P(xc + wb / 2, 0, z0), P(xc + wb / 2, db, z0), P(xc - wb / 2, db, z0),
          P(xc - wt / 2, 0, z1), P(xc + wt / 2, 0, z1), P(xc + wt / 2, dt, z1), P(xc - wt / 2, dt, z1)]
    faces = [(3, 2, 6, 7), (0, 3, 7, 4), (2, 1, 5, 6), (0, 1, 2, 3)]
    me = bpy.data.meshes.new('Hood')
    me.from_pydata([tuple(v) for v in vs], [], faces)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.update()
    ob = bpy.data.objects.new('Hood', me)
    ob.data.materials.append(M['wall'])
    bevel(ob, 0.25, 3)
    coll.objects.link(ob)
    box('Hood light', xc - wb / 2 + 1, xc + wb / 2 - 1, db - 2.0, db - 1.0, zb - 0.05, zb, M['led_hood'], coll, bev=0)


# ------------------------------------------------------------------ cabinets
def cone_y(name, x, y_face, z, r_back, r_front, depth, mat, coll, parent, segments=32):
    """A turned part sticking out of a face toward the camera (axis along -Y)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r_back * IN, radius2=r_front * IN, depth=depth * IN)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.location = P(x, y_face + depth / 2, z)
    return link(ob, coll, parent)


def knob(name, x, y_face, z, M, coll, parent):
    cone_y(name, x, y_face, z, 0.42, 0.62, 1.0, M['bronze'], coll, parent)


def bar_pull(name, x, y_face, z0, z1, M, coll, parent):
    cylinder(name, x, y_face + 0.9, z0, z1, 0.25, M['bronze'], coll, parent, verts=20)
    for k, zz in enumerate((z0 + 0.8, z1 - 0.8)):
        cone_y(f'{name} standoff {k}', x, y_face, zz, 0.18, 0.18, 0.75, M['bronze'], coll, parent, segments=16)


def front(name, x0, x1, z0, z1, kind, M, coll, parent, yf):
    """One inset front in its opening (reveal all round), with hardware."""
    r, t = K.REVEAL, K.FRAME_T
    y0 = yf - t
    if kind == 'doors':
        xm = (x0 + x1) / 2
        for side, (a, b) in (('L', (x0 + r, xm - r / 2)), ('R', (xm + r / 2, x1 - r))):
            box(f'{name} door {side}', a, b, y0, yf, z0 + r, z1 - r, M['oak_v'], coll, parent, bev=0.04)
            px = b - 1.5 if side == 'L' else a + 1.5
            bar_pull(f'{name} pull {side}', px, yf, z1 - 8.5, z1 - 2.0, M, coll, parent)
    else:
        mat = M['oak_h']
        box(f'{name} {kind}', x0 + r, x1 - r, y0, yf, z0 + r, z1 - r, mat, coll, parent, bev=0.04)
        if kind in ('drawer', 'panel'):
            knob(f'{name} knob', (x0 + x1) / 2, yf, (z0 + z1) / 2, M, coll, parent)


def base_module(code, x0, x1, kind, M, coll):
    root = empty(f'Base {code}', P(x0, 0, 0), coll)
    root['kind'] = kind
    yf = K.BASE_D + K.FRAME_T
    box(f'{code} toe', x0, x1, 0, yf - K.TOE_D, 0, K.TOE_H, M['toe'], coll, root, bev=0)
    if kind == 'FILL':
        box(f'{code} filler', x0, x1, K.BASE_D, yf, K.TOE_H, K.BOX_TOP, M['oak_v'], coll, root, bev=0.03)
        box(f'{code} back', x0, x1, 0, K.BASE_D, K.TOE_H, K.BOX_TOP, M['interior'], coll, root, bev=0)
        return root
    fw = K.FRAME_W
    box(f'{code} carcass', x0 + 0.1, x1 - 0.1, 0, K.BASE_D, K.TOE_H, K.BOX_TOP, M['interior'], coll, root, bev=0)
    box(f'{code} stile L', x0, x0 + fw, K.BASE_D, yf, K.TOE_H, K.BOX_TOP, M['oak_v'], coll, root, bev=0.03)
    box(f'{code} stile R', x1 - fw, x1, K.BASE_D, yf, K.TOE_H, K.BOX_TOP, M['oak_v'], coll, root, bev=0.03)
    z = K.BOX_TOP
    box(f'{code} rail top', x0 + fw, x1 - fw, K.BASE_D, yf, z - fw, z, M['oak_h'], coll, root, bev=0.03)
    z -= fw
    for k, (h, okind) in enumerate(K.OPENINGS[kind]):
        front(f'{code} {k}', x0 + fw, x1 - fw, z - h, z, okind, M, coll, root, yf)
        z -= h
        box(f'{code} rail {k}', x0 + fw, x1 - fw, K.BASE_D, yf, z - fw, z, M['oak_h'], coll, root, bev=0.03)
        z -= fw
    return root


def build_run(M, coll):
    roots = {}
    for code, x0, x1, kind in K.run_modules():
        roots[code] = base_module(code, x0, x1, kind, M, coll)
    return roots


def build_counter(M, coll):
    root = empty('Counter', P(0, 0, K.BOX_TOP), coll)
    s, c = K.SINK, K.COOKTOP
    sx0, sx1 = s['x_center'] - s['w'] / 2, s['x_center'] + s['w'] / 2
    sy0, sy1 = s['y_back'], s['y_back'] + s['d']
    z0, z1, D = K.BOX_TOP, K.COUNTER_TOP, K.COUNTER_D
    box('Counter left', 0, sx0, 0, D, z0, z1, M['stone'], coll, root, bev=0.08)
    box('Counter right', sx1, K.RUN_LEN, 0, D, z0, z1, M['stone'], coll, root, bev=0.08)
    box('Counter behind sink', sx0, sx1, 0, sy0, z0, z1, M['stone'], coll, root, bev=0.08)
    box('Counter before sink', sx0, sx1, sy1, D, z0, z1, M['stone'], coll, root, bev=0.08)
    # undermount basin: open-topped steel box
    me = bpy.data.meshes.new('Sink basin')
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    top = [f for f in bm.faces if f.normal.z > 0.5]
    bmesh.ops.delete(bm, geom=top, context='FACES')
    sz = P(sx1, sy0, z1) - P(sx0, sy1, z1 - 9)
    for v in bm.verts:
        v.co = Vector((v.co.x * abs(sz.x), v.co.y * abs(sz.y), v.co.z * abs(sz.z)))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('Sink basin', me)
    ob.location = (P(sx0, sy1, z1 - 9) + P(sx1, sy0, z1 - 0.01)) / 2
    ob.data.materials.append(M['sink'])
    ob.modifiers.new('Solidify', 'SOLIDIFY').thickness = 0.05 * IN
    link(ob, coll, root)
    box('Cooktop', c['x_center'] - c['w'] / 2 + 0.5, c['x_center'] + c['w'] / 2 - 0.5, c['y_back'],
        c['y_back'] + c['d'], z1 - 0.2, z1 + 0.06, M['cooktop'], coll, root, bev=0.1)
    f = K.FAUCET
    cylinder('Faucet base', f['x'], f['y'], z1, z1 + 1.5, 1.1, M['bronze'], coll, root)
    tube('Faucet spout', [(f['x'], f['y'], z1 + 1.4), (f['x'], f['y'], z1 + 12.5),
                          (f['x'], f['y'] + 4.5, z1 + f['h']), (f['x'], f['y'] + 8.5, z1 + 10.5)], 0.45, M['bronze'], coll, root)
    tube('Faucet lever', [(f['x'] + 0.9, f['y'], z1 + 4.0), (f['x'] + 3.2, f['y'] + 0.4, z1 + 6.0)], 0.2, M['bronze'], coll, root)
    return root


def build_backsplash(M, coll):
    b = K.BACKSPLASH
    root = empty('Backsplash', P(0, 0, b['z0']), coll)
    n = b['slabs']
    L = K.RUN_LEN / n
    for i in range(n):
        x0, x1 = i * L, (i + 1) * L
        mat = M['stone_m'] if i % 2 == 0 else M['stone']
        ob = box(f'Backsplash slab {i + 1}', x0, x1, 0, b['t'], b['z0'], b['z1'], mat, coll, None, bev=0.04)
        # Book-match: each mirrored pair meets at a shared seam, so the texture
        # (object coordinates) must start at that seam on both slabs.
        seam = x1 if i % 2 == 0 else x0
        shift = ob.location.x - seam * IN
        for v in ob.data.vertices:
            v.co.x += shift
        ob.location.x = seam * IN
        link_parent(ob, root)
    for k, (x, z) in enumerate(K.OUTLETS):
        box(f'Outlet {k + 1}', x - 1.4, x + 1.4, b['t'], b['t'] + 0.2, z - 2.25, z + 2.25, M['bronze'], coll, root, bev=0.05)
    return root


def carcass(name, x0, x1, d, z0, z1, M, coll, parent, hollow=False):
    """Oak sides, top and bottom with a dark interior (seen through reveals),
    or hollow (glass-front stackers show their lit oak back instead)."""
    t = 0.75
    box(f'{name} side L', x0, x0 + t, 0, d, z0, z1, M['oak_v'], coll, parent, bev=0.04)
    box(f'{name} side R', x1 - t, x1, 0, d, z0, z1, M['oak_v'], coll, parent, bev=0.04)
    box(f'{name} top', x0 + t, x1 - t, 0, d, z1 - t, z1, M['oak_h'], coll, parent, bev=0.02)
    box(f'{name} bottom', x0 + t, x1 - t, 0, d, z0, z0 + t, M['oak_h'], coll, parent, bev=0.02)
    if not hollow:
        box(f'{name} interior', x0 + t, x1 - t, 0, d - 0.05, z0 + t, z1 - t, M['interior'], coll, parent, bev=0)


def build_uppers(M, coll):
    u, st, cr = K.UPPER, K.STACKER, K.CROWN
    root = empty('Uppers', P(u['x0'], 0, u['z0']), coll)
    stack_root = empty('Stackers', P(u['x0'], 0, st['z0']), coll)
    fw, yf, d = K.FRAME_W, u['d'] + K.FRAME_T, u['d']
    w = (u['x1'] - u['x0']) / u['boxes']
    for i in range(u['boxes']):
        x0, x1 = u['x0'] + i * w, u['x0'] + (i + 1) * w
        carcass(f'Upper {i + 1}', x0, x1, d, u['z0'], u['z1'], M, coll, root)
        for name, a, b2, z0, z1 in (('stile L', x0, x0 + fw, u['z0'], u['z1']), ('stile R', x1 - fw, x1, u['z0'], u['z1'])):
            box(f'Upper {i + 1} {name}', a, b2, d, yf, z0, z1, M['oak_v'], coll, root, bev=0.03)
        box(f'Upper {i + 1} rail top', x0 + fw, x1 - fw, d, yf, u['z1'] - fw, u['z1'], M['oak_h'], coll, root, bev=0.03)
        box(f'Upper {i + 1} rail bottom', x0 + fw, x1 - fw, d, yf, u['z0'], u['z0'] + fw, M['oak_h'], coll, root, bev=0.03)
        zb, zt = u['z0'] + fw, u['z1'] - fw
        xm = (x0 + x1) / 2
        r = K.REVEAL
        for side, (a, b2) in (('L', (x0 + fw + r, xm - r / 2)), ('R', (xm + r / 2, x1 - fw - r))):
            box(f'Upper {i + 1} door {side}', a, b2, d, yf, zb + r, zt - r, M['oak_v'], coll, root, bev=0.04)
            px = b2 - 1.5 if side == 'L' else a + 1.5
            bar_pull(f'Upper {i + 1} pull {side}', px, yf, zb + 2.0, zb + 8.5, M, coll, root)
        box(f'Upper {i + 1} light', x0 + 2, x1 - 2, d - 2.5, d - 1.5, u['z0'] - 0.05, u['z0'], M['led_under'], coll, root, bev=0)
        # glass-front stacker
        carcass(f'Stacker {i + 1}', x0, x1, d, st['z0'], st['z1'], M, coll, stack_root, hollow=True)
        box(f'Stacker {i + 1} back', x0 + 0.75, x1 - 0.75, 0.2, 0.95, st['z0'] + 0.75, st['z1'] - 0.75, M['oak_v'], coll, stack_root, bev=0)
        box(f'Stacker {i + 1} shelf', x0 + 0.75, x1 - 0.75, 0.95, d - 1.0, st['z0'] + 5.4, st['z0'] + 6.0, M['oak_h'], coll, stack_root, bev=0.02)
        box(f'Stacker {i + 1} light', x0 + 2, x1 - 2, 2, 4, st['z1'] - fw - 0.2, st['z1'] - fw, M['led_stack'], coll, stack_root, bev=0)
        for name, a, b2, z0, z1 in (('stile L', x0, x0 + fw, st['z0'], st['z1']), ('stile R', x1 - fw, x1, st['z0'], st['z1']),
                                    ('rail top', x0 + fw, x1 - fw, st['z1'] - fw, st['z1']),
                                    ('rail bottom', x0 + fw, x1 - fw, st['z0'], st['z0'] + fw)):
            box(f'Stacker {i + 1} {name}', a, b2, d, yf, z0, z1, M['oak_v'], coll, stack_root, bev=0.03)
        gz0, gz1 = st['z0'] + fw, st['z1'] - fw
        for side, (a, b2) in (('L', (x0 + fw + r, xm - r / 2)), ('R', (xm + r / 2, x1 - fw - r))):
            # stiles run full height; rails sit between them (no overlapping pieces)
            for name, aa, bb, z0, z1 in (('L', a, a + 1.25, gz0 + r, gz1 - r), ('R', b2 - 1.25, b2, gz0 + r, gz1 - r),
                                         ('T', a + 1.25, b2 - 1.25, gz1 - r - 1.25, gz1 - r),
                                         ('B', a + 1.25, b2 - 1.25, gz0 + r, gz0 + r + 1.25)):
                box(f'Stacker {i + 1} door {side} {name}', aa, bb, yf - K.FRAME_T, yf, z0, z1, M['oak_v'], coll, stack_root, bev=0.02)
            box(f'Stacker {i + 1} glass {side}', a + 1.25, b2 - 1.25, yf - 0.45, yf - 0.3, gz0 + r + 1.25, gz1 - r - 1.25,
                M['cab_glass'], coll, stack_root, bev=0)
    box('Crown', u['x0'] - 0.5, u['x1'] + 0.5, 0, u['d'] + K.FRAME_T + 0.5, cr['z0'], cr['z1'], M['oak_h'], coll, stack_root, bev=0.05)
    return root, stack_root


def build_island(M, coll):
    I = K.ISLAND
    root = empty('Island', P(I['x_center'], I['y_back'], 0), coll)
    x0, x1, yb, yf = I['x0'], I['x1'], I['y_back'], I['y_front']
    t, e = I['top_t'], I['end_t']
    top_z = K.COUNTER_TOP
    box('Island top', x0, x1, yb, yf, top_z - t, top_z, M['stone'], coll, root, bev=0.08)
    box('Island end L', x0, x0 + e, yb, yf, 0, top_z - t, M['stone'], coll, root, bev=0.08)
    box('Island end R', x1 - e, x1, yb, yf, 0, top_z - t, M['stone_m'], coll, root, bev=0.08)
    box('Island body', x0 + e, x1 - e, yb + 1, yf - 1.0, 4, top_z - t, M['ink'], coll, root, bev=0.05)
    box('Island plinth', x0 + e, x1 - e, yb + 3, yf - 3.0, 0, 4, M['toe'], coll, root, bev=0)
    # fluted face toward the camera
    fw = K.FLUTE_W
    n = int((x1 - x0 - 2 * e - 1.0) / fw)
    start = x0 + e + ((x1 - x0 - 2 * e) - n * fw) / 2 + fw / 2
    me = bpy.data.meshes.new('Island flute')
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=fw / 2 * IN * 0.98, radius2=fw / 2 * IN * 0.98,
                          depth=(top_z - t - 4.5 - 0.5) * IN)
    # keep the half facing the camera
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > 1e-6], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('Island flutes', me)
    ob.location = P(start, yf - 1.0, (4.5 + top_z - t - 0.5) / 2)
    ob.data.materials.append(M['ink'])
    arr = ob.modifiers.new('Array', 'ARRAY')
    arr.count = n
    arr.use_relative_offset = False
    arr.use_constant_offset = True
    arr.constant_offset_displace = (fw * IN, 0, 0)
    link(ob, coll, root)
    return root


def build_pendants(M, coll, island_root):
    """Three pendants riding on the island (they travel with it, as in the
    reference). Each has a 'drop' pivot (globe, gallery, stem, lamp) and a cord
    whose origin sits at the ceiling, so dropping the pivot and scaling the cord
    keep it attached."""
    p = K.PENDANTS
    root = empty('Pendants', P(K.ISLAND['x_center'], p['y'], 0), coll)
    link_parent(root, island_root)
    r = p['globe_d'] / 2
    zc = p['bottom_z'] + r
    stem_top = zc + r + 3.0
    for i, x in enumerate(p['xs']):
        g = empty(f'Pendant {i + 1}', P(x, p['y'], K.CEILING), coll)
        link_parent(g, root)
        drop = empty(f'Pendant {i + 1} drop', P(x, p['y'], zc), coll)
        link_parent(drop, g)
        sphere(f'Pendant {i + 1} globe', x, p['y'], zc, r, M['opal'], coll, drop)
        cylinder(f'Pendant {i + 1} gallery', x, p['y'], zc + r - 1.0, zc + r + 0.8, 1.7, M['brass'], coll, drop)
        cylinder(f'Pendant {i + 1} stem', x, p['y'], zc + r + 0.8, stem_top, 0.35, M['brass'], coll, drop)
        cord = cylinder(f'Pendant {i + 1} cord', x, p['y'], stem_top, K.CEILING, 0.12, M['cord'], coll, None, verts=12)
        half = (K.CEILING - stem_top) / 2 * IN
        for v in cord.data.vertices:  # origin to the cord's top (ceiling)
            v.co.z -= half
        cord.location.z += half
        cord['rest_len_in'] = K.CEILING - stem_top
        link_parent(cord, g)
        cylinder(f'Pendant {i + 1} canopy', x, p['y'], K.CEILING - 0.8, K.CEILING, 2.6, M['brass'], coll, g)
        ld = bpy.data.lights.new(f'Pendant {i + 1} lamp', 'POINT')
        ld.shadow_soft_size = 2.0 * IN
        ld.color = kelvin(2600)
        ld.energy = 0.0
        lo = bpy.data.objects.new(f'Pendant {i + 1} lamp', ld)
        lo.location = P(x, p['y'], zc)
        link(lo, coll, drop)
    return root


# ------------------------------------------------------------- reveal cutters
def cutter(name, coll, axis):
    """A hidden box whose +Z face (axis 'z') or +X face (axis 'x') sits at the
    object's origin; parts kept by a Boolean INTERSECT end at that plane.
    Starts far away, so nothing is cut until the animation moves it."""
    big = 2000 * IN
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * big, v.co.y * big, v.co.z * big))
        if axis == 'z':
            v.co.z -= big / 2
        else:
            v.co.x -= big / 2
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (0, 0, 1000 * IN) if axis == 'z' else (1000 * IN, 0, 0)
    ob.display_type = 'WIRE'
    ob.hide_render = True
    coll.objects.link(ob)
    return ob


def setup_cutters(groups, coll):
    """groups: [(root, cutter name, axis)]. Wall cabinets and stackers reveal
    upward from their bottom edge (the 3D version of the reference's wipe);
    the run counter is laid left to right."""
    made = {}
    for root, name, axis in groups:
        c = made.get(name) or cutter(name, coll, axis)
        made[name] = c
        for ob in root.children_recursive:
            if ob.type != 'MESH':
                continue
            m = ob.modifiers.new('Reveal', 'BOOLEAN')
            m.operation = 'INTERSECT'
            m.solver = 'EXACT'
            m.object = c
    return made


# ------------------------------------------------------------ light, camera
def mix_rgb(nt, blend, name=None):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = blend
    if name:
        n.name = name
    a = next(i for i in n.inputs if i.name == 'A' and i.type == 'RGBA')
    b = next(i for i in n.inputs if i.name == 'B' and i.type == 'RGBA')
    fac = next(i for i in n.inputs if i.name == 'Factor' and i.type == 'VALUE')
    out = next(o for o in n.outputs if o.type == 'RGBA')
    return n, a, b, fac, out


def build_world_and_lights(coll):
    sc = bpy.context.scene
    world = bpy.data.worlds.new('Garden')
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.name = 'HDRI_MAP'
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(196.0))  # garden trees fill the window; the HDRI sun is clamped, the Sun lamp leads
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(ASSETS, 'hdri', 'borghese_gardens_4k.hdr'), check_existing=True)
    # tame the HDRI's own sun (the Sun lamp does that job), then a dusk tint
    clamp, ca, cb, cf, cout = mix_rgb(nt, 'DARKEN')
    cf.default_value = 1.0
    cb.default_value = (12, 12, 12, 1)
    tint, ta, tb, tf, tout = mix_rgb(nt, 'MULTIPLY', 'DUSK_TINT')
    tf.default_value = 0.0
    tb.default_value = (0.42, 0.55, 0.95, 1)
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.name = 'BG'
    bg.inputs['Strength'].default_value = 1.0
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], ca)
    nt.links.new(cout, ta)
    nt.links.new(tout, bg.inputs['Color'])
    nt.links.new(bg.outputs[0], out.inputs['Surface'])

    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 3.2
    sun.angle = math.radians(1.2)
    sun.color = kelvin(5200)
    so = bpy.data.objects.new('Sun', sun)
    d = Vector((0.85, 0.35, -0.27)).normalized()  # low sun through the left windows, toward the back right
    so.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    coll.objects.link(so)

    # Soft fill from behind the camera: stands in for the rest of an open-plan
    # room, as archviz bounce panels do. Off-camera; dims and cools at dusk.
    fill = bpy.data.lights.new('Fill', 'AREA')
    fill.shape = 'RECTANGLE'
    fill.size, fill.size_y = 240 * IN, 110 * IN
    fill.energy = FILL_W
    fill.color = kelvin(6200)
    fo = bpy.data.objects.new('Fill', fill)
    fo.location = P(141, 340, 70)
    fo.rotation_euler = (math.radians(90), 0, 0)
    coll.objects.link(fo)

    w = K.WINDOW
    portal = bpy.data.lights.new('Window portal', 'AREA')
    portal.shape = 'RECTANGLE'
    portal.size = (w['z1'] - w['z0']) * IN
    portal.size_y = (w['y1'] - w['y0']) * IN
    portal.cycles.is_portal = True
    po = bpy.data.objects.new('Window portal', portal)
    po.location = P(-1.0, (w['y0'] + w['y1']) / 2, (w['z0'] + w['z1']) / 2)
    po.rotation_euler = (0, math.radians(-90), 0)
    coll.objects.link(po)


def build_camera(coll):
    c = K.CAMERA
    cam = bpy.data.cameras.new('Desktop camera')
    cam.lens = c['focal_mm']
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = c['sensor_w_mm']
    cam.clip_start = 0.05
    cam.clip_end = 60
    co = bpy.data.objects.new('Desktop camera', cam)
    co.location = P(c['x'], c['y'], c['z'])
    co.rotation_euler = (math.radians(90), 0, 0)
    coll.objects.link(co)
    bpy.context.scene.camera = co
    pc = K.PHONE_CAMERA
    ph = bpy.data.cameras.new('Phone camera')
    ph.lens = pc['focal_mm']
    ph.sensor_fit = 'HORIZONTAL'
    ph.sensor_width = pc['sensor_w_mm']
    ph.shift_y = pc['shift_y']
    ph.clip_start, ph.clip_end = 0.05, 60
    po = bpy.data.objects.new('Phone camera', ph)
    po.location = P(pc['x'], pc['y'], pc['z'])
    po.rotation_euler = (math.radians(90), 0, 0)
    coll.objects.link(po)
    return co


def compositor():
    """Gentle bloom on light sources and a soft vignette (Blender 5 compositor,
    where node settings are input sockets)."""
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new('Kitchen comp', 'CompositorNodeTree')
    sc.compositing_node_group = ng
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    out = ng.nodes.new('NodeGroupOutput')
    rl = ng.nodes.new('CompositorNodeRLayers')
    gl = ng.nodes.new('CompositorNodeGlare')
    for name, val in (('Type', 'Bloom'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.22),
                      ('Size', 0.6), ('Saturation', 0.9)):
        gl.inputs[name].default_value = val
    em = ng.nodes.new('CompositorNodeEllipseMask')
    em.inputs['Size'].default_value = (1.35, 1.25)
    bl = ng.nodes.new('CompositorNodeBlur')
    bl.inputs['Size'].default_value = (360, 360)
    vig, va, vb, vf, vout = mix_rgb(ng, 'MULTIPLY')
    vf.default_value = 0.22
    ng.links.new(rl.outputs['Image'], gl.inputs['Image'])
    ng.links.new(em.outputs['Mask'], bl.inputs['Image'])
    ng.links.new(gl.outputs['Image'], va)
    ng.links.new(bl.outputs['Image'], vb)
    ng.links.new(vout, out.inputs[0])


def render_settings():
    sc = bpy.context.scene
    try:
        sc.render.engine = 'CYCLES'
    except TypeError as e:
        print('engine', e)
    sc.cycles.device = 'GPU'
    sc.cycles.samples = 384
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.012
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 10
    sc.cycles.diffuse_bounces = 5
    sc.cycles.glossy_bounces = 4
    sc.cycles.transmission_bounces = 8
    sc.cycles.transparent_max_bounces = 12
    sc.cycles.sample_clamp_indirect = 8.0
    sc.cycles.blur_glossy = 0.6
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 100
    vs = sc.view_settings
    try:
        vs.view_transform = 'AgX'
    except TypeError:
        pass
    looks = [i.identifier for i in vs.bl_rna.properties['look'].enum_items]
    for want in ('AgX - Medium High Contrast', 'AgX - Base Contrast', 'None'):
        if want in looks:
            vs.look = want
            break
    vs.exposure = 1.0


# ------------------------------------------------------------------- states
KITCHEN_ROOTS = []
FILL_W = 260.0


def set_state(kitchen=True, dusk=0.0):
    """kitchen: show the cabinetry; dusk: 0 day ... 1 evening."""
    for name in KITCHEN_ROOTS or list(bpy.context.scene.get('kitchen_roots', [])):
        root = bpy.data.objects.get(name)
        if root is None:
            continue
        for ob in [root] + list(root.children_recursive):
            ob.hide_render = not kitchen
            ob.hide_viewport = not kitchen
    sc = bpy.context.scene
    nt = sc.world.node_tree
    nt.nodes['BG'].inputs['Strength'].default_value = 1.0 - 0.72 * dusk
    tint = nt.nodes['DUSK_TINT']
    next(i for i in tint.inputs if i.name == 'Factor' and i.type == 'VALUE').default_value = dusk
    bpy.data.objects['Sun'].data.energy = 3.2 * (1 - dusk) ** 1.5
    fill = bpy.data.objects['Fill'].data
    fill.energy = FILL_W * (1 - 0.82 * dusk)
    fill.color = tuple(a + (b - a) * dusk for a, b in zip(kelvin(6200), kelvin(9000)))
    for i in range(len(K.PENDANTS['xs'])):
        lamp = bpy.data.objects.get(f'Pendant {i + 1} lamp')
        if lamp:
            lamp.data.energy = 9.0 * dusk
    bpy.data.materials['Opal glass'].node_tree.nodes['GLOW_GAIN'].inputs[1].default_value = 0.55 * dusk
    bpy.data.materials['led_under'].node_tree.nodes['Emission'].inputs['Strength'].default_value = 2.5 * dusk
    bpy.data.materials['led_stack'].node_tree.nodes['Emission'].inputs['Strength'].default_value = 2.5 * dusk


def build():
    clear()
    M = make_materials()
    arch = collection('Architecture')
    run = collection('Run')
    upper = collection('Wall cabinets')
    island = collection('Island')
    pend = collection('Pendants')
    splash = collection('Backsplash')
    lights = collection('Lights and camera')
    build_room(M, arch)
    roots = build_run(M, run)
    counter = build_counter(M, run)
    back = build_backsplash(M, splash)
    up, stack = build_uppers(M, upper)
    isl = build_island(M, island)
    pen = build_pendants(M, pend, isl)
    build_world_and_lights(lights)
    setup_cutters([(up, 'Cutter upper', 'z'), (stack, 'Cutter stack', 'z'), (counter, 'Cutter counter', 'x')], lights)
    build_camera(lights)
    render_settings()
    try:
        compositor()
    except Exception as e:  # never let post effects block the build
        print('compositor skipped:', e)
    KITCHEN_ROOTS[:] = [r.name for r in roots.values()] + [counter.name, back.name, up.name, stack.name, isl.name]
    bpy.context.scene['kitchen_roots'] = KITCHEN_ROOTS
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print('built', len(bpy.data.objects), 'objects; saved', BLEND)


if __name__ == '__main__':
    build()
