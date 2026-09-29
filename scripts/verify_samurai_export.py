"""Round-trip QA: import the actual deployment GLB into a clean Blender scene."""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
cinematic='--cinematic' in sys.argv
OUT=ROOT/('artifacts/cinematic' if cinematic else 'artifacts/rigging')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/('samurai-cinematic.glb' if cinematic else 'samurai-animated.glb')))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
# Blender creates a hidden icosphere for bone display; it is not glTF geometry.
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o not in meshes: o.hide_render=True
actions={a.name:a for a in bpy.data.actions}
expected={'Idle_Breathing','Enter_From_Shadow','Draw_Katana','Hologram_Slice','Recover_From_Slice',
    'Walk_Forward_Loop','Panel_Reveal_Left','Panel_Reveal_Right','Portal_Brace','Sheathe_Katana','Closing_Bow'}
if cinematic: expected.update({'Walk_Travel_Loop','Panel_Slash_Left','Panel_Slash_Right','Portal_Entry','Portal_Landing'})
assert set(actions)==expected, list(actions)
assert len(arm.data.bones)>=20
assert meshes
missing=sum(1 for o in meshes for v in o.data.vertices if not v.groups)
assert missing==0, missing
arm.animation_data_create()
for tr in arm.animation_data.nla_tracks: tr.mute=True
def sample(name,t):
    act=actions[name];arm.animation_data.action=act
    a,b=act.frame_range
    bpy.context.scene.frame_set(int(a+(b-a)*t),subframe=(a+(b-a)*t)%1)
    bpy.context.view_layer.update()
    return {b.name:(arm.matrix_world @ b.matrix).copy() for b in arm.pose.bones}

measures={}
for name in expected:
    poses=[sample(name,t) for t in [0,.25,.5,.75,1]]
    # Fixed world-space root, actual in-place gait, no overall object tilt for bow.
    delta=max((p['root'].translation-poses[0]['root'].translation).length for p in poses) if 'root' in poses[0] else 0
    assert delta<1e-5,(name,delta)
    for p in poses:
        assert all(math.isfinite(x) for m in p.values() for row in m for x in row)
        assert (p['katana_socket'].translation-p['hand.R'].translation).length<.10
    measures[name]=dict(root_translation_delta=delta)
    if name in {'Idle_Breathing','Walk_Forward_Loop','Portal_Brace','Panel_Reveal_Left','Panel_Reveal_Right','Closing_Bow','Walk_Travel_Loop','Panel_Slash_Left','Panel_Slash_Right','Portal_Entry','Portal_Landing'}:
        seam=max(max(abs(poses[0][n][r][c]-poses[-1][n][r][c]) for r in range(4) for c in range(4)) for n in poses[0])
        assert seam<1e-4,(name,seam)
        measures[name]['loop_or_neutral_seam']=seam

neutral=sample('Closing_Bow',0);bow=sample('Closing_Bow',.5)
assert bow['head'].translation.y < neutral['head'].translation.y-.20
head_drop=neutral['head'].translation.z-bow['head'].translation.z
assert head_drop>.07,head_drop
feet=max((bow['foot.'+s].translation-neutral['foot.'+s].translation).length for s in ['L','R'])
assert feet<.025,feet
measures['Closing_Bow']['foot_drift_m']=feet
measures['Closing_Bow']['head_drop_m']=head_drop
world=bpy.data.worlds.new('Round-trip Studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.05,.065,.08,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.7;bpy.context.scene.world=world
for name,loc,energy in [('Key',(2,-3,4),280),('Fill',(-2,-1,2),150),('Rim',(0,2,3),220)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=3
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector((0,0,.9))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('QA');data.type='ORTHO';data.ortho_scale=2.3
camera=bpy.data.objects.new('QA',data);bpy.context.collection.objects.link(camera)
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=560;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for label,clip,t,loc in [('strike','Hologram_Slice',.85,(0,-5,.95)),('bow-front','Closing_Bow',.5,(0,-5,.95)),
                         ('bow-side','Closing_Bow',.5,(5,0,.95))]:
    sample(clip,t);camera.location=loc
    camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'export-{label}.png');bpy.ops.render.render(write_still=True)
(OUT/'export-verification.json').write_text(json.dumps(dict(clips=measures,unweighted_vertices=missing,
    skin_meshes=len(meshes),bones=len(arm.data.bones)),indent=2))
print('ROUND_TRIP_PASS')
