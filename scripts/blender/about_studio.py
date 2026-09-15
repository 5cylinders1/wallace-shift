"""Build the editable Wallace Shift About studio film in Blender 5.x.

Run with Blender, not the system Python::

    blender --background --python scripts/blender/about_studio.py -- \
        --output review-assets/about-studio --width 1920 --height 1080 \
        --samples 48 --frames 144 --render-frame 1

The default authors and saves the scene without rendering the animation.
Use ``--render-frames 1,72,144`` for previews in one persistent render process,
or ``--render-animation`` to render all frames immediately after authoring.
To render the saved animation subsequently, use Blender's ``-b FILE -a``.
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


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("review-assets/about-studio"))
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--frames", type=int, default=144)
    parser.add_argument("--render-frame", type=int)
    parser.add_argument("--render-frames", help="Comma-separated preview frames rendered in one process.")
    parser.add_argument("--render-animation", action="store_true", help="Render the complete animation after saving.")
    parser.add_argument("--save-only", action="store_true")
    cli = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = parser.parse_args(cli)
    if min(args.width, args.height, args.samples) < 1 or args.frames < 3:
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
    mat, bsdf = material("02 / blue optical glass · solid volume", (0.68, 0.87, 1.0), 0.0, 0.021)
    bsdf.inputs["IOR"].default_value = 1.46
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    bsdf.inputs["Coat Weight"].default_value = 0.10
    bsdf.inputs["Coat Roughness"].default_value = 0.025
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    absorption = nodes.new("ShaderNodeVolumeAbsorption")
    absorption.inputs["Color"].default_value = (0.025, 0.22, 0.72, 1.0)
    absorption.inputs["Density"].default_value = 1.8
    links.new(absorption.outputs["Volume"], nodes.get("Material Output").inputs["Volume"])
    return mat


def graphite():
    mat, bsdf = material("03 / polished graphite terrazzo", (0.008, 0.010, 0.013), 0.32, 0.22)
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
    rough.inputs["To Min"].default_value = 0.20
    rough.inputs["To Max"].default_value = 0.24
    links.new(noise.outputs["Fac"], rough.inputs["Value"])
    links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    return mat


def fin(scene, name, mat, x, width, depth, height, lean, frames):
    half = width / 2
    y = depth / 2
    # Both bases sit exactly on the floor; all eight vertices form a closed volume.
    vertices = [(-half, -y, 0), (half, -y, 0), (half, y, 0), (-half, y, 0),
                (-half + lean, -y, height), (half + lean, -y, height - 0.10),
                (half + lean, y, height - 0.10), (-half + lean, y, height)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    obj = mesh_object(scene, name, vertices, faces, mat)
    obj.location = (x, 0, 0.004)
    # These are rigid solids: their geometry never stretches or morphs. A short
    # lateral move and restrained yaw bring their broad faces into alignment.
    initial_yaw = -0.055 if x < 0 else 0.10
    for progress, factor in [(0.0, 1.0), (0.53, 1.0), (0.90, 0.0), (1.0, 0.0)]:
        obj.rotation_euler.z = initial_yaw * factor
        obj.keyframe_insert("rotation_euler", frame=1 + round(progress * (frames - 1)))
    for progress, offset in [(0.0, 0.0), (0.53, 0.0), (0.90, -math.copysign(0.10, x)), (1.0, -math.copysign(0.10, x))]:
        obj.location.x = x + offset
        obj.keyframe_insert("location", frame=1 + round(progress * (frames - 1)))
    bevel_object(obj)
    return obj


def build_room(scene, floor_mat):
    box(scene, "Floor / continuous polished graphite", (0, 0, -0.075), (100, 100, 0.15), floor_mat)
    wall_mat, wall_bsdf = material("04 / charcoal acoustic walls", (0.0007, 0.0009, 0.0012), 0.0, 0.80)
    wall_bsdf.inputs["Specular IOR Level"].default_value = 0.12
    # A real quarter-round cyclorama catches light softly without a horizon seam.
    cross_section = [(4.0, 0.0)]
    radius = 4.0
    for step in range(1, 41):
        theta = (math.pi / 2) * step / 40
        cross_section.append((4.0 + radius * math.sin(theta), radius * (1 - math.cos(theta))))
    cross_section.append((8.0, 14.0))
    vertices = []
    for y, z in cross_section:
        vertices.extend([(-40, y, z), (40, y, z)])
    faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(cross_section) - 1)]
    backdrop = mesh_object(scene, "Room / curved charcoal cyclorama", vertices, faces, wall_mat)
    for face in backdrop.data.polygons:
        face.use_smooth = True
    # The cyclorama spans the whole travelling-camera view. Side-wall ends would
    # create visible vertical seams at these wide, off-center compositions.


def build_lighting(scene):
    # Physical sources remain visible in reflective and transmissive rays. They are
    # overhead or outside the camera frame, rather than floating visible cards.
    area(scene, "Key / tall neutral softbox", (-3.5, -4.0, 5.0), (-0.4, 0, 2.6),
         720, (1.0, 0.95, 0.88), 2.4, 5.5)
    area(scene, "Edge / narrow silver strip", (3.1, 1.3, 4.2), (0.3, 0, 2.4),
         520, (0.77, 0.87, 1.0), 0.65, 5.4)
    area(scene, "Top / large overhead diffusion", (0, -0.2, 7.0), (0, 0, 1.0),
         420, (0.87, 0.93, 1.0), 4.0, 3.0)
    area(scene, "Front / restrained broad fill", (0.4, -5.0, 3.0), (0, 0, 2.5),
         45, (0.67, 0.80, 1.0), 4.0, 4.5)
    area(scene, "Glass / cool rear reflection", (2.2, 3.0, 3.0), (0.65, 0, 2.6),
         180, (0.07, 0.32, 1.0), 0.45, 5.0)
    area(scene, "Slit / blue light on the polished floor", (0.12, 0.1, 0.38), (0.1, -0.9, 0),
         3, (0.025, 0.23, 1.0), 0.22, 0.8)
    glow, node = material("05 / blue architectural light", (0.025, 0.22, 0.9), 0.0, 0.25)
    node.inputs["Emission Color"].default_value = (0.02, 0.25, 1.0, 1.0)
    node.inputs["Emission Strength"].default_value = 4.0
    box(scene, "Architecture / blue slit", (0.13, 0.16, 2.24), (0.018, 0.024, 4.48), glow, 0.004)


def build_camera(scene, frames):
    data = bpy.data.cameras.new("About / travelling studio camera")
    camera = bpy.data.objects.new("Camera / three connected compositions", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    data.lens = 43.0
    data.sensor_width = 36.0
    data.clip_start = 0.08
    data.clip_end = 200
    data.dof.use_dof = False  # Crisp optical product work throughout the travelling shot.
    # Authored as physical camera positions and targets. Rest frames make the
    # text beats readable; the interpolated paths travel through the same room.
    poses = [
        (0.00, (3.8, -12.8, 2.9), (-2.7, 0.0, 2.48), 43.0),
        (0.08, (3.72, -12.70, 2.94), (-2.66, 0.0, 2.48), 43.0),
        (0.41, (-3.5, -10.0, 2.62), (2.35, 0.0, 2.55), 40.0),
        (0.53, (-3.65, -9.9, 2.70), (2.30, 0.0, 2.56), 40.0),
        (0.91, (3.2, -14.0, 4.0), (-2.65, 0.0, 2.32), 43.0),
        (1.00, (3.05, -14.1, 4.10), (-2.65, 0.0, 2.32), 43.0),
    ]
    for progress, position, target, lens in poses:
        frame = 1 + round(progress * (frames - 1))
        camera.location = position
        point_at(camera, target)
        data.lens = lens
        camera.keyframe_insert("location", frame=frame)
        camera.keyframe_insert("rotation_euler", frame=frame)
        data.keyframe_insert("lens", frame=frame)
    for name, progress in [("01 / two people", 0.0), ("02 / complementary perspectives", 0.41),
                           ("03 / one shared standard", 0.91)]:
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
    fin(scene, "Object 01 / brushed aluminum", fine_brushed_aluminum(),
        -0.68, 0.72, 0.34, 4.85, 0.30, args.frames)
    fin(scene, "Object 02 / optical glass", optical_glass(),
        0.68, 0.66, 0.40, 4.72, -0.12, args.frames)
    build_lighting(scene)
    build_camera(scene, args.frames)
    scene["Art direction"] = "Two complementary materials. One continuous studio. Physical travel, shared alignment."
    scene["Scale"] = "Meters; tallest fin 4.85 m, optical glass thickness 0.40 m."
    scene["Compositions"] = "Opening: pair right, copy left. Middle: pair left, copy right. Ending: pair right, copy left."
    scene.render.filepath = str(sequence / "frame_")
    scene.frame_set(args.preview_frames[0] if args.preview_frames else 1)
    # Blender's default Bezier keys are auto-clamped. Keep their smooth motion
    # while ensuring later interactive edits cannot overshoot material alignment.
    blend_path = output / "about-studio.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print("ABOUT_STUDIO_CONFIG " + json.dumps({
        "blend": str(blend_path), "sequence": str(sequence / "frame_####.png"),
        "scene": scene.name, "engine": scene.render.engine,
        "devices": devices or ["CPU"], "samples": args.samples,
        "resolution": [args.width, args.height], "frames": args.frames,
        "preview_frames": args.preview_frames if not args.save_only else [],
        "render_animation": args.render_animation and not args.save_only,
    }), flush=True)
    if not args.save_only:
        # Render sequential stills in one process to retain Cycles caches. A
        # prior animation-operator run failed during Metal pipeline compilation;
        # the underlying cause has not been established.
        render_frames = range(1, args.frames + 1) if args.render_animation else args.preview_frames
        for frame in render_frames:
            scene.frame_set(frame)
            scene.render.filepath = str(sequence / f"frame_{frame:04d}.png")
            bpy.ops.render.render(write_still=True, scene=scene.name)


if __name__ == "__main__":
    main()
