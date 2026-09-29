"""Repair sleeve/arm deformation and bake a varied, connected sword vocabulary."""
import ast
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/sakura'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'samurai-sakura.blend'))
arm = bpy.data.objects['Samurai_Rig']
body = bpy.data.objects['Samurai_Skinned_Body_Weapons']
for track in arm.animation_data.nla_tracks:
    track.mute = True
arm.animation_data.action = None
rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
source = ast.parse((ROOT / 'scripts/build_samurai_rig.py').read_text())
functions = {'sat', 'ease', 'world_rotation', 'set_world', 'aim', 'two_link',
             'pose', 'mix_poses', 'action', 'segment_distance', 'axial', 'arm_weights', 'blend_weights'}
assignments = {'spec', 'RGRIP', 'LGRIP', 'blade_axis', 'sheath_axis', 'sheathed_q', 'sheathed_grip'}
nodes = [n for n in source.body if
         (isinstance(n, ast.FunctionDef) and n.name in functions) or
         (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in assignments for t in n.targets))]
exec(compile(ast.Module(body=nodes, type_ignores=[]), 'fitted_helpers', 'exec'))
actions = {}
FPS = 30

def hand_pose(side, grip, rotation):
    rest_grip = RGRIP if side == 'R' else LGRIP
    wrist = Vector(spec['hand.' + side][0])
    requested = Vector(grip) - rotation @ (rest_grip - wrist)
    # The elbow bends out and forward, never through the torso.
    sign = -1 if side == 'R' else 1
    pole = Vector((sign * .43, -.20, 1.14))
    chest_transform = arm.pose.bones['chest'].matrix @ rest['chest'].inverted()
    end = two_link('upper_arm.' + side, 'forearm.' + side, requested, chest_transform @ pole)
    set_world('hand.' + side, end, rotation)

# Use the same spatial weight field for skin and clothing. In particular the
# lower sleeve must follow the arm rather than snapping to spine at z=1.08.
affected = set()
for poly in body.data.polygons:
    name = body.data.materials[poly.material_index].name
    if any(key in name for key in ['Haori', 'Harness', 'Arms', 'Torso']):
        affected.update(poly.vertices)
reweighted = 0
for index in affected:
    vertex = body.data.vertices[index]
    v = vertex.co
    if not 1.025 < v.z < 1.56:
        continue
    side = 'R' if v.x < .04 else 'L'
    da = min(segment_distance(v, *spec['upper_arm.' + side][:2]),
             segment_distance(v, *spec['forearm.' + side][:2]))
    dt = segment_distance(v, (.03, .02, 1.06), (.025, .02, 1.51))
    arm_share = ease((dt - da + .025) / .13) * (1 - ease((v.z - 1.47) / .09))
    weights = {name: value * (1-arm_share) for name, value in axial(v.z).items()}
    for name, value in arm_weights(v).items():
        weights[name] = weights.get(name, 0) + value * arm_share
    weights = sorted(weights.items(), key=lambda pair: pair[1], reverse=True)[:4]
    total = sum(value for _, value in weights)
    for group in list(vertex.groups):
        body.vertex_groups[group.group].remove([index])
    for name, value in weights:
        if value > .00001:
            body.vertex_groups[name].add([index], value / total, 'REPLACE')
    reweighted += 1

def connected_cut(t, kind='horizontal', direction=1, dash=False):
    envelope = math.sin(math.pi * t) ** 2
    strike = ease((t - .25) / .45)
    pose(t, brace=envelope * (.9 if dash else .28),
         walk=envelope * (1.35 if dash else .2), phase=t * math.tau)
    world_rotation('chest', direction * (.24 - .48 * strike) * envelope, (0, 0, 1))
    world_rotation('spine', .07 * envelope)
    world_rotation('head', direction * .08 * envelope, (0, 0, 1))
    bpy.context.view_layer.update()
    # The katana makes the broad arc while the grip remains in front of its shoulder.
    height = 1.14
    tilt = -.18
    if kind == 'diagonal':
        height = 1.32 - .32 * strike
        tilt = -.55 + .8 * strike
    elif kind == 'rising':
        height = .96 + .36 * strike
        tilt = .45 - .8 * strike
    grip = Vector((-.30 + .055 * math.sin(strike * math.pi), -.36, height))
    q = Quaternion((0, 0, 1), direction * (1.15 - strike * 2.4)) @ Quaternion((1, 0, 0), tilt)
    hand_pose('R', RGRIP.lerp(grip, envelope), Quaternion().slerp(q, envelope))
    hand_pose('L', LGRIP + Vector((.04, -.045, .07)) * envelope, Quaternion())
    bpy.context.view_layer.update()

def conduct(t, side=1, scan=False):
    env = math.sin(t * math.pi) ** 2
    phase = t * math.tau
    pose(t, brace=.08 * env, breath=math.sin(phase))
    world_rotation('chest', side * .10 * env, (0, 0, 1))
    world_rotation('head', side * .2 * env, (0, 0, 1))
    bpy.context.view_layer.update()
    hand_pose('R', RGRIP + Vector((-.08, -.12, .12)) * env, Quaternion((0, 0, 1), -.25 * env))
    hand_pose('L', LGRIP + Vector((.10 * env, -.25 * env,
              (.27 if scan else .2) * env + .07 * math.sin(phase) * env)), Quaternion((1, 0, 0), -.16 * env))

def flourish(t):
    env = math.sin(t * math.pi) ** 2
    pose(t, breath=math.sin(t * math.tau), brace=.14 * env)
    world_rotation('chest', math.sin(t * math.tau) * .1, (0, 0, 1))
    bpy.context.view_layer.update()
    q = Quaternion((0, 0, 1), math.sin(t * math.tau) * 1.1) @ Quaternion((1, 0, 0), -.25 * env)
    hand_pose('R', RGRIP + Vector((-.08, -.22, .25)) * env, q)
    hand_pose('L', LGRIP, Quaternion())

def bake(name, duration, fn):
    old = bpy.data.actions.get(name)
    if old:
        for track in list(arm.animation_data.nla_tracks):
            if any(strip.action == old for strip in track.strips):
                arm.animation_data.nla_tracks.remove(track)
        bpy.data.actions.remove(old)
    action(name, duration, fn)

bake('Dash_Wide_Slash', 1.25, lambda t: connected_cut(t, dash=True))
bake('Panel_Slash_Left', 1.65, lambda t: connected_cut(t, 'diagonal', 1))
bake('Panel_Slash_Right', 1.65, lambda t: connected_cut(t, 'diagonal', -1))
bake('Slash_Horizontal', 1.7, lambda t: connected_cut(t, 'horizontal'))
bake('Slash_Diagonal', 1.8, lambda t: connected_cut(t, 'diagonal'))
bake('Slash_Rising', 1.8, lambda t: connected_cut(t, 'rising', -1))
bake('Hologram_Conduct_Left', 4.4, lambda t: conduct(t, 1))
bake('Hologram_Conduct_Right', 4.4, lambda t: conduct(t, -1))
bake('Scan_Display', 4.0, lambda t: conduct(t, 1, True))
bake('Guard_Step', 4.2, lambda t: pose(t, walk=.8, phase=t*math.tau, breath=math.sin(t*math.tau)))
bake('Blade_Flourish', 4.8, flourish)
bake('Slow_Sheathe', 3.6, lambda t: pose(t, draw=1-ease(t), breath=math.sin(t*math.pi)))

for name, (act, end) in actions.items():
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.mute = True
    track.strips.new(name, 1, act).frame_end = end

# Validate joint attachment throughout each newly baked action, including extremes.
drift = 0
scene = bpy.context.scene
for act, end in actions.values():
    arm.animation_data.action = act
    for frame in range(1, end + 1):
        scene.frame_set(frame)
        for side in ['L', 'R']:
            drift = max(drift, arm.pose.bones['upper_arm.' + side].location.length)
assert drift < .00001, drift
arm.animation_data.action = bpy.data.actions['Courtyard_Guard']
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'samurai-connected.blend'))
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = arm
arm.animation_data.action = None
pose(0)
bpy.ops.export_scene.gltf(
    filepath=str(ROOT / 'public/assets/models/samurai-sakura.glb'),
    export_format='GLB', use_selection=True, export_animations=True,
    export_animation_mode='ACTIONS', export_force_sampling=True,
    export_frame_range=False, export_def_bones=True, export_skins=True,
    export_image_format='WEBP', export_image_quality=85, export_image_add_webp=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
scene.camera.location = (0, -5, 1.42)
scene.camera.rotation_euler = (Vector((0, 0, 1.42))-scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera.data.ortho_scale = 1.3
scene.render.resolution_x = 780
scene.render.resolution_y = 720
for clip, time in [('Dash_Wide_Slash', .35), ('Dash_Wide_Slash', .65),
                   ('Slash_Diagonal', .45), ('Slash_Rising', .65)]:
    act, end = actions[clip]
    arm.animation_data.action = act
    scene.frame_set(1 + round((end-1)*time))
    scene.render.filepath = str(OUT / f'connected-{clip}-{time}.png')
    bpy.ops.render.render(write_still=True)
(OUT / 'shoulder-repair-report.json').write_text(json.dumps({
    'reweighted_vertices': reweighted, 'max_shoulder_translation_m': drift,
    'clips': [a.name for a in bpy.data.actions], 'rebaked': list(actions),
    'master': 'artifacts/sakura/samurai-connected.blend',
}, indent=2))
print('CONNECTED_RIG_EXPORTED', reweighted, drift)
