import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BEACH, FOREST, LAKE, LANDMARKS, MOUNTAIN, SHORE, SUN, WATER_Y, game } from "./data";

export const SIGNPOST = { x: -3.4, z: 3.4 };
export const CAMPFIRE = { x: -37.5, z: 29 };
const MAP = SHORE * 2 + 40; // side length of the terrain / ground-map square

export const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
/** smoothstep; also works reversed (a > b) */
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- layout helpers -------------------------------------------------------

type Seg = { ax: number; az: number; bx: number; bz: number };

function segDist(x: number, z: number, s: Seg) {
  const vx = s.bx - s.ax, vz = s.bz - s.az;
  const t = clamp(((x - s.ax) * vx + (z - s.az) * vz) / (vx * vx + vz * vz), 0, 1);
  return { d: Math.hypot(x - s.ax - vx * t, z - s.az - vz * t), t };
}

const PATHS: Seg[] = LANDMARKS.map((l) => {
  const d = Math.hypot(l.x, l.z);
  return { ax: (l.x / d) * 6, az: (l.z / d) * 6, bx: l.x - (l.x / d) * l.radius, bz: l.z - (l.z / d) * l.radius };
});

/** Paved road network: a spoke from the plaza to every building, joined by a ring road. */
const ROAD_W = 2.6; // half-width: the asphalt is 5.2 wide, comfortable for the car
const RING = 24;

const spokeDist = (x: number, z: number) => {
  let best = Infinity;
  for (const s of PATHS) best = Math.min(best, segDist(x, z, s).d);
  return best;
};
const roadDistExact = (x: number, z: number) => Math.min(spokeDist(x, z), Math.abs(Math.hypot(x, z) - RING));

function padDistExact(x: number, z: number) {
  let best = Infinity;
  for (const l of LANDMARKS) best = Math.min(best, Math.hypot(x - l.x, z - l.z) - l.radius);
  return best;
}

/** 1 in the middle of Palm Beach, fading to 0 */
const beachness = (x: number, z: number) => smooth(30, 12, Math.hypot(x - BEACH.x, z - BEACH.z));
/** distance from the centre where sand starts */
const sandEdge = (x: number, z: number) => SHORE - 7 - 12 * beachness(x, z);

function heightExact(x: number, z: number, pd: number, pad: number) {
  const d = Math.hypot(x, z);
  let h =
    (Math.sin(x * 0.06) * Math.cos(z * 0.05) * 1.6 +
      Math.sin(x * 0.13 + z * 0.09) * 0.7 +
      Math.sin(z * 0.17 - x * 0.04) * 0.4 +
      Math.sin(x * 0.31 + z * 0.27) * 0.15) *
      0.55 +
    0.7;
  // the mountain, with rocky roughness only on its slopes
  const m = Math.exp(-((Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) / MOUNTAIN.r) ** 2));
  h += MOUNTAIN.h * m + (Math.sin(x * 0.5) * Math.cos(z * 0.45) + Math.sin(x * 0.9 + z * 0.7) * 0.5) * 1.2 * m;
  // flatten the plaza, the building pads and (partly) the paths
  // (roads are dead flat so the car drives smoothly; `pd` is the distance from the road edge)
  h *= Math.min(smooth(8, 14, d), smooth(1.5, 6, pad), smooth(0, 3.5, pd));
  // lake bowl
  h -= 3.4 * smooth(LAKE.r + 5, LAKE.r - 2, Math.hypot(x - LAKE.x, z - LAKE.z));
  // sink into the sea at the shore (gentler on the beach)
  const s = smooth(SHORE - 6 - 6 * beachness(x, z), SHORE + 3, d);
  return h * (1 - s) - 4.5 * s;
}

// --- baked terrain grid --------------------------------------------------------
// The exact formulas above are evaluated once per grid point at load; everything
// else (mesh, grass map, scatter, physics) samples these arrays bilinearly.

const RES = 353; // grid points per side (= island mesh vertices)
const STEP = MAP / (RES - 1);
const H = new Float32Array(RES * RES), RD = new Float32Array(RES * RES), PD = new Float32Array(RES * RES), PAD = new Float32Array(RES * RES);
for (let j = 0, k = 0; j < RES; j++) {
  for (let i = 0; i < RES; i++, k++) {
    const x = -MAP / 2 + i * STEP, z = -MAP / 2 + j * STEP;
    RD[k] = roadDistExact(x, z);
    PD[k] = RD[k] - ROAD_W + 1.7; // keeps the old "path distance" meaning for scatter/grass: clear of the asphalt edge
    PAD[k] = padDistExact(x, z);
    H[k] = heightExact(x, z, RD[k] - ROAD_W, PAD[k]);
  }
}

function sample(a: Float32Array, x: number, z: number, outside: number) {
  const fx = (x + MAP / 2) / STEP, fz = (z + MAP / 2) / STEP;
  if (!(fx >= 0 && fz >= 0 && fx < RES - 1 && fz < RES - 1)) return outside;
  const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * RES + i;
  return (a[k] * (1 - tx) + a[k + 1] * tx) * (1 - tz) + (a[k + RES] * (1 - tx) + a[k + RES + 1] * tx) * tz;
}

export const heightAt = (x: number, z: number) => sample(H, x, z, -4.5);
export const pathDist = (x: number, z: number) => sample(PD, x, z, 99);
const padDist = (x: number, z: number) => sample(PAD, x, z, 99);

// --- walkable piers ------------------------------------------------------------

const LH = LANDMARKS.find((l) => l.id === "contact")!;
const LHU = { x: -LH.x / Math.hypot(LH.x, LH.z), z: -LH.z / Math.hypot(LH.x, LH.z) };
const LAKEU = { x: -LAKE.x / Math.hypot(LAKE.x, LAKE.z), z: -LAKE.z / Math.hypot(LAKE.x, LAKE.z) };
export const PIERS = [
  // lighthouse dock (matches the model in Landmarks.tsx)
  { ax: LH.x - LHU.x * 3.4, az: LH.z - LHU.z * 3.4, bx: LH.x - LHU.x * 11.5, bz: LH.z - LHU.z * 11.5, w: 1.6, y: 0.26 },
  // lake pier, pointing from the shore into the lake
  { ax: LAKE.x + LAKEU.x * 15, az: LAKE.z + LAKEU.z * 15, bx: LAKE.x + LAKEU.x * 4.5, bz: LAKE.z + LAKEU.z * 4.5, w: 1.8, y: 0.35 },
];

export function deckAt(x: number, z: number) {
  for (const p of PIERS) {
    const { d, t } = segDist(x, z, p);
    if (d < p.w / 2 && t > 0 && t < 1) return p.y;
  }
  return null;
}
export const groundAt = (x: number, z: number) => Math.max(heightAt(x, z), deckAt(x, z) ?? -Infinity);
export const walkable = (x: number, z: number) => deckAt(x, z) !== null || heightAt(x, z) > WATER_Y + 0.3;

/** Can scenery go here? */
function free(x: number, z: number, margin: number) {
  const d = Math.hypot(x, z), h = heightAt(x, z);
  return (
    d > 9 + margin &&
    d < sandEdge(x, z) - 2 - margin &&
    pathDist(x, z) > 1.8 + margin &&
    padDist(x, z) > 2.5 + margin &&
    h > WATER_Y + 0.9 &&
    h < 11 &&
    Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) > 5 &&
    Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) > 4 &&
    deckAt(x, z) === null
  );
}

// --- scatter (computed once, deterministic) ---------------------------------

type Prop = { x: number; z: number; y: number; s: number; rot: number; kind: number };
type ScatterOpts = { count: number; tries: number; spacing?: number; kinds?: number; sMin: number; sMax: number; cx?: number; cz?: number; R?: number; ok: (x: number, z: number) => boolean };

function scatter(seed: number, o: ScatterOpts) {
  const r = rng(seed), R = o.R ?? SHORE, cx = o.cx ?? 0, cz = o.cz ?? 0;
  const out: Prop[] = [];
  for (let i = 0; i < o.tries && out.length < o.count; i++) {
    const x = cx + (r() * 2 - 1) * R, z = cz + (r() * 2 - 1) * R;
    if (!o.ok(x, z)) continue;
    if (o.spacing && out.some((p) => Math.hypot(p.x - x, p.z - z) < o.spacing!)) continue;
    out.push({ x, z, y: heightAt(x, z), s: o.sMin + r() * (o.sMax - o.sMin), rot: r() * Math.PI * 2, kind: Math.floor(r() * (o.kinds ?? 1)) });
  }
  return out;
}

const TREES = [
  ...scatter(7, { count: 210, tries: 9000, spacing: 3.4, kinds: 3, sMin: 0.8, sMax: 1.4, ok: (x, z) => free(x, z, 0.8) }),
  ...scatter(8, { count: 90, tries: 3000, spacing: 2.3, kinds: 3, sMin: 1, sMax: 1.6, cx: FOREST.x, cz: FOREST.z, R: FOREST.r + 3, ok: (x, z) => free(x, z, 0.3) }),
].map((t) => ({ ...t, kind: t.y > 4 ? 0 : t.kind })); // only pines up the mountain
const ROCKS = [
  ...scatter(11, { count: 60, tries: 3000, spacing: 2, sMin: 0.35, sMax: 1.1, ok: (x, z) => free(x, z, 0) }),
  ...scatter(12, { count: 30, tries: 1500, spacing: 3, sMin: 0.6, sMax: 1.8, cx: MOUNTAIN.x, cz: MOUNTAIN.z, R: MOUNTAIN.r * 1.3, ok: (x, z) => Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) > 4 && heightAt(x, z) > 3 && pathDist(x, z) > 2 && padDist(x, z) > 3 }),
];
const PALMS = scatter(13, {
  count: 16, tries: 2000, spacing: 3.5, sMin: 0.85, sMax: 1.2, cx: BEACH.x, cz: BEACH.z, R: 18,
  ok: (x, z) => beachness(x, z) > 0.3 && Math.hypot(x, z) > sandEdge(x, z) - 1 && heightAt(x, z) > WATER_Y + 0.7 && pathDist(x, z) > 2 && padDist(x, z) > 3,
});
const FLOWERS = scatter(23, { count: 1800, tries: 20000, kinds: 5, sMin: 0.8, sMax: 1.2, ok: (x, z) => free(x, z, -1.2) });
const MUSHROOMS = [
  ...scatter(29, { count: 60, tries: 2000, kinds: 2, sMin: 0.7, sMax: 1.5, cx: FOREST.x, cz: FOREST.z, R: FOREST.r + 3, ok: (x, z) => free(x, z, -1) }),
  ...scatter(30, { count: 25, tries: 2000, kinds: 2, sMin: 0.7, sMax: 1.3, ok: (x, z) => free(x, z, -1) }),
];

// 30 collectible code orbs: a few in special spots, the rest scattered
export const ORBS = [
  [MOUNTAIN.x + 1.6, MOUNTAIN.z + 1.8],
  [PIERS[0].bx + LHU.x * 0.6, PIERS[0].bz + LHU.z * 0.6],
  [PIERS[1].bx + LAKEU.x * 0.6, PIERS[1].bz + LAKEU.z * 0.6],
  [FOREST.x, FOREST.z],
  [BEACH.x + 6, BEACH.z - 2],
  [LAKE.x - 2, LAKE.z + 3], // floating mid-lake: only reachable by boat
  ...scatter(41, { count: 25, tries: 6000, spacing: 10, sMin: 1, sMax: 1, ok: (x, z) => free(x, z, 0) }).map((p) => [p.x, p.z]),
].map(([x, z]) => ({ x, z, y: Math.max(groundAt(x, z), WATER_Y) + 1.2 }));

// "Sunset Point": a bench on the summit, turned to face the sun over the sea
const SUN_H = { x: SUN.x / Math.hypot(SUN.x, SUN.z), z: SUN.z / Math.hypot(SUN.x, SUN.z) };
export const BENCH = {
  x: MOUNTAIN.x + SUN_H.x * 3.2,
  z: MOUNTAIN.z + SUN_H.z * 3.2,
  y: heightAt(MOUNTAIN.x + SUN_H.x * 3.2, MOUNTAIN.z + SUN_H.z * 3.2),
  rot: Math.atan2(SUN_H.x, SUN_H.z),
};
/** summit props sit on the opposite side of the bench from the sunset camera */
const atSummit = (face: number, right: number) => ({ x: MOUNTAIN.x + SUN_H.x * face - SUN_H.z * right, z: MOUNTAIN.z + SUN_H.z * face + SUN_H.x * right });
export const SUMMIT = { cairn: atSummit(-0.4, 2.8), viewer: atSummit(2.4, 2.4) };

// ponytail: linear scan of ~420 circles per frame, add a spatial grid if obstacle count grows 10x
export const OBSTACLES = [
  ...LANDMARKS.map((l) => ({ x: l.x, z: l.z, r: l.radius })),
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.s })),
  ...ROCKS.map((t) => ({ x: t.x, z: t.z, r: 0.9 * t.s })),
  ...PALMS.map((t) => ({ x: t.x, z: t.z, r: 0.35 })),
  { x: 0, z: 0, r: 2.5 }, // fountain
  { x: SIGNPOST.x, z: SIGNPOST.z, r: 0.3 },
  { x: CAMPFIRE.x, z: CAMPFIRE.z, r: 1.3 },
  { ...SUMMIT.cairn, r: 0.9 },
  { x: BENCH.x, z: BENCH.z, r: 0.6 },
];

/** Push a circle of radius r out of every obstacle and villager. */
export function pushOut(p: THREE.Vector3, r: number) {
  const push = (ox: number, oz: number, or: number) => {
    const dx = p.x - ox, dz = p.z - oz, min = or + r, d2 = dx * dx + dz * dz;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x = ox + (dx / d) * min;
      p.z = oz + (dz / d) * min;
    }
  };
  for (const o of OBSTACLES) push(o.x, o.z, o.r);
  for (const n of game.npcs) push(n.x, n.z, 0.4);
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();
function mat4(x: number, y: number, z: number, rot: number, sx: number, sy = sx, sz = sx) {
  return tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(tmpE.set(0, rot, 0)), tmpS.set(sx, sy, sz)).clone();
}

function Instanced({
  geometry, material, matrices, colors, shadow = true,
}: {
  geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors?: THREE.Color[]; shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const m = ref.current;
    matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    colors?.forEach((c, i) => m.setColorAt(i, c));
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [matrices, colors]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={shadow} receiveShadow />;
}

// --- wind (shared by trees) -------------------------------------------------

const wind = { value: 0 };
function windy<T extends THREE.Material>(m: T, amount: number, from = 1.2): T {
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = wind;
    s.vertexShader = "uniform float uTime;\n" + s.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec3 ip = instanceMatrix[3].xyz;
      float sway = max(position.y - ${from.toFixed(2)}, 0.0) * ${amount.toFixed(3)};
      transformed.x += sin(uTime * 1.3 + ip.x * 0.4 + ip.z * 0.3) * sway;
      transformed.z += cos(uTime * 1.1 + ip.z * 0.4) * sway * 0.6;`,
    );
  };
  return m;
}

/** Night dims unlit shaders (grass, water) by this color. */
const NIGHT_TINT = new THREE.Color("#4a5a8a");
const SUNSET_TINT = new THREE.Color("#ffc49a");
const nightTint = (target: THREE.Color) => target.setRGB(1, 1, 1).lerp(SUNSET_TINT, game.sunsetMix * 0.6).lerp(NIGHT_TINT, game.nightMix);
const SPEC_DAY = new THREE.Color(1, 0.85, 0.6), SPEC_SUNSET = new THREE.Color(1.8, 0.8, 0.3);
const SKY_DAY = new THREE.Color("#f2d2b0"), SKY_SUNSET = new THREE.Color("#ff9a6a");

// --- island -----------------------------------------------------------------

export function Island({ onGround }: { onGround: (p: THREE.Vector3) => void }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(MAP, MAP, RES - 1, RES - 1);
    g.rotateX(-Math.PI / 2); // vertex k now sits exactly on grid point k
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const grassA = new THREE.Color("#4f8a37"), grassB = new THREE.Color("#8fb04a"), forest = new THREE.Color("#2f5e2a");
    const asphalt = new THREE.Color("#3b3e46"), curb = new THREE.Color("#d8d3c4"), dirt = new THREE.Color("#b08458"), pad = new THREE.Color("#9c8a6e"), stone = new THREE.Color("#bdb5a6");
    const sand = new THREE.Color("#e6cf9a"), wet = new THREE.Color("#9c8457"), rock = new THREE.Color("#8d8a84"), snow = new THREE.Color("#f4f6fb");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = H[i], d = Math.hypot(x, z);
      pos.setY(i, h);
      const n = 0.5 + 0.5 * Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * Math.cos(z * 0.17 - x * 0.05);
      c.copy(grassA).lerp(grassB, n * 0.8);
      c.lerp(forest, smooth(FOREST.r + 6, FOREST.r - 4, Math.hypot(x - FOREST.x, z - FOREST.z)) * 0.7);
      c.lerp(dirt, smooth(ROAD_W + 1.1, ROAD_W + 0.3, RD[i]) * 0.6); // worn verge
      c.lerp(asphalt, smooth(ROAD_W + 0.1, ROAD_W - 0.4, RD[i]));
      c.lerp(curb, smooth(ROAD_W - 0.75, ROAD_W - 0.45, RD[i]) * smooth(ROAD_W - 0.05, ROAD_W - 0.35, RD[i])); // painted edge line
      c.lerp(pad, smooth(1.6, 0, PAD[i]));
      if (d < 8) {
        // plaza tiles: hash per cell for subtle variation
        const cell = Math.sin(Math.floor(x * 0.9) * 12.9898 + Math.floor(z * 0.9) * 78.233) * 43758.5453;
        const tile = stone.clone().multiplyScalar(0.9 + 0.12 * (cell - Math.floor(cell)));
        c.lerp(tile, smooth(7.8, 7.3, d));
      }
      c.lerp(rock, smooth(5, 9, h) * (0.8 + 0.2 * n));
      c.lerp(snow, smooth(12.5, 15, h));
      const se = sandEdge(x, z);
      c.lerp(sand, Math.max(smooth(se, se + 3, d), smooth(-0.3, -0.7, h)));
      c.lerp(wet, smooth(WATER_Y + 0.1, WATER_Y - 0.8, h));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh
      geometry={geo}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 8) onGround(e.point);
      }}
    >
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

// --- water ------------------------------------------------------------------

export function Water() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uSun: { value: SUN.clone().normalize() },
            uDeep: { value: new THREE.Color("#1d5f80") },
            uShallow: { value: new THREE.Color("#3fb8b0") },
            uSky: { value: new THREE.Color("#f2d2b0") },
            uFoam: { value: new THREE.Color("#ffffff") },
            uLight: { value: new THREE.Color("#ffffff") },
            uSpec: { value: SPEC_DAY.clone() },
            uShine: { value: 180 },
          },
        ]),
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          #include <fog_pars_vertex>
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            vec4 mvPosition = viewMatrix * wp;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSun, uDeep, uShallow, uSky, uFoam, uLight, uSpec;
          uniform float uShine;
          varying vec3 vWorld;
          #include <fog_pars_fragment>
          vec2 wave(vec2 p, vec2 k, float w, float a) { return k * cos(dot(p, k) + uTime * w) * a; }
          void main() {
            vec2 p = vWorld.xz;
            vec2 g = wave(p, vec2(0.35, 0.2), 1.1, 0.5) + wave(p, vec2(-0.25, 0.45), 1.4, 0.35)
                   + wave(p, vec2(0.9, -0.6), 2.3, 0.12) + wave(p, vec2(-1.3, -0.9), 2.9, 0.08)
                   + wave(p, vec2(2.7, 1.9), 3.7, 0.03);
            vec3 n = normalize(vec3(-g.x * 0.45, 1.0, -g.y * 0.45));
            vec3 v = normalize(cameraPosition - vWorld);
            float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            float d = length(p);
            vec3 col = mix(uShallow, uDeep, smoothstep(${SHORE - 1}.0, ${SHORE + 40}.0, d));
            col = mix(col, uSky, fres * 0.65);
            float spec = pow(max(dot(reflect(-v, n), uSun), 0.0), uShine) * 4.0;
            col += uSpec * spec;
            float ripple = sin(d * 2.6 - uTime * 1.6 + sin(atan(p.y, p.x) * 9.0) * 0.8) * 0.5 + 0.5;
            float band = smoothstep(${SHORE + 3}.5, ${SHORE}.0, d) * step(${SHORE - 12}.0, d);
            col = mix(col, uFoam, smoothstep(0.55, 0.85, band * 0.7 + ripple * 0.45 * band) * 0.8);
            gl_FragColor = vec4(col * uLight, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }`,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const u = mat.uniforms, s = game.sunsetMix;
    u.uTime.value = clock.elapsedTime;
    nightTint(u.uLight.value);
    u.uSun.value.copy(game.sunDir);
    u.uShine.value = 180 - 130 * s;
    u.uSpec.value.copy(SPEC_DAY).lerp(SPEC_SUNSET, s);
    u.uSky.value.copy(SKY_DAY).lerp(SKY_SUNSET, s);
  });
  return (
    // huge, so at sunset the sea (not the sky) is what the sun sinks behind
    <mesh rotation-x={-Math.PI / 2} position-y={WATER_Y} material={mat}>
      <planeGeometry args={[6000, 6000]} />
    </mesh>
  );
}

// --- grass ------------------------------------------------------------------
// A fixed pool of blades tiles around the player (so the whole island has grass at
// constant cost). Height and "may grass grow here" come from a baked ground map.

const TILE = 64;

function groundMap() {
  const data = new Uint16Array(RES * RES * 2);
  for (let j = 0, k = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++, k++) {
      const x = -MAP / 2 + i * STEP, z = -MAP / 2 + j * STEP;
      const h = H[k], d = Math.hypot(x, z);
      const ok =
        d > 8.3 && d < sandEdge(x, z) - 0.5 && h > -0.25 && h < 6.5 &&
        PD[k] > 1.4 && PAD[k] > 0.6 && Math.hypot(x - CAMPFIRE.x, z - CAMPFIRE.z) > 2.2;
      data[k * 2] = THREE.DataUtils.toHalfFloat(h);
      data[k * 2 + 1] = THREE.DataUtils.toHalfFloat(ok ? 1 : 0);
    }
  }
  const tex = new THREE.DataTexture(data, RES, RES, THREE.RGFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; // soft edges: blades shrink near paths
  tex.needsUpdate = true;
  return tex;
}

export function Grass() {
  const { geo, mat, matrices } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.09, 1, 1, 4);
    geo.translate(0, 0.5, 0);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - uv.getY(i) * 0.92));

    const mat = new THREE.ShaderMaterial({
      fog: true,
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uPlayer: { value: new THREE.Vector3() },
          uMap: { value: null },
          uRoot: { value: new THREE.Color("#2f5a22") },
          uTipA: { value: new THREE.Color("#8fc055") },
          uTipB: { value: new THREE.Color("#c9cf6a") },
          uLight: { value: new THREE.Color("#ffffff") },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uPlayer, uTipA, uTipB;
        uniform sampler2D uMap;
        varying float vH;
        varying vec3 vTip;
        #include <fog_pars_vertex>
        void main() {
          // blades live at fixed world spots: local + whole tiles towards the player
          vec2 local = instanceMatrix[3].xz;
          vec2 wxz = local + ${TILE}.0 * floor((uPlayer.xz - local) / ${TILE}.0 + 0.5);
          vec4 g = texture2D(uMap, ((wxz + ${(MAP / 2).toFixed(1)}) / ${STEP.toFixed(6)} + 0.5) / ${RES}.0);
          float fade = 1.0 - smoothstep(${(TILE * 0.36).toFixed(2)}, ${(TILE * 0.5).toFixed(2)}, distance(wxz, uPlayer.xz));
          vec3 root = vec3(wxz.x, g.r - 0.05, wxz.y);
          vec3 wp = root + mat3(instanceMatrix) * position * (g.g * fade);
          float h = uv.y;
          float w = sin(uTime * 1.8 + root.x * 0.25 + root.z * 0.18) * 0.5 + sin(uTime * 3.1 + root.x * 0.7) * 0.18;
          wp.x += w * 0.25 * h * h;
          wp.z += w * 0.12 * h * h;
          vec2 away = root.xz - uPlayer.xz;
          float push = 1.0 - smoothstep(0.3, 1.6, length(away));
          wp.xz += normalize(away + 0.0001) * push * 0.55 * h * h;
          wp.y -= push * 0.3 * h;
          float r = fract(sin(dot(root.xz, vec2(12.9898, 78.233))) * 43758.5453);
          vTip = mix(uTipA, uTipB, r);
          vH = h;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uRoot, uLight;
        varying float vH;
        varying vec3 vTip;
        #include <fog_pars_fragment>
        void main() {
          gl_FragColor = vec4(mix(uRoot, vTip, smoothstep(0.0, 1.0, vH)) * uLight, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    mat.uniforms.uMap.value = groundMap();

    const count = matchMedia("(pointer: coarse)").matches ? 24000 : 60000;
    const r = rng(99);
    const matrices = Array.from({ length: count }, () =>
      mat4((r() - 0.5) * TILE, 0, (r() - 0.5) * TILE, r() * Math.PI, 1, 0.35 + r() * 0.45, 1),
    );
    return { geo, mat, matrices };
  }, []);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPlayer.value.copy(game.pos);
    nightTint(mat.uniforms.uLight.value);
  });

  return (
    <instancedMesh
      args={[geo, mat, matrices.length]}
      frustumCulled={false}
      ref={(m) => {
        if (!m || m.userData.ready) return;
        matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
        m.instanceMatrix.needsUpdate = true;
        m.userData.ready = true;
      }}
    />
  );
}

// --- trees, rocks, flowers, palms, mushrooms ---------------------------------

function palmGeometries() {
  const trunk: THREE.BufferGeometry[] = [];
  let x = 0, y = 0;
  for (let i = 0; i < 7; i++) {
    trunk.push(new THREE.CylinderGeometry(0.17 - i * 0.012, 0.2 - i * 0.012, 0.85, 7).rotateZ(-0.05 - i * 0.03).translate(x, y + 0.42, 0));
    x += 0.05 + i * 0.035;
    y += 0.8;
  }
  const leaves: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 7; k++) {
    leaves.push(
      new THREE.ConeGeometry(0.42, 2.6, 4, 1)
        .scale(1, 1, 0.18)
        .rotateX(Math.PI / 2)
        .translate(0, 0, 1.25)
        .rotateX(0.45)
        .rotateY((k / 7) * Math.PI * 2)
        .translate(x, y + 0.1, 0),
    );
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    leaves.push(new THREE.SphereGeometry(0.15, 6, 5).translate(x + Math.sin(a) * 0.22, y - 0.15, Math.cos(a) * 0.22));
  }
  return { trunk: mergeGeometries(trunk), crown: mergeGeometries(leaves.map((g) => g.toNonIndexed())) };
}

export function Scenery() {
  const parts = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 6).translate(0, 0.8, 0);
    const pine = mergeGeometries([
      new THREE.ConeGeometry(1.2, 1.8, 7).translate(0, 1.9, 0),
      new THREE.ConeGeometry(0.95, 1.5, 7).translate(0, 2.7, 0),
      new THREE.ConeGeometry(0.65, 1.2, 7).translate(0, 3.4, 0),
    ]);
    const round = mergeGeometries([
      new THREE.IcosahedronGeometry(1.15, 1).translate(0, 2.4, 0),
      new THREE.IcosahedronGeometry(0.75, 1).translate(0.55, 3.0, 0.2),
      new THREE.IcosahedronGeometry(0.7, 1).translate(-0.5, 2.9, -0.3),
    ]);
    const rock = new THREE.DodecahedronGeometry(1, 0);
    const bloom = new THREE.IcosahedronGeometry(0.09, 0);
    const palm = palmGeometries();
    const stem = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6).translate(0, 0.15, 0);
    const cap = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.28, 0);

    const flat = (color = "#ffffff", rough = 0.9) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
    const trunkMat = windy(flat("#6b4a2f"), 0.02);
    const leafMat = windy(flat(), 0.07);
    const palmLeafMat = windy(flat("#3f8f3a"), 0.05, 4);
    const capMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ff6b8a", emissiveIntensity: 0.25, roughness: 0.6 });

    const pines = TREES.filter((t) => t.kind === 0);
    const rounds = TREES.filter((t) => t.kind !== 0);
    const pineGreens = ["#2f6b3a", "#3b7a40", "#285e36"].map((c) => new THREE.Color(c));
    const roundCols = ["#6aa84f", "#d98b3a", "#e0a63c", "#7fb04f", "#c4642f"].map((c) => new THREE.Color(c));
    const flowerCols = ["#ffd1e8", "#fff6d5", "#f9a8d4", "#fde047", "#c4b5fd"].map((c) => new THREE.Color(c));
    const capCols = ["#e5484d", "#f5a524"].map((c) => new THREE.Color(c));
    const at = (t: Prop, sx = t.s, sy = sx) => mat4(t.x, t.y - 0.1, t.z, t.rot, sx, sy, sx);

    return [
      { geometry: trunk, material: trunkMat, matrices: TREES.map((t) => at(t)) },
      { geometry: pine, material: leafMat, matrices: pines.map((t) => at(t)), colors: pines.map((_, i) => pineGreens[i % 3]) },
      { geometry: round, material: leafMat, matrices: rounds.map((t) => at(t)), colors: rounds.map((_, i) => roundCols[i % 5]) },
      { geometry: rock, material: flat("#8e8a84", 1), matrices: ROCKS.map((t) => mat4(t.x, t.y + t.s * 0.1, t.z, t.rot, t.s * 1.3, t.s * 0.75, t.s)) },
      { geometry: palm.trunk, material: flat("#9a7650"), matrices: PALMS.map((t) => at(t)) },
      { geometry: palm.crown, material: palmLeafMat, matrices: PALMS.map((t) => at(t)) },
      { geometry: stem, material: flat("#f1e9d8"), shadow: false, matrices: MUSHROOMS.map((t) => at(t)) },
      { geometry: cap, material: capMat, shadow: false, matrices: MUSHROOMS.map((t) => at(t)), colors: MUSHROOMS.map((t) => capCols[t.kind]) },
      {
        geometry: bloom, material: flat(), shadow: false,
        matrices: FLOWERS.map((t) => mat4(t.x, t.y + 0.3 + t.s * 0.15, t.z, t.rot, t.s)),
        colors: FLOWERS.map((t) => flowerCols[t.kind]),
      },
    ];
  }, []);

  useFrame(({ clock }) => {
    wind.value = clock.elapsedTime;
  });

  return (
    <>
      {parts.map((p, i) => (
        <Instanced key={i} {...p} />
      ))}
    </>
  );
}

// --- sky life ---------------------------------------------------------------

export function Clouds() {
  const ref = useRef<THREE.Group>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const geo = useMemo(() => {
    const r = rng(5);
    const puffs: THREE.BufferGeometry[] = [];
    for (let c = 0; c < 24; c++) {
      const a = r() * Math.PI * 2, d = 50 + r() * 170, y = 34 + r() * 18;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const n = 4 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const s = 2.8 + r() * 3.4;
        puffs.push(new THREE.IcosahedronGeometry(s, 1).scale(1, 0.7, 1).translate(cx + (i - n / 2) * 3.2 + r(), y + r() * 1.8, cz + (r() - 0.5) * 4));
      }
    }
    return mergeGeometries(puffs);
  }, []);
  const day = useMemo(() => new THREE.Color("#ffffff"), []);
  const night = useMemo(() => new THREE.Color("#2a3352"), []);
  const sunset = useMemo(() => new THREE.Color("#ffb0a0"), []);
  const glowDay = useMemo(() => new THREE.Color("#ffd9b8"), []);
  const glowSunset = useMemo(() => new THREE.Color("#ff7a4a"), []);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 0.004;
    const s = game.sunsetMix;
    mat.current.color.copy(day).lerp(sunset, s).lerp(night, game.nightMix);
    mat.current.emissive.copy(glowDay).lerp(glowSunset, s);
    mat.current.emissiveIntensity = (0.35 + s * 0.55) * (1 - game.nightMix);
  });
  return (
    <group ref={ref}>
      <mesh geometry={geo}>
        <meshStandardMaterial ref={mat} color="#ffffff" emissive="#ffd9b8" emissiveIntensity={0.35} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function Birds() {
  const refs = useRef<THREE.Group[]>([]);
  const birds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ r: 22 + i * 3, y: 20 + (i % 3) * 3, off: i * 0.5, speed: 0.16 + (i % 2) * 0.04 })), []);
  const wing = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.25, 0.9, 0, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    birds.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = game.nightMix < 0.6; // birds roost at night
      const a = t * b.speed + b.off;
      g.position.set(Math.cos(a) * b.r, b.y + Math.sin(t * 0.8 + i) * 1.2, Math.sin(a) * b.r);
      g.rotation.y = -a;
      const flap = Math.sin(t * 9 + i * 2) * 0.6;
      g.children[0].rotation.z = flap;
      g.children[1].rotation.z = -flap;
    });
  });
  return (
    <>
      {birds.map((_, i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g; }} scale={0.9}>
          <mesh geometry={wing}><meshStandardMaterial color="#2b2b30" side={THREE.DoubleSide} /></mesh>
          <mesh geometry={wing} scale-x={-1}><meshStandardMaterial color="#2b2b30" side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
    </>
  );
}

// --- road centre-line dashes ---------------------------------------------------

export function RoadMarkings() {
  const mx = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const ok = (x: number, z: number, skipRing: boolean, skipSpoke: boolean) =>
      Math.hypot(x, z) > 8.6 && padDist(x, z) > 1.2 &&
      (!skipRing || Math.abs(Math.hypot(x, z) - RING) > ROAD_W + 0.4) &&
      (!skipSpoke || spokeDist(x, z) > ROAD_W + 0.4);
    for (const sp of PATHS) {
      const len = Math.hypot(sp.bx - sp.ax, sp.bz - sp.az), ux = (sp.bx - sp.ax) / len, uz = (sp.bz - sp.az) / len;
      for (let t = 2; t < len - 1.5; t += 3.4) {
        const x = sp.ax + ux * t, z = sp.az + uz * t;
        if (ok(x, z, true, false)) out.push(mat4(x, 0.06, z, Math.atan2(ux, uz), 0.16, 1, 1.6));
      }
    }
    const n = Math.round((2 * Math.PI * RING) / 3.4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * RING, z = Math.sin(a) * RING;
      if (ok(x, z, false, true)) out.push(mat4(x, 0.06, z, Math.atan2(-Math.sin(a), Math.cos(a)), 0.16, 1, 1.6));
    }
    return out;
  }, []);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 0.02, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3ead0", roughness: 0.6 }), []);
  return <Instanced geometry={geo} material={mat} matrices={mx} shadow={false} />;
}
