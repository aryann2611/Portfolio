import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { LANDMARKS, type Landmark } from "./data";
import { SIGNPOST } from "./Terrain";

export type V3 = [number, number, number];

// --- tiny building blocks ---------------------------------------------------

export function Mat({ c, m = 0, r = 0.8, flat = true }: { c: string; m?: number; r?: number; flat?: boolean }) {
  return <meshStandardMaterial color={c} metalness={m} roughness={r} flatShading={flat} />;
}
/** HDR emissive: values > 1 get picked up by bloom */
export function Glow({ c, i = 3 }: { c: string; i?: number }) {
  return <meshStandardMaterial color="#000000" emissive={c} emissiveIntensity={i} />;
}
export function B({ s, p, c = "#ffffff", rot, glow, i }: { s: V3; p: V3; c?: string; rot?: V3; glow?: string; i?: number }) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={s} />
      {glow ? <Glow c={glow} i={i} /> : <Mat c={c} />}
    </mesh>
  );
}
export function Cyl({ a, p, c = "#ffffff", rot, glow, i, m, r }: { a: [number, number, number, number]; p: V3; c?: string; rot?: V3; glow?: string; i?: number; m?: number; r?: number }) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={a} />
      {glow ? <Glow c={glow} i={i} /> : <Mat c={c} m={m} r={r} />}
    </mesh>
  );
}
function Prism({ w, h, depth, p, c }: { w: number; h: number; depth: number; p: V3; c: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(0, h);
    s.closePath();
    return s;
  }, [w, h]);
  return (
    <mesh position={p} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false }]} />
      <Mat c={c} />
    </mesh>
  );
}
function useSpin(speed: number) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * speed;
  });
  return ref;
}

// --- site wrapper: placement, quest marker, name plate, click ---------------

function Site({ l, discovered, labelY, onSelect, children }: { l: Landmark; discovered: boolean; labelY: number; onSelect: (l: Landmark) => void; children: ReactNode }) {
  const marker = useRef<THREE.Mesh>(null!);
  const label = useRef<HTMLDivElement>(null!);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    // distanceFactor makes plates huge right next to the camera: fade them out there
    const d = Math.hypot(camera.position.x - l.x, camera.position.z - l.z);
    if (label.current) label.current.style.opacity = String(Math.min(Math.max((d - 14) / 10, 0), 1));
    marker.current.position.y = labelY + 1.6 + Math.sin(t * 2 + l.x) * 0.25;
    marker.current.rotation.y = t * 1.2;
  });
  return (
    <group
      position={[l.x, 0, l.z]}
      rotation-y={Math.atan2(-l.x, -l.z)}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta < 8) onSelect(l);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {children}
      <mesh ref={marker} scale={[1, 1.5, 1]}>
        <octahedronGeometry args={[0.4, 0]} />
        <Glow c={discovered ? "#7ee2a8" : l.color} i={discovered ? 1.6 : 4} />
      </mesh>
      <Html position={[0, labelY, 0]} center distanceFactor={24} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className="whitespace-nowrap rounded-full border border-white/15 bg-black/60 px-3.5 py-1.5 text-center shadow-lg">
          <div className="font-display text-sm font-medium leading-tight text-white">{l.name}</div>
          <div className="font-mono text-[10px] uppercase leading-tight tracking-[0.18em]" style={{ color: l.color }}>
            {l.section}
          </div>
        </div>
      </Html>
    </group>
  );
}

// --- 01 Home ----------------------------------------------------------------

function Smoke({ p }: { p: V3 }) {
  const refs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      const k = (t * 0.3 + i / 6) % 1;
      m.position.set(Math.sin(k * 3 + i) * 0.25 + k * 0.9, k * 3.2, 0);
      m.scale.setScalar(0.25 + k * 0.75);
      (m.material as THREE.MeshStandardMaterial).opacity = (1 - k) * 0.55;
    });
  });
  return (
    <group position={p}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) refs.current[i] = m; }}>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial color="#e9e4dc" transparent depthWrite={false} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Home() {
  return (
    <group>
      <B s={[6.4, 0.4, 5.4]} p={[0, 0.2, 0]} c="#9a948a" />
      <B s={[5, 3, 4]} p={[0, 1.9, 0]} c="#efe3cf" />
      {[[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].map(([x, z]) => (
        <B key={`${x}${z}`} s={[0.3, 3.1, 0.3]} p={[x, 1.95, z]} c="#7a5236" />
      ))}
      <B s={[5.2, 0.25, 4.2]} p={[0, 3.45, 0]} c="#7a5236" />
      <Prism w={6.2} h={2.3} depth={5} p={[0, 3.55, -2.5]} c="#b5523b" />
      <B s={[1, 1.8, 0.12]} p={[0, 1.3, 2.02]} c="#6b3f26" />
      <B s={[0.12, 0.12, 0.1]} p={[0.3, 1.3, 2.1]} glow="#ffd27a" i={2} />
      {[-1.5, 1.5].map((x) => (
        <group key={x}>
          <B s={[1, 0.85, 0.1]} p={[x, 2.2, 2.02]} glow="#ffc477" i={2.4} />
          <B s={[1.2, 0.1, 0.25]} p={[x, 1.72, 2.1]} c="#7a5236" />
          <B s={[1.1, 0.25, 0.3]} p={[x, 1.6, 2.25]} c="#7a5236" />
          {[-0.35, 0, 0.35].map((dx, k) => (
            <mesh key={dx} position={[x + dx, 1.82, 2.25]}>
              <icosahedronGeometry args={[0.13, 0]} />
              <Mat c={["#f472b6", "#fde047", "#fb923c"][k]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-2.52, 2.52].map((x) => (
        <B key={x} s={[0.1, 0.85, 1]} p={[x, 2.2, 0]} glow="#ffc477" i={2.4} />
      ))}
      <B s={[0.6, 1.8, 0.6]} p={[1.6, 4.6, -0.8]} c="#8a7f72" />
      <Smoke p={[1.6, 5.6, -0.8]} />
      <B s={[1.8, 0.3, 0.8]} p={[0, 0.15, 3.1]} c="#8a7f72" />
      <Cyl a={[0.06, 0.08, 2.2, 6]} p={[1.9, 1.1, 3.4]} c="#2e2e2e" />
      <mesh position={[1.9, 2.3, 3.4]}>
        <icosahedronGeometry args={[0.2, 1]} />
        <Glow c="#ffb366" i={5} />
      </mesh>
      <pointLight position={[1.9, 2.3, 3.6]} color="#ffb366" intensity={8} distance={9} decay={2} />
    </group>
  );
}

// --- 02 Skill Tower -----------------------------------------------------------

const SKILL_COLORS = ["#5eead4", "#60a5fa", "#f472b6", "#facc15", "#a78bfa", "#fb923c"];

function Tower() {
  const orbit = useSpin(0.45);
  const orb = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    orb.current.position.y = 9.7 + Math.sin(clock.elapsedTime * 1.5) * 0.25;
    orb.current.rotation.y = clock.elapsedTime * 0.8;
  });
  const r = (y: number) => 1.9 - ((y - 0.6) / 7) * 0.4;
  return (
    <group>
      <Cyl a={[3, 3.3, 0.6, 8]} p={[0, 0.3, 0]} c="#8f8a80" />
      <Cyl a={[1.5, 1.9, 7, 8]} p={[0, 4.1, 0]} c="#ddd8cb" />
      {[2.2, 4.4, 6.6].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[r(y) + 0.03, 0.08, 6, 8]} />
          <Glow c="#5eead4" i={2.2} />
        </mesh>
      ))}
      <B s={[0.9, 1.6, 0.3]} p={[0, 1.4, 1.8]} c="#3b3026" />
      {[3.4, 5.5].map((y) => (
        <B key={y} s={[0.25, 0.9, 0.1]} p={[0, y, r(y) - 0.05]} glow="#9ff5e6" i={2.5} />
      ))}
      <Cyl a={[2.1, 1.6, 0.4, 8]} p={[0, 7.8, 0]} c="#8f8a80" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return <B key={i} s={[0.45, 0.5, 0.45]} p={[Math.sin(a) * 1.85, 8.25, Math.cos(a) * 1.85]} rot={[0, a, 0]} c="#8f8a80" />;
      })}
      <mesh ref={orb}>
        <icosahedronGeometry args={[0.7, 1]} />
        <Glow c="#5eead4" i={4} />
      </mesh>
      <pointLight position={[0, 9.7, 0]} color="#5eead4" intensity={14} distance={14} decay={2} />
      <group ref={orbit}>
        {SKILL_COLORS.map((c, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={c} position={[Math.sin(a) * 3.7, 3 + (i % 3) * 1.5, Math.cos(a) * 3.7]} scale={[1, 1.7, 1]} rotation-y={a}>
              <octahedronGeometry args={[0.32, 0]} />
              <Glow c={c} i={3} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// --- 03 Workshop (projects: under construction) -------------------------------

function useSignTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f2b632";
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#1b1a16";
    for (let x = -64; x < 576; x += 64) {
      for (const y of [0, 224]) {
        g.beginPath();
        g.moveTo(x, y + 32);
        g.lineTo(x + 32, y);
        g.lineTo(x + 64, y);
        g.lineTo(x + 32, y + 32);
        g.fill();
      }
    }
    g.textAlign = "center";
    g.font = "bold 66px 'JetBrains Mono', monospace";
    g.fillText("COMING", 256, 118);
    g.fillText("SOON", 256, 190);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

function Workshop() {
  const jib = useRef<THREE.Group>(null!);
  const hook = useRef<THREE.Group>(null!);
  const beacon = useRef<THREE.MeshStandardMaterial>(null!);
  const sign = useSignTexture();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    jib.current.rotation.y = Math.sin(t * 0.22) * 0.9 + 0.6;
    hook.current.rotation.z = Math.sin(t * 1.3) * 0.08;
    hook.current.rotation.x = Math.cos(t * 1.1) * 0.05;
    beacon.current.emissiveIntensity = Math.sin(t * 4) > 0.6 ? 6 : 0.3;
  });
  const steel = "#9aa1a8";
  return (
    <group>
      <B s={[8.5, 0.3, 6.5]} p={[0, 0.15, 0]} c="#a19d95" />
      <B s={[7, 1.6, 0.4]} p={[0, 1.1, -2.5]} c="#c46a4a" />
      <B s={[0.4, 1, 4.6]} p={[-3.5, 0.8, -0.2]} c="#c46a4a" />
      {[-3.5, 0, 3.5].flatMap((x) =>
        [-2.5, 2.5].map((z) => <B key={`${x}${z}`} s={[0.14, 4.6, 0.14]} p={[x, 2.6, z]} c={steel} />),
      )}
      {[2.3, 4.6].flatMap((y) => [
        ...[-2.5, 2.5].map((z) => <B key={`x${y}${z}`} s={[7.2, 0.12, 0.12]} p={[0, y, z]} c={steel} />),
        ...[-3.5, 3.5].map((x) => <B key={`z${y}${x}`} s={[0.12, 0.12, 5.2]} p={[x, y, 0]} c={steel} />),
      ])}
      <B s={[7, 0.1, 1.4]} p={[0, 2.42, -1.8]} c="#b98a55" />
      <B s={[0.9, 0.9, 0.9]} p={[2.3, 0.75, 1.2]} rot={[0, 0.3, 0]} c="#b98a55" />
      <B s={[0.7, 0.7, 0.7]} p={[2.4, 1.55, 1.15]} rot={[0, -0.2, 0]} c="#c79a63" />
      <B s={[0.8, 0.8, 0.8]} p={[1.3, 0.7, 1.6]} rot={[0, 0.9, 0]} c="#a87b4a" />
      {[-1.2, 0.4, 2].map((x) => (
        <group key={x} position={[x, 0.3, 3.6]}>
          <Cyl a={[0.04, 0.26, 0.65, 12]} p={[0, 0.33, 0]} c="#ff7a1a" />
          <Cyl a={[0.15, 0.19, 0.12, 12]} p={[0, 0.33, 0]} c="#ffffff" />
          <B s={[0.6, 0.06, 0.6]} p={[0, 0.03, 0]} c="#ff7a1a" />
        </group>
      ))}
      <B s={[0.1, 1.6, 0.1]} p={[-3.5, 0.8, 3.5]} c="#6b4a2f" />
      <B s={[0.1, 1.6, 0.1]} p={[-1.7, 0.8, 3.5]} c="#6b4a2f" />
      <mesh position={[-2.6, 1.55, 3.56]} castShadow>
        <planeGeometry args={[2.2, 1.1]} />
        <meshStandardMaterial map={sign} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* tower crane */}
      <group position={[4.8, 0, -3.6]}>
        <B s={[1.4, 0.4, 1.4]} p={[0, 0.2, 0]} c="#6b6b6b" />
        <B s={[0.55, 10.4, 0.55]} p={[0, 5.4, 0]} c="#f2b632" />
        {Array.from({ length: 6 }, (_, i) => (
          <B key={i} s={[0.06, 1.9, 0.6]} p={[0.3, 1.4 + i * 1.6, 0]} rot={[i % 2 ? 0.7 : -0.7, 0, 0]} c="#c99520" />
        ))}
        <group ref={jib} position={[0, 10.7, 0]}>
          <B s={[10, 0.45, 0.45]} p={[-3, 0, 0]} c="#f2b632" />
          <B s={[1.3, 0.9, 0.9]} p={[1.6, -0.35, 0]} c="#555555" />
          <B s={[0.9, 0.85, 0.9]} p={[0, -0.75, 0.6]} c="#f2b632" />
          <B s={[0.6, 0.4, 0.05]} p={[0, -0.7, 1.06]} glow="#bfe9ff" i={1.5} />
          <Cyl a={[0.04, 0.4, 1.8, 4]} p={[0, 1.1, 0]} c="#c99520" />
          <mesh position={[0, 2.05, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial ref={beacon} color="#000000" emissive="#ff2a2a" />
          </mesh>
          <group ref={hook} position={[-6, -0.2, 0]}>
            <B s={[0.04, 4.5, 0.04]} p={[0, -2.25, 0]} c="#222222" />
            <B s={[2.2, 0.28, 0.32]} p={[0, -4.6, 0]} c="#b98a55" />
          </group>
        </group>
      </group>
    </group>
  );
}

// --- 04 Academy ---------------------------------------------------------------

export function Flag({ p, color = "#3f6fc4" }: { p: V3; color?: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => new THREE.PlaneGeometry(1.8, 1.1, 14, 6).translate(0.9, 0, 0), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(x * 3 - t * 5) * 0.16 * (x / 1.8) + Math.sin(x * 5 - t * 7) * 0.04 * (x / 1.8));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <mesh ref={ref} geometry={geo} position={p} castShadow>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.9} />
    </mesh>
  );
}

function Torch({ p }: { p: V3 }) {
  const fire = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + p[0];
    fire.current.scale.set(1, 1 + Math.sin(t * 17) * 0.15 + Math.sin(t * 29) * 0.1, 1);
  });
  return (
    <group position={p}>
      <Cyl a={[0.08, 0.12, 1.6, 6]} p={[0, 0.8, 0]} c="#3a3a3a" />
      <Cyl a={[0.3, 0.15, 0.3, 8]} p={[0, 1.7, 0]} c="#6b5b45" m={0.5} r={0.4} />
      <mesh ref={fire} position={[0, 2.05, 0]}>
        <coneGeometry args={[0.2, 0.55, 6]} />
        <Glow c="#ff9a3c" i={6} />
      </mesh>
    </group>
  );
}

function Academy() {
  const cols: V3[] = [
    ...[-3, -1.8, -0.6, 0.6, 1.8, 3].map((x): V3 => [x, 0, 2.4]),
    ...[0.8, -0.8, -2.4].flatMap((z): V3[] => [[-3, 0, z], [3, 0, z]]),
  ];
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <B key={i} s={[9 - i * 0.6, 0.3, 7 - i * 0.6]} p={[0, 0.15 + i * 0.3, 0]} c={i % 2 ? "#e3ddd0" : "#d4cdbf"} />
      ))}
      <B s={[4.6, 3.6, 3.4]} p={[0, 2.7, -0.9]} c="#e2dccf" />
      <B s={[1.3, 2.3, 0.1]} p={[0, 2.05, 0.86]} glow="#ffd59a" i={1.8} />
      {cols.map(([x, , z]) => (
        <group key={`${x}${z}`}>
          <Cyl a={[0.27, 0.32, 3.6, 12]} p={[x, 2.7, z]} c="#f1ede4" />
          <B s={[0.75, 0.22, 0.75]} p={[x, 4.6, z]} c="#e7e1d4" />
          <B s={[0.75, 0.15, 0.75]} p={[x, 0.97, z]} c="#e7e1d4" />
        </group>
      ))}
      <B s={[7.6, 0.18, 6]} p={[0, 4.78, 0]} c="#5b7fb8" />
      <B s={[7.4, 0.45, 5.8]} p={[0, 5.1, 0]} c="#ebe5d8" />
      <Prism w={7.6} h={1.4} depth={6} p={[0, 5.32, -3]} c="#e7e1d4" />
      <mesh position={[0, 5.95, 3.02]}>
        <circleGeometry args={[0.32, 24]} />
        <Glow c="#93c5fd" i={2.5} />
      </mesh>
      <Cyl a={[0.05, 0.06, 5, 6]} p={[-5, 2.5, 3.2]} c="#cfcfcf" m={0.8} r={0.3} />
      <Flag p={[-5, 4.4, 3.2]} />
      <Torch p={[-4, 0, 4]} />
      <Torch p={[4, 0, 4]} />
    </group>
  );
}

// --- 05 Eternal Flame (achievements) -----------------------------------------

function Trophy({ p }: { p: V3 }) {
  const ref = useSpin(0.7);
  return (
    <group position={p}>
      <B s={[0.7, 1.1, 0.7]} p={[0, 0.55, 0]} c="#7d766c" />
      <group ref={ref} position={[0, 1.1, 0]}>
        <B s={[0.36, 0.1, 0.36]} p={[0, 0.05, 0]} c="#e8b94a" />
        <Cyl a={[0.05, 0.06, 0.28, 8]} p={[0, 0.24, 0]} c="#e8b94a" m={0.9} r={0.25} />
        <Cyl a={[0.3, 0.1, 0.42, 14]} p={[0, 0.58, 0]} c="#e8b94a" m={0.9} r={0.25} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.3 * s, 0.6, 0]} rotation-z={Math.PI / 2}>
            <torusGeometry args={[0.12, 0.03, 6, 12]} />
            <Mat c="#e8b94a" m={0.9} r={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Flame() {
  const layers = useRef<THREE.Mesh[]>([]);
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    layers.current.forEach((m, i) => {
      m.scale.y = m.userData.sy * (1 + Math.sin(t * 13 + i * 2) * 0.12 + Math.sin(t * 23 + i) * 0.07);
      m.rotation.z = Math.sin(t * 3 + i) * 0.06;
      m.rotation.y += dt * (i + 1) * 0.8;
    });
    light.current.intensity = 22 + Math.sin(t * 15) * 4 + Math.sin(t * 37) * 2;
  });
  const flame: { c: string; s: V3; i: number; o: number }[] = [
    { c: "#ff3d14", s: [1, 1, 1], i: 1.6, o: 0.75 },
    { c: "#ff7a1a", s: [0.72, 0.85, 0.72], i: 2.4, o: 0.85 },
    { c: "#ffc24a", s: [0.45, 0.65, 0.45], i: 4, o: 1 },
  ];
  return (
    <group>
      <Cyl a={[2.6, 2.9, 0.5, 10]} p={[0, 0.25, 0]} c="#6d675e" />
      <Cyl a={[1.9, 2.2, 0.5, 10]} p={[0, 0.75, 0]} c="#7d766c" />
      <Cyl a={[0.7, 0.9, 2, 10]} p={[0, 2, 0]} c="#7d766c" />
      <Cyl a={[1.3, 0.6, 0.7, 14]} p={[0, 3.35, 0]} c="#9c6b3c" m={0.7} r={0.35} />
      {flame.map((f, i) => (
        <mesh
          key={f.c}
          ref={(m) => {
            if (m) {
              layers.current[i] = m;
              m.userData.sy = f.s[1];
            }
          }}
          position={[0, 3.5 + 1.2 * f.s[1], 0]}
          scale={f.s}
        >
          <coneGeometry args={[0.75, 2.4, 7]} />
          <meshStandardMaterial color="#000000" emissive={f.c} emissiveIntensity={f.i} transparent opacity={f.o} depthWrite={false} />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 5, 0]} color="#ff7a2a" distance={16} decay={2} />
      <Sparkles count={45} scale={[2.2, 5, 2.2]} position={[0, 6, 0]} size={4} speed={0.9} color="#ffb15c" noise={1} />
      {[-0.9, 0, 0.9].map((a) => (
        <Trophy key={a} p={[Math.sin(a) * 2.6, 0.5, Math.cos(a) * 2.6]} />
      ))}
    </group>
  );
}

// --- 06 Observatory -----------------------------------------------------------

function Observatory() {
  const dome = useSpin(0.12);
  return (
    <group>
      <Cyl a={[3.4, 3.7, 0.4, 24]} p={[0, 0.2, 0]} c="#b9b3c9" />
      <Cyl a={[2.8, 2.8, 3.2, 24]} p={[0, 2, 0]} c="#ece9f3" />
      <Cyl a={[3, 3, 0.25, 24]} p={[0, 3.7, 0]} c="#7c6fb0" />
      <B s={[1, 1.8, 0.3]} p={[0, 1.3, 2.75]} c="#4b3f74" />
      {[-0.9, 0.9, 2.2, -2.2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 2.81, 2.3, Math.cos(a) * 2.81]} rotation-y={a}>
          <circleGeometry args={[0.28, 16]} />
          <Glow c="#c4b5fd" i={2.5} />
        </mesh>
      ))}
      <group ref={dome} position={[0, 3.82, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[2.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat c="#c9cbd6" m={0.6} r={0.35} flat={false} />
        </mesh>
        <B s={[0.9, 0.06, 2.3]} p={[0, 1.95, 1.75]} rot={[-0.72, 0, 0]} c="#1e1b2e" />
        <group position={[0, 1.2, 0]} rotation-x={-0.6}>
          <Cyl a={[0.32, 0.42, 3.9, 16]} p={[0, 0, 1.6]} rot={[Math.PI / 2, 0, 0]} c="#3d3a52" m={0.6} r={0.3} />
          <mesh position={[0, 0, 3.56]}>
            <circleGeometry args={[0.32, 20]} />
            <Glow c="#e0d7ff" i={3} />
          </mesh>
        </group>
      </group>
      <Sparkles count={70} scale={[9, 6, 9]} position={[0, 9, 0]} size={3} speed={0.25} color="#d8ccff" />
    </group>
  );
}

// --- 07 Lighthouse (contact) --------------------------------------------------

function Lighthouse() {
  const beam = useSpin(0.9);
  const segs = [0, 1, 2, 3];
  return (
    <group>
      {[[1.8, -1.6, 0.9], [-1.9, -1.2, 1.1], [0.9, -2.4, 0.7], [-1, -2.6, 0.8]].map(([x, z, s]) => (
        <mesh key={`${x}${z}`} position={[x, 0.1, z]} scale={[s * 1.2, s * 0.7, s]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <Mat c="#8b8780" />
        </mesh>
      ))}
      <Cyl a={[2.1, 2.3, 0.4, 16]} p={[0, 0.2, 0]} c="#8a8580" />
      {segs.map((i) => {
        const rb = 1.7 - i * 0.15;
        return <Cyl key={i} a={[rb - 0.15, rb, 2.2, 20]} p={[0, 0.4 + 1.1 + i * 2.2, 0]} c={i % 2 ? "#f4f1ea" : "#d64541"} />;
      })}
      <B s={[0.8, 1.5, 0.3]} p={[0, 1.15, 1.6]} c="#5a3a2a" />
      {[3.3, 5.5, 7.7].map((y, i) => (
        <B key={y} s={[0.3, 0.45, 0.1]} p={[0, y, 1.52 - i * 0.15]} glow="#ffe7a3" i={1.6} />
      ))}
      <Cyl a={[1.7, 1.7, 0.2, 20]} p={[0, 9.3, 0]} c="#2b2b2b" />
      <mesh position={[0, 9.85, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.62, 0.04, 6, 32]} />
        <Mat c="#2b2b2b" />
      </mesh>
      <Cyl a={[0.85, 0.85, 1.2, 12]} p={[0, 10, 0]} glow="#fff1b8" i={4} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return <B key={i} s={[0.06, 1.25, 0.06]} p={[Math.sin(a) * 0.88, 10, Math.cos(a) * 0.88]} c="#1f1f1f" />;
      })}
      <Cyl a={[0.05, 1.15, 1, 12]} p={[0, 11.1, 0]} c="#d64541" />
      <pointLight position={[0, 10, 0]} color="#ffe7a3" intensity={30} distance={26} decay={2} />
      <group ref={beam} position={[0, 10, 0]}>
        {[0, Math.PI].map((r) => (
          <group key={r} rotation-y={r}>
            <mesh position={[0, 0, 9]} rotation-x={-Math.PI / 2}>
              <coneGeometry args={[2.2, 18, 24, 1, true]} />
              <meshBasicMaterial color="#fff3c4" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
      {/* mailbox */}
      <group position={[2.4, 0, 2.2]} rotation-y={-0.4}>
        <B s={[0.12, 1.1, 0.12]} p={[0, 0.55, 0]} c="#6b4a2f" />
        <B s={[0.45, 0.4, 0.7]} p={[0, 1.25, 0]} c="#2d6cdf" />
        <B s={[0.05, 0.4, 0.1]} p={[0.25, 1.45, 0.15]} c="#e63946" />
      </group>
      {/* dock out to sea */}
      <B s={[1.6, 0.12, 8]} p={[0, 0.2, -7.5]} c="#9b7653" />
      {[-4.5, -7.5, -10.5].flatMap((z) =>
        [-0.75, 0.75].map((x) => <B key={`${x}${z}`} s={[0.16, 2.6, 0.16]} p={[x, -1, z]} c="#6b4a2f" />),
      )}
    </group>
  );
}

// --- plaza ------------------------------------------------------------------

function Plaza() {
  const angles = LANDMARKS.map((l) => Math.atan2(l.x, l.z)).sort((a, b) => a - b);
  const lanterns = angles.map((a, i) => {
    const b = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? Math.PI * 2 : 0);
    return (a + b) / 2;
  });
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2} scale={[1, 1, 0.35]} receiveShadow>
        <torusGeometry args={[7.6, 0.3, 6, 64]} />
        <Mat c="#a59d8f" />
      </mesh>
      {/* fountain */}
      <Cyl a={[2.3, 2.5, 0.6, 24]} p={[0, 0.3, 0]} c="#b3ab9d" />
      <mesh position={[0, 0.64, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[2.2, 0.14, 6, 32]} />
        <Mat c="#a59d8f" />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.1, 32]} />
        <meshStandardMaterial color="#3aa6b9" roughness={0.08} metalness={0.2} />
      </mesh>
      <Cyl a={[0.25, 0.35, 1.6, 12]} p={[0, 1.1, 0]} c="#b3ab9d" />
      <Cyl a={[0.9, 0.3, 0.35, 16]} p={[0, 1.95, 0]} c="#b3ab9d" />
      <Sparkles count={40} scale={[1.6, 1.8, 1.6]} position={[0, 1.6, 0]} size={3} speed={1.4} color="#d6f6ff" />
      {/* signpost */}
      <group position={[SIGNPOST.x, 0, SIGNPOST.z]}>
        <Cyl a={[0.09, 0.11, 3.9, 8]} p={[0, 1.95, 0]} c="#6b4a2f" />
        {LANDMARKS.map((l, i) => (
          <group key={l.id} position-y={1.3 + i * 0.36} rotation-y={Math.atan2(l.x - SIGNPOST.x, l.z - SIGNPOST.z)}>
            <B s={[0.07, 0.28, 1.2]} p={[0, 0, 0.6]} c="#c49a6c" />
            <B s={[0.09, 0.3, 0.22]} p={[0, 0, 1.18]} c={l.color} />
          </group>
        ))}
      </group>
      {lanterns.map((a) => (
        <group key={a} position={[Math.sin(a) * 7.4, 0, Math.cos(a) * 7.4]}>
          <Cyl a={[0.05, 0.07, 1.6, 6]} p={[0, 0.8, 0]} c="#2e2e2e" />
          <mesh position={[0, 1.7, 0]}>
            <icosahedronGeometry args={[0.16, 1]} />
            <Glow c="#ffcf8a" i={4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- all --------------------------------------------------------------------

const MODELS: Record<string, { Model: () => ReactNode; labelY: number }> = {
  about: { Model: Home, labelY: 7 },
  skills: { Model: Tower, labelY: 11.4 },
  projects: { Model: Workshop, labelY: 6.6 },
  experience: { Model: Academy, labelY: 7.8 },
  achievements: { Model: Flame, labelY: 7.4 },
  exploring: { Model: Observatory, labelY: 7.6 },
  contact: { Model: Lighthouse, labelY: 12.8 },
};

export function Landmarks({ discovered, onSelect }: { discovered: string[]; onSelect: (l: Landmark) => void }) {
  return (
    <>
      <Plaza />
      {LANDMARKS.map((l) => {
        const { Model, labelY } = MODELS[l.id];
        return (
          <Site key={l.id} l={l} discovered={discovered.includes(l.id)} labelY={labelY} onSelect={onSelect}>
            <Model />
          </Site>
        );
      })}
    </>
  );
}
