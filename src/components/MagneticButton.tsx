import { motion, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode, MouseEvent } from "react";

export function MagneticButton({
  children,
  href,
  variant = "solid",
  className = "",
  onClick,
}: {
  children: ReactNode;
  href?: string;
  variant?: "solid" | "outline" | "ghost";
  className?: string;
  onClick?: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.2 });

  function handleMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.35);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.35);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-sm tracking-tight transition-colors duration-300";
  const styles = {
    solid: "bg-accent text-bg hover:bg-[#f2a561]",
    outline: "border border-border text-ink hover:border-accent hover:text-accent",
    ghost: "text-muted hover:text-ink",
  } as const;

  const Tag = motion.a;

  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </Tag>
  );
}
