# Blender production procedure

The source under `preproduction/` has no rig. These are derivatives. Its unchanged hash is recorded in `build-report.json`.

1. `scripts/inspect_samurai.py` imports the source, measures parts in world coordinates, bakes the import hierarchy without changing the observed shape, and renders fitting references. The character faces -Y in Blender, Z up, and stands approximately 1.79 m tall.
2. `scripts/build_samurai_rig.py` fits a custom FK skeleton to those landmarks. Skin and clothing share spatial weights at shoulder seams. Limbs use their own joint regions. Head/hair and sword/sheath attachments are rigid. Linear skinning matches glTF.
3. The script authors eleven exact actions at 30 fps. Analytic limb posing produces ordinary editable bone keyframes. The root stays fixed; the website supplies world placement. The bow hinges through pelvis, spine, chest, neck and head while solving feet back to the floor. Weapon sockets inherit the hands.
4. Geometry is reduced to 95,169 triangles. Derivative textures are capped at 1024 pixels and exported as WebP. The script exports Draco GLB, saves the packed master and renders selected action frames.
5. `scripts/verify_samurai_export.py` re-imports the compressed GLB in a clean scene, checks weights/actions/root/attachment/loops/bow and renders the actual export. `npm run assets` copies the derivative for deployment. Node/build/browser checks validate integration.

Run from the project root:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build_samurai_rig.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/verify_samurai_export.py
npm run assets
npm test
npm run build
npm run test:browser
```

## Editing in Blender

Open `samurai-production.blend`. Select `Samurai_Rig`, enter Pose Mode and select an action in the Action Editor. The eleven NLA tracks are intentionally muted while a single action is edited. The master opens with Idle_Breathing active. Actions have fake users so they remain saved. The katana_socket, blade_socket and sheath_socket bones control attachments. There is no runtime IK dependency.

Rerunning the generation script overwrites its generated master; save hand-edited variants under a new filename. For a hand-edited export, select armature and body and export GLB using Actions, skinning, sampling, deform bones, WebP and Draco. Preserve exact action names and verify the derivative before copying to public assets.

Draw/sheath uses stylized blade retraction into the opaque scabbard. Motion capture, individual finger animation, dynamic cloth and dynamic hair are not claimed. These may be refined in the editable master.
