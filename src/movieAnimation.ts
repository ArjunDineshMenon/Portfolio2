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
  const createActions = () =>
    new Map(
      clips.map((c) => {
        const a = mixer.clipAction(c);
        a.setLoop(LoopOnce, 1).play();
        a.clampWhenFinished = true;
        a.paused = true;
        return [c.name, a];
      }),
    );
  let actions = createActions();
  let lastP = -1,
    lastAmbient = -1;
  let lastResult = { name: MOVIE_CUES[0].name, time: 0, index: 0 };
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
    activate() {
      if (!actions.size) actions = createActions();
      for (const a of actions.values()) a.play();
      lastP = -1;
    },
    sample(p: number, ambientSeconds = 0) {
      p = clamp(p);
      const index = Math.max(
        0,
        MOVIE_CUES.findIndex((c) => p >= c.start && p < c.end),
      );
      const cue = MOVIE_CUES[index];
      const ambientKey = cue.ambient ? ambientSeconds : 0;
      if (lastP === p && lastAmbient === ambientKey) return lastResult;
      for (const a of actions.values()) a.enabled = false;
      const local = clamp((p - cue.start) / (cue.end - cue.start));
      const duration = actions.get(cue.name)?.getClip().duration ?? 4;
      const ambientPhase = cue.ambient ? ambientSeconds / duration : 0;
      const time =
        cue.hold ??
        (cue.cycles ? (local * cue.cycles + ambientPhase) % 1 : local);
      set(cue.name, time, 1);
      const prev = MOVIE_CUES[index - 1];
      const blend = smooth(
        cue.start,
        cue.start + Math.min(0.001, (cue.end - cue.start) * 0.1),
        p,
      );
      if (prev && prev.name !== cue.name && blend < 1) {
        const prevDuration = actions.get(prev.name)?.getClip().duration ?? 4;
        set(
          prev.name,
          prev.hold ??
            (prev.cycles
              ? prev.ambient
                ? (ambientSeconds / prevDuration) % 1
                : 0
              : 1),
          1 - blend,
        );
        set(cue.name, time, blend);
      }
      if (ready) mixer.update(0);
      lastP = p;
      lastAmbient = ambientKey;
      lastResult = { name: cue.name, time, index };
      return lastResult;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      actions.clear();
      lastP = -1;
    },
  };
}
