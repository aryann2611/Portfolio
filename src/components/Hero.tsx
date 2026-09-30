import { motion } from "framer-motion";
import { Mail, ArrowDown } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { GithubIcon } from "./icons/GithubIcon";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-start justify-center overflow-hidden px-6 pt-24 md:px-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(242,239,233,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(242,239,233,0.035)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-accent"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Lucknow, India — B.Tech CS '27
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-7xl"
        >
          Building modern software
          <br />
          with code, systems <span className="text-accent italic">&amp;</span> AI.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-base text-muted md:text-lg"
        >
          Backend &amp; Full-Stack Developer focused on building modern web
          applications, APIs, and practical software systems.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <MagneticButton href="#projects" variant="solid">
            View Projects
          </MagneticButton>
          <MagneticButton
            href="https://github.com/aryans2611"
            variant="outline"
          >
            <GithubIcon size={16} /> GitHub
          </MagneticButton>
          <MagneticButton href="#contact" variant="ghost">
            <Mail size={16} /> Contact Me
          </MagneticButton>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        aria-label="Scroll to about section"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-muted"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowDown size={18} />
      </motion.a>
    </section>
  );
}
