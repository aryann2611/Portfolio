import type { RefObject } from "react";
import * as THREE from "three";

export type Rig = { body: THREE.Group; head: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group };
export type Look = { top: string; pants: string; skin: string; hair: string; shoes?: string; headphones?: boolean; backpack?: boolean; hat?: string; rod?: boolean };

export const damp = (a: number, b: number, rate: number, dt: number) => b + (a - b) * Math.exp(-rate * dt);
export const dampAngle = (a: number, b: number, rate: number, dt: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-rate * dt));

function Mat({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.75} />;
}

/** Procedural walk / run / jump / idle pose. `speed` in m/s, `lean` 0..1. */
export function animateRig(r: Rig, o: { speed: number; phase: number; grounded: boolean; lean: number; squash: number; t: number; dt: number; idleLook?: boolean }) {
  const { dt, t } = o;
  const amt = Math.min(o.speed / 5, 1.4);
  const swing = Math.sin(o.phase);
  if (o.grounded) {
    r.legL.rotation.x = swing * 0.85 * amt;
    r.legR.rotation.x = -swing * 0.85 * amt;
    r.armL.rotation.x = -swing * 0.8 * amt;
    r.armR.rotation.x = swing * 0.8 * amt;
    r.armL.rotation.z = damp(r.armL.rotation.z, -0.08, 10, dt);
    r.armR.rotation.z = damp(r.armR.rotation.z, 0.08, 10, dt);
  } else {
    r.legL.rotation.x = damp(r.legL.rotation.x, -0.9, 12, dt);
    r.legR.rotation.x = damp(r.legR.rotation.x, 0.4, 12, dt);
    r.armL.rotation.z = damp(r.armL.rotation.z, -2.4, 12, dt);
    r.armR.rotation.z = damp(r.armR.rotation.z, 2.4, 12, dt);
    r.armL.rotation.x = damp(r.armL.rotation.x, 0, 12, dt);
    r.armR.rotation.x = damp(r.armR.rotation.x, 0, 12, dt);
  }
  r.body.position.y = Math.abs(swing) * 0.09 * amt + Math.sin(t * 2.2) * 0.012;
  r.body.rotation.x = damp(r.body.rotation.x, o.lean * 0.28, 8, dt);
  r.body.scale.set(1 + o.squash * 0.18, 1 - o.squash * 0.22 + Math.sin(t * 2.2) * 0.008, 1 + o.squash * 0.18);
  r.head.rotation.x = damp(r.head.rotation.x, 0, 6, dt);
  r.head.rotation.y = o.idleLook && o.speed < 0.3 ? Math.sin(t * 0.6) * 0.35 : damp(r.head.rotation.y, 0, 6, dt);
}

/** Low-poly person. Parts are written into `rig` so the caller can animate them. */
export function Character({ look, rig }: { look: Look; rig: RefObject<Partial<Rig>> }) {
  const set = (k: keyof Rig) => (g: THREE.Group | null) => {
    if (g && rig.current) rig.current[k] = g;
  };
  return (
    <group ref={set("body")}>
      {(["legL", "legR"] as const).map((k, i) => (
        <group key={k} ref={set(k)} position={[i ? 0.15 : -0.15, 0.75, 0]}>
          <mesh position={[0, -0.34, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <Mat c={look.pants} />
          </mesh>
          <mesh position={[0, -0.68, 0.06]} castShadow>
            <boxGeometry args={[0.2, 0.13, 0.34]} />
            <Mat c={look.shoes ?? "#f1ece2"} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.06, 0]} castShadow>
        <capsuleGeometry args={[0.27, 0.36, 6, 16]} />
        <Mat c={look.top} />
      </mesh>
      {look.backpack && (
        <>
          <mesh position={[0, 1.42, -0.06]} rotation-x={-0.3} castShadow>
            <torusGeometry args={[0.2, 0.07, 8, 16]} />
            <Mat c="#c8743a" />
          </mesh>
          <mesh position={[0, 1.08, -0.3]} castShadow>
            <boxGeometry args={[0.4, 0.46, 0.2]} />
            <Mat c="#34405e" />
          </mesh>
          <mesh position={[0, 1.1, -0.41]}>
            <boxGeometry args={[0.24, 0.05, 0.02]} />
            <meshStandardMaterial color="#000000" emissive="#5eead4" emissiveIntensity={3} />
          </mesh>
        </>
      )}
      {(["armL", "armR"] as const).map((k, i) => (
        <group key={k} ref={set(k)} position={[i ? 0.36 : -0.36, 1.33, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.34, 4, 10]} />
            <Mat c={look.top} />
          </mesh>
          <mesh position={[0, -0.54, 0]} castShadow>
            <sphereGeometry args={[0.085, 12, 10]} />
            <Mat c={look.skin} />
          </mesh>
          {look.rod && i === 1 && (
            <mesh position={[0, 0, 0.97]} rotation-x={Math.PI / 2 - 0.5}>
              <cylinderGeometry args={[0.015, 0.025, 2.4, 5]} />
              <Mat c="#5a3d24" />
            </mesh>
          )}
        </group>
      ))}
      <group ref={set("head")} position={[0, 1.7, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.26, 28, 20]} />
          <Mat c={look.skin} />
        </mesh>
        <mesh position={[0, 0.05, -0.03]} rotation-x={-0.4} scale={[1.06, 0.95, 1.08]} castShadow>
          <sphereGeometry args={[0.27, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <Mat c={look.hair} />
        </mesh>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.01, 0.24]}>
            <sphereGeometry args={[0.032, 10, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
          </mesh>
        ))}
        {look.hat && (
          <group position={[0, 0.2, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.42, 0.42, 0.04, 20]} />
              <Mat c={look.hat} />
            </mesh>
            <mesh position={[0, 0.12, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.24, 0.24, 16]} />
              <Mat c={look.hat} />
            </mesh>
          </group>
        )}
        {look.headphones && (
          <>
            <mesh position={[0, 0.02, 0]}>
              <torusGeometry args={[0.29, 0.025, 6, 24, Math.PI]} />
              <Mat c="#1f2230" />
            </mesh>
            {[-0.28, 0.28].map((x) => (
              <group key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
                  <Mat c="#1f2230" />
                </mesh>
                <mesh position={[0, x > 0 ? -0.042 : 0.042, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.01, 16]} />
                  <meshStandardMaterial color="#000000" emissive={look.top} emissiveIntensity={3} />
                </mesh>
              </group>
            ))}
          </>
        )}
      </group>
    </group>
  );
}
