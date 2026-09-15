"""Build the editable Wallace Shift About studio film in Blender 5.x.

Run with Blender, not the system Python::

    blender --background --python-exit-code 1 --python scripts/blender/about_studio.py -- \
        --output review-assets/about-identity-final --width 1920 --height 1080 \
        --samples 32 --frames 240 --render-frames 1,54,120,173,240

The default authors and saves the scene without rendering the animation.
Use ``--render-frames 1,54,120,173,240`` for previews in one persistent render process,
or ``--render-animation`` to render all frames immediately after authoring.
For a later full render, rerun this script with the same scene options and
``--render-animation``. It renders sequential stills in one persistent process.
Blender's native ``-b FILE -a`` path has crashed during Metal compilation locally,
so it is not the supported render route for this scene.
All geometry, materials, lights and animation remain editable in the .blend.
Existing scene objects are preserved; a new scene is made for this project.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("review-assets/about-identity-final"))
    parser.add_argument("--samples", type=int, default=32)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--frames", type=int, default=240)
    parser.add_argument("--render-frame", type=int)
    parser.add_argument("--render-frames", help="Comma-separated preview frames rendered in one process.")
    parser.add_argument("--render-animation", action="store_true", help="Render the complete animation after saving.")
    parser.add_argument("--save-only", action="store_true")
    parser.add_argument("--render-step", type=int, default=1, help="Frame stride for a quick animation preview.")
    cli = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(cli)
    if min(args.width, args.height, args.samples, args.render_step) < 1 or args.frames < 3:
        parser.error("Dimensions and samples must be positive; use at least three frames.")
    if args.render_frame is not None and not 1 <= args.render_frame <= args.frames:
        parser.error("--render-frame must be inside the animation range.")
    try:
        args.preview_frames = list(dict.fromkeys(
            int(value.strip()) for value in args.render_frames.split(",")
        )) if args.render_frames else []
    except ValueError:
        parser.error("--render-frames must contain comma-separated integers.")
    if any(not 1 <= frame <= args.frames for frame in args.preview_frames):
        parser.error("Every --render-frames value must be inside the animation range.")
    if args.render_frame is not None:
        args.preview_frames = list(dict.fromkeys([args.render_frame, *args.preview_frames]))
    if args.render_animation and args.preview_frames:
        parser.error("Choose preview frames or --render-animation, not both.")
    return args


def material(name, color, metallic=0.0, roughness=0.3):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat, bsdf


def mesh_object(scene, name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name + " · mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj


def box(scene, name, center, dimensions, mat, bevel=0.0):
    x, y, z = (d / 2 for d in dimensions)
    verts = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
             (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    obj = mesh_object(scene, name, verts, faces, mat)
    obj.location = center
    if bevel:
        bevel_object(obj, bevel)
    return obj


def bevel_object(obj, amount=0.025):
    bevel = obj.modifiers.new("Machined edge radius · real geometry", "BEVEL")
    bevel.width = amount
    bevel.segments = 6
    bevel.affect = "EDGES"
    bevel.harden_normals = True
    for poly in obj.data.polygons:
        poly.use_smooth = True
    normal = obj.modifiers.new("Preserve flat optical faces", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    normal.weight = 50


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(scene, name, location, target, watts, color, width, height=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = watts
    data.color = color
    data.shape = "RECTANGLE"
    data.size = width
    data.size_y = height if height is not None else width
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    point_at(obj, target)
    return obj


def fine_brushed_aluminum():
    mat, bsdf = material("01 / vertically brushed aluminum", (0.63, 0.66, 0.69), 1.0, 0.25)
    if "Anisotropic IOR Level" in bsdf.inputs:
        bsdf.inputs["Anisotropic IOR Level"].default_value = 0.64
    elif "Anisotropic" in bsdf.inputs:
        bsdf.inputs["Anisotropic"].default_value = 0.64
    bsdf.inputs["Anisotropic Rotation"].default_value = 0.25
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coordinates = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeVectorMath")
    mapping.operation = "MULTIPLY"
    mapping.inputs[1].default_value = (420.0, 420.0, 2.8)
    links.new(coordinates.outputs["Object"], mapping.inputs[0])
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.6
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.11
    bump.inputs["Distance"].default_value = 0.00016
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    rough = nodes.new("ShaderNodeMapRange")
    rough.inputs["From Min"].default_value = 0.0
    rough.inputs["From Max"].default_value = 1.0
    rough.inputs["To Min"].default_value = 0.22
    rough.inputs["To Max"].default_value = 0.30
    links.new(noise.outputs["Fac"], rough.inputs["Value"])
    links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    tangent = nodes.new("ShaderNodeTangent")
    tangent.direction_type = "RADIAL"
    tangent.axis = "Z"
    links.new(tangent.outputs["Tangent"], bsdf.inputs["Tangent"])
    return mat


def optical_glass():
    mat, bsdf = material("02 / blue optical glass · solid volume", (0.87, 0.96, 1.0), 0.0, 0.021)
    bsdf.inputs["IOR"].default_value = 1.46
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    bsdf.inputs["Coat Weight"].default_value = 0.10
    bsdf.inputs["Coat Roughness"].default_value = 0.025
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    absorption = nodes.new("ShaderNodeVolumeAbsorption")
    absorption.inputs["Color"].default_value = (0.06, 0.34, 0.85, 1.0)
    absorption.inputs["Density"].default_value = 0.055
    links.new(absorption.outputs["Volume"], nodes.get("Material Output").inputs["Volume"])
    return mat


def graphite():
    mat, bsdf = material("03 / honed graphite terrazzo", (0.008, 0.010, 0.013), 0.025, 0.33)
    bsdf.inputs["Specular IOR Level"].default_value = 0.085
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coord = nodes.new("ShaderNodeTexCoord")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 140.0
    noise.inputs["Detail"].default_value = 2.0
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.00012
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    rough = nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.30
    rough.inputs["To Max"].default_value = 0.36
    links.new(noise.outputs["Fac"], rough.inputs["Value"])
    links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    return mat


# These are the two literal closed SVG paths, rather than an approximation of W.
# The visitor travels between their extruded walls, and the final crane reveals
# that the architecture they crossed was the brand mark all along.
LOGO_LEFT = [(124, 291), (322, 291), (516, 715), (582, 572),
             (459, 457), (540, 291), (713, 291), (640, 447),
             (772, 581), (645, 852), (396, 852)]
LOGO_RIGHT = [(952, 291), (1149, 291), (877, 852), (693, 852)]
LOGO_SCALE = 30.0 / 1025.0
ARCHITECTURE_HEIGHT = 7.2


def footprint(points):
    result = [((x - 636.5) * LOGO_SCALE, (571.5 - y) * LOGO_SCALE) for x, y in points]
    area2 = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(result, result[1:] + result[:1]))
    return result if area2 > 0 else list(reversed(result))


def extruded_mark(scene, name, points, mat):
    outline = footprint(points)
    count = len(outline)
    vertices = [(x, y, z) for z in (0.008, ARCHITECTURE_HEIGHT) for x, y in outline]
    vectors = [Vector((x, y, 0)) for x, y in outline]
    triangles = tessellate_polygon([vectors])
    faces = []
    for triangle in triangles:
        indices = [int(v) if isinstance(v, int) else
                   next(i for i, vector in enumerate(vectors) if (vector - v).length < 1e-6)
                   for v in triangle]
        faces.extend([tuple(reversed(indices)), tuple(i + count for i in indices)])
    faces.extend((i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count))
    obj = mesh_object(scene, name, vertices, faces, mat)
    bevel_object(obj, 0.045)
    obj["Source"] = "public/brand/wallace-shift-logo-white.svg"
    obj["Physical dimensions"] = "Exact planar SVG outline extruded to 7.2 metres; no moving prop geometry."
    return obj


def emission_material(name, color, strength):
    mat, node = material(name, color, 0.1, 0.24)
    node.inputs["Emission Color"].default_value = (*color, 1.0)
    node.inputs["Emission Strength"].default_value = strength
    return mat, node.inputs["Emission Strength"]


def light_path(scene, name, coords, mat, radius=0.025, closed=False):
    curve = bpy.data.curves.new(name + " · real luminous inlay", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(coords) - 1)
    for point, xyz in zip(spline.points, coords):
        point.co = (*xyz, 1.0)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def smooth(value):
    value = min(1.0, max(0.0, value))
    return value * value * (3.0 - 2.0 * value)


def reveal(value, start, end):
    return smooth((value - start) / (end - start))


def build_room(scene, floor_mat):
    box(scene, "Ground / continuous polished graphite", (0, 0, -0.12), (300, 300, 0.24), floor_mat)
    wall_mat, wall_bsdf = material("04 / infinite charcoal cyclorama", (0.014, 0.019, 0.030), 0.0, 0.90)
    wall_bsdf.inputs["Specular IOR Level"].default_value = 0.12
    cross_section = [(60.0, 0.0)]
    for step in range(1, 41):
        theta = (math.pi / 2) * step / 40
        cross_section.append((60.0 + 12.0 * math.sin(theta), 12.0 * (1 - math.cos(theta))))
    cross_section.append((72.0, 70.0))
    vertices = [(x, y, z) for y, z in cross_section for x in (-180, 180)]
    faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(cross_section) - 1)]
    backdrop = mesh_object(scene, "World / seamless charcoal horizon", vertices, faces, wall_mat)
    for face in backdrop.data.polygons:
        face.use_smooth = True


def build_lighting(scene, frames):
    # The opening is lit locally. The complete overhead architecture lights up
    # during the crane, making the reveal a change in understanding and scale.
    area(scene, "Entry / warm silver key", (-8.5, -14.0, 8.0), (-3.5, -7, 3.5),
         1700, (1.0, 0.96, 0.9), 4.0, 9.0)
    area(scene, "Entry / cool glass edge", (9.0, -9.0, 7.0), (3.0, -7, 3.2),
         1800, (0.55, 0.76, 1.0), 2.5, 9.0)
    area(scene, "Entry / controlled front fill", (-1.0, -19.0, 6.0), (0, -7, 3.5),
         180, (0.7, 0.8, 1.0), 11.0, 7.0)
    # Diffusion panels sit above the open channel. The camera sees the physical
    # wall reflections, and the height of the sources preserves a dark ceiling.
    area(scene, "Channel / long overhead silk", (3.2, -2.0, 11.0), (3.2, -2.0, 0),
         2600, (0.88, 0.93, 1.0), 2.2, 14.0)
    area(scene, "Channel / blue glass backlight", (13, 2.0, 6.0), (5.0, 1.0, 3.0),
         2100, (0.12, 0.40, 1.0), 3.0, 12.0)
    area(scene, "Threshold / far white opening", (5.5, 13, 8), (4, 3, 3),
         2500, (0.8, 0.9, 1.0), 3.5, 7.0)
    # A broad physical pool on the distant curved wall gives the shared space
    # a visible horizon. It is part of the same world, with no inserted portal.
    area(scene, "Horizon / blue diffusion on the distant cyclorama",
         (5.0, 43.0, 9.0), (5.0, 67.0, 6.0),
         18000, (0.08, 0.24, 0.60), 24.0, 12.0)
    overhead = area(scene, "Reveal / immense overhead silk", (-2, 0, 24), (0, 0, 0),
                     0, (0.85, 0.92, 1.0), 27, 20)
    silver_rim = area(scene, "Reveal / silver rim", (-17, 10, 13), (-5, 1, 4),
                      0, (1, 0.97, 0.92), 7, 19)
    glass_rim = area(scene, "Reveal / glass reflection card", (19, 8, 15), (7, 1, 4),
                     0, (0.44, 0.69, 1.0), 7, 21)
    guide, _ = emission_material("05 / illuminated channel inlay", (0.028, 0.26, 1.0), 5.0)
    # The lower narrow diagonal is the physical route; both strips terminate in
    # the same open atrium created by the left path's original polygon cut.
    left_channel = [((x - 636.5) * LOGO_SCALE + 0.072,
                     (571.5 - y) * LOGO_SCALE, 0.045)
                    for x, y in [LOGO_LEFT[i] for i in (9, 8, 7, 6)]]
    right_channel = [((x - 636.5) * LOGO_SCALE - 0.072,
                      (571.5 - y) * LOGO_SCALE, 0.045)
                     for x, y in [LOGO_RIGHT[i] for i in (3, 0)]]
    light_path(scene, "Light / silver wall foot", left_channel, guide, 0.032)
    light_path(scene, "Light / glass wall foot", right_channel, guide, 0.032)
    silver_trace, silver_strength = emission_material("06 / final silver outline", (0.65, 0.82, 1.0), 0.0)
    glass_trace, glass_strength = emission_material("07 / final blue glass outline", (0.035, 0.25, 1.0), 0.0)
    for name, points, mat in [("Silver", LOGO_LEFT, silver_trace), ("Glass", LOGO_RIGHT, glass_trace)]:
        outline = footprint(points)
        light_path(scene, "Reveal / " + name + " top edge", [(x, y, ARCHITECTURE_HEIGHT + 0.012) for x, y in outline], mat, 0.020, True)
        light_path(scene, "Reveal / " + name + " foundation edge", [(x, y, 0.043) for x, y in outline], mat, 0.030, True)
    for frame in range(1, frames + 1):
        p = (frame - 1) / (frames - 1)
        illumination = reveal(p, 0.60, 0.86)
        for obj, energy in [(overhead, 12000), (silver_rim, 5700), (glass_rim, 6600)]:
            obj.data.energy = energy * illumination
            obj.data.keyframe_insert("energy", frame=frame)
        silver_strength.default_value = 1.25 * illumination
        glass_strength.default_value = 4.0 * illumination
        silver_strength.keyframe_insert("default_value", frame=frame)
        glass_strength.keyframe_insert("default_value", frame=frame)


# Parameter, camera position, look target, focal length in millimetres.
# Dense authored positions protect the narrow passage. The solids never move.
CAMERA_POSES = [
    (0.00, (-5.0, -30.0, 5.3), (-5.0, -3.0, 4.0), 30.0),
    (0.10, (-1.5, -21.0, 4.1), (-0.6, -4.3, 3.3), 30.0),
    (0.22, (0.92, -10.1, 2.7), (2.45, -5.0, 3.0), 23.0),
    (0.34, (2.22, -5.5, 2.7), (3.80, -2.0, 3.0), 21.0),
    (0.46, (4.16, -1.25, 2.75), (4.70, 2.80, 1.95), 22.0),
    (0.54, (4.50, 1.6, 3.1), (5.30, 6.1, 1.8), 24.0),
    (0.63, (5.25, 6.4, 9.2), (4.80, 10.0, 0.0), 26.0),
    (0.72, (2.80, 1.0, 24.0), (1.80, 5.0, 0.0), 29.0),
    (0.84, (-2.30, -11.0, 42.0), (-5.30, 1.0, 0.0), 33.0),
    (0.96, (-10.2, -17.0, 59.0), (-10.2, 0.0, 0.0), 36.0),
    (1.00, (-10.5, -17.5, 61.0), (-10.5, 0.0, 0.0), 36.0),
]


def sample_pose(progress):
    # Cubic Hermite with central-difference tangents produces a continuous
    # velocity path. Frame-by-frame quaternion keys prevent Euler wrap flips.
    index = next((i for i in range(len(CAMERA_POSES) - 1) if progress <= CAMERA_POSES[i + 1][0]), len(CAMERA_POSES) - 2)
    left, right = CAMERA_POSES[index:index + 2]
    before = CAMERA_POSES[max(0, index - 1)]
    after = CAMERA_POSES[min(len(CAMERA_POSES) - 1, index + 2)]
    t = (progress - left[0]) / (right[0] - left[0])
    duration = right[0] - left[0]
    def interpolate(component, axis=None):
        value = lambda pose: pose[component][axis] if axis is not None else pose[component]
        a, b = value(left), value(right)
        m0 = (value(right) - value(before)) / (right[0] - before[0]) * duration
        m1 = (value(after) - value(left)) / (after[0] - left[0]) * duration
        return ((2*t**3 - 3*t**2 + 1)*a + (t**3 - 2*t**2 + t)*m0
                + (-2*t**3 + 3*t**2)*b + (t**3 - t**2)*m1)
    return (tuple(interpolate(1, a) for a in range(3)),
            tuple(interpolate(2, a) for a in range(3)), interpolate(3))


def point_in_polygon(point, polygon):
    x, y = point
    inside = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:] + polygon[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
    return inside


def validate_camera_path(frames):
    outlines = [footprint(LOGO_LEFT), footprint(LOGO_RIGHT)]
    minimum_clearance = math.inf
    for frame in range(1, frames + 1):
        position, _, _ = sample_pose((frame - 1) / (frames - 1))
        x, y, z = position
        if z >= ARCHITECTURE_HEIGHT + 0.2:
            continue
        for polygon in outlines:
            if point_in_polygon((x, y), polygon):
                raise ValueError(f"Camera intersects brand architecture at frame {frame}: {position}")
            for (ax, ay), (bx, by) in zip(polygon, polygon[1:] + polygon[:1]):
                dx, dy = bx - ax, by - ay
                t = min(1, max(0, ((x-ax)*dx + (y-ay)*dy)/(dx*dx + dy*dy)))
                minimum_clearance = min(minimum_clearance, math.hypot(x-ax-t*dx, y-ay-t*dy))
    if minimum_clearance < 0.18:
        raise ValueError(f"Camera lacks safe optical clearance: {minimum_clearance:.3f} m")
    return minimum_clearance


def linear_keys(block):
    if not block.animation_data or not block.animation_data.action:
        return
    action = block.animation_data.action
    # Blender 4.4+ stores actions in slots; support both new and legacy forms.
    curves = list(action.fcurves) if hasattr(action, "fcurves") else []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            if hasattr(strip, "channelbags"):
                for bag in strip.channelbags:
                    curves.extend(bag.fcurves)
    for curve in curves:
        for key in curve.keyframe_points:
            key.interpolation = "LINEAR"


def build_camera(scene, frames):
    data = bpy.data.cameras.new("About / one unbroken architectural journey")
    camera = bpy.data.objects.new("Camera / enter, cross, emerge, understand", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    data.sensor_width = 36.0
    data.clip_start = 0.08
    data.clip_end = 300
    data.dof.use_dof = False
    camera.rotation_mode = "QUATERNION"
    previous = None
    for frame in range(1, frames + 1):
        position, target, lens = sample_pose((frame - 1) / (frames - 1))
        camera.location = position
        rotation = (Vector(target) - Vector(position)).to_track_quat("-Z", "Y")
        if previous is not None and rotation.dot(previous) < 0:
            rotation.negate()
        camera.rotation_quaternion = rotation
        previous = rotation.copy()
        data.lens = lens
        camera.keyframe_insert("location", frame=frame)
        camera.keyframe_insert("rotation_quaternion", frame=frame)
        data.keyframe_insert("lens", frame=frame)
    linear_keys(camera)
    linear_keys(data)
    for name, progress in [("01 / two materials", 0.0), ("02 / enter the shared space", 0.22),
                           ("03 / inside the work", 0.50), ("04 / a wider perspective", 0.72),
                           ("05 / one Wallace Shift", 1.0)]:
        scene.timeline_markers.new(name, frame=1 + round(progress * (frames - 1)))
    return camera


def configure_cycles(scene, args):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    device_names = []
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == "METAL"
            if device.use:
                device_names.append(device.name)
    except (TypeError, AttributeError, RuntimeError):
        # The file can also be generated on machines without Apple Metal.
        device_names = []
    scene.cycles.device = "GPU" if device_names else "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.04
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 8
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.volume_bounces = 2
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.cycles.sample_clamp_indirect = 4.0
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 30
    scene.render.fps = 24
    scene.render.film_transparent = False
    scene.render.use_persistent_data = True
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    scene.view_settings.exposure = 0.0
    scene.world = bpy.data.worlds.new("About / dark studio ambient")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.075, 0.090, 0.115, 1)
    background.inputs["Strength"].default_value = 0.035
    return device_names


def main():
    args = arguments()
    output = args.output.expanduser().resolve()
    sequence = output / "sequence"
    sequence.mkdir(parents=True, exist_ok=True)
    scene = bpy.data.scenes.new("WALLACE SHIFT / About studio film")
    if bpy.context.window:
        bpy.context.window.scene = scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.frame_start = 1
    scene.frame_end = args.frames
    devices = configure_cycles(scene, args)
    build_room(scene, graphite())
    clearance = validate_camera_path(args.frames)
    extruded_mark(scene, "Architecture 01 / the silver brand outline", LOGO_LEFT, fine_brushed_aluminum())
    extruded_mark(scene, "Architecture 02 / the glass brand outline", LOGO_RIGHT, optical_glass())
    build_lighting(scene, args.frames)
    build_camera(scene, args.frames)
    scene["Art direction"] = "The camera enters two materials, crosses their shared negative space, then cranes up to reveal the world was Wallace Shift."
    scene["Scale"] = "Meters; exact brand outline 30 m wide and 16.42 m deep, extruded to 7.2 m."
    scene["Compositions"] = "Opening: material architecture right. Journey: immersive full frame. Reveal: complete W right, copy left."
    scene.render.filepath = str(sequence / "frame_")
    scene.frame_set(args.preview_frames[0] if args.preview_frames else 1)
    blend_path = output / "about-studio.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print("ABOUT_STUDIO_CONFIG " + json.dumps({
        "blend": str(blend_path), "sequence": str(sequence / "frame_####.png"),
        "scene": scene.name, "engine": scene.render.engine,
        "devices": devices or ["CPU"], "samples": args.samples,
        "resolution": [args.width, args.height], "frames": args.frames,
        "camera_minimum_wall_clearance_m": round(clearance, 4), "render_step": args.render_step,
        "preview_frames": args.preview_frames if not args.save_only else [],
        "render_animation": args.render_animation and not args.save_only,
    }), flush=True)
    if not args.save_only:
        # Render sequential stills in one process to retain Cycles caches. A
        # prior animation-operator run failed during Metal pipeline compilation;
        # the underlying cause has not been established.
        render_frames = range(1, args.frames + 1, args.render_step) if args.render_animation else args.preview_frames
        for frame in render_frames:
            scene.frame_set(frame)
            scene.render.filepath = str(sequence / f"frame_{frame:04d}.png")
            bpy.ops.render.render(write_still=True, scene=scene.name)


if __name__ == "__main__":
    main()
