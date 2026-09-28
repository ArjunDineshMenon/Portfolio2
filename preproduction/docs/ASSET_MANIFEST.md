# Asset Manifest

## Source files

| File | Purpose | Status |
|---|---|---|
| `../../portfolio_content.md` | Source of truth for portfolio facts and links | Ready |
| `../../Arjun_Dinesh_Menon_Resume.docx` | Original resume | Ready |
| `../../faceimage(backgroundnotremoved).jpeg` | Original portrait source | Preserved |
| `../../samurai_girl.glb` | Original full-detail samurai model | Preserved; static and unrigged |

## Prepared assets

| File | Purpose | Details |
|---|---|---|
| `../assets/images/arjun-face-cutout.png` | Hologram portrait and particle source | Transparent PNG, head only, 1120 × 1405 |
| `../assets/images/japanese-night-environment.png` | Opening and closing environment | 16:9 PNG, 1672 × 941 |
| `../assets/images/scifi-portal-environment.png` | Middle-act sci-fi environment | 16:9 PNG, 1672 × 941 |
| `../assets/models/samurai-girl-web.glb` | Web model candidate | Draco GLB, 279,910 triangles, 12.9 MB, static/unrigged |
| `../assets/models/samurai-girl-web-preview.png` | Visual inspection render | Confirms the optimized model imports and renders |
| `../assets/documents/Arjun-Dinesh-Menon-Resume.docx` | Downloadable resume | Exact copy of supplied resume |

## Image-generation record

The three prepared PNGs were created with the built-in image generation tool.

### Face cutout

Use case: `background-extraction`. The source portrait was treated as the edit target. The background and neck were removed; the output was constrained to preserve identity, expression, hair, lighting, colors, proportions, and fine edges, with genuine alpha transparency and no retouching or added effects.

### Japanese environment

Use case: `stylized-concept`. A cinematic moonlit Japanese temple courtyard was created with an open central path, dark negative space, layered depth, indigo and charcoal tones, restrained cyan holographic motes, and warm lantern accents. It contains no characters or text.

### Sci-fi environment

Use case: `stylized-concept`. A futuristic chamber was created with Japanese architectural echoes, an open central stage, calm text zones, holographic structures, and a matching indigo/cyan/amber palette. It contains no characters or text.

## Model preparation record

`preproduction/blender/prepare_web_model.py` imports the original GLB, decimates complex meshes non-destructively, and exports a Draco level 6 GLB. The original model remains unchanged.

`preproduction/blender/render_model_preview.py` creates the inspection render. Both scripts are reproducible with Blender 5.2.

