import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ChevronDown, CloudRain, Gem, Mail, MapPin, Moon, Play, Sun, Volume2, VolumeX, X } from "lucide-react";
import { GithubIcon } from "../components/icons/GithubIcon";
import { LoadingBar, SCREEN, TitleBlock } from "../components/Splash";
import { BEACH, FOREST, LAKE, LANDMARKS, MOUNTAIN, SHORE, game, type Landmark } from "./data";
import { ORB_COUNT } from "./Life";

const ease = [0.22, 1, 0.36, 1] as const;
const glass = "border border-white/10 bg-black/45 backdrop-blur-md";
const isTouch = typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches;

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white">
      {children}
    </kbd>
  );
}

/** Title screen. Same layout as the download Splash; shows loading progress until the world is ready. */
export function Intro({ onStart, loading }: { onStart: () => void; loading: { label: string; progress: number } | null }) {
  return (
    <motion.div
      className={`${SCREEN} bg-gradient-to-t from-black/85 via-black/30 to-transparent md:bg-gradient-to-r`}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <div className="max-w-xl">
        <TitleBlock />
        {loading ? (
          <LoadingBar label={loading.label} progress={loading.progress} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
            <button
              autoFocus
              onClick={onStart}
              className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3.5 font-mono text-sm text-bg shadow-[0_0_40px_-8px_var(--color-accent)] transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Play size={16} className="fill-current" /> Enter the world
            </button>
            <p className="mt-7 max-w-md text-sm text-white/70">
              Find all {ORB_COUNT} hidden code orbs, chat with the villagers, take the rowboat out, climb the mountain, and stay for the night sky.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/55">
              {isTouch ? (
                <>Joystick to move · Drag to look around · Tap a building to head there</>
              ) : (
                <>
                  <Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key> move · <Key>Shift</Key> sprint · <Key>Space</Key> jump · <Key>E</Key> interact · or just click
                </>
              )}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

type TopBarProps = { orbs: number; night: boolean; muted: boolean; rain: boolean; onNight: () => void; onMute: () => void; onRain: () => void; onPhoto: () => void };

export function TopBar({ orbs, night, muted, rain, onNight, onMute, onRain, onPhoto }: TopBarProps) {
  const round = `grid h-10 w-10 place-items-center rounded-full text-white/85 transition-colors hover:text-accent ${glass}`;
  return (
    <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-4 md:p-6">
      <div className={`pointer-events-auto rounded-2xl px-4 py-2.5 ${glass}`}>
        <p className="font-display text-lg font-semibold leading-tight text-white">
          Aryan Singh<span className="text-accent">.</span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">Backend &amp; Full-Stack Dev</p>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <motion.div
          key={orbs}
          initial={{ scale: orbs ? 1.25 : 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease }}
          className={`flex h-10 items-center gap-2 rounded-full px-4 font-mono text-xs text-white ${glass}`}
          title="Code orbs collected"
        >
          <Gem size={14} className="text-[#7df9ff]" /> {orbs}/{ORB_COUNT}
        </motion.div>
        <button onClick={onNight} aria-label={night ? "Switch to day (N)" : "Switch to night (N)"} title="Day / night (N)" className={round}>
          {night ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={onRain} aria-label="Toggle rain (R)" title="Rain (R)" className={`${round} ${rain ? "text-accent" : ""}`}>
          <CloudRain size={16} />
        </button>
        <button onClick={onPhoto} aria-label="Save screenshot (P)" title="Photo (P)" className={round}>
          <Camera size={16} />
        </button>
        <button onClick={onMute} aria-label={muted ? "Unmute (M)" : "Mute (M)"} title="Sound (M)" className={round}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <a href="https://github.com/aryans2611" aria-label="GitHub" className={`hidden sm:grid ${round}`}>
          <GithubIcon size={16} />
        </a>
        <a href="mailto:decodedna27@gmail.com" aria-label="Email" className={`hidden sm:grid ${round}`}>
          <Mail size={16} />
        </a>
      </div>
    </motion.header>
  );
}

export function QuestLog({ discovered, onTravel }: { discovered: string[]; onTravel: (l: Landmark) => void }) {
  const [open, setOpen] = useState(() => !isTouch && innerWidth > 768);
  return (
    <motion.nav
      aria-label="Locations"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease }}
      className={`fixed left-4 top-24 z-30 w-60 overflow-hidden rounded-2xl md:left-6 md:top-28 ${glass}`}
    >
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">
          Locations <span className="text-accent">{discovered.length}/{LANDMARKS.length}</span>
        </span>
        <ChevronDown size={14} className={`text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="h-0.5 bg-white/10">
        <motion.div className="h-full bg-accent" animate={{ width: `${(discovered.length / LANDMARKS.length) * 100}%` }} transition={{ duration: 0.6, ease }} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
            {LANDMARKS.map((l) => {
              const done = discovered.includes(l.id);
              return (
                <li key={l.id}>
                  <button
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTravel(l);
                    }}
                    className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1" style={{ boxShadow: `inset 0 0 0 1px ${l.color}66`, background: done ? `${l.color}33` : "transparent" }}>
                      {done ? <Check size={11} style={{ color: l.color }} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{l.name}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-white/50">{l.section}</span>
                    </span>
                    <MapPin size={13} className="text-white/30 transition-colors group-hover:text-accent" />
                  </button>
                </li>
              );
            })}
            <li className="px-4 pb-3 pt-1 font-mono text-[10px] text-white/40">Click a location to fast travel</li>
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

const V = SHORE + 10;

export function Minimap({ discovered }: { discovered: string[] }) {
  const arrow = useRef<SVGGElement>(null);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      arrow.current?.setAttribute("transform", `translate(${game.pos.x} ${game.pos.z}) rotate(${180 - (game.heading * 180) / Math.PI})`);
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease }}
      className={`fixed bottom-4 right-4 z-30 h-36 w-36 overflow-hidden rounded-full md:bottom-6 md:right-6 md:h-44 md:w-44 ${glass}`}
      aria-hidden
    >
      <svg viewBox={`${-V} ${-V} ${V * 2} ${V * 2}`} className="h-full w-full">
        <circle r={V} fill="#1d5f80" opacity={0.55} />
        <circle r={SHORE - 3} fill="#e6cf9a" opacity={0.9} />
        <circle r={SHORE - 7} fill="#5a8f3c" />
        <circle cx={BEACH.x} cy={BEACH.z} r={13} fill="#e6cf9a" />
        <circle cx={FOREST.x} cy={FOREST.z} r={FOREST.r} fill="#2f5e2a" opacity={0.8} />
        <circle cx={MOUNTAIN.x} cy={MOUNTAIN.z} r={MOUNTAIN.r} fill="#8d8a84" opacity={0.75} />
        <circle cx={MOUNTAIN.x} cy={MOUNTAIN.z} r={MOUNTAIN.r * 0.45} fill="#f4f6fb" />
        <circle cx={LAKE.x} cy={LAKE.z} r={LAKE.r + 1.5} fill="#3fb8b0" />
        {LANDMARKS.map((l) => {
          const d = Math.hypot(l.x, l.z);
          return <line key={l.id} x1={(l.x / d) * 6} y1={(l.z / d) * 6} x2={l.x} y2={l.z} stroke="#b08458" strokeWidth={3.5} strokeLinecap="round" />;
        })}
        <circle r={8} fill="#bdb5a6" />
        {LANDMARKS.map((l) => (
          <circle key={l.id} cx={l.x} cy={l.z} r={5} fill={discovered.includes(l.id) ? l.color : "#2b2b2b"} stroke={l.color} strokeWidth={2} />
        ))}
        <g ref={arrow}>
          <path d="M0 -8 L5.8 6.3 L0 3.2 L-5.8 6.3Z" fill="#ffffff" stroke="#000" strokeWidth={1} />
        </g>
      </svg>
    </motion.div>
  );
}

export type Action = { id: string; title: string; sub: string; color: string; onClick?: () => void };

/** Bottom-centre context action ("Enter Home", "Board the rowboat", ...). No onClick = info only. */
export function Prompt({ action }: { action: Action | null }) {
  return (
    <AnimatePresence>
      {action && (
        <motion.button
          key={action.id}
          onClick={action.onClick}
          disabled={!action.onClick}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.35, ease }}
          className={`fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full py-2.5 pl-2.5 pr-5 text-left md:bottom-10 ${glass}`}
          style={{ boxShadow: `0 0 40px -10px ${action.color}` }}
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-full font-mono text-sm font-medium text-bg"
            style={{ background: action.onClick ? action.color : "#6b7280" }}
          >
            {isTouch ? <Play size={14} className="fill-current" /> : "E"}
          </span>
          <span>
            <span className="block text-sm text-white">{action.title}</span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-white/55">{action.sub}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function RowingHint({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="pointer-events-none fixed bottom-40 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-[11px] text-white/80 md:bottom-28"
        >
          {isTouch ? (
            "Joystick: up to row, sideways to steer"
          ) : (
            <>
              <Key>W</Key><Key>S</Key> row · <Key>A</Key><Key>D</Key> steer
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type ToastMsg = { title: string; name: string; color: string };

export function Toast({ landmark }: { landmark: ToastMsg | null }) {
  return (
    <AnimatePresence>
      {landmark && (
        <motion.div
          key={landmark.title + landmark.name}
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease }}
          className="pointer-events-none fixed left-1/2 top-24 z-30 -translate-x-1/2 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: landmark.color }}>
            {landmark.title}
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] md:text-4xl">{landmark.name}</p>
          <motion.div className="mx-auto mt-2 h-px" style={{ background: landmark.color }} initial={{ width: 0 }} animate={{ width: 160 }} transition={{ duration: 0.8, delay: 0.2, ease }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Controls() {
  if (isTouch) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pointer-events-none fixed bottom-6 left-6 z-30 hidden flex-col gap-1.5 text-[11px] text-white/60 lg:flex [@media(max-height:820px)]:!hidden">
      <span className="flex items-center gap-1.5"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key> move</span>
      <span className="flex items-center gap-1.5"><Key>Shift</Key> sprint · <Key>Space</Key> jump</span>
      <span className="flex items-center gap-1.5"><Key>E</Key> enter · click to walk</span>
      <span>drag to rotate · scroll to zoom</span>
      <span className="flex items-center gap-1.5"><Key>N</Key> day / night · <Key>M</Key> sound · <Key>R</Key> rain · <Key>P</Key> photo</span>
    </motion.div>
  );
}

export function Panel({ landmark, onClose }: { landmark: Landmark | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {landmark && (
        <motion.div
          key={landmark.id}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={landmark.section}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-border bg-bg/95 shadow-2xl md:rounded-3xl [&_section]:py-8 md:[&_section]:py-10"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-bg/90 px-6 py-4 backdrop-blur-md md:px-10">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: landmark.color, boxShadow: `0 0 12px ${landmark.color}` }} />
                <p className="font-display text-lg text-ink">{landmark.name}</p>
              </div>
              <button autoFocus onClick={onClose} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent">
                {!isTouch && <Key>Esc</Key>} <X size={14} />
              </button>
            </div>
            <landmark.Content />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Touch-only virtual stick; writes game.joy (camera-relative, like WASD). */
export function Joystick() {
  const knob = useRef<HTMLDivElement>(null);
  if (!isTouch) return null;
  const R = 44;
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    game.joy.x = dx / R;
    game.joy.y = dy / R;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const end = () => {
    game.joy.x = game.joy.y = 0;
    if (knob.current) knob.current.style.transform = "";
  };
  return (
    <div
      className={`fixed bottom-8 left-6 z-30 h-28 w-28 touch-none rounded-full ${glass}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div ref={knob} className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-white/75 shadow-lg transition-transform duration-75" />
    </div>
  );
}

/** Letterbox + caption while sitting on the summit bench watching the sunset. */
export function Cinematic({ show, onStand }: { show: boolean; onStand: () => void }) {
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setThanks(true), 14000);
    return () => {
      clearTimeout(id);
      setThanks(false);
    };
  }, [show]);
  const bar = { initial: { scaleY: 0 }, animate: { scaleY: 1 }, exit: { scaleY: 0 }, transition: { duration: 1.6, ease } };
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="cinematic" className="pointer-events-none fixed inset-0 z-30" exit={{ opacity: 0, transition: { duration: 1 } }}>
          <motion.div {...bar} className="absolute inset-x-0 top-0 h-[11vh] origin-top bg-black" />
          <motion.div {...bar} className="absolute inset-x-0 bottom-0 h-[11vh] origin-bottom bg-black" />
          <motion.div
            className="absolute bottom-[14vh] left-6 md:left-16"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 1.6, ease }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffcf9a]">Summit Peak · Sunset Point</p>
            <p className="mt-2 font-display text-3xl text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)] md:text-5xl">Take a moment.</p>
            <AnimatePresence>
              {thanks && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, ease }}
                  className="mt-3 max-w-md text-sm text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:text-base"
                >
                  Thanks for exploring my little world. Every corner of it was built with care. — Aryan
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
          <motion.button
            onClick={onStand}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4, duration: 1 }}
            className="pointer-events-auto absolute bottom-[3.5vh] right-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:text-white md:right-16"
          >
            {isTouch ? "Tap to stand up" : <><Key>E</Key> stand up</>}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
