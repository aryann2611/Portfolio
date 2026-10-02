import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { SUN, game } from "./data";
import { damp } from "./Character";
import { rng } from "./Terrain";

const DAY_FOG = new THREE.Color("#e3c6a8");
const NIGHT_FOG = new THREE.Color("#121a33");
const DAY_SKY = new THREE.Color("#c9dcff");
const NIGHT_SKY = new THREE.Color("#3a4a80");
const MOON = new THREE.Vector3(-0.5, 0.45, 0.6).normalize().multiplyScalar(700);
const SUNSET_FOG = new THREE.Color("#f9a074"); // matches the sunset dome horizon so the sea fades seamlessly into it
const SUNSET_SKY = new THREE.Color("#ffb8a8");
const SUN_AZ = Math.atan2(SUN.z, SUN.x);
const SUN_ELEV = Math.atan2(SUN.y, Math.hypot(SUN.x, SUN.z));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Eases game.nightMix towards game.night and drives every global light/sky value from it. */
export function DayNight() {
  const { scene } = useThree();
  const sky = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const stars = useRef<THREE.PointsMaterial>(null!);
  const moon = useRef<THREE.Mesh>(null!);
  const flies = useRef<THREE.Group>(null!);
  const sun = useMemo(() => SUN.clone(), []);
  const starGeo = useMemo(() => {
    const r = rng(77), pts: number[] = [];
    for (let i = 0; i < 1800; i++) {
      const u = r() * 0.95 + 0.05, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pts.push(Math.cos(a) * s * 900, u * 900, Math.sin(a) * s * 900);
    }
    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    game.nightMix = damp(game.nightMix, game.night ? 1 : 0, 1.4, dt);
    // sitting on the summit bench: ease into golden hour, then let the sun slowly sink into the sea
    game.sunsetMix = damp(game.sunsetMix, game.sitting ? 1 : 0, game.sitting ? 0.32 : 0.9, dt);
    game.sunsetSink = Math.min(Math.max(game.sunsetSink + (game.sitting ? dt / 50 : -dt / 3), 0), 1);
    const n = game.nightMix, s = game.sunsetMix;

    const elev = lerp(SUN_ELEV, 0.07, s) - game.sunsetSink * 0.06 * s - n * 0.45;
    game.sunDir.set(Math.cos(elev) * Math.cos(SUN_AZ), Math.sin(elev), Math.cos(elev) * Math.sin(SUN_AZ));
    sun.copy(game.sunDir).multiplyScalar(100);
    const u = sky.current.material.uniforms;
    u.sunPosition.value.copy(sun); // R3F copied the prop into the uniform once; keep it in sync
    u.rayleigh.value = lerp(2.4, 3.8, s) - n * 2;
    u.turbidity.value = lerp(7, 11, s);
    u.mieCoefficient.value = lerp(0.006, 0.005, s);
    u.mieDirectionalG.value = lerp(0.86, 0.88, s);

    const fog = (scene.fog as THREE.Fog).color.copy(DAY_FOG).lerp(SUNSET_FOG, s).lerp(NIGHT_FOG, n);
    (scene.background as THREE.Color).copy(fog);
    scene.environmentIntensity = 1 - n * 0.8 - s * 0.35;
    hemi.current.intensity = 0.8 - n * 0.45 - s * 0.15;
    hemi.current.color.copy(DAY_SKY).lerp(SUNSET_SKY, s).lerp(NIGHT_SKY, n);
    stars.current.opacity = Math.max(n * 1.4 - 0.4, 0);
    moon.current.visible = n > 0.05;
    (moon.current.material as THREE.MeshStandardMaterial).emissiveIntensity = n * 2.5;
    flies.current.visible = n > 0.5;
    flies.current.position.copy(game.pos);
  });

  return (
    <>
      <Sky ref={sky} distance={2000} sunPosition={sun} turbidity={7} rayleigh={2.4} mieCoefficient={0.006} mieDirectionalG={0.86} />
      <hemisphereLight ref={hemi} args={["#c9dcff", "#5a4a32", 0.8]} />
      <points geometry={starGeo}>
        <pointsMaterial ref={stars} size={2} sizeAttenuation={false} color="#ffffff" transparent opacity={0} fog={false} depthWrite={false} />
      </points>
      <mesh ref={moon} position={MOON}>
        <sphereGeometry args={[22, 32, 16]} />
        <meshStandardMaterial color="#000000" emissive="#dfe7ff" fog={false} />
      </mesh>
      <group ref={flies}>
        <Sparkles count={160} scale={[50, 5, 50]} position={[0, 2.5, 0]} size={6} speed={0.35} color="#e4ff8a" />
      </group>
    </>
  );
}
