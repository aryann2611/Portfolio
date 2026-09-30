import { Mail } from "lucide-react";
import { Reveal } from "./Reveal";
import { MagneticButton } from "./MagneticButton";
import { GithubIcon } from "./icons/GithubIcon";

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 md:px-10 md:py-32">
      <Reveal>
        <div className="rounded-3xl border border-border bg-surface px-8 py-16 text-center md:px-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            07 — Contact
          </p>
          <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Let's build something together.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Open to backend and full-stack opportunities, collaborations,
            and interesting problems.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="mailto:decodedna27@gmail.com" variant="solid">
              <Mail size={16} /> Say Hello
            </MagneticButton>
            <MagneticButton href="https://github.com/aryans2611" variant="outline">
              <GithubIcon size={16} /> GitHub
            </MagneticButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
