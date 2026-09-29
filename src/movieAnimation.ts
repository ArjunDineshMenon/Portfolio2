import {
  AnimationMixer,
  LoopOnce,
  type AnimationClip,
  type Object3D,
} from "three";
import { MOVIE_CUES, type MovieClip } from "./director";
import { clamp, smooth } from "./timeline";

export function createMovieSampler(root: Object3D, clips: AnimationClip[]) {
  let skin = false;
  root.traverse((o) => {
    if ("isSkinnedMesh" in o && o.isSkinnedMesh) skin = true;
  });
  const missing = [...new Set(MOVIE_CUES.map((c) => c.name))].filter(
    (n) => !clips.some((c) => c.name === n),
  );
  const ready = skin && missing.length === 0;
  const mixer = new AnimationMixer(root);
  const actions = new Map(
    clips.map((c) => {
      const a = mixer.clipAction(c);
      a.setLoop(LoopOnce, 1).play();
      a.clampWhenFinished = true;
      a.paused = true;
      return [c.name, a];
    }),
  );
  function set(name: MovieClip, time: number, weight: number) {
    const a = actions.get(name);
    if (!a) return;
    a.enabled = true;
    a.paused = true;
    a.setEffectiveWeight(weight);
    a.time = clamp(time) * a.getClip().duration;
  }
  return {
    ready,
    missing,
    sample(p: number) {
      p = clamp(p);
      const index = Math.max(
        0,
        MOVIE_CUES.findIndex((c) => p >= c.start && p < c.end),
      );
      const cue = MOVIE_CUES[index];
      for (const a of actions.values()) a.enabled = false;
      const local = clamp((p - cue.start) / (cue.end - cue.start));
      const time = cue.hold ?? (cue.cycles ? (local * cue.cycles) % 1 : local);
      set(cue.name, time, 1);
      const prev = MOVIE_CUES[index - 1];
      const blend = smooth(
        cue.start,
        cue.start + Math.min(0.001, (cue.end - cue.start) * 0.1),
        p,
      );
      if (prev && prev.name !== cue.name && blend < 1) {
        set(prev.name, prev.hold ?? (prev.cycles ? 0 : 1), 1 - blend);
        set(cue.name, time, blend);
      }
      if (ready) mixer.update(0);
      return { name: cue.name, time, index };
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
