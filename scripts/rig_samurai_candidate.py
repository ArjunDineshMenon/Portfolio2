from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "preproduction" / "assets" / "models" / "samurai-girl-web.glb"
OUTPUT = ROOT / "preproduction" / "assets" / "models" / "samurai-girl-rigged-candidate.glb"
REQUIRED = [
    "Idle_Breathing", "Enter_From_Shadow", "Draw_Katana", "Hologram_Slice",
    "Recover_From_Slice", "Walk_Forward_Loop", "Panel_Reveal_Left",
    "Panel_Reveal_Right", "Portal_Brace", "Sheathe_Katana", "Closing_Bow",
]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    raise RuntimeError("No meshes imported")

# Combine the imported pieces while preserving their material slots.
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = "Samurai_Rigged_Body"
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

corners = [body.matrix_world @ Vector(c) for c in body.bound_box]
lo = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
hi = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
cx, cy, h = (lo.x + hi.x) * .5, (lo.y + hi.y) * .5, hi.z - lo.z
sx = max((hi.x - lo.x) * .5, h * .25)

spec = {
    "root": ((cx,cy,lo.z),(cx,cy,lo.z+h*.10),None),
    "pelvis": ((cx,cy,lo.z+h*.46),(cx,cy,lo.z+h*.58),"root"),
    "spine": ((cx,cy,lo.z+h*.58),(cx,cy,lo.z+h*.72),"pelvis"),
    "chest": ((cx,cy,lo.z+h*.72),(cx,cy,lo.z+h*.82),"spine"),
    "neck": ((cx,cy,lo.z+h*.82),(cx,cy,lo.z+h*.89),"chest"),
    "head": ((cx,cy,lo.z+h*.89),(cx,cy,hi.z),"neck"),
    "upper_arm.L": ((cx+sx*.42,cy,lo.z+h*.78),(cx+sx*.75,cy,lo.z+h*.66),"chest"),
    "forearm.L": ((cx+sx*.75,cy,lo.z+h*.66),(cx+sx*.92,cy,lo.z+h*.53),"upper_arm.L"),
    "hand.L": ((cx+sx*.92,cy,lo.z+h*.53),(cx+sx*.98,cy,lo.z+h*.50),"forearm.L"),
    "upper_arm.R": ((cx-sx*.42,cy,lo.z+h*.78),(cx-sx*.75,cy,lo.z+h*.66),"chest"),
    "forearm.R": ((cx-sx*.75,cy,lo.z+h*.66),(cx-sx*.92,cy,lo.z+h*.53),"upper_arm.R"),
    "hand.R": ((cx-sx*.92,cy,lo.z+h*.53),(cx-sx*.98,cy,lo.z+h*.50),"forearm.R"),
    "thigh.L": ((cx+sx*.20,cy,lo.z+h*.48),(cx+sx*.18,cy,lo.z+h*.25),"pelvis"),
    "shin.L": ((cx+sx*.18,cy,lo.z+h*.25),(cx+sx*.18,cy,lo.z+h*.07),"thigh.L"),
    "foot.L": ((cx+sx*.18,cy,lo.z+h*.07),(cx+sx*.18,cy-.10*h,lo.z+h*.02),"shin.L"),
    "thigh.R": ((cx-sx*.20,cy,lo.z+h*.48),(cx-sx*.18,cy,lo.z+h*.25),"pelvis"),
    "shin.R": ((cx-sx*.18,cy,lo.z+h*.25),(cx-sx*.18,cy,lo.z+h*.07),"thigh.R"),
    "foot.R": ((cx-sx*.18,cy,lo.z+h*.07),(cx-sx*.18,cy-.10*h,lo.z+h*.02),"shin.R"),
}

arm_data = bpy.data.armatures.new("Samurai_Armature")
arm = bpy.data.objects.new("Samurai_Armature", arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for name, (head, tail, parent_name) in spec.items():
    bone = arm_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent_name:
        bone.parent = arm_data.edit_bones[parent_name]
bpy.ops.object.mode_set(mode="POSE")
for bone in arm.pose.bones:
    bone.rotation_mode = "XYZ"
bpy.ops.object.mode_set(mode="OBJECT")

# Use real vertex groups and an armature modifier. Automatic weights are used
# first; envelope weights are a fallback for disconnected ornaments.
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
try:
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
except RuntimeError:
    bpy.ops.object.parent_set(type="ARMATURE_ENVELOPE")

# The imported asset is highly fragmented and can defeat Blender's heat solver.
# Ensure a real skinned mesh exists by assigning normalized distance weights to
# the nearest deform bones. This remains inspectable and deformable in glTF.
for modifier in list(body.modifiers):
    body.modifiers.remove(modifier)
for group in list(body.vertex_groups):
    body.vertex_groups.remove(group)
deform_bones = [b for b in arm_data.bones if b.use_deform]
for bone in deform_bones:
    body.vertex_groups.new(name=bone.name)
def distance_to_segment(point, a, b):
    ab = b - a
    if ab.length_squared == 0:
        return (point - a).length
    t = max(0.0, min(1.0, (point - a).dot(ab) / ab.length_squared))
    return (point - (a + t * ab)).length
for vertex in body.data.vertices:
    distances = []
    for bone in deform_bones:
        distances.append((distance_to_segment(vertex.co, bone.head_local, bone.tail_local), bone.name))
    distances.sort(key=lambda item: item[0])
    nearest = distances[:4]
    falloff = max(h * 0.12, 0.001)
    weights = [1.0 / (1.0 + (distance / falloff) ** 2) for distance, _ in nearest]
    total = sum(weights) or 1.0
    for weight, (_, name) in zip(weights, nearest):
        body.vertex_groups[name].add([vertex.index], weight / total, "REPLACE")
modifier = body.modifiers.new(name="Samurai_Armature_Deform", type="ARMATURE")
modifier.object = arm
modifier.use_deform_preserve_volume = True

def set_pose(frame, root=(0,0,0), spine=(0,0,0), head=(0,0,0), left=(0,0,0), right=(0,0,0)):
    bpy.context.scene.frame_set(frame)
    pose = arm.pose.bones
    pose["root"].location = root
    pose["spine"].rotation_euler = spine
    pose["head"].rotation_euler = head
    pose["upper_arm.L"].rotation_euler = left
    pose["forearm.L"].rotation_euler = (left[0]*.35,left[1],left[2])
    pose["upper_arm.R"].rotation_euler = right
    pose["forearm.R"].rotation_euler = (right[0]*.35,right[1],right[2])
    for name in ("root","spine","head","upper_arm.L","forearm.L","upper_arm.R","forearm.R"):
        bone = pose[name]
        bone.keyframe_insert("location", frame=frame)
        bone.keyframe_insert("rotation_euler", frame=frame)

strip_cursor = 1
def make_action(name, length, first, last):
    global strip_cursor
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    set_pose(1, *first)
    set_pose(length, *last)
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, strip_cursor, act)
    strip.frame_end = strip_cursor + length - 1
    strip.use_sync_length = True
    strip_cursor += length + 2
    arm.animation_data.action = None

neutral = ((0,0,0),(0,0,0),(0,0,0),(0,0,0),(0,0,0))
make_action("Idle_Breathing",36,neutral,((0,0,.002),(.025,0,0),(.01,0,0),(0,0,0),(0,0,0)))
make_action("Enter_From_Shadow",30,((-.22,0,-.02),(0,0,0),(0,0,0),(0,0,0),(0,0,0)),neutral)
make_action("Draw_Katana",24,neutral,((0,0,0),(0,0,0),(0,0,0),(.32,-.12,-.4),(-.25,.1,.35)))
make_action("Hologram_Slice",20,neutral,((0,0,0),(.08,0,-.10),(0,-.08,.1),(-.55,.12,-.95),(.45,-.1,.85)))
make_action("Recover_From_Slice",18,((0,0,0),(.08,0,-.10),(0,-.08,.1),(-.55,.12,-.95),(.45,-.1,.85)),neutral)
make_action("Walk_Forward_Loop",32,neutral,((0,0,.025),(0,0,0),(0,0,0),(.18,0,0),(-.18,0,0)))
make_action("Panel_Reveal_Left",22,neutral,((0,0,0),(0,0,.08),(0,0,0),(-.25,.12,-.55),(.12,0,.12)))
make_action("Panel_Reveal_Right",22,neutral,((0,0,0),(0,0,-.08),(0,0,0),(.12,0,.12),(-.25,.12,.55)))
make_action("Portal_Brace",24,neutral,((0,0,0),(-.08,0,0),(0,0,0),(-.15,0,-.25),(.15,0,.25)))
make_action("Sheathe_Katana",18,((0,0,0),(0,0,0),(0,0,0),(-.25,.12,-.55),(.12,0,.12)),neutral)
make_action("Closing_Bow",28,neutral,((0,0,0),(.42,0,0),(.12,0,0),(.10,0,0),(-.10,0,0)))

bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", export_animations=True, export_nla_strips=True, export_def_bones=True)
print("RIG_CANDIDATE", OUTPUT, "bones", len(arm_data.bones), "actions", ",".join(REQUIRED))

