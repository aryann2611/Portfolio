import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { game } from "./data";
import { BENCH } from "./Terrain";
import { B, Cyl, Glow } from "./Landmarks";
import { sfx, sunsetMusic } from "./audio";

export type SunsetUi = { near: boolean; sitting: boolean };

const SIT_DIST = 2.6;
const FACE = { x: Math.sin(BENCH.rot), z: Math.cos(BENCH.rot) }; // towards the sun
const SIDE = { x: FACE.z, z: -FACE.x };
let nightBefore = false;

export function sit() {
  nightBefore = game.night;
  game.night = false; // the sunset always wins while you sit
  game.sitting = true;
  game.sitStart = performance.now() / 1000;
  game.target = null;
  game.keys.clear();
  sfx("land");
  sunsetMusic(true);
}

export function stand() {
  game.sitting = false;
  game.night = nightBefore;
  game.pos.set(BENCH.x + SIDE.x * 1.2, 0, BENCH.z + SIDE.z * 1.2);
  game.heading = BENCH.rot;
  game.camYaw = game.camYawGoal = BENCH.rot + Math.PI;
  game.startedAt = performance.now() / 1000; // slow, swooping camera return
  sunsetMusic(false);
}

/** Soft radial glow for the sun halo. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,220,170,0.7)");
  grad.addColorStop(0.45, "rgba(255,150,90,0.18)");
  grad.addColorStop(1, "rgba(255,120,80,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Bench() {
  return (
    <group position={[BENCH.x, BENCH.y, BENCH.z]} rotation-y={BENCH.rot}>
      {[-0.15, 0, 0.15].map((z) => (
        <B key={z} s={[1.9, 0.07, 0.13]} p={[0, 0.52, z]} c="#9a7650" />
      ))}
      {[0.75, 0.92].map((y) => (
        <B key={y} s={[1.9, 0.12, 0.05]} p={[0, y, -0.25]} rot={[-0.15, 0, 0]} c="#9a7650" />
      ))}
      {[-0.8, 0.8].map((x) => (
        <group key={x}>
          <B s={[0.12, 0.5, 0.45]} p={[x, 0.25, 0]} c="#3a3631" />
          <B s={[0.1, 0.55, 0.08]} p={[x, 0.75, -0.25]} rot={[-0.15, 0, 0]} c="#3a3631" />
        </group>
      ))}
      {/* a little lantern beside the bench */}
      <Cyl a={[0.04, 0.05, 1.3, 6]} p={[1.25, 0.65, -0.1]} c="#2e2e2e" />
      <mesh position={[1.25, 1.38, -0.1]}>
        <icosahedronGeometry args={[0.11, 1]} />
        <Glow c="#ffcf8a" i={3} />
      </mesh>
      {/* plaque */}
      <B s={[0.5, 0.18, 0.04]} p={[0, 0.3, 0.24]} c="#c79a63" />
    </group>
  );
}

const FLOCK = Array.from({ length: 9 }, (_, i) => {
  const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
  return { back: row * 2.2, out: i === 0 ? 0 : side * row * 2.6, flap: i * 0.7 };
});

/** Golden-hour sky painted over the physical sky: orange horizon, pink band, indigo zenith, warm glow round the sun. */
function makeSkyDome() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSun: { value: new THREE.Vector3() },
      uOpacity: { value: 0 },
      uHorizon: { value: new THREE.Color("#ffa070") },
      uMid: { value: new THREE.Color("#e86f86") },
      uZenith: { value: new THREE.Color("#33366e") },
      uGlow: { value: new THREE.Color("#ffb45a") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uHorizon, uMid, uZenith, uGlow;
      uniform float uOpacity;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        float toSun = max(dot(d, uSun), 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.16, h));
        col = mix(col, uZenith, smoothstep(0.12, 0.55, h));
        // the sky is hottest around the sun and along the horizon beneath it
        col += uGlow * (pow(toSun, 5.0) * 0.55 + pow(toSun, 48.0) * 1.4) * (1.0 - smoothstep(0.0, 0.45, h) * 0.6);
        gl_FragColor = vec4(col, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function Sunset({ onUi }: { onUi: (ui: SunsetUi) => void }) {
  const disc = useRef<THREE.Mesh>(null!);
  const dome = useRef<THREE.Mesh>(null!);
  const domeMat = useMemo(makeSkyDome, []);
  const halo = useRef<THREE.Sprite>(null!);
  const flock = useRef<THREE.Group>(null!);
  const motes = useRef<THREE.Group>(null!);
  const ui = useRef("");
  const tex = useMemo(glowTexture, []);
  const wing = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.3, 0, 0, -0.3, 1.3, 0.1, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame(({ camera, clock }) => {
    const s = game.sunsetMix, t = clock.elapsedTime;

    // sun disc + halo far away along the sun direction; the (huge) sea occludes them as they set
    const d = game.sunDir;
    dome.current.position.copy(camera.position);
    dome.current.visible = s > 0.01;
    domeMat.uniforms.uSun.value.copy(d);
    domeMat.uniforms.uOpacity.value = s * (1 - game.nightMix);
    disc.current.position.copy(camera.position).addScaledVector(d, 1400);
    halo.current.position.copy(disc.current.position);
    disc.current.visible = halo.current.visible = s > 0.01;
    (disc.current.material as THREE.MeshBasicMaterial).opacity = s;
    halo.current.material.opacity = s * 0.55;

    // a flock gliding across the sun, slowly, again and again
    flock.current.visible = s > 0.4;
    if (flock.current.visible) {
      const k = ((t * 0.035) % 1) * 2 - 1; // -1..1 across the view
      flock.current.position.set(
        BENCH.x + FACE.x * 140 + SIDE.x * k * 120,
        BENCH.y + 14 + Math.sin(t * 0.3) * 2,
        BENCH.z + FACE.z * 140 + SIDE.z * k * 120,
      );
      flock.current.rotation.y = Math.atan2(SIDE.x, SIDE.z);
      flock.current.children.forEach((b, i) => {
        const f = Math.sin(t * 5 + FLOCK[i].flap) * 0.55;
        b.children[0].rotation.z = f;
        b.children[1].rotation.z = -f;
      });
    }
    motes.current.visible = s > 0.2;

    const near = game.started && !game.sitting && Math.hypot(game.pos.x - BENCH.x, game.pos.z - BENCH.z) < SIT_DIST;
    const key = `${near}${game.sitting}`;
    if (key !== ui.current) {
      ui.current = key;
      onUi({ near, sitting: game.sitting });
    }
  });

  return (
    <>
      <Bench />
      <mesh ref={dome} material={domeMat} visible={false} renderOrder={-1}>
        <sphereGeometry args={[1500, 48, 24]} />
      </mesh>
      <mesh ref={disc} visible={false}>
        <sphereGeometry args={[40, 32, 16]} />
        <meshBasicMaterial color={new THREE.Color(3, 1.45, 0.55)} transparent depthWrite={false} fog={false} />
      </mesh>
      <sprite ref={halo} scale={420} visible={false}>
        <spriteMaterial map={tex} color="#ffb070" transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <group ref={flock} visible={false} scale={1.6}>
        {FLOCK.map((b, i) => (
          <group key={i} position={[b.out, Math.abs(b.out) * 0.15, -b.back]}>
            <mesh geometry={wing}><meshBasicMaterial color="#2a1a22" side={THREE.DoubleSide} fog={false} /></mesh>
            <mesh geometry={wing} scale-x={-1}><meshBasicMaterial color="#2a1a22" side={THREE.DoubleSide} fog={false} /></mesh>
          </group>
        ))}
      </group>
      <group ref={motes} position={[BENCH.x, BENCH.y + 1.5, BENCH.z]} visible={false}>
        <Sparkles count={50} scale={[9, 3, 9]} size={4} speed={0.25} color="#ffd59a" />
      </group>
    </>
  );
}
