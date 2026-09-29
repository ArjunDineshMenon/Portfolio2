import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";

const input = "preproduction/assets";
await mkdir("public/assets/images", { recursive: true });
await mkdir("public/assets/models", { recursive: true });
await mkdir("public/assets/documents", { recursive: true });
await mkdir("public/draco", { recursive: true });
for (const name of ["japanese-night-environment", "scifi-portal-environment"]) {
  await sharp(`${input}/images/${name}.png`)
    .webp({ quality: 88 })
    .toFile(`public/assets/images/${name}.webp`);
}
// The lossless RGBA derivative preserves the portrait alpha mask and identity.
await sharp(`${input}/images/arjun-face-cutout.png`)
  .resize({ width: 768 })
  .webp({ lossless: true })
  .toFile("public/assets/images/arjun-face-cutout.webp");
await copyFile(
  "artifacts/rigging/samurai-animated.glb",
  "public/assets/models/samurai-animated.glb",
);
await copyFile(
  "artifacts/cinematic/samurai-cinematic.glb",
  "public/assets/models/samurai-cinematic.glb",
);
await copyFile(
  `${input}/documents/Arjun-Dinesh-Menon-Resume.docx`,
  "public/assets/documents/Arjun-Dinesh-Menon-Resume.docx",
);
for (const name of [
  "draco_decoder.wasm",
  "draco_wasm_wrapper.js",
  "draco_decoder.js",
]) {
  await copyFile(
    `node_modules/three/examples/jsm/libs/draco/gltf/${name}`,
    `public/draco/${name}`,
  );
}
console.log(
  "Prepared web derivatives, original sources untouched. Draco decoder is self-hosted.",
);
