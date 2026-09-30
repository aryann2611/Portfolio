import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorGlow() {
  const [active, setActive] = useState(false);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 120, damping: 20, mass: 0.4 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      setActive(true);
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  if (!active) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-40 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-3xl"
      style={{
        x: sx,
        y: sy,
        background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
      }}
    />
  );
}
