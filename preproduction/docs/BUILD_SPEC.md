# Single-Camera Portfolio Build Specification

## Creative direction

The experience is a continuous cinematic journey controlled by scroll. The camera never cuts. The world begins in a dark Japanese temple courtyard, passes through a holographic rupture into a Japanese-inspired sci-fi dimension, and returns to the original courtyard for the closing bow.

The face is always a harmless holographic construct. The katana interaction produces light, particles, and spatial distortion only. There is no blood, wound, anatomy, or realistic violence.

## Scroll timeline

| Scroll | Story beat | Visual action | Content |
|---|---|---|---|
| 0–8% | Establishing shot | Slow camera drift into the moonlit courtyard; faint cyan particles wake | Minimal loading/scroll cue |
| 8–17% | Formation | Particles orbit, dance, and converge into the outline of Arjun's face | None |
| 17–23% | Introduction | Hologram stabilizes; the transparent portrait crossfades in | “Hi, I’m Arjun.” / “Aspiring Cloud & DevOps Engineer” |
| 23–32% | Arrival | Samurai emerges from shadow behind the hologram and prepares the katana | One-line bio |
| 32–39% | Slice | Katana crosses the portrait; the image separates into two holographic halves and dissolves into particles | No new copy during the impact |
| 39–47% | Dimension shift | Particles accelerate into a portal; environment blends from temple to sci-fi while camera continues forward | Short transition phrase: “Building beyond localhost.” |
| 47–57% | About | Samurai walks/gestures toward floating information panels | About paragraph and quick facts |
| 57–68% | Skills | Katana light trails reveal grouped skill constellations | Cloud, DevOps, languages, Japanese |
| 68–80% | Projects | Three spatial project monoliths appear; samurai reveals each with a controlled interaction | Three project summaries and tech |
| 80–89% | Roadmap | Camera follows a luminous path through milestone gates | 2026–2032 roadmap, education, certification status |
| 89–95% | Return | Portal contracts; scene transitions back to the exact opening courtyard | “The path continues.” |
| 95–98% | Bow | Samurai sheaths the katana and bows | “Thank you for visiting.” |
| 98–100% | Finale | Camera settles on final composition | Contact CTA, GitHub, LinkedIn, email, resume download |

## Required animation clips

Use these exact clip names in the final rigged GLB so the website can address them reliably:

- `Idle_Breathing` — subtle loop for quiet sections
- `Enter_From_Shadow` — controlled entrance into frame
- `Draw_Katana` — draw and settle into stance
- `Hologram_Slice` — one clean horizontal or diagonal strike
- `Recover_From_Slice` — return to neutral stance
- `Walk_Forward_Loop` — short loop for camera travel sections
- `Panel_Reveal_Left` — restrained left-side gesture or slash
- `Panel_Reveal_Right` — restrained right-side gesture or slash
- `Portal_Brace` — reaction during dimension shift
- `Sheathe_Katana` — prepares the closing beat
- `Closing_Bow` — respectful Japanese bow with a short hold

Each clip should begin and end on compatible poses. Root motion should be removed; website timelines will control world position. The katana should remain parented to the appropriate hand or sheath attachment throughout.

## Content framing

### Identity

**Arjun Dinesh Menon**  
Aspiring Cloud & DevOps Engineer

First-year AI & Data Science student at KGiSL Institute of Technology, building toward a Cloud & DevOps engineering career in Japan.

### About

I’m pursuing a B.Tech in AI & Data Science at KGiSL Institute of Technology, graduating in 2029. My focus is cloud infrastructure and DevOps, and every project I build is intended to move beyond localhost onto real infrastructure. Alongside AWS, Linux, containers, and automation, I study Japanese daily as I work toward a career and postgraduate study in Japan.

Quick facts:

- B.Tech, AI & Data Science — Class of 2029
- KGiSL Institute of Technology, Anna University
- Focus: Cloud Infrastructure & DevOps
- Core stack: AWS, Kubernetes, Terraform
- Direction: work in Japan and pursue MEXT postgraduate study
- Japanese goal: JLPT N3

### Skills

- **Cloud, active:** AWS S3, EC2, IAM, CloudFront
- **Cloud, learning:** Lambda, VPC, Terraform
- **DevOps, active:** Git, GitHub, Linux CLI
- **DevOps, learning:** Docker, Kubernetes, GitHub Actions
- **Languages, active:** Python, HTML, CSS
- **Languages, learning:** Bash, YAML
- **Japanese, active:** Hiragana, Katakana
- **Japanese, learning:** JLPT N5 and N4 material

Keep “active” and “learning” visually distinct. Do not imply mastery or completed certification.

### Projects

1. **Personal Portfolio on AWS S3** — A static portfolio deployed with S3 website hosting, IAM bucket policy, public-access configuration, billing alarms, and MFA. Tech: AWS S3, IAM, HTML/CSS, Git.
2. **Portfolio V2 with CloudFront and HTTPS** — An in-progress upgrade adding a CDN, HTTPS, global distribution, and responsive multi-section design. Tech: CloudFront, S3, HTTPS, DNS.
3. **Cupola Furnace Waste-Heat Recovery System** — A team prototype concept for Coimbatore foundries, using a sensor-to-AWS-to-ML-to-dashboard architecture for energy monitoring. Tech: AWS, sensor architecture, ML pipeline design.

Do not invent repository or live-site URLs. The current source provides only the GitHub profile and leaves the live deployment URL blank.

### Education and roadmap

- 2025–2029: B.Tech in AI & Data Science, KGiSL Institute of Technology; Semester 1 SGPA 8.17, Semester 2 SGPA 8.52; no standing arrears.
- 2026: AWS Cloud Practitioner, JLPT N5, Linux, Git, and initial projects.
- 2027: AWS Solutions Architect Associate, Security+, JLPT N4, Docker, and Kubernetes.
- 2028: CKA, JLPT N3, internship, MEXT preparation, and professor outreach.
- 2029: Graduate.
- 2030: Target MEXT-supported master’s study in Japan.
- 2032: Target Cloud/DevOps role in Japan.

Future certifications and milestones must be labeled “planned,” “target,” or “in progress” exactly as supported by `portfolio_content.md`.

### Closing

**The path continues.**

Open to internship opportunities, cloud project collaboration, and connecting with engineers on a similar path.

CTAs: GitHub, LinkedIn, Email, Download Resume.

## Technical direction for the later build

- React + TypeScript + Vite.
- React Three Fiber, Drei, and Three.js for the 3D scene.
- GSAP ScrollTrigger for one deterministic scroll timeline.
- Custom shader or GPU particles for portrait formation and dissolution; sample particle targets from the portrait alpha mask.
- One persistent Canvas and one persistent perspective camera.
- HTML overlays for accessible portfolio copy; synchronize them with 3D beats.
- Preload critical assets and show real progress.
- Use the Draco loader for `samurai-girl-web.glb`.
- Add a reduced-motion experience that preserves all content and CTAs.
- Add a mobile quality tier with fewer particles, lighter post-processing, and static environment fallbacks.
- Pause rendering when the tab is hidden and clamp device pixel ratio.
- Do not use video for the main sequence; interactions must remain scroll-controlled.

## Performance budgets

- Initial interactive payload target: under 8 MB where possible.
- Load the samurai after the opening shell or stream it behind the loader.
- Desktop target: stable 60 fps on a mid-range discrete GPU.
- Mobile target: stable 30 fps on a modern phone.
- Particle count: adaptive, approximately 15k–60k depending on quality tier.
- Avoid large real-time shadow maps; use baked/contact shadows where possible.

## Acceptance criteria

- The user can scrub forward and backward without broken animation state.
- The camera path contains no visible cuts.
- The face remains recognizable before becoming stylized particles.
- The hologram slice is elegant and non-graphic.
- Every factual claim matches `portfolio_content.md`.
- The resume downloads successfully.
- Keyboard navigation and screen readers can reach all textual content and CTAs.
- Reduced-motion mode presents the same information without intense movement.

