import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Object3D, PropertyBinding, Vector3 } from "three";

const transpile = (file) =>
  ts.transpile(readFileSync(new URL(file, import.meta.url), "utf8"), {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  });
const dataUri = (js) =>
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
const adapter = transpile("../src/animation.ts")
  .replace(
    'from "three"',
    `from ${JSON.stringify(import.meta.resolve("three"))}`,
  )
  .replace(
    'from "./timeline"',
    `from ${JSON.stringify(dataUri(transpile("../src/timeline.ts")))}`,
  );
const { createSamuraiTimeline, REQUIRED_CLIPS, CLIP_CUES } = await import(
  dataUri(adapter)
);
const file = readFileSync(
  new URL("../public/assets/models/samurai-animated.glb", import.meta.url),
);
const jsonLength = file.readUInt32LE(12);
const original = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
const json = structuredClone(original);
const binary = file.subarray(28 + jsonLength);
json.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString("base64")}`;
// Decode the actual exported bone hierarchy and uncompressed animation samplers
// without starting WebGL/Draco. Mesh decoding is covered by the browser suite.
for (const node of json.nodes) {
  delete node.mesh;
  delete node.skin;
}
json.meshes = [];
json.skins = [];
json.images = [];
json.textures = [];
json.materials = [];
delete json.extensionsRequired;
delete json.extensionsUsed;
globalThis.ProgressEvent ??= class ProgressEvent extends Event {
  constructor(type, properties) {
    super(type);
    Object.assign(this, properties);
  }
};
const asset = await new GLTFLoader().parseAsync(JSON.stringify(json), "");
const marker = new Object3D();
marker.isSkinnedMesh = true;
asset.scene.add(marker);
const timeline = createSamuraiTimeline(asset.scene, asset.animations);
const bone = (name) =>
  asset.scene.getObjectByName(PropertyBinding.sanitizeNodeName(name));
const snapshot = (p) => {
  timeline.sample(p);
  asset.scene.updateMatrixWorld(true);
  return json.nodes
    .filter((n) => n.name && bone(n.name))
    .map((n) => bone(n.name).matrixWorld.elements.slice());
};

test("deployed asset has a real skin, exact clips, Draco/WebP and web payload", () => {
  assert.ok(original.skins.length > 0);
  assert.deepEqual(
    asset.animations.map((a) => a.name).sort(),
    [...REQUIRED_CLIPS].sort(),
  );
  assert.equal(timeline.ready, true);
  assert.ok(file.length < 5_000_000);
  assert.ok(original.extensionsRequired.includes("KHR_draco_mesh_compression"));
  assert.ok(original.images.every((i) => i.mimeType === "image/webp"));
  for (const clip of asset.animations)
    assert.ok(clip.duration > 0.8 && clip.tracks.length >= 60);
});
test("actual exported bone poses are identical on forward/reverse scrubbing and jumps", () => {
  const samples = Array.from({ length: 501 }, (_, i) => i / 500);
  const forward = samples.map(snapshot);
  for (let i = samples.length - 1; i >= 0; i--)
    assert.deepEqual(snapshot(samples[i]), forward[i]);
  for (const p of [0.35, 0.971, 0.28, 0.82, 0.49, 0.35])
    assert.deepEqual(snapshot(p), snapshot(p));
});
test("bow articulates the upper body, holds feet and preserves the sheathed finale", () => {
  timeline.sample(0.963);
  asset.scene.updateMatrixWorld(true);
  const head = bone("head").getWorldPosition(new Vector3());
  const feet = ["foot.L", "foot.R"].map((n) =>
    bone(n).getWorldPosition(new Vector3()),
  );
  timeline.sample(0.9715);
  asset.scene.updateMatrixWorld(true);
  assert.ok(bone("head").getWorldPosition(new Vector3()).y < head.y - 0.07);
  feet.forEach((v, i) =>
    assert.ok(
      v.distanceTo(
        bone(["foot.L", "foot.R"][i]).getWorldPosition(new Vector3()),
      ) < 0.03,
    ),
  );
  assert.ok(bone("blade_socket").scale.y < 0.01);
  timeline.sample(1);
  assert.ok(bone("blade_socket").scale.y < 0.01);
});
test("clip transitions are bounded and incomplete assets remain isolated", () => {
  for (const cue of CLIP_CUES.slice(1)) {
    if (cue.start >= 0.98) continue;
    const before = snapshot(cue.start - 1e-7),
      after = snapshot(cue.start + 1e-7);
    const jump = Math.max(
      ...before.flatMap((m, i) => m.map((v, j) => Math.abs(v - after[i][j]))),
    );
    assert.ok(jump < 0.01, `${cue.name}: ${jump}`);
  }
  const incomplete = createSamuraiTimeline(new Object3D(), []);
  assert.equal(incomplete.ready, false);
  assert.equal(incomplete.missing.length, 11);
  assert.doesNotThrow(() => incomplete.sample(0.971));
  incomplete.dispose();
});
