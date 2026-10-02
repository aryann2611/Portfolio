import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER_Y, game } from "./data";
import { PIERS, deckAt, heightAt, walkable } from "./Terrain";
import { damp } from "./Character";
import { sfx } from "./audio";

const MAX_SPEED = 5;
const BOARD_DIST = 3.2;

// moored alongside the end of the lake pier
const P = PIERS[1];
const PIER_DIR = Math.atan2(P.bx - P.ax, P.bz - P.az);
const DOCK = {
  x: P.bx + Math.cos(PIER_DIR) * 1.9 - Math.sin(PIER_DIR) * 1.5,
  z: P.bz - Math.sin(PIER_DIR) * 1.9 - Math.cos(PIER_DIR) * 1.5,
  heading: PIER_DIR,
};

/** Shared boat state: Boat drives it, Player sits in it while `riding`. */
export const boat = {
  ...DOCK,
  y: WATER_Y + 0.15,
  roll: 0,
  speed: 0,
  turn: 0,
  row: 0,
  riding: false,
  /** where the player steps off if they leave now (null = too far from land) */
  land: null as THREE.Vector3 | null,
};

export type BoatUi = { near: boolean; riding: boolean; canLeave: boolean };

/** Open water the boat may float on: deep enough and not under a pier. */
const floatable = (x: number, z: number) => heightAt(x, z) < WATER_Y - 0.25 && deckAt(x, z) === null;

export function boardBoat() {
  boat.riding = true;
  boat.speed = 0;
  game.target = null;
  game.camYaw = game.camYawGoal = boat.heading + Math.PI;
  sfx("splash");
}

export function leaveBoat() {
  if (!boat.land) return;
  boat.riding = false;
  boat.speed = 0;
  game.pos.copy(boat.land);
  game.heading = Math.atan2(boat.land.x - boat.x, boat.land.z - boat.z);
  sfx("land");
}

/** Put the boat back at the pier (e.g. after fast travel while rowing). */
export function dockBoat() {
  boat.riding = false;
  Object.assign(boat, DOCK, { speed: 0 });
}

function findLanding() {
  let best: THREE.Vector3 | null = null, bestD = Infinity;
  for (const r of [1.4, 2.2, 3]) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = boat.x + Math.sin(a) * r, z = boat.z + Math.cos(a) * r;
      if (walkable(x, z) && r < bestD) {
        bestD = r;
        best = new THREE.Vector3(x, 0, z);
      }
    }
    if (best) return best;
  }
  return null;
}

const pressed = (...codes: string[]) => codes.some((c) => game.keys.has(c));

export function Boat({ onUi }: { onUi: (ui: BoatUi) => void }) {
  const root = useRef<THREE.Group>(null!);
  const oarL = useRef<THREE.Group>(null!);
  const oarR = useRef<THREE.Group>(null!);
  const wakes = useRef<THREE.Mesh[]>([]);
  const s = useRef({ ui: "", wakeT: 0, wakeI: 0, stroke: 1 });

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, st = s.current;

    if (boat.riding && !game.frozen) {
      // W/S row, A/D steer (or the touch joystick)
      let thrust = 0, steer = 0;
      if (pressed("KeyW", "ArrowUp")) thrust += 1;
      if (pressed("KeyS", "ArrowDown")) thrust -= 0.6;
      if (pressed("KeyA", "ArrowLeft")) steer += 1;
      if (pressed("KeyD", "ArrowRight")) steer -= 1;
      if (!thrust && !steer) {
        thrust = -game.joy.y;
        steer = -game.joy.x;
      }
      boat.speed = damp(boat.speed, thrust * MAX_SPEED, thrust ? 1.2 : 0.6, dt);
      boat.turn = damp(boat.turn, steer * (0.6 + Math.abs(boat.speed) * 0.15), 4, dt);
      boat.heading += boat.turn * dt;
      boat.row += dt * (thrust || steer ? 5 : 0);

      // move, bumping off shores and the pier
      const nx = boat.x + Math.sin(boat.heading) * boat.speed * dt;
      const nz = boat.z + Math.cos(boat.heading) * boat.speed * dt;
      const ahead = Math.sign(boat.speed || 1) * 1.4;
      if (floatable(nx, nz) && floatable(nx + Math.sin(boat.heading) * ahead, nz + Math.cos(boat.heading) * ahead)) {
        boat.x = nx;
        boat.z = nz;
      } else {
        boat.speed *= -0.25;
      }

      // splash on every oar stroke
      const stroke = Math.sign(Math.sin(boat.row));
      if (stroke > 0 && st.stroke <= 0) sfx("splash");
      st.stroke = stroke;
    }

    boat.land = boat.riding ? findLanding() : null;
    boat.y = WATER_Y + 0.12 + Math.sin(t * 1.3) * 0.05;
    boat.roll = Math.sin(t * 1.1) * 0.04 - boat.turn * 0.08;

    root.current.position.set(boat.x, boat.y, boat.z);
    root.current.rotation.set(Math.cos(t * 0.9) * 0.025, boat.heading, boat.roll);

    // oars sweep while rowing, rest flat otherwise
    const rowing = boat.riding && (Math.abs(boat.speed) > 0.2 || Math.abs(boat.turn) > 0.1);
    const sweep = rowing ? Math.sin(boat.row) * 0.55 : 0;
    const dip = rowing ? 0.3 + Math.cos(boat.row) * 0.18 : 0.15;
    oarL.current.rotation.set(0, -sweep, dip);
    oarR.current.rotation.set(0, sweep, -dip);

    // wake rings behind the boat
    st.wakeT -= dt;
    if (Math.abs(boat.speed) > 0.6 && st.wakeT <= 0) {
      st.wakeT = 0.22;
      const m = wakes.current[st.wakeI++ % wakes.current.length];
      if (m) {
        m.userData.life = 1.6;
        m.position.set(boat.x - Math.sin(boat.heading) * 1.3, WATER_Y + 0.02, boat.z - Math.cos(boat.heading) * 1.3);
      }
    }
    wakes.current.forEach((m) => {
      const life = (m.userData.life = (m.userData.life ?? 0) - dt);
      m.visible = life > 0;
      if (life <= 0) return;
      m.scale.setScalar(1 + (1.6 - life) * 2.2);
      (m.material as THREE.MeshBasicMaterial).opacity = (life / 1.6) * 0.45;
    });

    // tell the HUD when the prompt should change
    const near = !boat.riding && game.started && Math.hypot(game.pos.x - boat.x, game.pos.z - boat.z) < BOARD_DIST;
    const ui = { near, riding: boat.riding, canLeave: !!boat.land };
    const key = `${ui.near}${ui.riding}${ui.canLeave}`;
    if (key !== st.ui) {
      st.ui = key;
      onUi(ui);
    }
  });

  const wood = "#b5523b", trim = "#7a4a2a", plank = "#c79a63";
  return (
    <>
      <group ref={root}>
        {/* hull */}
        <mesh scale={[0.7, 0.42, 1.5]} castShadow receiveShadow>
          <sphereGeometry args={[1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={wood} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        <mesh position-y={-0.02} rotation-x={Math.PI / 2} scale={[0.7, 1.5, 1]}>
          <torusGeometry args={[1, 0.04, 6, 32]} />
          <meshStandardMaterial color={trim} roughness={0.7} />
        </mesh>
        <mesh position-y={-0.3} rotation-x={-Math.PI / 2} scale={[0.5, 1.15, 1]}>
          <circleGeometry args={[1, 20]} />
          <meshStandardMaterial color={plank} roughness={0.9} />
        </mesh>
        {/* seats */}
        {[-0.1, 0.85].map((z) => (
          <mesh key={z} position={[0, -0.08, z]} castShadow>
            <boxGeometry args={[1.25, 0.06, 0.3]} />
            <meshStandardMaterial color={plank} roughness={0.8} />
          </mesh>
        ))}
        {/* bow lantern */}
        <mesh position={[0, 0.25, 1.35]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
          <meshStandardMaterial color="#2e2e2e" />
        </mesh>
        <mesh position={[0, 0.52, 1.35]}>
          <icosahedronGeometry args={[0.09, 1]} />
          <meshStandardMaterial color="#000000" emissive="#ffcf8a" emissiveIntensity={4} />
        </mesh>
        {/* oars, pivoting at the rowlocks */}
        {[oarL, oarR].map((ref, i) => {
          const side = i ? 1 : -1;
          return (
            <group key={i} ref={ref} position={[side * 0.66, 0.02, 0.15]}>
              <mesh position={[side * 0.9, 0, 0]} rotation-z={Math.PI / 2}>
                <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
                <meshStandardMaterial color={plank} roughness={0.8} />
              </mesh>
              <mesh position={[side * 1.85, 0, 0]}>
                <boxGeometry args={[0.45, 0.03, 0.16]} />
                <meshStandardMaterial color={trim} roughness={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>

      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) wakes.current[i] = m; }} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.45, 0.6, 32]} />
          <meshBasicMaterial color="#e8f7ff" transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
