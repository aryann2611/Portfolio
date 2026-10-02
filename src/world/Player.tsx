import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LANDMARKS, ZONES, game, type Landmark, type Zone } from "./data";
import { BENCH, groundAt, heightAt, pushOut, walkable } from "./Terrain";
import { Character, animateRig, damp, dampAngle, type Look, type Rig } from "./Character";
import { sfx } from "./audio";
import { boat } from "./Boat";

const WALK = 5;
const SPRINT = 9.5;
const GRAVITY = 30;
const JUMP = 10;
const BODY_R = 0.45;

const pressed = (...codes: string[]) => codes.some((c) => game.keys.has(c));
const LOOK: Look = { top: "#e8934a", pants: "#2a2f45", skin: "#e0ac85", hair: "#2b2118", headphones: true, backpack: true };
const DAY_LIGHT = new THREE.Color("#ffd2a1");
const SUNSET_LIGHT = new THREE.Color("#ff7a3d");
const MOON_LIGHT = new THREE.Color("#9db4ff");

export function Player({ onNearby, onZone }: { onNearby: (l: Landmark | null) => void; onZone: (z: Zone) => void }) {
  const root = useRef<THREE.Group>(null!);
  const rig = useRef<Partial<Rig>>({});
  const sun = useRef<THREE.DirectionalLight>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const dust = useRef<THREE.Mesh[]>([]);

  const s = useRef({ vx: 0, vz: 0, vy: 0, jumpY: 0, grounded: true, phase: 0, squash: 0, dustT: 0, dustI: 0, stuck: 0, near: "", zone: "", step: 1 });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const st = s.current;
    const pos = game.pos;

    if (boat.riding) {
      // seated in the rowboat: follow it, pull the oars
      pos.set(boat.x - Math.sin(boat.heading) * 0.1, boat.y, boat.z - Math.cos(boat.heading) * 0.1);
      game.heading = boat.heading;
      game.follow = Math.abs(boat.speed) > 0.4;
      st.vx = st.vz = st.jumpY = st.vy = 0;
      st.grounded = true;
      root.current.position.set(pos.x, boat.y - 0.78, pos.z);
      root.current.rotation.set(0, boat.heading, boat.roll);
      const r = rig.current as Rig;
      if (r.body) {
        const pull = Math.sin(boat.row);
        r.legL.rotation.x = r.legR.rotation.x = -1.45;
        r.armL.rotation.x = r.armR.rotation.x = -1.2 + pull * 0.45;
        r.armL.rotation.z = -0.25;
        r.armR.rotation.z = 0.25;
        r.body.rotation.x = pull * 0.18;
        r.body.position.y = 0;
        r.body.scale.set(1, 1, 1);
        r.head.rotation.y = 0;
      }
    } else if (game.sitting) {
      // on the summit bench, facing the sunset
      const fx = Math.sin(BENCH.rot), fz = Math.cos(BENCH.rot);
      pos.set(BENCH.x + fx * 0.08, BENCH.y, BENCH.z + fz * 0.08);
      game.heading = BENCH.rot;
      game.follow = false;
      st.vx = st.vz = st.jumpY = st.vy = 0;
      st.grounded = true;
      root.current.position.set(pos.x, BENCH.y - 0.2, pos.z);
      root.current.rotation.set(0, BENCH.rot, 0);
      const r = rig.current as Rig;
      if (r.body) {
        r.legL.rotation.x = r.legR.rotation.x = -1.3;
        r.armL.rotation.x = r.armR.rotation.x = -0.45;
        r.armL.rotation.z = -0.15;
        r.armR.rotation.z = 0.15;
        r.body.rotation.x = damp(r.body.rotation.x, -0.06, 2, dt);
        r.body.position.y = Math.sin(t * 1.4) * 0.01; // slow breathing
        r.body.scale.set(1, 1, 1);
        r.head.rotation.x = damp(r.head.rotation.x, -0.12, 1.5, dt);
        r.head.rotation.y = Math.sin(t * 0.15) * 0.12;
      }
    } else {
      // --- input -> desired direction (keys, then touch joystick, then click target)
      let ix = 0, iz = 0;
      if (!game.frozen) {
        if (pressed("KeyW", "ArrowUp")) iz -= 1;
        if (pressed("KeyS", "ArrowDown")) iz += 1;
        if (pressed("KeyA", "ArrowLeft")) ix -= 1;
        if (pressed("KeyD", "ArrowRight")) ix += 1;
        if (!ix && !iz && Math.hypot(game.joy.x, game.joy.y) > 0.15) {
          ix = game.joy.x;
          iz = game.joy.y;
        }
      }
      let toTarget = 0;
      if (ix || iz) game.target = null;
      else if (game.target && !game.frozen) {
        const dx = game.target.x - pos.x, dz = game.target.z - pos.z;
        toTarget = Math.hypot(dx, dz);
        if (toTarget < 0.35) game.target = null;
        else {
          ix = dx;
          iz = dz;
        }
      }
      game.follow = !game.frozen && (iz < -0.3 || toTarget > 0);
      if (!game.target && (ix || iz)) {
        // keyboard / joystick input is camera-relative
        const c = Math.cos(game.camYaw), sn = Math.sin(game.camYaw);
        [ix, iz] = [ix * c + iz * sn, -ix * sn + iz * c];
      }
      const len = Math.hypot(ix, iz);
      const sprint = pressed("ShiftLeft", "ShiftRight") || toTarget > 7 || Math.hypot(game.joy.x, game.joy.y) > 0.9;
      const speed = len ? (sprint ? SPRINT : WALK) * Math.min(len, 1) : 0;
      st.vx = damp(st.vx, len ? (ix / len) * speed : 0, 10, dt);
      st.vz = damp(st.vz, len ? (iz / len) * speed : 0, 10, dt);

      // --- move (per axis, so you slide along shorelines) + collide
      const nx = pos.x + st.vx * dt;
      if (walkable(nx, pos.z)) pos.x = nx;
      else st.vx = 0;
      const nz = pos.z + st.vz * dt;
      if (walkable(pos.x, nz)) pos.z = nz;
      else st.vz = 0;
      pushOut(pos, BODY_R);
      // give up on a click target we can't reach (blocked by a building or water)
      st.stuck = toTarget > 0 && Math.hypot(st.vx, st.vz) < 1 ? st.stuck + dt : 0;
      if (st.stuck > 0.6) game.target = null;

      // --- jump
      if (pressed("Space") && st.grounded && !game.frozen) {
        st.vy = JUMP;
        st.grounded = false;
        sfx("jump");
      }
      st.vy -= GRAVITY * dt;
      st.jumpY += st.vy * dt;
      if (st.jumpY <= 0) {
        if (!st.grounded) {
          st.squash = 1;
          sfx("land");
          for (let i = 0; i < 6; i++) puff(i * 1.05, 1.6);
        }
        st.jumpY = 0;
        st.vy = 0;
        st.grounded = true;
      }
      pos.y = groundAt(pos.x, pos.z);
      root.current.position.set(pos.x, pos.y + st.jumpY, pos.z);

      // --- facing + animation
      const hs = Math.hypot(st.vx, st.vz);
      if (hs > 0.2) game.heading = dampAngle(game.heading, Math.atan2(st.vx, st.vz), 12, dt);
      root.current.rotation.set(0, game.heading, 0); // also clears the boat roll after stepping off
      st.phase += hs * dt * 2.1;
      st.squash = damp(st.squash, 0, 9, dt);
      const r = rig.current as Rig;
      if (r.body) animateRig(r, { speed: hs, phase: st.phase, grounded: st.grounded, lean: hs / SPRINT, squash: st.squash, t, dt, idleLook: true });

      // --- footsteps: one sound per foot fall
      const step = Math.sign(Math.sin(st.phase));
      if (st.grounded && hs > 1 && step !== st.step) sfx("step");
      st.step = step;

      // --- footstep dust when sprinting
      st.dustT -= dt;
      if (st.grounded && hs > 7 && st.dustT <= 0) {
        st.dustT = 0.07;
        puff(game.heading + Math.PI + (Math.random() - 0.5), 0.6);
      }
    }
    dust.current.forEach((m) => {
      const life = (m.userData.life -= dt);
      m.visible = life > 0;
      if (life <= 0) return;
      m.position.x += m.userData.vx * dt;
      m.position.z += m.userData.vz * dt;
      m.position.y += dt * 0.6;
      m.scale.setScalar(0.2 + (1 - life / 0.7) * 0.45);
      (m.material as THREE.MeshStandardMaterial).opacity = (life / 0.7) * 0.5;
    });

    // --- sun (or moon) follows the player so shadows stay crisp
    sun.current.position.copy(pos).addScaledVector(game.sunDir, 70);
    sun.current.target.position.copy(pos);
    sun.current.target.updateMatrixWorld();
    sun.current.intensity = 3.2 - game.nightMix * 2.6 - game.sunsetMix * 0.9;
    sun.current.color.copy(DAY_LIGHT).lerp(SUNSET_LIGHT, game.sunsetMix).lerp(MOON_LIGHT, game.nightMix);

    // --- click target marker
    ring.current.visible = !!game.target;
    if (game.target) {
      ring.current.position.set(game.target.x, heightAt(game.target.x, game.target.z) + 0.06, game.target.z);
      ring.current.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
    }

    // --- nearby landmark + current area
    let near: Landmark | null = null;
    for (const l of LANDMARKS) if (Math.hypot(pos.x - l.x, pos.z - l.z) < l.radius + 3.2) near = l;
    if ((near?.id ?? "") !== st.near) {
      st.near = near?.id ?? "";
      onNearby(near);
    }
    const zone = ZONES.find((z) => Math.hypot(pos.x - z.x, pos.z - z.z) < z.r);
    if ((zone?.id ?? "") !== st.zone) {
      st.zone = zone?.id ?? "";
      if (zone && game.started) onZone(zone);
    }

    function puff(angle: number, spread: number) {
      const m = dust.current[st.dustI++ % dust.current.length];
      if (!m) return;
      m.userData = { life: 0.7, vx: Math.sin(angle) * spread, vz: Math.cos(angle) * spread };
      m.position.set(pos.x, pos.y + 0.1, pos.z);
    }
  });

  return (
    <>
      <directionalLight
        ref={sun}
        castShadow
        color="#ffd2a1"
        intensity={3.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={4}
      />

      <group ref={root}>
        <Character look={LOOK} rig={rig} />
      </group>

      <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} ref={(m) => { if (m) dust.current[i] = m; }} visible={false}>
          <icosahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial color="#d8c7a4" transparent depthWrite={false} flatShading />
        </mesh>
      ))}

      <CameraRig />
    </>
  );
}

function CameraRig() {
  const look = useRef(new THREE.Vector3());
  const want = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    if (!game.started) {
      // cinematic orbit behind the title screen
      const a = t * 0.05 + 0.6;
      cam.position.set(Math.sin(a) * 105, 48 + Math.sin(t * 0.2) * 4, Math.cos(a) * 105);
      look.current.set(0, 0, 0);
      cam.lookAt(look.current);
      return;
    }
    if (game.sitting) {
      // cinematic: glide in behind the bench, then slowly pull back towards the setting sun
      const k = performance.now() / 1000 - game.sitStart, e = Math.min(k / 30, 1);
      const ease = e * e * (3 - 2 * e);
      const fx = Math.sin(BENCH.rot), fz = Math.cos(BENCH.rot);
      const back = 3.4 + ease * 5, up = 2.9 + ease * 2.2, side = 1.5 + Math.sin(k * 0.07) * 0.7; // camera to the sitter's left: they land on the right third
      want.current.set(BENCH.x - fx * back + fz * side, BENCH.y + up, BENCH.z - fz * back - fx * side);
      want.current.y = Math.max(want.current.y, heightAt(want.current.x, want.current.z) + 1.2);
      // look out towards the sun, tilted ~9° down: horizon and sun in the upper third, sitter lower right
      aim.current.set(want.current.x + fx * 50, want.current.y - 8, want.current.z + fz * 50);
      if (game.snapCamera) {
        cam.position.copy(want.current);
        look.current.copy(aim.current);
        game.snapCamera = false;
      }
      cam.position.lerp(want.current, 1 - Math.exp(-1.1 * dt));
      look.current.lerp(aim.current, 1 - Math.exp(-1.4 * dt));
      cam.lookAt(look.current);
      return;
    }
    // third-person: swing in behind the player while they run forward (unless the user just dragged)
    if (game.follow && performance.now() - game.lastDrag > 1500) {
      game.camYawGoal = dampAngle(game.camYawGoal, game.heading + Math.PI, 1.8, dt);
    }
    // ease towards the goals: no snapping on drag, wheel or follow
    game.camYaw = dampAngle(game.camYaw, game.camYawGoal, 10, dt);
    game.camPitch = damp(game.camPitch, game.camPitchGoal, 10, dt);
    game.zoom = damp(game.zoom, game.zoomGoal, 7, dt);
    const p = game.pos, dist = 9 * game.zoom, flat = Math.cos(game.camPitch) * dist;
    want.current.set(
      p.x + Math.sin(game.camYaw) * flat,
      p.y + 1.6 + Math.sin(game.camPitch) * dist,
      p.z + Math.cos(game.camYaw) * flat,
    );
    // don't let buildings come between the camera and the player: pull in to the first wall hit
    for (let k = 0.15; k <= 1; k += 0.05) {
      const x = p.x + (want.current.x - p.x) * k, z = p.z + (want.current.z - p.z) * k;
      if (LANDMARKS.some((l) => Math.hypot(x - l.x, z - l.z) < l.radius + 0.6)) {
        want.current.set(p.x + (want.current.x - p.x) * (k - 0.05), want.current.y, p.z + (want.current.z - p.z) * (k - 0.05));
        break;
      }
    }
    want.current.y = Math.max(want.current.y, heightAt(want.current.x, want.current.z) + 0.8); // don't dip into hills
    const target = aim.current.set(p.x, p.y + 2, p.z);
    if (game.snapCamera) {
      cam.position.copy(want.current);
      look.current.copy(target);
      game.snapCamera = false;
    }
    // slow, swooping blend right after the intro, then a tight follow
    const rate = Math.min(1 + (performance.now() / 1000 - game.startedAt) * 1.2, 5);
    cam.position.lerp(want.current, 1 - Math.exp(-rate * dt));
    look.current.lerp(target, 1 - Math.exp(-rate * 1.5 * dt));
    cam.lookAt(look.current);
  });
  return null;
}
