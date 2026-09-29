"""Bake the courtyard dash and ambient interaction loops into the fitted rig."""
import ast
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/sakura'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'artifacts/cinematic/samurai-cinematic.blend'))
arm = bpy.data.objects['Samurai_Rig']
body = bpy.data.objects['Samurai_Skinned_Body_Weapons']
rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
for track in arm.animation_data.nla_tracks:
    track.mute = True
arm.animation_data.action = None
source = ast.parse((ROOT / 'scripts/build_samurai_rig.py').read_text())
functions = {'sat', 'ease', 'world_rotation', 'set_world', 'aim', 'two_link',
             'hand_pose', 'pose', 'mix_poses', 'action'}
assignments = {'spec', 'RGRIP', 'LGRIP', 'blade_axis', 'sheath_axis', 'sheathed_q', 'sheathed_grip'}
nodes = [n for n in source.body if
         (isinstance(n, ast.FunctionDef) and n.name in functions) or
         (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in assignments for t in n.targets))]
exec(compile(ast.Module(body=nodes, type_ignores=[]), 'fitted_helpers', 'exec'))
actions = {}
FPS = 30

def dash_pose(t):
    drive = math.sin(t * math.pi) ** 2
    pose(t, brace=drive * 1.7, walk=drive * 2.0, phase=t * math.tau)
    arc = ease((t - .26) / .48)
    world_rotation('chest', .5 - arc * .95, (0, 0, 1))
    world_rotation('spine', .13 * drive)
    bpy.context.view_layer.update()
    grip = Vector((-.30 + arc * .42, -.36, 1.31 - arc * .18))
    rotation = Quaternion((0, 0, 1), 1.25 - arc * 2.85) @ Quaternion((1, 0, 0), -.18)
    hand_pose('R', grip, rotation)
    hand_pose('L', LGRIP + Vector((.025, -.06, .12)) * drive, Quaternion())

def dash(t):
    if t < .15:
        mix_poses(lambda: pose(0), lambda: dash_pose(.15), ease(t / .15))
    elif t > .85:
        mix_poses(lambda: dash_pose(.85), lambda: pose(0), ease((t - .85) / .15))
    else:
        dash_pose(t)

def conduct(t, side):
    envelope = math.sin(t * math.pi) ** 2
    pose(t, reveal=side * envelope, breath=math.sin(t * math.tau))
    world_rotation('head', side * .16 * envelope, (0, 0, 1))
    world_rotation('chest', side * .12 * envelope, (0, 0, 1))
    bpy.context.view_layer.update()
    # Keep the weapon's hand connected while the opposite arm traces the display.
    hand_pose('L', LGRIP + Vector((.14 * envelope, -.27 * envelope,
              .22 * envelope + .06 * math.sin(t * math.tau) * envelope)), Quaternion())

def flourish(t):
    envelope = math.sin(t * math.pi) ** 2
    pose(t, breath=math.sin(t * math.tau), brace=.15 * envelope)
    world_rotation('chest', math.sin(t * math.tau) * .14, (0, 0, 1))
    bpy.context.view_layer.update()
    grip = RGRIP + Vector((-.09 * envelope, -.20 * envelope, .30 * envelope))
    q = Quaternion((0, 0, 1), math.sin(t * math.tau) * 1.2) @ Quaternion((1, 0, 0), -.4 * envelope)
    hand_pose('R', grip, q)

action('Courtyard_Guard', 4.0, lambda t: pose(t, draw=0, breath=math.sin(t * math.tau)))
action('Dash_Wide_Slash', 1.25, dash)
action('Slow_Sheathe', 3.6, lambda t: pose(t, draw=1-ease(t), breath=math.sin(t*math.pi)))
action('Sheathed_Portal_Entry', 1.8, lambda t: pose(t, draw=0, brace=math.sin(t*math.pi)**2))
action('Hologram_Conduct_Left', 4.4, lambda t: conduct(t, 1))
action('Hologram_Conduct_Right', 4.4, lambda t: conduct(t, -1))
action('Blade_Flourish', 4.8, flourish)

for name, (act, end) in actions.items():
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.mute = True
    track.strips.new(name, 1, act).frame_end = end
arm.animation_data.action = bpy.data.actions['Courtyard_Guard']
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'samurai-sakura.blend'))
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
(OUT / 'animation-report.json').write_text(json.dumps({
    'added': list(actions), 'clips': [a.name for a in bpy.data.actions],
    'master': 'artifacts/sakura/samurai-sakura.blend',
}, indent=2))
print('SAKURA_ACTIONS_EXPORTED', list(actions))
