import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { BEACH } from "./data";
import { BENCH, CAMPFIRE, PIERS, SUMMIT, heightAt } from "./Terrain";
import { B, Cyl, Glow, Mat } from "./Landmarks";

// --- Summit Peak: cairn, flag, bench and a coin-op viewer ------------------------

function Summit() {
  const { cairn, viewer } = SUMMIT;
  const toBench = Math.atan2(BENCH.x - viewer.x, BENCH.z - viewer.z);
  return (
    <>
      {[0.9, 0.65, 0.45, 0.3].map((s, i) => (
        <mesh key={s} position={[cairn.x, heightAt(cairn.x, cairn.z) + 0.3 + i * 0.55, cairn.z]} rotation-y={i} scale={[s, s * 0.7, s]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <Mat c="#9a958c" />
        </mesh>
      ))}
      <group position={[viewer.x, heightAt(viewer.x, viewer.z), viewer.z]} rotation-y={toBench + Math.PI / 2}>
        <Cyl a={[0.07, 0.09, 1.2, 8]} p={[0, 0.6, 0]} c="#3a3a3a" />
        <B s={[0.5, 0.3, 0.35]} p={[0, 1.3, 0]} c="#2d6cdf" />
        {[-0.12, 0.12].map((x) => (
          <Cyl key={x} a={[0.07, 0.07, 0.25, 10]} p={[x, 1.32, 0.25]} rot={[Math.PI / 2, 0, 0]} c="#1f1f1f" />
        ))}
      </group>
    </>
  );
}

// --- Whispering Lake: pier, bobbing rowboat, campfire -------------------------------

function Campfire() {
  const flames = useRef<THREE.Mesh[]>([]);
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current.forEach((m, i) => {
      m.scale.y = 1 + Math.sin(t * 14 + i * 2) * 0.15 + Math.sin(t * 25 + i) * 0.08;
      m.rotation.y = t * (1 + i);
    });
    light.current.intensity = 9 + Math.sin(t * 13) * 2 + Math.sin(t * 31) * 1;
  });
  const y = heightAt(CAMPFIRE.x, CAMPFIRE.z);
  return (
    <group position={[CAMPFIRE.x, y, CAMPFIRE.z]}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.85, 0.08, Math.cos(a) * 0.85]} scale={[0.22, 0.16, 0.2]} rotation-y={a} castShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <Mat c="#8b8780" />
          </mesh>
        );
      })}
      {[0, 1, 2].map((i) => (
        <Cyl key={i} a={[0.09, 0.09, 1.1, 6]} p={[0, 0.15, 0]} rot={[Math.PI / 2 - 0.35, (i / 3) * Math.PI * 2, 0]} c="#5a3d24" />
      ))}
      {[
        { c: "#ff5a1f", s: 1, i: 3 },
        { c: "#ffc24a", s: 0.6, i: 5 },
      ].map((f, i) => (
        <mesh key={f.c} ref={(m) => { if (m) flames.current[i] = m; }} position={[0, 0.5 * f.s + 0.15, 0]} scale={f.s}>
          <coneGeometry args={[0.35, 1, 6]} />
          <meshStandardMaterial color="#000000" emissive={f.c} emissiveIntensity={f.i} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 1, 0]} color="#ff8a3d" distance={12} decay={2} />
      <Sparkles count={25} scale={[1, 3, 1]} position={[0, 2, 0]} size={3} speed={0.8} color="#ffb15c" />
      {[0.9, 2.6].map((a) => (
        <Cyl key={a} a={[0.22, 0.22, 1.8, 8]} p={[Math.sin(a) * 2.1, 0.2, Math.cos(a) * 2.1]} rot={[0, a + Math.PI / 2, Math.PI / 2]} c="#7a5236" />
      ))}
    </group>
  );
}

function Pier() {
  const p = PIERS[1];
  const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
  const rot = Math.atan2(p.bx - p.ax, p.bz - p.az);
  return (
    <group position={[(p.ax + p.bx) / 2, 0, (p.az + p.bz) / 2]} rotation-y={rot}>
      <B s={[p.w, 0.12, len]} p={[0, p.y - 0.06, 0]} c="#9b7653" />
      {Array.from({ length: 5 }, (_, i) => -len / 2 + 1 + i * ((len - 2) / 4)).flatMap((z) =>
        [-p.w / 2, p.w / 2].map((x) => <B key={`${x}${z}`} s={[0.16, 2.6, 0.16]} p={[x, p.y - 1.3, z]} c="#6b4a2f" />),
      )}
      <mesh position={[p.w / 2 - 0.1, p.y + 0.35, len / 2 - 0.4]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <Glow c="#ffcf8a" i={3} />
      </mesh>
    </group>
  );
}

// --- Palm Beach: umbrellas, loungers, a beach ball ----------------------------------

function Beach() {
  const spots = useMemo(
    () =>
      [
        { dx: -3, dz: -2, c: "#ff6b6b" },
        { dx: 2, dz: 4, c: "#5eead4" },
        { dx: -5, dz: 6, c: "#fcd34d" },
      ].map((s) => ({ ...s, x: BEACH.x + s.dx, z: BEACH.z + s.dz, y: heightAt(BEACH.x + s.dx, BEACH.z + s.dz) })),
    [],
  );
  const ballY = heightAt(BEACH.x - 1, BEACH.z + 1) + 0.3;
  return (
    <>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation-y={i * 1.3}>
          <Cyl a={[0.04, 0.04, 2.4, 6]} p={[0, 1.2, 0]} c="#e8e2d6" />
          <mesh position={[0, 2.35, 0]} castShadow>
            <coneGeometry args={[1.5, 0.6, 10, 1, true]} />
            <meshStandardMaterial color={s.c} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          <B s={[0.7, 0.08, 1.8]} p={[1.1, 0.3, 0.4]} rot={[0.12, 0, 0]} c="#f4f1ea" />
          <B s={[0.7, 0.08, 0.6]} p={[1.1, 0.55, -0.6]} rot={[-0.7, 0, 0]} c="#f4f1ea" />
          <mesh position={[-1, 0.03, 0.6]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.9, 1.8]} />
            <meshStandardMaterial color={s.c} roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[BEACH.x - 1, ballY, BEACH.z + 1]} castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff5d5d" emissiveIntensity={0.2} roughness={0.4} />
      </mesh>
    </>
  );
}

export function Props() {
  return (
    <>
      <Summit />
      <Pier />
      <Campfire />
      <Beach />
    </>
  );
}

