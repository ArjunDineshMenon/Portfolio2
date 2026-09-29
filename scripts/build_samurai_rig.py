"""Reproducible Blender production rig. Never edits the supplied GLB.

Run: blender --background --python scripts/build_samurai_rig.py
World-space fitting, material-aware skinning, analytic limb posing, baked FK
actions and rigid sword/sheath sockets. The editable .blend is the master.
"""
import bpy
import math
import json
import hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/rigging'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'preproduction/assets/models/samurai-girl-web.glb'
OUTPUT = OUT / 'samurai-animated.glb'
SOURCE_HASH = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in meshes:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.data.transform(world)
    obj.matrix_world = Matrix.Identity(4)
# Remove the now-empty Sketchfab import hierarchy, not any source geometry.
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        bpy.data.objects.remove(obj, do_unlink=True)

spec = {
    'root': ((0,0,0),(0,0,.15),None),
    'pelvis': ((.035,.015,.99),(.03,.015,1.14),'root'),
    'spine': ((.03,.015,1.14),(.045,.03,1.36),'pelvis'),
    'chest': ((.045,.03,1.36),(.025,.02,1.48),'spine'),
    'neck': ((.025,.02,1.48),(.015,.01,1.57),'chest'),
    'head': ((.015,.01,1.57),(.005,.01,1.76),'neck'),
    'upper_arm.R': ((-.11,.08,1.45),(-.17,.12,1.17),'chest'),
    'forearm.R': ((-.17,.12,1.17),(-.27,.075,.92),'upper_arm.R'),
    'hand.R': ((-.27,.075,.92),(-.272,.06,.875),'forearm.R'),
    'upper_arm.L': ((.175,0,1.455),(.24,-.015,1.18),'chest'),
    'forearm.L': ((.24,-.015,1.18),(.25,-.09,.92),'upper_arm.L'),
    'hand.L': ((.25,-.09,.92),(.232,-.117,.874),'forearm.L'),
    'thigh.R': ((-.067,.05,.97),(-.06,.06,.49),'pelvis'),
    'shin.R': ((-.06,.06,.49),(-.062,.05,.085),'thigh.R'),
    'foot.R': ((-.062,.05,.085),(-.065,-.045,.02),'shin.R'),
    'thigh.L': ((.132,0,.97),(.18,-.04,.49),'pelvis'),
    'shin.L': ((.18,-.04,.49),(.23,-.085,.085),'thigh.L'),
    'foot.L': ((.23,-.085,.085),(.235,-.18,.02),'shin.L'),
    'katana_socket': ((-.272,.06,.875),(-.30,-.036,.883),'hand.R'),
    'blade_socket': ((-.30,-.036,.883),(-.482,-.707,1.023),'katana_socket'),
    'sheath_socket': ((.232,-.117,.874),(.30,-.03,.846),'hand.L'),
}
arm_data = bpy.data.armatures.new('Samurai_Fitted_FK_Rig')
arm = bpy.data.objects.new('Samurai_Rig', arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, tail, parent) in spec.items():
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
    b.use_deform = name != 'root'
    b.align_roll(Vector((0,-1,0)))
bpy.ops.object.mode_set(mode='OBJECT')
arm.show_in_front = True
arm_data.display_type = 'STICK'
for b in arm.pose.bones:
    b.rotation_mode = 'QUATERNION'
    b.bone.color.palette = 'THEME04' if 'socket' in b.name else 'THEME03'
rest = {b.name: b.matrix_local.copy() for b in arm_data.bones}

def sat(t):
    return max(0., min(1., t))

def ease(t):
    t = sat(t)
    return t*t*(3-2*t)

def blend_weights(a, b, t):
    t = sat(t)
    return {a: 1-t, b: t}

def axial(z):
    levels = [(1.02,'pelvis'),(1.22,'spine'),(1.43,'chest'),(1.535,'neck'),(1.61,'head')]
    if z <= levels[0][0]: return {'pelvis':1}
    for (za, a),(zb,b) in zip(levels,levels[1:]):
        if z < zb: return blend_weights(a,b,ease((z-za)/(zb-za)))
    return {'head':1}

def arm_weights(v):
    side = 'R' if v.x < .04 else 'L'
    if v.z < .95: return {'hand.'+side:1}
    if v.z < 1.04:
        return blend_weights('hand.'+side,'forearm.'+side,ease((v.z-.95)/.09))
    if v.z < 1.10: return {'forearm.'+side:1}
    if v.z < 1.26:
        return blend_weights('forearm.'+side,'upper_arm.'+side,ease((v.z-1.10)/.16))
    return {'upper_arm.'+side:1}

def segment_distance(v, a, b):
    a,b=Vector(a),Vector(b)
    d=b-a
    return (v-a-d*sat((v-a).dot(d)/d.length_squared)).length

def shoulder_weights(v):
    # A shared spatial field for skin, sleeve and strap seams, independent of material.
    side='R' if v.x < .04 else 'L'
    da=segment_distance(v,*spec['upper_arm.'+side][:2])
    db=segment_distance(v,(.03,.02,1.1),(.025,.02,1.51))
    sleeve=ease((db-da+.005)/.10)*(1-ease((v.z-1.47)/.08))
    if v.z<1.08: sleeve=0
    w={n:x*(1-sleeve) for n,x in axial(v.z).items()}
    for n,x in arm_weights(v).items(): w[n]=w.get(n,0)+x*sleeve
    return w

def leg_weights(v):
    side = 'R' if v.x < .04 else 'L'
    if v.z < .13: return {'foot.'+side:1}
    if v.z < .23: return blend_weights('foot.'+side,'shin.'+side,ease((v.z-.13)/.10))
    if v.z < .40: return {'shin.'+side:1}
    if v.z < .59: return blend_weights('shin.'+side,'thigh.'+side,ease((v.z-.40)/.19))
    if v.z < .81: return {'thigh.'+side:1}
    return blend_weights('thigh.'+side,'pelvis',ease((v.z-.81)/.23))

weapons = {'Blade_base','Blade','Crossguard','Hamdle','Grip_End','Grip_Ring','Handle_Wrappings'}
sheath_mats = {'Scabbard','Side_Ring','Top_Ring','Wrappings'}
head_mats = {'Ears','Face','Lips','Eyes','EyeMoisture','Eye_Moisture','Eyebrows','Eyelashes',
             'Hair','Back','BackUnder','Bangs','Front','Side','ClothStrip1','ClothStrip2'}
weight_report = []
for obj in meshes:
    mat = obj.data.materials[0].name.split('.')[0] if obj.data.materials else ''
    # Some names contain suffixes; determine actual region from bounds as well.
    low = min(v.co.z for v in obj.data.vertices)
    high = max(v.co.z for v in obj.data.vertices)
    weapon = mat in weapons
    sheath = mat in sheath_mats
    for bone in arm_data.bones:
        if bone.use_deform: obj.vertex_groups.new(name=bone.name)
    for v in obj.data.vertices:
        if mat in {'Blade','Blade_base'}: w={'blade_socket':1}
        elif weapon: w = {'katana_socket':1}
        elif sheath: w = {'sheath_socket':1}
        elif mat == 'Fingernails' or mat == 'Arms':
            w = arm_weights(v.co) if v.co.z<1.1 else shoulder_weights(v.co)
        elif 'Tabi' in mat or 'Waraji' in mat or mat in {'Toenails','Legs'} or 'Hakama_Main' in mat:
            w = leg_weights(v.co)
        elif mat in head_mats or low > 1.59 or mat.startswith(('Hair','Bangs','Front','Side')): w = {'head':1}
        elif 'Obi_Belt' in mat: w = {'pelvis':1}
        elif 'Haori' in mat or 'Harness' in mat:
            w=shoulder_weights(v.co)
        else: w = shoulder_weights(v.co) if 1.10<v.co.z<1.55 else axial(v.co.z)
        for n,value in w.items():
            if value > 1e-6: obj.vertex_groups[n].add([v.index],value,'REPLACE')
    mod = obj.modifiers.new('Fitted skin','ARMATURE')
    mod.object = arm
    # Standard linear skinning matches glTF/Three.js rather than Blender-only DQ.
    mod.use_deform_preserve_volume = False
    obj.parent = arm
    weight_report.append(dict(mesh=obj.name,material=mat,weapon=weapon,sheath=sheath))

# Collapse the fragmented source into one skinned object, preserving its materials.
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes: obj.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.join()
body=bpy.context.object
body.name='Samurai_Skinned_Body_Weapons'
# Reduce geometry before skinning. The unmodified original and master remain available.
dec=body.modifiers.new('Web topology reduction','DECIMATE');dec.ratio=.34
bpy.context.view_layer.objects.active=body
bpy.ops.object.modifier_move_up(modifier=dec.name)
bpy.ops.object.modifier_apply(modifier=dec.name)
body.data.calc_loop_triangles()
triangles=len(body.data.loop_triangles)

# Texture copies belong to the derivative master, never the source file.
for img in bpy.data.images:
    if img.type=='IMAGE' and max(img.size)>1024:
        factor=1024/max(img.size)
        img.scale(max(1,round(img.size[0]*factor)),max(1,round(img.size[1]*factor)))
    if img.type=='IMAGE': img.pack()

def world_rotation(name, angle, axis=(1,0,0)):
    b=arm.pose.bones[name]
    local_axis=rest[name].to_quaternion().inverted() @ Vector(axis)
    b.rotation_quaternion=Quaternion(local_axis,angle)

def set_world(name, head, rotation):
    matrix=rotation.to_matrix().to_4x4() @ rest[name].to_quaternion().to_matrix().to_4x4()
    matrix.translation=head
    arm.pose.bones[name].matrix=matrix
    bpy.context.view_layer.update()

def aim(name, head, tail):
    direction=Vector(spec[name][1])-Vector(spec[name][0])
    q=direction.rotation_difference(Vector(tail)-Vector(head))
    set_world(name,Vector(head),q)

def two_link(a,b,end,pole):
    # Solve in armature/world meters. No scaling/stretching, root remains fixed.
    parent=arm.pose.bones[a].parent
    transform=parent.matrix @ rest[parent.name].inverted()
    start=transform @ Vector(spec[a][0])
    length_a=(Vector(spec[a][1])-Vector(spec[a][0])).length
    length_b=(Vector(spec[b][1])-Vector(spec[b][0])).length
    direction=Vector(end)-start
    distance=max(.015,min(direction.length,length_a+length_b-.0005))
    direction.normalize()
    real_end=start+direction*distance
    projected=Vector(pole)-start
    bend=projected-direction*projected.dot(direction)
    if bend.length<1e-6: bend=direction.cross(Vector((1,0,0)))
    bend.normalize()
    adjacent=(length_a**2-length_b**2+distance**2)/(2*distance)
    height=math.sqrt(max(0,length_a**2-adjacent**2))
    joint=start+direction*adjacent+bend*height
    aim(a,start,joint)
    aim(b,joint,real_end)
    return real_end

RGRIP=Vector((-.272,.06,.875));LGRIP=Vector((.232,-.117,.874))
blade_axis=Vector((-.18,-.67,.12)).normalized()
sheath_axis=Vector((.38,.53,-.19)).normalized()
sheathed_q=blade_axis.rotation_difference(sheath_axis)
sheathed_grip=Vector((.135,-.24,.951))-sheathed_q @ (Vector((-.30,-.036,.883))-RGRIP)

def hand_pose(side, grip, rotation):
    rest_grip=RGRIP if side=='R' else LGRIP
    wrist=Vector(spec['hand.'+side][0])
    requested=Vector(grip)-rotation @ (rest_grip-wrist)
    end=two_link('upper_arm.'+side,'forearm.'+side,requested,spec['upper_arm.'+side][1])
    set_world('hand.'+side,end,rotation)
    # Sockets inherit the hand transform exactly; no sword or sheath skin bending.

def pose(t, *, draw=1., bow=0., swing=0., brace=0., reveal=0., walk=0., phase=0., breath=0.):
    for b in arm.pose.bones:
        b.location=(0,0,0);b.rotation_quaternion=(1,0,0,0);b.scale=(1,1,1)
    # Bow is a hip hinge plus articulated spine/head; feet are solved back to ground.
    world_rotation('pelvis', bow*.40 + brace*.055)
    world_rotation('spine', bow*.19 + breath*.006)
    world_rotation('chest', bow*.12, (1,0,0))
    world_rotation('neck', bow*.09)
    world_rotation('head', bow*.07)
    if swing:
        world_rotation('chest',swing*.13,(0,0,1))
    arm.pose.bones['pelvis'].location.z=abs(math.sin(phase))*walk*.007 - brace*.018
    bpy.context.view_layer.update()
    for side, offset in [('R',0),('L',math.pi)]:
        ph=phase+offset
        ankle=Vector(spec['foot.'+side][0])
        ankle.y+=walk*.09*math.sin(ph)
        ankle.z+=walk*.035*max(0,math.cos(ph))
        ankle=two_link('thigh.'+side,'shin.'+side,ankle,(ankle.x,-.45,.48))
        set_world('foot.'+side,ankle,Quaternion((1,0,0),walk*.07*math.sin(ph)))
    # A real draw starts with the blade inside the scabbard and ends in guard.
    rq=sheathed_q.slerp(Quaternion(),ease(draw))
    r=sheathed_grip.lerp(RGRIP,ease(draw))
    # Separation along the blade/sheath direction through the extraction phase.
    r+=Vector((-.10,-.15,.18))*math.sin(math.pi*draw)
    l=LGRIP.copy()
    lq=Quaternion()
    if swing:
        # Winding right, crossing front, then finishing left: one diagonal strike.
        r=Vector((-.36+.55*ease((swing+1)/2),-.37,1.30-.30*ease((swing+1)/2)))
        rq=Quaternion((0,0,1),-.85+swing*1.15) @ Quaternion((1,0,0),-.12)
        l+=Vector((.03,.01,.12))
    if brace:
        r+=Vector((-.04,-.12,.21))*brace
        l+=Vector((.025,-.07,.13))*brace
        rq=Quaternion((1,0,0),-.24*brace) @ rq
    if reveal:
        l+=Vector((.16,-.23,.22))*max(0,reveal)
        r+=Vector((-.12,-.22,.24))*max(0,-reveal)
        rq=Quaternion((0,0,1),-.65*max(0,-reveal)) @ rq
    if walk:
        r.y+=.035*walk*math.sin(phase);l.y-=.035*walk*math.sin(phase)
    if bow:
        # Follow pelvis hinge, with both hands low and the sheathed blade held aside.
        transform=arm.pose.bones['pelvis'].matrix @ rest['pelvis'].inverted()
        r=transform @ r;l=transform @ l
        rq=transform.to_quaternion() @ rq;lq=transform.to_quaternion()
    hand_pose('R',r,rq)
    hand_pose('L',l,lq)
    # The blade withdraws into the opaque sheath; its hilt stays in the hand.
    arm.pose.bones['blade_socket'].scale=(1,max(.001,ease(draw/.68)),1)
    # The sheath initially remains at its original angle. During bow it follows L.
    bpy.context.view_layer.update()

actions={}
FPS=30
bpy.context.scene.render.fps=FPS
arm.animation_data_create()

def action(name,duration,fn):
    act=bpy.data.actions.new(name);act.use_fake_user=True
    arm.animation_data.action=act
    frames=round(duration*FPS)
    for f in range(frames+1):
        bpy.context.scene.frame_set(f+1)
        fn(f/frames)
        for b in arm.pose.bones:
            b.keyframe_insert('location',frame=f+1,group=b.name)
            b.keyframe_insert('rotation_quaternion',frame=f+1,group=b.name)
            b.keyframe_insert('scale',frame=f+1,group=b.name)
    actions[name]=(act,frames+1)
    arm.animation_data.action=None

action('Idle_Breathing',3.2,lambda t:pose(t,breath=math.sin(t*math.tau)))
action('Enter_From_Shadow',2.0,lambda t:pose(t,draw=0,walk=.22*math.sin(t*math.pi)**2,phase=t*math.tau))
action('Draw_Katana',2.0,lambda t:pose(t,draw=ease(t)))
# Explicit preparation, acceleration, impact and follow-through, not two endpoints.
def mix_poses(first,second,k):
    first();a={b.name:b.matrix_basis.copy() for b in arm.pose.bones}
    second();b={b.name:b.matrix_basis.copy() for b in arm.pose.bones}
    for bone in arm.pose.bones:
        la,qa,sa=a[bone.name].decompose();lb,qb,sb=b[bone.name].decompose()
        bone.matrix_basis=Matrix.LocRotScale(la.lerp(lb,k),qa.slerp(qb,k),sa.lerp(sb,k))

def strike(t):
    if t<.38:
        mix_poses(lambda:pose(0),lambda:pose(0,swing=-1),ease(t/.38))
    else:
        pose(t,swing=-1+2*ease((t-.38)/.62))
action('Hologram_Slice',1.3,strike)
def recover(t):
    # Blend baked matrices to guard so every joint and weapon remains connected.
    pose(1,swing=1)
    start={b.name:b.matrix_basis.copy() for b in arm.pose.bones}
    pose(0)
    end={b.name:b.matrix_basis.copy() for b in arm.pose.bones}
    for b in arm.pose.bones:
        la,qa,sa=start[b.name].decompose();lb,qb,sb=end[b.name].decompose()
        k=ease(t)
        b.matrix_basis=Matrix.LocRotScale(la.lerp(lb,k),qa.slerp(qb,k),sa.lerp(sb,k))
action('Recover_From_Slice',.9,recover)
action('Walk_Forward_Loop',1.6,lambda t:pose(t,walk=.85,phase=t*math.tau))
action('Panel_Reveal_Left',2.4,lambda t:pose(t,reveal=math.sin(t*math.pi)**2))
action('Panel_Reveal_Right',2.4,lambda t:pose(t,reveal=-math.sin(t*math.pi)**2))
action('Portal_Brace',2.0,lambda t:pose(t,brace=math.sin(t*math.pi)**2))
action('Sheathe_Katana',2.2,lambda t:pose(t,draw=1-ease(t)))
action('Closing_Bow',3.0,lambda t:pose(t,draw=0,bow=ease(t/.32) if t<.32 else 1 if t<.68 else 1-ease((t-.68)/.32)))

# Independent named NLA tracks give the glTF exporter exact clip names.
for name,(act,end) in actions.items():
    track=arm.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,1,act);strip.frame_end=end
    track.mute=True
arm.animation_data.action=None
pose(0)
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True);arm.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
    export_frame_range=False,export_def_bones=True,export_skins=True,
    export_image_format='WEBP',export_image_quality=85,export_image_add_webp=True,
    export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)

# Studio setup for QA and a useful editable master.
world=bpy.data.worlds.new('Studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.068,.083,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.context.scene.world=world
for name,loc,energy in [('Key',(2,-3,4),280),('Fill',(-2,-1,2),150),('Rim',(0,2,3),230)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.size=3
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,.9))-obj.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('QA Camera');data.type='ORTHO';data.ortho_scale=2.2
camera=bpy.data.objects.new('QA Camera',data);bpy.context.collection.objects.link(camera)
camera.location=(0,-5,.95)
camera.rotation_euler=(Vector((0,0,.95))-camera.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=560;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
arm.animation_data.action=actions['Idle_Breathing'][0]
scene.frame_start=1;scene.frame_end=97;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'samurai-production.blend'))
qa=[('Idle_Breathing',0),('Draw_Katana',0),('Draw_Katana',.5),('Hologram_Slice',.35),
    ('Hologram_Slice',.7),('Recover_From_Slice',1),('Walk_Forward_Loop',.25),
    ('Panel_Reveal_Left',.5),('Sheathe_Katana',1),('Closing_Bow',.5)]
for name,t in qa:
    act,end=actions[name];arm.animation_data.action=act;scene.frame_set(1+round((end-1)*t))
    scene.render.filepath=str(OUT / f'{name}-{t:.2f}.png')
    bpy.ops.render.render(write_still=True)
report=dict(source_sha256=SOURCE_HASH,source_unchanged=SOURCE_HASH==hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    triangles=triangles,bones=len(arm_data.bones),clips={n:round((f-1)/FPS,3) for n,(_,f) in actions.items()},
    output_bytes=OUTPUT.stat().st_size,skinning=weight_report)
(OUT/'build-report.json').write_text(json.dumps(report,indent=2))
print('PRODUCTION_RIG_EXPORTED',json.dumps({k:v for k,v in report.items() if k!='skinning'}))
