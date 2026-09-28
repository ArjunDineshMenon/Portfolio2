"""Render a quick inspection image of the optimized samurai GLB."""

from pathlib import Path
import math
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "preproduction" / "assets" / "models" / "samurai-girl-web.glb"
OUTPUT = ROOT / "preproduction" / "assets" / "models" / "samurai-girl-web-preview.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(MODEL))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
corners = []
for obj in meshes:
    corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)

minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (minimum + maximum) / 2
height = maximum.z - minimum.z

camera_data = bpy.data.cameras.new("Preview Camera")
camera = bpy.data.objects.new("Preview Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = center + Vector((height * 1.45, -height * 2.25, height * 0.22))
camera.rotation_euler = ((center - camera.location).to_track_quat("-Z", "Y")).to_euler()
camera_data.lens = 62
bpy.context.scene.camera = camera

key_data = bpy.data.lights.new("Key", type="AREA")
key_data.energy = 1100
key_data.shape = "DISK"
key_data.size = height * 1.2
key = bpy.data.objects.new("Key", key_data)
bpy.context.collection.objects.link(key)
key.location = center + Vector((-height, -height, height * 1.2))
key.rotation_euler = ((center - key.location).to_track_quat("-Z", "Y")).to_euler()

fill_data = bpy.data.lights.new("Fill", type="AREA")
fill_data.energy = 650
fill_data.color = (0.2, 0.55, 1.0)
fill_data.size = height
fill = bpy.data.objects.new("Fill", fill_data)
bpy.context.collection.objects.link(fill)
fill.location = center + Vector((height, height * 0.4, height * 0.5))
fill.rotation_euler = ((center - fill.location).to_track_quat("-Z", "Y")).to_euler()

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.render.filepath = str(OUTPUT)
scene.render.image_settings.color_mode = "RGBA"
scene.world.color = (0.005, 0.008, 0.02)

bpy.ops.render.render(write_still=True)
print(f"PREVIEW output={OUTPUT}")
