from pathlib import Path
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
model = root / "preproduction" / "assets" / "models" / "samurai-girl-rigged-candidate.glb"
output = root / "preproduction" / "assets" / "models" / "samurai-girl-rigged-candidate-preview.png"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(model))
for obj in bpy.context.scene.objects:
    if obj.type == "ARMATURE" and obj.animation_data:
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != "Idle_Breathing"
    if obj.type == "MESH":
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.show_render = False
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
hi = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (lo + hi) / 2
h = hi.z - lo.z
camera_data = bpy.data.cameras.new("Preview Camera")
camera = bpy.data.objects.new("Preview Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = center + Vector((h * 1.45, -h * 2.25, h * .22))
camera.rotation_euler = ((center - camera.location).to_track_quat("-Z", "Y")).to_euler()
camera_data.lens = 62
bpy.context.scene.camera = camera
for name, energy, color, loc in [
    ("Key", 1100, (1.0, .9, .8), (-h, -h, h*1.2)),
    ("Fill", 650, (.2, .55, 1.0), (h, h*.4, h*.5)),
]:
    data = bpy.data.lights.new(name, type="AREA")
    data.energy, data.shape, data.size, data.color = energy, "DISK", h*1.2, color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = center + Vector(loc)
    light.rotation_euler = ((center-light.location).to_track_quat("-Z", "Y")).to_euler()
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.render.filepath = str(output)
scene.world = bpy.data.worlds.new("Preview World")
scene.world.color = (.005, .008, .02)
bpy.ops.render.render(write_still=True)
print("RIG_PREVIEW", output)
