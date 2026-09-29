# Cinematic production files

Open `samurai-cinematic.blend` in Blender to edit the fitted rig and sixteen named actions. This is the editable master used by the current website. The original supplied static model and earlier production master are preserved.

`scripts/extend_cinematic_actions.py` opens the base master and adds:

- `Panel_Slash_Left` / `Panel_Slash_Right`: articulated shoulder, elbow, chest and head actions; neutral endpoints.
- `Walk_Travel_Loop`: an in-place travel gait. The website controls position along the continuous route.
- `Portal_Entry` / `Portal_Landing`: bracing and landing actions for both dimension changes.

The eleven BUILD_SPEC actions remain present. Export uses sampled actions, skins, Draco compression and embedded WebP textures. The deployment asset is 3,455,076 bytes. Use `npm run assets` after exporting to copy the model into `public/assets/models/`.

Run the independent check with:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/verify_samurai_export.py -- --cinematic
```

`export-verification.json` records the clean GLB re-import checks: sixteen clips, twenty joints, no unweighted vertices, no clip root translation, compatible endpoints, and attached weapons. Bow head-joint drop is 0.111 m with maximum foot drift of 0.0153 m. Rendered strike and bow views are adjacent PNG files.

`src/director.ts` controls camera routes, character translation/yaw and the fourteen information stations. `src/movieAnimation.ts` samples clip time directly from scroll, making forward, reverse and instant navigation deterministic. Camera and actor paths are tested at every station and portal boundary. Environmental wind moves in real time; narrative action is tied to scroll.

To change pacing, edit each station's `start`/`end`, retaining the major BUILD_SPEC story boundaries. Each station contains travel, an opening strike, a stationary reading interval and an exit strike. The text halves and 3D shards follow the exit strike. Text stays accessible HTML, and the reading view retains the complete portfolio without WebGL.

Animations are procedurally authored and baked, with a stylized blade insertion during sheathing. The rig does not include cloth/hair simulation or motion capture.
