import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Object3D, Vector3, PropertyBinding } from "three";

const uri = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const transpile = (file) =>
  ts.transpile(readFileSync(new URL(file, import.meta.url), "utf8"), {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  });
const timeline = uri(transpile("../src/timeline.ts"));
const director = uri(
  transpile("../src/director.ts").replace(
    /from ['"]\.\/timeline['"]/g,
    `from '${timeline}'`,
  ),
);
const samplerModule = uri(
  transpile("../src/movieAnimation.ts")
    .replace(/from ['"]three['"]/g, `from '${import.meta.resolve("three")}'`)
    .replace(/from ['"]\.\/director['"]/g, `from '${director}'`)
    .replace(/from ['"]\.\/timeline['"]/g, `from '${timeline}'`),
);
const { direct, INFO_SHOTS, MOVIE_CUES } = await import(director);
const { createMovieSampler } = await import(samplerModule);

test("one continuous camera and actor route, including phone portals and station changes", () => {
  const boundaries = [
    0,
    0.08,
    0.17,
    0.23,
    0.28,
    0.32,
    0.39,
    0.43,
    0.444,
    0.47,
    0.89,
    0.913,
    0.929,
    0.94,
    0.95,
    0.962,
    0.982,
    1,
    ...INFO_SHOTS.flatMap((s) => [s.start, s.end]),
  ];
  for (const mobile of [false, true])
    for (const p of boundaries) {
      const before = direct(p - 1e-7, mobile),
        after = direct(p + 1e-7, mobile);
      for (const key of ["camera", "look", "actor"])
        assert.ok(
          new Vector3(...before[key]).distanceTo(new Vector3(...after[key])) <
            0.002,
          `${mobile ? "mobile" : "desktop"} ${key} jump at ${p}`,
        );
      assert.ok(Math.abs(before.yaw - after.yaw) < 0.002, `yaw at ${p}`);
    }
});
test("all fourteen information stations reveal after the strike and hold still for reading", () => {
  assert.equal(INFO_SHOTS.length, 14);
  assert.equal(INFO_SHOTS.filter((s) => s.kind === "project").length, 3);
  assert.equal(INFO_SHOTS.filter((s) => s.kind === "skills").length, 4);
  INFO_SHOTS.forEach((s, i) => {
    const at = (t) => direct(s.start + (s.end - s.start) * t);
    assert.equal(at(0.3).reveal, 0);
    assert.equal(at(0.65).reveal, 1);
    assert.equal(at(0.65).dissolve, 0);
    assert.ok(at(0.95).dissolve > 0.5);
    assert.deepEqual(at(0.55).camera, at(0.85).camera);
    assert.deepEqual(at(0.55).anchor, at(0.85).anchor);
    if (i) assert.equal(s.start, INFO_SHOTS[i - 1].end);
  });
  const samples = Array.from({ length: 1001 }, (_, i) => direct(i / 1000));
  for (let i = 1000; i >= 0; i--)
    assert.deepEqual(direct(i / 1000), samples[i]);
});

const file = readFileSync(
  new URL("../public/assets/models/samurai-sakura.glb", import.meta.url),
);
const length = file.readUInt32LE(12),
  original = JSON.parse(file.subarray(20, 20 + length).toString());
const json = structuredClone(original);
json.buffers[0].uri = `data:application/octet-stream;base64,${file.subarray(28 + length).toString("base64")}`;
for (const node of json.nodes) {
  delete node.mesh;
  delete node.skin;
}
for (const key of ["meshes", "skins", "images", "textures", "materials"])
  json[key] = [];
delete json.extensionsRequired;
delete json.extensionsUsed;
globalThis.ProgressEvent ??= class extends Event {
  constructor(type, properties) {
    super(type);
    Object.assign(this, properties);
  }
};
const asset = await new GLTFLoader().parseAsync(JSON.stringify(json), "");
const marker = new Object3D();
marker.isSkinnedMesh = true;
asset.scene.add(marker);
const sampler = createMovieSampler(asset.scene, asset.animations);
const bone = (name) =>
  asset.scene.getObjectByName(PropertyBinding.sanitizeNodeName(name));
const snapshot = (p) => {
  sampler.sample(p);
  asset.scene.updateMatrixWorld(true);
  return json.nodes
    .filter((n) => n.name && bone(n.name))
    .flatMap((n) => bone(n.name).matrixWorld.elements.slice());
};

test("deployed cinematic model contains a skin and twenty-eight exported bone animations", () => {
  assert.equal(sampler.ready, true);
  assert.ok(original.skins.length > 0);
  assert.equal(asset.animations.length, 28);
  for (const name of [
    "Walk_Travel_Loop",
    "Panel_Slash_Left",
    "Panel_Slash_Right",
    "Portal_Entry",
    "Portal_Landing",
    "Closing_Bow",
    "Dash_Wide_Slash",
    "Slow_Sheathe",
    "Hologram_Conduct_Left",
    "Hologram_Conduct_Right",
    "Blade_Flourish",
    "Slash_Horizontal",
    "Slash_Diagonal",
    "Slash_Rising",
    "Scan_Display",
    "Guard_Step",
  ])
    assert.ok(asset.animations.find((c) => c.name === name));
  assert.ok(file.length < 5_000_000);
  assert.ok(original.extensionsRequired.includes("KHR_draco_mesh_compression"));
  assert.ok(original.images.every((i) => i.mimeType === "image/webp"));
  assert.ok(
    asset.animations.every((c) => c.tracks.length >= 60 && c.duration > 0.8),
  );
});

test("opening silhouettes stay separated and the portrait bursts only at the end of sheathing", () => {
  for (const mobile of [false, true]) {
    const d = direct(.22, mobile);
    assert.ok(Math.abs(d.actor[0] - d.faceX) > 2);
    assert.ok(d.actor[2] >= 0);
    assert.ok(d.faceScale > (mobile ? .83 : 1));
    assert.ok(d.actorOpacity > .9);
  }
  assert.ok(direct(.335).actor[0] > 2.5);
  assert.ok(direct(.36).actor[0] < -2.5);
  assert.equal(direct(.4).faceBurst, 0);
  assert.equal(direct(.4).warp, 0);
  assert.equal(direct(.4).scifi, 0);
  assert.ok(direct(.429).faceBurst > 0);
  assert.equal(direct(.48).scifi, 1);
});

test("reading gestures animate with elapsed time while story actions remain scroll controlled", () => {
  const sample = (p, time) => {
    sampler.sample(p, time);
    return bone("hand.L").quaternion.toArray();
  };
  assert.notDeepEqual(sample(.505, 0), sample(.505, 1.1));
  assert.deepEqual(sample(.35, 0), sample(.35, 1.1));
  sampler.dispose();
  sampler.activate();
  assert.notDeepEqual(sample(.505, 0), sample(.505, 1.1));
});
test("actual cinematic poses reverse exactly and remain continuous at every action boundary", () => {
  const samples = Array.from({ length: 1001 }, (_, i) => i / 1000),
    forward = samples.map(snapshot);
  for (let i = 1000; i >= 0; i--)
    assert.deepEqual(snapshot(samples[i]), forward[i]);
  for (const cue of MOVIE_CUES.slice(1)) {
    const a = snapshot(cue.start - 1e-7),
      b = snapshot(cue.start + 1e-7);
    assert.ok(
      Math.max(...a.map((n, i) => Math.abs(n - b[i]))) < 0.01,
      `${cue.name} at ${cue.start}`,
    );
  }
});
test("new panel strikes move the sword and torso; the closing bow plants the feet", () => {
  const s = INFO_SHOTS[0],
    a = s.start + (s.end - s.start) * 0.32,
    b = s.start + (s.end - s.start) * 0.41;
  snapshot(a);
  const tip = bone("blade_socket").getWorldPosition(new Vector3());
  const chest = bone("chest").matrixWorld.clone();
  snapshot(b);
  assert.ok(
    tip.distanceTo(bone("blade_socket").getWorldPosition(new Vector3())) > 0.05,
  );
  assert.notDeepEqual(chest.elements, bone("chest").matrixWorld.elements);
  snapshot(0.962);
  const head = bone("head").getWorldPosition(new Vector3()),
    feet = ["L", "R"].map((s) =>
      bone(`foot.${s}`).getWorldPosition(new Vector3()),
    );
  snapshot(0.972);
  assert.ok(bone("head").getWorldPosition(new Vector3()).y < head.y - 0.07);
  feet.forEach((foot, i) =>
    assert.ok(
      foot.distanceTo(
        bone(`foot.${["L", "R"][i]}`).getWorldPosition(new Vector3()),
      ) < 0.03,
    ),
  );
  snapshot(1);
  assert.ok(bone("blade_socket").scale.y < 0.01);
});

test("sword actions keep both shoulder joints attached and sci-fi stations use five different cuts", () => {
  const names = new Set(MOVIE_CUES.filter(c => c.start >= .47 && c.end <= .89 && c.name.includes('Slash')).map(c=>c.name));
  assert.equal(names.size, 5);
  const active = MOVIE_CUES.filter(c=>c.name.includes('Slash'));
  for (const side of ['L','R']) {
    snapshot(0);
    const shoulder = bone(`upper_arm.${side}`).position.clone();
    for (const cue of active) for (let i=0; i<=20; i++) {
      sampler.sample(cue.start + (cue.end-cue.start)*i/20);
      assert.ok(shoulder.distanceTo(bone(`upper_arm.${side}`).position)<.00001,
        `${cue.name}: ${side} shoulder translated away from its attachment`);
    }
  }
});
