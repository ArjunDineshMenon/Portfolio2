# Prompt for GPT-6 Astra

Build the complete portfolio website in this folder using the prepared preproduction package. Read these files first:

1. `preproduction/README.md`
2. `preproduction/docs/BUILD_SPEC.md`
3. `preproduction/docs/ASSET_MANIFEST.md`
4. `portfolio_content.md`

Use the prepared assets under `preproduction/assets/`. Preserve all source files. Create a polished, responsive, production-quality React + TypeScript + Vite experience with React Three Fiber, Drei, Three.js, and GSAP ScrollTrigger.

The experience must be one continuous camera shot controlled by scroll. Follow the scroll timeline and content wording in `BUILD_SPEC.md`. Begin in the dark Japanese courtyard, form Arjun’s head from holographic particles, reveal the portrait and “Hi, I’m Arjun,” introduce the samurai, perform a non-graphic hologram slice, transition through accelerated particles into the sci-fi dimension, reveal all portfolio sections through samurai interactions, then return to the courtyard for the bow and final contact page.

Important model constraint: `preproduction/assets/models/samurai-girl-web.glb` is optimized and verified but has no armature or animation clips. Do not claim that it contains skeletal animation. Before implementing the final sword strike and bow, either rig it properly and export the exact clips listed in `BUILD_SPEC.md`, or replace it with a user-approved rigged model. Until that dependency is resolved, use clearly isolated placeholder timeline hooks for the clip names so the site architecture remains ready for the animated GLB.

Use the transparent portrait as both the visible face texture and the alpha target for GPU particles. Use the prepared environment images as visual direction and layered backdrops; add restrained 3D foreground geometry, fog, particles, and lighting to create depth. Keep the actual portfolio text as accessible HTML rather than baking text into the WebGL scene.

Implement adaptive quality, asset preloading with progress, reduced-motion support, keyboard-accessible controls and links, responsive layouts, mobile fallbacks, robust reverse scrolling, and graceful WebGL failure handling. Keep facts faithful to `portfolio_content.md`, and mark planned certifications and future goals accurately. Make `preproduction/assets/documents/Arjun-Dinesh-Menon-Resume.docx` downloadable.

Do not invent project URLs, certifications, experience, metrics, or claims. Do not introduce gore or realistic injury. Do not create camera cuts. Validate the production build and inspect the main experience at desktop and mobile sizes before finishing.

