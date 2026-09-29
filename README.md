# Arjun — A journey beyond localhost

A scroll-directed 3D film and accessible portfolio, built with React, TypeScript, Vite, React Three Fiber, Drei, Three.js, and GSAP ScrollTrigger. Source content, images, static model and resume are preserved.

The camera travels through the courtyard, portrait formation, hologram strike, particle tunnel, fourteen information stations, return portal and closing bow. The samurai walks between stations, opens information with a sword strike, then slices it into drifting holographic fragments. Text remains real HTML attached to the scene and holds still while being read. The full reading layout is available at any point.

Open `/?mode=3d` to launch the animated experience explicitly, including when the browser reports a reduced-motion preference. The normal `/` entry respects that preference and offers an enabled “Play 3D experience” button. `/?mode=read` opens the reading layout. WebGL or model failures still switch to reading view.

## Run

Requires Node.js 22.12+ or 24 LTS and npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. All assets, fonts and Draco decoders are self-hosted. There are no API keys, backend services, analytics, remote font requests or fabricated project links. The relative Vite base supports subdirectory deployment.

## Blender rig and animation

The supplied `preproduction/assets/models/samurai-girl-web.glb` still has **no armature or animation clips** and remains unchanged. The website uses `public/assets/models/samurai-cinematic.glb`, rigged and animated using the installed Blender 5.2.2 LTS. No replacement model or MCP installation was needed.

The current editable master is `artifacts/cinematic/samurai-cinematic.blend`. It extends the preserved `artifacts/rigging/samurai-production.blend` with stronger left/right strikes, a travel gait, portal entry and landing. It includes all eleven exact actions from BUILD_SPEC.md plus five new actions. The fitted skeleton has material-aware body/limb weights and rigid weapon sockets. The export has 20 joints, 95,169 triangles, Draco geometry, WebP textures and a 3.46 MB payload. Animations are procedurally authored and baked at 30 fps. The stylized draw/sheath retracts the blade into the opaque scabbard. Hair and cloth are skinned without physics simulation.

To reproduce the production procedure in PowerShell:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build_samurai_rig.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/extend_cinematic_actions.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/verify_samurai_export.py -- --cinematic
npm run assets
npm test
npm run build
npm run test:browser
```

The Blender commands create the base rig, extend the cinematic actions, and independently re-import the compressed GLB to check skinning, exact clips, root motion, attachment, loop boundaries and bow foot drift. The remaining commands prepare deployment derivatives and validate the website. See [the rigging procedure](artifacts/rigging/README.md) and [cinematic production notes](artifacts/cinematic/README.md).

The scroll adapter samples actual clips deterministically, blends short boundaries, loops the gait and retains the sheathed pose after the bow. It validates skinning and every referenced action. Character loading failures switch to reading view.

## Structure

- `src/App.tsx`: accessible HTML, navigation, real image decode progress, reading mode and the single GSAP ScrollTrigger timeline.
- `src/MovieScene.tsx`: persistent Canvas/camera, animated character, bone-driven sword trail and adaptive rendering.
- `src/director.ts`: continuous camera/actor routes, fourteen stations, action cues and deterministic scroll channels.
- `src/movieAnimation.ts`: validated rig interface and deterministic clip sampler.
- `src/MoviePortrait.tsx`: alpha/brightness-sampled GPU portrait particles, visible face, holographic split and accelerating dissolution.
- `src/MovieWorld.tsx`: layered backdrops, gates, lanterns, wet stone reflections, sci-fi architecture, wind, leaves and fog.
- `src/MovieEffects.tsx`: portal tunnel, energy surfaces and fragment bursts.
- `src/CinematicCards.tsx`: accessible world-positioned HTML, sword-driven reveals and split text surfaces.
- `src/timeline.ts`: specification story boundaries and reading-layout section mapping.
- `src/content.ts`: source-faithful skills, projects, roadmap, certification status and contact destinations.
- `src/styles.css` and `src/cinematic.css`: responsive reading/stage layouts, local fonts, focus, reduced-motion and print styles.
- `public/assets/`: deployable derivatives, animated GLB and exact resume copy.
- `scripts/prepare-assets.mjs`: reproducible image optimization and copying of the verified animated export.
- `scripts/build_samurai_rig.py`, `scripts/extend_cinematic_actions.py`, `scripts/verify_samurai_export.py`: Blender creation and independent round-trip QA.
- `artifacts/rigging/` and `artifacts/cinematic/`: editable masters, exports, QA images and reports.

## Quality and accessibility

Desktop uses 40,000 alpha-sampled particles; mobile and lower-performance devices use 15,000. DPR is capped at 1.6 or 1.1 in the low tier. Sustained low frame rate selects the low tier. The low tier also reduces leaves/dust and disables antialiasing. Rendering pauses while the tab is hidden. Reflections use an environment projection shader; no reflection render pass or large shadow map is needed.

Prepared images total approximately 1.16 MB. The 3.46 MB animated model loads after the opening shell, with actual loading progress. Physical-device frame-rate budgets remain targets, not guarantees.

Reduced motion defaults to the full reading layout and skips WebGL/model downloads until the visitor explicitly chooses 3D. “Read portfolio” also selects it. The chosen mode is reflected in the URL for reloads and direct launch links. Semantic HTML preserves all facts and CTAs. The mobile menu supports keyboard/Escape. Mobile cinematic panels have internal scrolling and keyboard focus. WebGL and character loading failures preserve the reading view. The downloadable resume is byte-for-byte identical to the prepared DOCX.

Future credentials retain their supplied In progress/Planned labels and target dates. No certification is represented as earned.

## Verify

```sh
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

Node tests sample the actual exported bone hierarchy through Three.js to verify reverse scrubbing, camera/actor continuity, stationary reading holds, clip transitions, sword movement, bow/feet and the sheathed finale. Browser tests cover desktop/mobile stations, downloads, keyboard controls, reduced motion, failure handling and axe audits. Screenshots are in `test-results/` and `artifacts/cinematic/web/`. See [VALIDATION.md](VALIDATION.md).
