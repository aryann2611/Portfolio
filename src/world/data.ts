import type { ComponentType } from "react";
import { Vector3 } from "three";
import { About } from "../components/About";
import { Skills } from "../components/Skills";
import { Projects } from "../components/Projects";
import { Experience } from "../components/Experience";
import { Achievements } from "../components/Achievements";
import { CurrentlyExploring } from "../components/CurrentlyExploring";
import { Contact } from "../components/Contact";

// --- world geography ----------------------------------------------------------

export const SHORE = 84;
export const WATER_Y = -1.1;
export const MOUNTAIN = { x: 38, z: -50, r: 17, h: 16 };
export const LAKE = { x: -46, z: 44, r: 11 };
export const BEACH = { x: 70, z: 22 };
export const FOREST = { x: 2, z: 66, r: 15 };
export const SUN = new Vector3(80, 24, -30);

export type Landmark = {
  id: string;
  name: string;
  section: string;
  x: number;
  z: number;
  /** collision radius of the building footprint */
  radius: number;
  color: string;
  Content: ComponentType;
};

// -z is "north": the player spawns just north of the plaza facing Home.
export const LANDMARKS: Landmark[] = [
  { id: "about", name: "Home", section: "About me", x: 0, z: -36, radius: 4.2, color: "#e8934a", Content: About },
  { id: "skills", name: "Skill Tower", section: "Skills", x: 34, z: -20, radius: 3.4, color: "#5eead4", Content: Skills },
  { id: "projects", name: "Workshop", section: "Projects", x: 40, z: 14, radius: 4.8, color: "#facc15", Content: Projects },
  { id: "experience", name: "Academy", section: "Experience", x: 14, z: 40, radius: 4.8, color: "#93c5fd", Content: Experience },
  { id: "achievements", name: "Eternal Flame", section: "Achievements", x: -20, z: 36, radius: 3.4, color: "#fb7185", Content: Achievements },
  { id: "exploring", name: "Observatory", section: "Currently exploring", x: -40, z: 8, radius: 4, color: "#c4b5fd", Content: CurrentlyExploring },
  { id: "contact", name: "Lighthouse", section: "Contact", x: -58, z: -46, radius: 2.6, color: "#f87171", Content: Contact },
];

/** Named regions: entering one for the first time shows its name, open-world style. */
export type Zone = { id: string; name: string; x: number; z: number; r: number; color: string };
export const ZONES: Zone[] = [
  { id: "square", name: "Town Square", x: 0, z: 0, r: 8, color: "#e8934a" },
  { id: "summit", name: "Summit Peak", x: MOUNTAIN.x, z: MOUNTAIN.z, r: 7, color: "#e2e8f0" },
  { id: "lake", name: "Whispering Lake", x: LAKE.x, z: LAKE.z, r: 20, color: "#38bdf8" },
  { id: "beach", name: "Palm Beach", x: BEACH.x, z: BEACH.z, r: 15, color: "#fcd34d" },
  { id: "forest", name: "Old Forest", x: FOREST.x, z: FOREST.z, r: FOREST.r, color: "#4ade80" },
];

/** Per-frame game state. Mutable on purpose: read in useFrame, never triggers React renders. */
export const game = {
  pos: new Vector3(0, 0, -10),
  heading: Math.PI,
  /** camera orbit angle around the player; 0 = camera south of player looking north */
  camYaw: 0,
  /** camera elevation angle in radians */
  camPitch: 0.32,
  /** true while the player runs forward, so the camera swings in behind them */
  follow: false,
  /** performance.now() of the last manual camera drag; auto-follow waits after it */
  lastDrag: 0,
  keys: new Set<string>(),
  /** touch joystick, -1..1 on each axis (y < 0 = forward) */
  joy: { x: 0, y: 0 },
  target: null as Vector3 | null,
  frozen: true,
  started: false,
  startedAt: 0,
  zoom: 1,
  /** input (drag, wheel, auto-follow) sets these goals; the camera eases towards them */
  camYawGoal: 0,
  camPitchGoal: 0.32,
  zoomGoal: 1,
  snapCamera: false,
  night: false,
  /** 0 = day, 1 = night; eased towards `night` every frame */
  nightMix: 0,
  /** sitting on the summit bench, watching the sunset */
  sitting: false,
  sitStart: 0,
  /** 0..1 sunset colour blend (eased), and how far the sun has sunk while you watch */
  sunsetMix: 0,
  sunsetSink: 0,
  /** current direction to the sun (day / sunset / night), updated by DayNight */
  sunDir: SUN.clone().normalize(),
  /** live villager positions, so the player can't walk through them */
  npcs: [] as Vector3[],
};

/** Spot in front of a landmark (on the plaza side), used for fast travel and click-to-walk. */
export function frontOf(l: Landmark, extra = 2.2) {
  const d = Math.hypot(l.x, l.z);
  const k = (d - l.radius - extra) / d;
  return new Vector3(l.x * k, 0, l.z * k);
}
