import {
  AnimationMixer,
  LoopOnce,
  type AnimationClip,
  type Object3D,
} from "three";
import { clamp } from "./timeline";

export const REQUIRED_CLIPS = [
  "Idle_Breathing",
  "Enter_From_Shadow",
  "Draw_Katana",
  "Hologram_Slice",
  "Recover_From_Slice",
  "Walk_Forward_Loop",
  "Panel_Reveal_Left",
  "Panel_Reveal_Right",
  "Portal_Brace",
  "Sheathe_Katana",
  "Closing_Bow",
] as const;
export type ClipName = (typeof REQUIRED_CLIPS)[number];
export const CLIP_CUES: { name: ClipName; start: number; end: number }[] = [
  { name: "Idle_Breathing", start: 0, end: 0.23 },
  { name: "Enter_From_Shadow", start: 0.23, end: 0.28 },
  { name: "Draw_Katana", start: 0.28, end: 0.32 },
  { name: "Hologram_Slice", start: 0.32, end: 0.37 },
  { name: "Recover_From_Slice", start: 0.37, end: 0.39 },
  { name: "Portal_Brace", start: 0.39, end: 0.47 },
  { name: "Panel_Reveal_Left", start: 0.47, end: 0.57 },
  { name: "Panel_Reveal_Right", start: 0.57, end: 0.68 },
  { name: "Panel_Reveal_Left", start: 0.68, end: 0.72 },
  { name: "Panel_Reveal_Right", start: 0.72, end: 0.76 },
  { name: "Panel_Reveal_Left", start: 0.76, end: 0.8 },
  { name: "Walk_Forward_Loop", start: 0.8, end: 0.89 },
  { name: "Portal_Brace", start: 0.89, end: 0.95 },
  { name: "Sheathe_Katana", start: 0.95, end: 0.963 },
  { name: "Closing_Bow", start: 0.963, end: 0.98 },
  { name: "Idle_Breathing", start: 0.98, end: 1.001 },
];
/** Sample baked Blender actions directly from scroll. No elapsed-time state,
 * so reversing or jumping chapters produces the same bone pose. */
export function createSamuraiTimeline(root: Object3D, clips: AnimationClip[]) {
  let skinned = false;
  root.traverse((obj) => {
    if ("isSkinnedMesh" in obj && obj.isSkinnedMesh) skinned = true;
  });
  const missing = REQUIRED_CLIPS.filter(
    (name) => !clips.some((clip) => clip.name === name),
  );
  const ready = skinned && missing.length === 0;
  const mixer = ready ? new AnimationMixer(root) : null;
  const actions = new Map(
    clips.map((clip) => [clip.name, mixer?.clipAction(clip)]),
  );
  function activate(name: ClipName, time: number, weight: number) {
    const action = actions.get(name)!;
    action.enabled = true;
    action.paused = true;
    action.setEffectiveWeight(weight);
    action.time = time * action.getClip().duration;
  }
  for (const action of actions.values()) {
    action?.setLoop(LoopOnce, 1).play();
    if (action) action.clampWhenFinished = true;
  }
  return {
    ready,
    missing,
    sample(p: number) {
      const index = Math.max(
        0,
        CLIP_CUES.findIndex((c) => p >= c.start && p < c.end),
      );
      const cue = CLIP_CUES[index];
      if (!mixer) return cue.name; // Explicit fallback for incomplete replacement assets.
      for (const action of actions.values()) if (action) action.enabled = false;
      const local = clamp((p - cue.start) / (cue.end - cue.start));
      // Breathing and gait are periodic. Non-looping actions hold their last pose.
      const looping =
        cue.name === "Walk_Forward_Loop" || cue.name === "Idle_Breathing";
      const time = looping
        ? (local * (cue.name === "Walk_Forward_Loop" ? 3 : 2)) % 1
        : local;
      // Closing holds the recovered, sheathed pose rather than redrawing the sword.
      if (p >= 0.98) {
        activate("Closing_Bow", 1, 1);
        mixer.update(0);
        return "Closing_Bow";
      }
      activate(cue.name, time, 1);
      const previous = CLIP_CUES[index - 1];
      const blend = clamp(
        (p - cue.start) / Math.min(0.003, (cue.end - cue.start) * 0.12),
      );
      if (previous && previous.name !== cue.name && blend < 1) {
        const eased = blend * blend * (3 - 2 * blend);
        activate(
          previous.name,
          previous.name === "Walk_Forward_Loop" ||
            previous.name === "Idle_Breathing"
            ? 0
            : 1,
          1 - eased,
        );
        activate(cue.name, time, eased);
      }
      mixer.update(0);
      return cue.name;
    },
    dispose() {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(root);
    },
  };
}
