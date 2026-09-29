"""Measure the original asset in world space and render fitting references."""
import bpy
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "rigging"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "preproduction/assets/models/samurai-girl-web.glb"))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
report = []
for obj in meshes:
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    center = [(a+b)/2 for a,b in zip(low,high)]
    report.append(dict(name=obj.name, vertices=len(points), lo=low, hi=high, center=center,
                       materials=[m.name for m in obj.data.materials if m]))
    # Preserve the observed world-space mesh exactly; remove all import transforms.
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.data.transform(world)
    obj.matrix_world = Matrix.Identity(4)
with (OUT / 'source-measurements.json').open('w') as f:
    json.dump(report, f, indent=2)
print('PARTS_JSON', OUT / 'source-measurements.json')

world = bpy.data.worlds.new('Inspection World')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.09,.11,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.context.scene.world=world
for name, loc, energy in [('Key',(2,-3,4),250),('Fill',(-2,-1,2),150),('Rim',(0,2,3),200)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=3
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,.9))-obj.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=700;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
camera_data=bpy.data.cameras.new('Inspection Camera');camera_data.type='ORTHO';camera_data.ortho_scale=2.1
camera=bpy.data.objects.new('Inspection Camera',camera_data);bpy.context.collection.objects.link(camera)
scene.camera=camera
for label, loc in [('front',(0,-5,.9)),('side',(5,0,.9)),('back',(0,5,.9))]:
    camera.location=loc;camera.rotation_euler=(Vector((0,0,.9))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT / ('source-'+label+'.png'))
    bpy.ops.render.render(write_still=True)
print('INSPECTION_DONE')
