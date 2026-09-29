/** Pure scroll-derived state. No event-triggered animation, so reverse scrubbing is identical. */
export const clamp = (v: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, v));
export function smooth(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function windowAt(p: number, start: number, end: number, fade = 0.012) {
  return smooth(start, start + fade, p) * (1 - smooth(end - fade, end, p));
}
export const beats = [
  { id: "opening", label: "The courtyard", start: 0, end: 0.08 },
  { id: "formation", label: "Taking shape", start: 0.08, end: 0.17 },
  { id: "intro", label: "Hello, world", start: 0.17, end: 0.23 },
  { id: "arrival", label: "A shared path", start: 0.23, end: 0.32 },
  { id: "slice", label: "Light into possibility", start: 0.32, end: 0.39 },
  { id: "portal", label: "Beyond localhost", start: 0.39, end: 0.47 },
  { id: "about", label: "The person", start: 0.47, end: 0.57 },
  { id: "skills", label: "The toolkit", start: 0.57, end: 0.68 },
  { id: "projects", label: "Selected work", start: 0.68, end: 0.8 },
  { id: "roadmap", label: "The way forward", start: 0.8, end: 0.89 },
  { id: "return", label: "Full circle", start: 0.89, end: 0.95 },
  { id: "bow", label: "With gratitude", start: 0.95, end: 0.98 },
  { id: "contact", label: "Let’s connect", start: 0.98, end: 1 },
] as const;
export function sceneState(p: number) {
  const scifi = smooth(0.395, 0.47, p) * (1 - smooth(0.89, 0.95, p));
  return {
    scifi,
    formation: smooth(0.08, 0.17, p),
    portrait: smooth(0.16, 0.19, p) * (1 - smooth(0.355, 0.385, p)),
    dissolution: smooth(0.348, 0.42, p),
    portal: windowAt(p, 0.39, 0.48, 0.03) + windowAt(p, 0.89, 0.955, 0.028),
    samurai: smooth(0.235, 0.285, p),
    travel: smooth(0.39, 0.47, p),
  };
}
