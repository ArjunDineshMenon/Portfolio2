# Portfolio V2 Preproduction Package

This folder contains the production-ready inputs for building the portfolio. It intentionally contains no website scaffold, components, dependencies, or runtime code.

## Ready

- Transparent head-only portrait for the hologram sequence.
- Matching Japanese night and science-fiction environment backdrops.
- Optimized, Draco-compressed samurai GLB for web use.
- Verified downloadable resume copy.
- Storyboard, scroll timing, content framing, interaction rules, and performance targets.
- A prompt that can be given directly to GPT-6 Astra.

## Blocking animation dependency

The supplied `samurai_girl.glb` is a static model. Blender reports:

- 100 mesh objects
- 1,116,206 triangles in the original
- 53 materials and 17 embedded textures
- no armature
- no bones
- no animation clips

The optimized copy preserves the static pose at 279,910 triangles and 12.9 MB. It cannot perform a believable sword strike or bow until it is rigged. A production build should use either:

1. A properly rigged replacement GLB with named animation clips, or
2. This model after manual rigging and skinning in Blender.

Required clip names are documented in `docs/BUILD_SPEC.md`.

## Start here

Give `docs/ASTRA_HANDOFF_PROMPT.md` to Astra and point it to this project folder. The prompt tells Astra what to build and which files to use.

