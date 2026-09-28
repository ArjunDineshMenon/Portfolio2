"""Create a non-destructive web-ready GLB variant from the supplied static model.

Run with Blender in background mode. The original GLB is never modified.
"""

from pathlib import Path
import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "samurai_girl.glb"
OUTPUT = ROOT / "preproduction" / "assets" / "models" / "samurai-girl-web.glb"
TARGET_TRIANGLES = 280_000


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def triangle_count(objects) -> int:
    total = 0
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


clear_scene()
bpy.ops.import_scene.gltf(filepath=str(SOURCE))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
source_triangles = triangle_count(meshes)
ratio = min(1.0, TARGET_TRIANGLES / max(source_triangles, 1))

for obj in meshes:
    if len(obj.data.polygons) < 500:
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name="Web_Decimate", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

export_args = {
    "filepath": str(OUTPUT),
    "export_format": "GLB",
    "export_apply": True,
    "export_yup": True,
    "export_materials": "EXPORT",
}

try:
    bpy.ops.export_scene.gltf(
        **export_args,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    compression = "Draco level 6"
except TypeError:
    bpy.ops.export_scene.gltf(**export_args)
    compression = "standard GLB"

final_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
final_triangles = triangle_count(final_meshes)
print(
    f"WEB_MODEL source_triangles={source_triangles} "
    f"final_triangles={final_triangles} ratio={ratio:.4f} "
    f"compression={compression} output={OUTPUT}"
)
