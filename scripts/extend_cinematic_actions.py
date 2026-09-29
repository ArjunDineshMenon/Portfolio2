"""Extend the preserved production master with cinematic interaction actions."""
import ast, bpy, json, math
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/cinematic'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'artifacts/rigging/samurai-production.blend'))
arm=bpy.data.objects['Samurai_Rig'];body=bpy.data.objects['Samurai_Skinned_Body_Weapons']
rest={b.name:b.matrix_local.copy() for b in arm.data.bones}
for track in arm.animation_data.nla_tracks: track.mute=True
arm.animation_data.action=None
# Reuse the measured fitting and limb solver without rerunning/overwriting the old master.
source=ast.parse((ROOT/'scripts/build_samurai_rig.py').read_text())
functions={'sat','ease','world_rotation','set_world','aim','two_link','hand_pose','pose','mix_poses','action'}
assignments={'spec','RGRIP','LGRIP','blade_axis','sheath_axis','sheathed_q','sheathed_grip'}
nodes=[]
for node in source.body:
    if isinstance(node,ast.FunctionDef) and node.name in functions: nodes.append(node)
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id in assignments for t in node.targets): nodes.append(node)
exec(compile(ast.Module(body=nodes,type_ignores=[]),'fitted_rig_helpers','exec'))
actions={};FPS=30

def slash_pose(direction,t):
    pose(t)
    wind=1-ease((t-.18)/.43)
    q=Quaternion((0,0,1),direction*(1.3-2.55*ease((t-.18)/.43))) @ Quaternion((1,0,0),-.12)
    grip=Vector((-.32 if direction>0 else .10,-.33,1.27-.24*ease((t-.18)/.43)))
    world_rotation('chest',direction*(.10-.23*ease((t-.18)/.43)),(0,0,1))
    world_rotation('spine',.055)
    world_rotation('head',-direction*.10,(0,0,1))
    bpy.context.view_layer.update()
    hand_pose('R',grip,q)
    hand_pose('L',LGRIP+Vector((.025,-.015,.08+wind*.025)),Quaternion())
    bpy.context.view_layer.update()

def slash(t,direction):
    if t<.20: mix_poses(lambda:pose(0),lambda:slash_pose(direction,0),ease(t/.2))
    elif t<.70: slash_pose(direction,(t-.2)/.5)
    else: mix_poses(lambda:slash_pose(direction,1),lambda:pose(0),ease((t-.7)/.3))

action('Panel_Slash_Left',1.65,lambda t:slash(t,1))
action('Panel_Slash_Right',1.65,lambda t:slash(t,-1))
action('Walk_Travel_Loop',1.2,lambda t:pose(t,walk=1.6,phase=t*math.tau))
action('Portal_Entry',1.8,lambda t:pose(t,brace=math.sin(t*math.pi)**2,walk=.45*math.sin(t*math.pi)**2,phase=t*math.tau))
action('Portal_Landing',1.4,lambda t:pose(t,brace=math.sin(t*math.pi)**2*.75))

for name,(act,end) in actions.items():
    track=arm.animation_data.nla_tracks.new();track.name=name;track.mute=True
    track.strips.new(name,1,act).frame_end=end
arm.animation_data.action=bpy.data.actions['Idle_Breathing']
scene=bpy.context.scene;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'samurai-cinematic.blend'))
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=arm
arm.animation_data.action=None
bpy.ops.export_scene.gltf(filepath=str(OUT/'samurai-cinematic.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,
    export_def_bones=True,export_skins=True,export_image_format='WEBP',export_image_quality=85,
    export_image_add_webp=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
scene.render.resolution_x=720;scene.render.resolution_y=800
scene.camera.data.ortho_scale=2.4
for name,t in [('Panel_Slash_Left',.45),('Panel_Slash_Right',.45),('Walk_Travel_Loop',.25),('Portal_Entry',.5)]:
    act,end=actions[name];arm.animation_data.action=act;scene.frame_set(1+round(t*(end-1)))
    scene.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)
(OUT/'animation-report.json').write_text(json.dumps({'added':list(actions),'clips':[a.name for a in bpy.data.actions],
    'bytes':(OUT/'samurai-cinematic.glb').stat().st_size,'preserved_master':'artifacts/rigging/samurai-production.blend'},indent=2))
print('CINEMATIC_ACTIONS_EXPORTED')
