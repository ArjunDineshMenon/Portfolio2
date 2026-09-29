# Build validation

Verified locally on September 29, 2026. Source content and prepared assets remain preserved.

## Blender production export

- Installed Blender 5.2.2 LTS ran `scripts/build_samurai_rig.py`; no MCP server or replacement character was needed.
- Original static GLB SHA-256 remains `86947fcec6761fa25e0feb9f88eaf92abb2cbd3fe0ca3c21969c233f6f5044e8`.
- Current editable master: `artifacts/cinematic/samurai-cinematic.blend`. Derivative: `artifacts/cinematic/samurai-cinematic.glb`, copied to `public/assets/models/samurai-cinematic.glb`. The earlier production master and export are preserved under `artifacts/rigging/`.
- Master: 21 bones, including the non-deforming root. Export: 20 joints and one skinned mesh, partitioned by materials.
- All eleven exact BUILD_SPEC actions exported, plus `Panel_Slash_Left`, `Panel_Slash_Right`, `Walk_Travel_Loop`, `Portal_Entry`, and `Portal_Landing`.
- 95,169 triangles; 3,455,076 bytes; Draco geometry and sixteen embedded WebP textures. Deployment model SHA-256: `7dcc51ecda2ce5ec65caf7ac16490c266996a1ab71b4da3fef36d5f7d45d73e0`.
- Clean Blender round-trip: exact clips, zero unweighted vertices, finite bone matrices, no clip root translation, socket attachment and compatible loop/neutral endpoints passed.
- Bow: head-joint drop 0.111 m; maximum foot drift 0.0153 m. No whole-object tilt substitutes for skeletal articulation.
- Front/side export renders and new strike/travel/portal action frames inspected. The final clean re-import report is `artifacts/cinematic/export-verification.json`; the action inventory is `artifacts/cinematic/animation-report.json`.

The original `samurai-girl-web.glb` remains static. The earlier `samurai-girl-rigged-candidate.glb` is a rejected experiment retained for inspection and never deployed. The new rig fixes its import-transform mismatch and uses fitted anatomical weight regions. Animations are procedurally authored FK actions, not motion capture. Blade insertion is stylized; hair/cloth physics are not simulated.

## Website checks

- Strict TypeScript check and Vite production build passed.
- Thirteen Node tests passed: actual exported animation sampling, forward/reverse pose determinism, camera/actor continuity at station and portal boundaries, stationary reading holds, blade/chest movement, bow/feet, sheathed finale and story invariants.
- Nine Chromium production browser tests passed across the full suite and focused correction runs: loaded rig, desktop/mobile story beats, all fourteen stations, reverse travel, panel positioning, links/resume, mobile keyboard menu, navigation focus, reduced motion, WebGL context loss/startup failure and character download failure.
- Desktop 1440 × 960 and mobile 390 × 844 cinematic layouts visually inspected, including portrait, sword strike, panel breakup, travel, bow and contact. Bounds also checked at 800 × 900, 844 × 390 and 320 × 568. Mobile panels scroll internally and support keyboard focus.
- Reading and cinematic axe audits have zero violations in tested desktop/mobile layouts. Automated checks do not replace a full assistive-technology audit.
- Initial reduced motion skips GLB downloads and preserves every portfolio section. Failure routes retain semantic HTML and contact links.
- Exact prepared resume downloads successfully. Both copies have SHA-256 `AC3BCD6B3A1AE5445287184F706076169E0CDB7F5032DE65F74994963F090650`.

The cinematic layout has one persistent camera, a scroll-sampled skeleton and fourteen sword-driven information stations. The reading holds do not move upward with the page. Wind, leaves, dust and fog supply ambient movement; alpha/brightness-sampled GPU particles form the face. Wet-ground environment reflections use a shader, without an extra reflection render pass.

## Explicit 3D launch correction

The browser's reduced-motion preference previously forced reading view and disabled the mode button. It now defaults to reading view with an explanation and an enabled “Play 3D experience” button. The `/?mode=3d` launch URL explicitly selects the animated scene; `/?mode=read` selects the reading layout. Failed WebGL/model loading still activates the HTML fallback.

The corrected production build passed. Four targeted browser checks passed: mobile reduced-motion switching and axe audit, initial reduced-motion with no GLB downloads, keyboard opt-in to 3D and return/reload in reading mode, and the direct 3D URL with reduced motion enabled. Both opt-in paths loaded `samurai-cinematic.glb`, displayed `Draw_Katana` during the entrance, and displayed the samurai in the sci-fi information scene without JavaScript or shader errors. Launch screenshots are `artifacts/cinematic/web/launch-direct-samurai.png` and `launch-direct-scifi.png`.

Application JS/CSS is approximately 1.41 MB uncompressed, images approximately 1.16 MB and the deferred model 3.46 MB. Physical-device frame-rate targets are not certified across target hardware; adaptive quality, DPR caps and hidden-tab suspension are implemented. No unsupported credentials, project URLs or deployment claims were added. The site is built locally and has not been published to external hosting.
