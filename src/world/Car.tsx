import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { game } from "./data";
import { groundAt, pushOut, walkable } from "./Terrain";
import { damp } from "./Character";
import { sfx } from "./audio";

const BOARD_DIST = 3.6;
const MAX = 20;
const BOOST = 30;
const R = 1.5; // collision radius
const PARK = { x: 8, z: 7, heading: -2.2 };

/** Shared car state: Car drives it, Player rides along while `driving`. */
export const car = { ...PARK, y: 0, speed: 0, driving: false };
export type CarUi = { near: boolean; driving: boolean };

export function boardCar() {
  car.driving = true;
  car.speed = 0;
  game.target = null;
  game.camYaw = game.camYawGoal = car.heading + Math.PI;
  sfx("land");
}

export function leaveCar() {
  car.driving = false;
  car.speed = 0;
  // step out on the driver's side, or behind the car if that side is water
  game.pos.set(car.x + Math.cos(car.heading) * 2.2, 0, car.z - Math.sin(car.heading) * 2.2);
  if (!walkable(game.pos.x, game.pos.z)) game.pos.set(car.x - Math.sin(car.heading) * 2.4, 0, car.z - Math.cos(car.heading) * 2.4);
  sfx("land");
}

const pressed = (...codes: string[]) => codes.some((c) => game.keys.has(c));
const tmp = new THREE.Vector3();

export function Car({ onUi }: { onUi: (ui: CarUi) => void }) {
  const root = useRef<THREE.Group>(null!);
  const wheels = useRef<THREE.Group[]>([]);
  const lamps = useRef<THREE.MeshStandardMaterial[]>([]);
  const s = useRef({ ui: "", spin: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05), st = s.current;

    if (car.driving && !game.frozen) {
      // W/S throttle, A/D steer, Shift boost, Space brake (or the touch joystick)
      let thrust = 0, steer = 0;
      if (pressed("KeyW", "ArrowUp")) thrust += 1;
      if (pressed("KeyS", "ArrowDown")) thrust -= 1;
      if (pressed("KeyA", "ArrowLeft")) steer += 1;
      if (pressed("KeyD", "ArrowRight")) steer -= 1;
      if (!thrust && !steer) {
        thrust = -game.joy.y;
        steer = -game.joy.x;
      }
      const top = pressed("ShiftLeft", "ShiftRight") ? BOOST : MAX;
      const braking = pressed("Space");
      car.speed = damp(car.speed, braking ? 0 : thrust > 0 ? thrust * top : thrust * 7, braking ? 4 : thrust ? 1.1 : 0.5, dt);
      car.heading += steer * Math.min(Math.abs(car.speed) / 4, 1) * 1.9 * Math.sign(car.speed) * dt;

      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      const nx = car.x + fx * car.speed * dt, nz = car.z + fz * car.speed * dt;
      const ahead = Math.sign(car.speed || 1) * 2;
      if (walkable(nx, nz) && walkable(nx + fx * ahead, nz + fz * ahead)) {
        tmp.set(nx, 0, nz);
        pushOut(tmp, R);
        if (Math.hypot(tmp.x - nx, tmp.z - nz) > 0.05) car.speed *= 0.6; // scraped a building or tree
        car.x = tmp.x;
        car.z = tmp.z;
      } else {
        car.speed *= -0.3; // shoreline
      }
    } else if (!car.driving) {
      car.speed = damp(car.speed, 0, 3, dt);
    }

    // sit on the ground and follow slopes
    const dx = Math.sin(car.heading), dz = Math.cos(car.heading);
    const gF = groundAt(car.x + dx * 1.3, car.z + dz * 1.3), gB = groundAt(car.x - dx * 1.3, car.z - dz * 1.3);
    car.y = damp(car.y, groundAt(car.x, car.z), 12, dt);
    root.current.rotation.order = "YXZ";
    root.current.rotation.set(-Math.atan2(gF - gB, 2.6), car.heading, 0);
    root.current.position.set(car.x, car.y + 0.02, car.z);

    st.spin += (car.speed / 0.36) * dt;
    wheels.current.forEach((w) => (w.rotation.x = st.spin));
    const glow = car.driving ? 1.5 + game.nightMix * 4 : 0.2;
    lamps.current.forEach((m) => (m.emissiveIntensity = glow));

    const near = !car.driving && game.started && !game.sitting && Math.hypot(game.pos.x - car.x, game.pos.z - car.z) < BOARD_DIST;
    const key = `${near}${car.driving}`;
    if (key !== st.ui) {
      st.ui = key;
      onUi({ near, driving: car.driving });
    }
  });

  const paint = "#d9503a", dark = "#1b1d27";
  return (
    <group ref={root}>
      {/* body */}
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.5, 3.5]} />
        <meshStandardMaterial color={paint} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.03, -0.25]} castShadow>
        <boxGeometry args={[1.5, 0.44, 1.8]} />
        <meshStandardMaterial color={paint} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* glass */}
      <mesh position={[0, 1.05, -0.25]}>
        <boxGeometry args={[1.54, 0.34, 1.6]} />
        <meshStandardMaterial color="#9fd4f2" metalness={0.8} roughness={0.08} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 1.27, -0.25]} castShadow>
        <boxGeometry args={[1.5, 0.05, 1.8]} />
        <meshStandardMaterial color={paint} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* bumpers + stripe */}
      {[1.78, -1.78].map((z) => (
        <mesh key={z} position={[0, 0.4, z]} castShadow>
          <boxGeometry args={[1.72, 0.18, 0.1]} />
          <meshStandardMaterial color={dark} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.84, 0.9]}>
        <boxGeometry args={[0.3, 0.015, 1.6]} />
        <meshStandardMaterial color="#f1ece2" roughness={0.5} />
      </mesh>
      {/* head and tail lights */}
      {[-0.6, 0.6].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.62, 1.76]}>
            <boxGeometry args={[0.32, 0.14, 0.05]} />
            <meshStandardMaterial ref={(m) => { if (m) lamps.current[x < 0 ? 0 : 1] = m; }} color="#fff6d8" emissive="#fff0b0" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[x, 0.62, -1.76]}>
            <boxGeometry args={[0.3, 0.12, 0.05]} />
            <meshStandardMaterial ref={(m) => { if (m) lamps.current[x < 0 ? 2 : 3] = m; }} color="#7a0d0d" emissive="#ff2a2a" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
      {/* wheels */}
      {[[-0.88, 1.1], [0.88, 1.1], [-0.88, -1.1], [0.88, -1.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z]}>
          <group ref={(g) => { if (g) wheels.current[i] = g; }}>
            <mesh rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.36, 0.36, 0.26, 18]} />
              <meshStandardMaterial color="#14151c" roughness={0.9} />
            </mesh>
            <mesh rotation-z={Math.PI / 2} position-x={x < 0 ? -0.07 : 0.07}>
              <cylinderGeometry args={[0.2, 0.2, 0.26, 10]} />
              <meshStandardMaterial color="#cfd3da" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
