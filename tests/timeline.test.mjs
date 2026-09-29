import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Transpile the actual source so timeline invariants do not mirror a second implementation.
const source = readFileSync(
  new URL("../src/timeline.ts", import.meta.url),
  "utf8",
);
const js = ts.transpile(source, {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
});
const { beats, sceneState } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

test("story covers 0–100% continuously with exact spec boundaries", () => {
  assert.equal(beats[0].start, 0);
  assert.equal(beats.at(-1).end, 1);
  beats.forEach((beat, i) => {
    assert.ok(beat.end > beat.start);
    if (i) assert.equal(beat.start, beats[i - 1].end);
  });
  assert.deepEqual(
    beats.map((b) => b.start),
    [0, 0.08, 0.17, 0.23, 0.32, 0.39, 0.47, 0.57, 0.68, 0.8, 0.89, 0.95, 0.98],
  );
});
test("forward and reverse samples have identical scene state", () => {
  const forward = Array.from({ length: 1001 }, (_, i) => sceneState(i / 1000));
  for (let i = 1000; i >= 0; i--)
    assert.deepEqual(sceneState(i / 1000), forward[i]);
});
test("all scene channels remain finite and normalized", () => {
  for (let i = 0; i <= 10000; i++)
    for (const value of Object.values(sceneState(i / 10000))) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= 0 && value <= 1);
    }
});
test("environment returns to opening and portrait is fully dissolved", () => {
  assert.equal(sceneState(0).scifi, 0);
  assert.equal(sceneState(1).scifi, 0);
  assert.equal(sceneState(0.6).scifi, 1);
  assert.equal(sceneState(0.2).portrait, 1);
  assert.equal(sceneState(0.4).portrait, 0);
});
