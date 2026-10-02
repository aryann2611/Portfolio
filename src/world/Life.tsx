import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BEACH, LAKE, game } from "./data";
import { ORBS, groundAt, pushOut, walkable } from "./Terrain";
import { Character, animateRig, dampAngle, type Look, type Rig } from "./Character";
import { sfx } from "./audio";

// --- particles: pickup sparkles and fireworks ----------------------------------

const MAX = 4000;
const fx = {
  spawn: (() => {}) as (x: number, y: number, z: number, color: THREE.Color, n: number, speed: number, life: number) => void,
  fireworksUntil: 0,
};

export function burst(p: { x: number; y: number; z: number }, color: string, n = 50, speed = 5, life = 1.1) {
  fx.spawn(p.x, p.y, p.z, new THREE.Color(color), n, speed, life);
}
export function fireworks(seconds: number) {
  fx.fireworksUntil = performance.now() + seconds * 1000;
}

const FIREWORK_COLORS = ["#ff5d5d", "#ffd166", "#5eead4", "#93c5fd", "#c084fc", "#e8934a", "#ffffff"].map((c) => new THREE.Color(c));

export function Particles() {
  const sim = useMemo(() => {
    const pos = new Float32Array(MAX * 3).fill(-9999);
    const col = new Float32Array(MAX * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { geo, pos, col, vel: new Float32Array(MAX * 3), base: new Float32Array(MAX * 3), life: new Float32Array(MAX), max: new Float32Array(MAX), next: 0, rocketT: 0 };
  }, []);

  fx.spawn = (x, y, z, c, n, speed, life) => {
    for (let k = 0; k < n; k++) {
      const i = sim.next++ % MAX;
      // random direction on a sphere
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const v = speed * (0.6 + Math.random() * 0.4);
      sim.pos.set([x, y, z], i * 3);
      sim.vel.set([s * Math.cos(a) * v, u * v + speed * 0.3, s * Math.sin(a) * v], i * 3);
      sim.base.set([c.r * 4, c.g * 4, c.b * 4], i * 3); // HDR so bloom picks it up
      sim.life[i] = sim.max[i] = life * (0.7 + Math.random() * 0.5);
    }
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (performance.now() < fx.fireworksUntil) {
      sim.rocketT -= dt;
      if (sim.rocketT <= 0) {
        sim.rocketT = 0.3 + Math.random() * 0.4;
        const p = game.pos;
        fx.spawn(p.x + (Math.random() - 0.5) * 50, 24 + Math.random() * 14, p.z - 15 + (Math.random() - 0.5) * 40, FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0], 160, 11, 2);
        sfx("boom");
      }
    }
    for (let i = 0; i < MAX; i++) {
      if (sim.life[i] <= 0) continue;
      const l = (sim.life[i] -= dt), k = i * 3;
      if (l <= 0) {
        sim.pos[k + 1] = -9999;
        continue;
      }
      sim.vel[k] *= 0.97;
      sim.vel[k + 2] *= 0.97;
      sim.vel[k + 1] = sim.vel[k + 1] * 0.97 - 6 * dt;
      sim.pos[k] += sim.vel[k] * dt;
      sim.pos[k + 1] += sim.vel[k + 1] * dt;
      sim.pos[k + 2] += sim.vel[k + 2] * dt;
      const f = l / sim.max[i];
      sim.col[k] = sim.base[k] * f;
      sim.col[k + 1] = sim.base[k + 1] * f;
      sim.col[k + 2] = sim.base[k + 2] * f;
    }
    sim.geo.attributes.position.needsUpdate = true;
    sim.geo.attributes.color.needsUpdate = true;
  });

  return (
    <points geometry={sim.geo} frustumCulled={false}>
      <pointsMaterial size={0.35} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// --- collectible code orbs -------------------------------------------------------

export const ORB_COUNT = ORBS.length;
const ORB_COLOR = "#7df9ff";

export function Orbs({ collected, onCollect }: { collected: number[]; onCollect: (i: number) => void }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const taken = useRef(new Set<number>());
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, p = game.pos;
    ORBS.forEach((o, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.y = o.y + Math.sin(t * 2 + i) * 0.2;
      g.rotation.y = t * 1.5 + i;
      if (taken.current.has(i)) return;
      if (Math.hypot(p.x - o.x, p.z - o.z) < 1.4 && Math.abs(p.y + 1 - g.position.y) < 2.5) {
        taken.current.add(i);
        burst(g.position, ORB_COLOR, 70, 6);
        sfx("pickup");
        onCollect(i);
      }
    });
  });
  return (
    <>
      {ORBS.map((o, i) =>
        collected.includes(i) ? null : (
          <group key={i} position={[o.x, o.y, o.z]} ref={(g) => { refs.current[i] = g; }}>
            <mesh scale={[1, 1.4, 1]}>
              <octahedronGeometry args={[0.32, 0]} />
              <meshStandardMaterial color="#000000" emissive={ORB_COLOR} emissiveIntensity={4} />
            </mesh>
            <mesh rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.55, 0.03, 6, 24]} />
              <meshStandardMaterial color="#000000" emissive={ORB_COLOR} emissiveIntensity={2.5} />
            </mesh>
          </group>
        ),
      )}
    </>
  );
}

// --- villagers -------------------------------------------------------------------

type Npc = { name: string; look: Look; x: number; z: number; wander: number; line: string; face?: number };

// the fisherman stands on the shore just beside the lake pier
const LU = { x: -LAKE.x / Math.hypot(LAKE.x, LAKE.z), z: -LAKE.z / Math.hypot(LAKE.x, LAKE.z) };
const lakeEdge = { x: LAKE.x + LU.x * 14 - LU.z * 2.6, z: LAKE.z + LU.z * 14 + LU.x * 2.6 };

const NPCS: Npc[] = [
  { name: "Maya", x: 5, z: -6, wander: 7, look: { top: "#5b8def", pants: "#e8e1d3", skin: "#c98e64", hair: "#3a2318" }, line: "Welcome! Every building on this island is a chapter of Aryan's story. Walk up to one and press E." },
  { name: "Kabir", x: 22, z: -14, wander: 6, look: { top: "#3fae7a", pants: "#2f3542", skin: "#d9a07a", hair: "#121212", hat: "#c7a26b" }, line: "The Skill Tower glows like crazy at night. Press N and see for yourself!" },
  { name: "Zoe", x: BEACH.x - 6, z: BEACH.z + 2, wander: 6, look: { top: "#f472b6", pants: "#1e3a5f", skin: "#f1c7a5", hair: "#e3b04b" }, line: "Did you know Aryan kept a CSSBattle streak alive for 400+ days? The Eternal Flame celebrates it." },
  { name: "Ravi", x: 30, z: 9, wander: 5, look: { top: "#f59e0b", pants: "#3b3b3b", skin: "#b8835c", hair: "#1c1c1c", hat: "#f2b632" }, line: "The Workshop is where Aryan's projects are being built. Big things are coming soon." },
  { name: "Old Nanu", ...lakeEdge, wander: 0, face: Math.atan2(LAKE.x - lakeEdge.x, LAKE.z - lakeEdge.z), look: { top: "#7c6f5a", pants: "#4a4338", skin: "#c69772", hair: "#d8d8d8", hat: "#8a6d3b", rod: true }, line: "Take my rowboat for a spin. It's tied at the end of the pier. Something glows out in the middle of the lake..." },
];

function Villager({ npc, index }: { npc: Npc; index: number }) {
  const root = useRef<THREE.Group>(null!);
  const bubble = useRef<HTMLDivElement>(null);
  const rig = useRef<Partial<Rig>>({});
  const s = useMemo(
    () => ({ pos: new THREE.Vector3(npc.x, 0, npc.z), target: null as THREE.Vector3 | null, wait: 1 + Math.random() * 3, heading: npc.face ?? Math.random() * 6, phase: 0, speed: 0, talking: false }),
    [npc],
  );
  game.npcs[index] = s.pos;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, p = game.pos;
    const dist = Math.hypot(p.x - s.pos.x, p.z - s.pos.z);
    const talking = dist < 4.5 && game.started;
    if (talking && !s.talking) sfx("talk");
    s.talking = talking;

    let want = 0;
    if (talking) {
      s.heading = dampAngle(s.heading, Math.atan2(p.x - s.pos.x, p.z - s.pos.z), 6, dt);
    } else if (npc.wander > 0) {
      if (s.wait > 0) s.wait -= dt;
      else if (!s.target) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * npc.wander;
        const tx = npc.x + Math.cos(a) * r, tz = npc.z + Math.sin(a) * r;
        if (walkable(tx, tz)) s.target = new THREE.Vector3(tx, 0, tz);
      } else {
        const dx = s.target.x - s.pos.x, dz = s.target.z - s.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3) {
          s.target = null;
          s.wait = 2 + Math.random() * 4;
        } else {
          want = 1.6;
          s.heading = dampAngle(s.heading, Math.atan2(dx, dz), 5, dt);
        }
      }
    } else if (npc.face !== undefined) {
      s.heading = dampAngle(s.heading, npc.face, 3, dt);
    }
    s.speed += (want - s.speed) * Math.min(dt * 6, 1);
    const ox = s.pos.x, oz = s.pos.z;
    s.pos.x += Math.sin(s.heading) * s.speed * dt;
    s.pos.z += Math.cos(s.heading) * s.speed * dt;
    pushOut(s.pos, 0.4);
    if (!walkable(s.pos.x, s.pos.z)) {
      s.pos.x = ox;
      s.pos.z = oz;
      s.target = null;
    }
    s.pos.y = groundAt(s.pos.x, s.pos.z);
    root.current.position.copy(s.pos);
    root.current.rotation.y = s.heading;

    s.phase += s.speed * dt * 2.1;
    const r = rig.current as Rig;
    if (r.body) animateRig(r, { speed: s.speed, phase: s.phase, grounded: true, lean: 0, squash: 0, t: t + index, dt, idleLook: !talking });
    if (bubble.current) {
      bubble.current.style.opacity = talking ? "1" : "0";
      bubble.current.style.transform = `translateY(${talking ? 0 : 8}px)`;
    }
  });

  return (
    <group ref={root}>
      <Character look={npc.look} rig={rig} />
      <Html position={[0, 2.5, 0]} center distanceFactor={9} zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <div ref={bubble} className="w-56 rounded-2xl border border-white/15 bg-black/75 px-3.5 py-2.5 text-left opacity-0 shadow-xl transition-all duration-300">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{npc.name}</p>
          <p className="mt-1 text-[12px] leading-snug text-white/90">{npc.line}</p>
        </div>
      </Html>
    </group>
  );
}

export function Villagers() {
  return (
    <>
      {NPCS.map((n, i) => (
        <Villager key={n.name} npc={n} index={i} />
      ))}
    </>
  );
}
