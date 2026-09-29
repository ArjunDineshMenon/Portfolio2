import { clamp, smooth, windowAt } from "./timeline";

export type Vec3 = [number, number, number];
export type ShotKind =
  "about" | "skills" | "project" | "roadmap" | "education" | "certifications";
export type InfoShot = {
  id: string;
  kind: ShotKind;
  item: number;
  start: number;
  end: number;
  label: string;
  lane: number;
  z: number;
};
export const INFO_SHOTS: InfoShot[] = [
  {
    id: "about-story",
    kind: "about",
    item: 0,
    start: 0.47,
    end: 0.52,
    label: "THE PERSON",
    lane: 1,
    z: -4,
  },
  {
    id: "about-direction",
    kind: "about",
    item: 1,
    start: 0.52,
    end: 0.57,
    label: "THE DIRECTION",
    lane: -1,
    z: -5.4,
  },
  {
    id: "skill-cloud",
    kind: "skills",
    item: 0,
    start: 0.57,
    end: 0.5975,
    label: "CLOUD",
    lane: 1,
    z: -7,
  },
  {
    id: "skill-devops",
    kind: "skills",
    item: 1,
    start: 0.5975,
    end: 0.625,
    label: "DEVOPS",
    lane: -1,
    z: -8.2,
  },
  {
    id: "skill-languages",
    kind: "skills",
    item: 2,
    start: 0.625,
    end: 0.6525,
    label: "LANGUAGES",
    lane: 1,
    z: -9.4,
  },
  {
    id: "skill-japanese",
    kind: "skills",
    item: 3,
    start: 0.6525,
    end: 0.68,
    label: "JAPANESE",
    lane: -1,
    z: -10.6,
  },
  {
    id: "project-s3",
    kind: "project",
    item: 0,
    start: 0.68,
    end: 0.72,
    label: "PROJECT 01",
    lane: 1,
    z: -12.4,
  },
  {
    id: "project-cloudfront",
    kind: "project",
    item: 1,
    start: 0.72,
    end: 0.76,
    label: "PROJECT 02",
    lane: -1,
    z: -14.2,
  },
  {
    id: "project-cupola",
    kind: "project",
    item: 2,
    start: 0.76,
    end: 0.8,
    label: "PROJECT 03",
    lane: 1,
    z: -16,
  },
  {
    id: "path-foundation",
    kind: "roadmap",
    item: 0,
    start: 0.8,
    end: 0.822,
    label: "2026 — 2027",
    lane: -1,
    z: -17.8,
  },
  {
    id: "path-graduation",
    kind: "roadmap",
    item: 2,
    start: 0.822,
    end: 0.844,
    label: "2028 — 2029",
    lane: 1,
    z: -19.2,
  },
  {
    id: "path-japan",
    kind: "roadmap",
    item: 4,
    start: 0.844,
    end: 0.862,
    label: "2030 — 2032",
    lane: -1,
    z: -20.6,
  },
  {
    id: "education",
    kind: "education",
    item: 0,
    start: 0.862,
    end: 0.876,
    label: "THE FOUNDATION",
    lane: 1,
    z: -21.8,
  },
  {
    id: "credentials",
    kind: "certifications",
    item: 0,
    start: 0.876,
    end: 0.89,
    label: "TARGETS IN PROGRESS",
    lane: -1,
    z: -23,
  },
];

export function infoAt(p: number) {
  const index = INFO_SHOTS.findIndex((s) => p >= s.start && p < s.end);
  const shot = index < 0 ? null : INFO_SHOTS[index];
  return {
    index,
    shot,
    local: shot ? clamp((p - shot.start) / (shot.end - shot.start)) : 0,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
type Key = { p: number; v: Vec3 };
function path(keys: Key[], p: number): Vec3 {
  for (let i = 1; i < keys.length; i++)
    if (p <= keys[i].p)
      return mix(keys[i - 1].v, keys[i].v, smooth(keys[i - 1].p, keys[i].p, p));
  return keys.at(-1)!.v;
}
const cameraKeys: Key[] = [
  { p: 0, v: [-0.45, 2.3, 12.4] },
  { p: 0.08, v: [0, 1.9, 10] },
  { p: 0.17, v: [0, 1.8, 8.7] },
  { p: 0.23, v: [0.1, 1.8, 8.5] },
  { p: 0.32, v: [0, 2.05, 9.4] },
  { p: 0.39, v: [0, 2.05, 9.4] },
  { p: 0.413, v: [0, 2, 8.8] },
  { p: 0.43, v: [0.5, 1.7, 5.2] },
  { p: 0.47, v: [0, 1.9, 4.7] },
  ...INFO_SHOTS.flatMap((s) => [
    {
      p: s.start + (s.end - s.start) * 0.24,
      v: [s.lane * 0.25, 1.95, s.z + 8.7] as Vec3,
    },
    { p: s.end, v: [s.lane * 0.25, 1.95, s.z + 8.7] as Vec3 },
  ]),
  { p: 0.89, v: [-0.25, 1.95, -14.3] },
  { p: 0.913, v: [0, 1.9, -11] },
  { p: 0.94, v: [0.5, 2.15, 9.5] },
  { p: 0.95, v: [0.25, 1.95, 10.2] },
  { p: 1, v: [-0.45, 2.3, 12.4] },
];

/** Shared scene/HTML choreography: everything story-critical is a pure scroll sample. */
function sampleDirection(p: number, mobile = false) {
  p = clamp(p);
  const { shot, index, local } = infoAt(p);
  let actor: Vec3 = path(
    [
      { p: 0, v: [2.8, 0, 0.25] },
      { p: 0.28, v: [2.8, 0, 0.25] },
      { p: 0.335, v: [2.8, 0, 0.65] },
      { p: 0.36, v: [-2.75, 0, 0.85] },
      { p: 0.413, v: [-2.75, 0, 0.85] },
      { p: 0.44, v: [-0.7, 0, -2] },
      { p: 0.47, v: [1.75, 0, -4] },
      { p: 0.89, v: [-1.75, 0, -23] },
      { p: 0.917, v: [-0.6, 0, -24] },
      { p: 0.94, v: [1.6, 0, -1] },
      { p: 0.95, v: [1.7, 0, 0] },
      { p: 1, v: [1.7, 0, 0] },
    ],
    p,
  );
  let yaw = lerp(-0.32, -0.72, smooth(0.32, 0.342, p));
  yaw = lerp(yaw, 0.18, smooth(0.36, 0.375, p));
  if (shot) {
    const previous = INFO_SHOTS[Math.max(0, index - 1)];
    const from: Vec3 =
      index === 0 ? [1.75, 0, -4] : [previous.lane * 1.75, 0, previous.z];
    const to: Vec3 = [shot.lane * 1.75, 0, shot.z];
    actor = mix(from, to, smooth(0, 0.24, local));
    const gesture = windowAt(local, 0.52, 0.87, 0.06);
    actor[0] += shot.lane * Math.sin(local * Math.PI * 4) * 0.12 * gesture;
    actor[2] += Math.sin(local * Math.PI * 2) * 0.12 * gesture;
    const travelYaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
    const previousYaw = index === 0 ? -0.32 : -previous.lane * 0.42;
    yaw = lerp(
      lerp(previousYaw, travelYaw, smooth(0, 0.055, local)),
      -shot.lane * 0.42,
      smooth(0.19, 0.28, local),
    );
  } else if (p > 0.413 && p < 0.47)
    yaw = lerp(0.18, Math.PI, windowAt(p, 0.413, 0.468, 0.014));
  else if (p >= 0.89 && p < 0.95)
    yaw = lerp(
      lerp(0.42, Math.PI, smooth(0.893, 0.908, p)),
      -0.32,
      smooth(0.93, 0.95, p),
    );

  const camera = path(cameraKeys, p);
  const look: Vec3 = [
    0,
    1.6,
    p < 0.47
      ? lerp(0, -4, smooth(0.39, 0.47, p))
      : p < 0.89
        ? camera[2] - 8.7
        : lerp(-23, 0, smooth(0.909, 0.942, p)),
  ];
  if (p >= 0.468 && p < 0.47) yaw = lerp(0.18, -0.32, smooth(0.468, 0.47, p));
  if (p >= 0.95) yaw = -0.32;
  const departure = windowAt(p, 0.414, 0.47, 0.02),
    arrival = windowAt(p, 0.89, 0.95, 0.024);
  const warp = departure + arrival;
  const flash =
    Math.exp(-Math.pow((p - 0.444) / 0.006, 2)) * 0.7 +
    Math.exp(-Math.pow((p - 0.929) / 0.0045, 2)) * 0.88;
  const scifi = smooth(0.432, 0.458, p) * (1 - smooth(0.922, 0.94, p));
  const lane = shot?.lane ?? 1;
  const anchor: Vec3 = shot
    ? [-lane * 1.75, 1.68, shot.z + 0.4]
    : [-1.75, 1.8, 0];
  if (mobile) {
    const compact = smooth(0.43, 0.47, p) * (1 - smooth(0.91, 0.95, p));
    actor[0] *= lerp(0.48, 0.23, compact);
    camera[0] *= 0.25;
    const close = smooth(0.45, 0.47, p) * (1 - smooth(0.89, 0.91, p));
    camera[2] += (1 - close) * 1.8 - close * 1.25;
    look[1] = 1.65 - close * 1.35;
    anchor[0] = 0;
    anchor[1] = -1;
    anchor[2] = (shot?.z ?? 0) + 0.8;
  }
  const reveal = shot ? smooth(0.405, 0.5, local) : 0;
  const dissolve = shot ? smooth(0.885, 1, local) : 0;
  const impact = shot
    ? windowAt(local, 0.36, 0.48, 0.035)
    : windowAt(p, 0.348, 0.367, 0.005);
  return {
    p,
    shot,
    index,
    local,
    actor,
    yaw,
    camera,
    look,
    anchor,
    warp,
    flash,
    scifi,
    reveal,
    dissolve,
    impact,
    actorOpacity: (1 - flash * 0.95) * (1 - smooth(0.982, 1, p)),
    faceX: mobile ? -0.74 : -0.2,
    faceScale: mobile ? 0.96 : 1.2,
    faceSplit: smooth(0.405, 0.432, p),
    faceBurst: smooth(0.414, 0.455, p),
    dash: windowAt(p, 0.336, 0.363, 0.005),
    actorScale: mobile ? .93 - .13 * smooth(.45, .47, p) * (1 - smooth(.89, .91, p)) : 1,
  };
}

// All consumers share one immutable scroll sample per viewport and frame.
const cached: ({ p: number; value: ReturnType<typeof sampleDirection> } | undefined)[] = [];
export function direct(p: number, mobile = false) {
  const key = mobile ? 1 : 0;
  const previous = cached[key];
  if (previous?.p === p) return previous.value;
  const value = sampleDirection(p, mobile);
  cached[key] = { p, value };
  return value;
}

export type MovieClip =
  | "Courtyard_Guard"
  | "Dash_Wide_Slash"
  | "Slow_Sheathe"
  | "Sheathed_Portal_Entry"
  | "Hologram_Conduct_Left"
  | "Hologram_Conduct_Right"
  | "Blade_Flourish"
  | "Slash_Horizontal"
  | "Slash_Diagonal"
  | "Slash_Rising"
  | "Scan_Display"
  | "Guard_Step"
  | "Idle_Breathing"
  | "Enter_From_Shadow"
  | "Draw_Katana"
  | "Hologram_Slice"
  | "Recover_From_Slice"
  | "Walk_Forward_Loop"
  | "Panel_Reveal_Left"
  | "Panel_Reveal_Right"
  | "Portal_Brace"
  | "Sheathe_Katana"
  | "Closing_Bow"
  | "Walk_Travel_Loop"
  | "Panel_Slash_Left"
  | "Panel_Slash_Right"
  | "Portal_Entry"
  | "Portal_Landing";
export type ActionCue = {
  name: MovieClip;
  start: number;
  end: number;
  cycles?: number;
  hold?: number;
  ambient?: boolean;
};
export const MOVIE_CUES: ActionCue[] = [
  { name: "Courtyard_Guard", start: 0, end: 0.28, cycles: 2, ambient: true },
  { name: "Draw_Katana", start: 0.28, end: 0.32 },
  { name: "Dash_Wide_Slash", start: 0.32, end: 0.37 },
  { name: "Slow_Sheathe", start: 0.37, end: 0.414 },
  { name: "Sheathed_Portal_Entry", start: 0.414, end: 0.452 },
  { name: "Draw_Katana", start: 0.452, end: 0.47 },
  ...INFO_SHOTS.flatMap((s, i): ActionCue[] => {
    const d = s.end - s.start;
    const cuts: MovieClip[] = ["Panel_Slash_Left", "Panel_Slash_Right", "Slash_Horizontal", "Slash_Diagonal", "Slash_Rising"];
    return [
      {
        name: i === 0 ? "Portal_Landing" : "Walk_Travel_Loop",
        start: s.start,
        end: s.start + d * 0.24,
        cycles: i === 0 ? undefined : 3,
      },
      {
        name: cuts[i % cuts.length],
        start: s.start + d * 0.24,
        end: s.start + d * 0.52,
      },
      {
        name: s.kind === "roadmap" ? "Guard_Step" : s.kind === "skills" ? "Scan_Display" : s.kind === "project"
          ? "Blade_Flourish"
          : s.lane > 0 ? "Hologram_Conduct_Left" : "Hologram_Conduct_Right",
        start: s.start + d * 0.52,
        end: s.start + d * 0.87,
        cycles: 1,
        ambient: true,
      },
      {
        name: cuts[(i + 1) % cuts.length],
        start: s.start + d * 0.87,
        end: s.end,
      },
    ];
  }),
  { name: "Portal_Entry", start: 0.89, end: 0.929 },
  { name: "Portal_Landing", start: 0.929, end: 0.95 },
  { name: "Sheathe_Katana", start: 0.95, end: 0.962 },
  { name: "Closing_Bow", start: 0.962, end: 0.982 },
  { name: "Closing_Bow", start: 0.982, end: 1.001, hold: 1 },
];
