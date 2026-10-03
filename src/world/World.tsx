import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type BrightnessContrastEffect, type HueSaturationEffect, type VignetteEffect } from "postprocessing";
import type { Vector3 } from "three";
import { LANDMARKS, frontOf, game, type Landmark, type Zone } from "./data";
import { Birds, Clouds, Grass, Island, Scenery, Water } from "./Terrain";
import { Landmarks } from "./Landmarks";
import { Player } from "./Player";
import { Props } from "./Props";
import { Rain } from "./Weather";
import { DayNight } from "./DayNight";
import { ORB_COUNT, Orbs, Particles, Villagers, fireworks } from "./Life";
import { initAudio, setMuted as setAudioMuted, sfx } from "./audio";
import { Cinematic, Controls, Intro, Joystick, Minimap, Panel, Prompt, QuestLog, RowingHint, Toast, TopBar, type Action, type ToastMsg } from "./Hud";
import { Boat, boardBoat, boat, dockBoat, leaveBoat, type BoatUi } from "./Boat";
import { Car, boardCar, car, leaveCar, type CarUi } from "./Car";
import { Sunset, sit, stand, type SunsetUi } from "./Sunset";

const FOG = "#e3c6a8";
const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "Space"];
const hour = new Date().getHours();
game.night = hour >= 19 || hour < 6; // visit after dark and the island is at night too
game.nightMix = game.night ? 1 : 0;

export default function World() {
  const [started, setStarted] = useState(game.started);
  const [nearby, setNearby] = useState<Landmark | null>(null);
  const [open, setOpen] = useState<Landmark | null>(null);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [, setZones] = useState<string[]>([]);
  const [collected, setCollected] = useState<number[]>([]);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [night, setNight] = useState(game.night);
  const [muted, setMuted] = useState(false);
  const [rain, setRain] = useState(false);
  const [shot, setShot] = useState(false);
  const [boatUi, setBoatUi] = useState<BoatUi>({ near: false, riding: false, canLeave: false });
  const [carUi, setCarUi] = useState<CarUi>({ near: false, driving: false });
  const [sunsetUi, setSunsetUi] = useState<SunsetUi>({ near: false, sitting: false });
  const [fading, setFading] = useState(false);
  const [hq, setHq] = useState(true);
  const [dpr, setDpr] = useState(Math.min(devicePixelRatio, 2));
  /** 0 compiling shaders, 1 rendering first frames under the cover, 2 ready */
  const [stage, setStage] = useState(0);
  const grade = useRef<Grade>({ sat: null, bc: null, vig: null });
  const compiled = useCallback(() => setStage(1), []);
  const warmedUp = useCallback(() => setStage(2), []);

  const nearbyRef = useRef(nearby);
  const openRef = useRef(open);
  const boatRef = useRef(boatUi);
  const benchRef = useRef(sunsetUi);
  const carRef = useRef(carUi);
  useEffect(() => {
    nearbyRef.current = nearby;
    openRef.current = open;
    boatRef.current = boatUi;
    benchRef.current = sunsetUi;
    carRef.current = carUi;
  }, [nearby, open, boatUi, sunsetUi, carUi]);

  const openPanel = useCallback((l: Landmark | null) => {
    if (l || openRef.current) sfx(l ? "open" : "close");
    openRef.current = l;
    setOpen(l);
    game.frozen = !!l || !game.started;
    game.keys.clear();
    game.target = null;
  }, []);

  const start = () => {
    initAudio();
    game.started = true;
    game.startedAt = performance.now() / 1000;
    game.frozen = false;
    setStarted(true);
  };

  const toggleNight = useCallback(() => {
    game.night = !game.night;
    setNight(game.night);
  }, []);
  const toggleRain = useCallback(() => {
    game.rain = !game.rain;
    setRain(game.rain);
  }, []);
  const [snapCanvas, setSnapCanvas] = useState<HTMLCanvasElement | null>(null);
  const photo = useCallback(() => {
    if (!snapCanvas) return;
    const a = document.createElement("a");
    a.href = snapCanvas.toDataURL("image/png");
    a.download = "island-snapshot.png";
    a.click();
    sfx("discover");
    setShot(true);
    setTimeout(() => setShot(false), 150);
  }, [snapCanvas]);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      setAudioMuted(!m);
      return !m;
    });
  }, []);

  const onNearby = useCallback((l: Landmark | null) => {
    setNearby(l);
    if (!l) return;
    setDiscovered((d) => {
      if (d.includes(l.id)) return d;
      sfx("discover");
      setToast({ title: "New location discovered", name: l.name, color: l.color });
      return [...d, l.id];
    });
  }, []);

  const onZone = useCallback((z: Zone) => {
    setZones((seen) => {
      if (seen.includes(z.id)) return seen;
      setToast({ title: "New area", name: z.name, color: z.color });
      return [...seen, z.id];
    });
  }, []);

  const onCollect = useCallback((i: number) => setCollected((c) => (c.includes(i) ? c : [...c, i])), []);

  // milestones
  useEffect(() => {
    if (discovered.length !== LANDMARKS.length) return;
    setToast({ title: "Every location found", name: "Island explored!", color: "#ffd166" });
    fireworks(10);
  }, [discovered.length]);
  useEffect(() => {
    if (!collected.length) return;
    if (collected.length === ORB_COUNT) {
      setToast({ title: `All ${ORB_COUNT} code orbs`, name: "Master collector!", color: "#7df9ff" });
      fireworks(12);
    }
  }, [collected.length]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const travel = (l: Landmark) => {
    setFading(true);
    setTimeout(() => {
      if (boat.riding) dockBoat();
      car.driving = false;
      car.speed = 0;
      const p = frontOf(l);
      game.pos.set(p.x, 0, p.z);
      game.heading = Math.atan2(l.x - p.x, l.z - p.z);
      game.camYaw = game.camYawGoal = Math.atan2(p.x - l.x, p.z - l.z);
      game.snapCamera = true;
      openPanel(l);
      setFading(false);
    }, 450);
  };

  const walkTo = useCallback((p: Vector3) => {
    if (!game.frozen && !boat.riding && !car.driving && !game.sitting) game.target = p.clone();
  }, []);

  const selectLandmark = useCallback((l: Landmark) => {
    if (!game.frozen && !boat.riding && !car.driving && !game.sitting) game.target = frontOf(l, 1.2);
  }, []);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (openRef.current) {
        if (e.code === "Escape") openPanel(null);
        return;
      }
      if (!game.started || e.repeat) {
        if (MOVE_KEYS.includes(e.code) && game.started) e.preventDefault();
        return;
      }
      const interact = e.code === "KeyE" || e.code === "Enter";
      if (game.sitting) {
        // any interact / movement key gets you up off the bench
        if (interact || e.code === "Escape" || MOVE_KEYS.includes(e.code)) {
          e.preventDefault();
          stand();
        }
        return;
      }
      if (interact && benchRef.current.near) {
        e.preventDefault();
        sit();
      } else if (interact && car.driving) {
        e.preventDefault();
        leaveCar();
      } else if (interact && carRef.current.near) {
        e.preventDefault();
        boardCar();
      } else if (interact && boat.riding) {
        e.preventDefault();
        leaveBoat();
      } else if (interact && boatRef.current.near) {
        e.preventDefault();
        boardBoat();
      } else if (interact && nearbyRef.current) {
        e.preventDefault();
        openPanel(nearbyRef.current);
      } else if (e.code === "KeyN") toggleNight();
      else if (e.code === "KeyM") toggleMute();
      else if (e.code === "KeyR") toggleRain();
      else if (e.code === "KeyP") photo();
      else if (MOVE_KEYS.includes(e.code)) {
        e.preventDefault();
        game.keys.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => game.keys.delete(e.code);
    const blur = () => game.keys.clear();
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", blur);
    };
  }, [openPanel, toggleNight, toggleMute, toggleRain, photo]);

  const LAKE_BLUE = "#38bdf8";
  const action: Action | null = carUi.driving
    ? { id: "park", title: "Get out of the car", sub: "Park here", color: "#d9503a", onClick: leaveCar }
    : carUi.near
      ? { id: "drive", title: "Drive the car", sub: "W/S gas · A/D steer · Shift boost", color: "#d9503a", onClick: boardCar }
      : boatUi.riding
    ? boatUi.canLeave
      ? { id: "leave", title: "Leave the boat", sub: "Step onto land", color: LAKE_BLUE, onClick: leaveBoat }
      : { id: "row", title: "Row to the shore to get out", sub: "Whispering Lake", color: LAKE_BLUE }
    : sunsetUi.near
      ? { id: "sit", title: "Sit and watch the sunset", sub: "Summit Peak", color: "#ffb35c", onClick: sit }
      : boatUi.near
      ? { id: "board", title: "Board the rowboat", sub: "Row anywhere, even out to sea", color: LAKE_BLUE, onClick: boardBoat }
      : nearby
        ? { id: nearby.id, title: `Enter ${nearby.name}`, sub: nearby.section, color: nearby.color, onClick: () => openPanel(nearby) }
        : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e3c6a8]">
      <div
        className="absolute inset-0 touch-none"
        onWheel={(e) => {
          game.zoomGoal = Math.min(Math.max(game.zoomGoal + e.deltaY * 0.0012, 0.5), 1.8);
        }}
        onPointerMove={(e) => {
          // drag anywhere to orbit the camera; a plain click still walks
          if (!e.buttons || !game.started || (!e.movementX && !e.movementY)) return;
          game.camYawGoal -= e.movementX * 0.006;
          game.camPitchGoal = Math.min(Math.max(game.camPitchGoal + e.movementY * 0.004, 0.05), 1.2);
          game.lastDrag = performance.now();
        }}
      >
        <Canvas
          shadows="percentage"
          dpr={dpr}
          frameloop={stage === 0 ? "never" : open ? "demand" : "always"}
          camera={{ fov: 45, near: 0.1, far: 3000, position: [100, 50, 100] }}
          gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          onCreated={({ gl }) => setSnapCanvas(gl.domElement)}
        >
          <Warmup stage={stage} onCompiled={compiled} onWarm={warmedUp} />
          <SunsetGrade grade={grade} />
          <PerformanceMonitor
            onDecline={() => {
              setHq(false);
              setDpr(1.25);
            }}
          />
          <color attach="background" args={[FOG]} />
          <fog attach="fog" args={[FOG, 90, 320]} />
          <DayNight />
          {/* procedural studio env (no HDR download): gives metals and glossy surfaces something to reflect */}
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={2} color="#ffd9b0" position={[10, 4, -4]} scale={[10, 4, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={1.2} color="#bcd4ff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
            <Lightformer form="rect" intensity={0.5} color="#7a6a50" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
          </Environment>

          <Island onGround={walkTo} />
          <Water />
          <Grass />
          <Scenery />
          <Clouds />
          <Birds />
          <Landmarks discovered={discovered} onSelect={selectLandmark} />
          <Props />
          <Villagers />
          <Orbs collected={collected} onCollect={onCollect} />
          <Particles />
          <Rain />
          <Boat onUi={setBoatUi} />
          <Car onUi={setCarUi} />
          <Sunset onUi={setSunsetUi} />
          <Player onNearby={onNearby} onZone={onZone} />

          <EffectComposer multisampling={hq ? 4 : 0}>
            {hq ? <N8AO halfRes aoRadius={2} intensity={2.2} distanceFalloff={1} color="#3a2a1a" /> : <></>}
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.25} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <HueSaturation ref={(e: HueSaturationEffect | null) => { grade.current.sat = e; }} saturation={0} />
            <BrightnessContrast ref={(e: BrightnessContrastEffect | null) => { grade.current.bc = e; }} brightness={0} contrast={0} />
            <Vignette ref={(e: VignetteEffect | null) => { grade.current.vig = e; }} offset={0.25} darkness={0.55} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* hides shader-compile hitches; fades away once the first frames are on screen */}
      <motion.div className="pointer-events-none fixed inset-0 z-[35] bg-bg" initial={false} animate={{ opacity: stage === 2 ? 0 : 1 }} transition={{ duration: 1.2 }} />

      <AnimatePresence>
        {!started && (
          <Intro
            onStart={start}
            loading={stage === 2 ? null : stage === 0 ? { label: "Compiling shaders", progress: 60 } : { label: "Lighting the island", progress: 90 }}
          />
        )}
      </AnimatePresence>

      <Cinematic show={sunsetUi.sitting} onStand={stand} />

      {started && (
        <motion.div animate={{ opacity: sunsetUi.sitting ? 0 : 1 }} transition={{ duration: 1 }} className={sunsetUi.sitting ? "pointer-events-none" : ""}>
          <TopBar orbs={collected.length} night={night} muted={muted} rain={rain} onNight={toggleNight} onMute={toggleMute} onRain={toggleRain} onPhoto={photo} />
          <QuestLog discovered={discovered} onTravel={travel} />
          <Minimap discovered={discovered} />
          <Controls />
          <Joystick />
          <Toast landmark={toast} />
          <RowingHint show={boatUi.riding && !open} />
          <Prompt action={open ? null : action} />
        </motion.div>
      )}

      <motion.div className="pointer-events-none fixed inset-0 z-[55] bg-white" initial={false} animate={{ opacity: shot ? 0.8 : 0 }} transition={{ duration: 0.15 }} />

      <Panel landmark={open} onClose={() => openPanel(null)} />

      <motion.div className="pointer-events-none fixed inset-0 z-[60] bg-black" initial={false} animate={{ opacity: fading ? 1 : 0 }} transition={{ duration: 0.4 }} />
      <span className="sr-only" aria-live="polite">
        {nearby ? `Near ${nearby.name}. Press E to open ${nearby.section}.` : ""}
      </span>
    </div>
  );
}

/**
 * Compiles every material in the background (KHR_parallel_shader_compile) before the render
 * loop starts, then renders a few frames under the cover so post-processing passes compile too.
 */
function Warmup({ stage, onCompiled, onWarm }: { stage: number; onCompiled: () => void; onWarm: () => void }) {
  const { gl, scene, camera } = useThree();
  const frames = useRef(0);
  useEffect(() => {
    let alive = true;
    const id = requestAnimationFrame(() => {
      gl.compileAsync(scene, camera)
        .catch(() => {}) // falls back to compiling on first render
        .finally(() => alive && onCompiled());
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, [gl, scene, camera, onCompiled]);
  useFrame(() => {
    if (stage === 1 && ++frames.current === 4) onWarm();
  });
  return null;
}

type Grade = { sat: HueSaturationEffect | null; bc: BrightnessContrastEffect | null; vig: VignetteEffect | null };

/** Golden-hour colour grade: richer colour, deeper contrast and a heavier vignette while the sun sets. */
function SunsetGrade({ grade }: { grade: { current: Grade } }) {
  useFrame(() => {
    const s = game.sunsetMix, g = grade.current;
    if (g.sat) g.sat.saturation = s * 0.28;
    if (g.bc) {
      g.bc.brightness = -s * 0.07;
      g.bc.contrast = s * 0.16;
    }
    if (g.vig) g.vig.darkness = 0.55 + s * 0.25;
  });
  return null;
}
