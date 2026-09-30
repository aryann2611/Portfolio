import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function About() {
  return (
    <Section id="about" index="01" title="About">
      <div className="grid gap-10 md:grid-cols-[1.3fr_1fr]">
        <Reveal delay={0.1}>
          <p className="text-lg leading-relaxed text-ink/90 md:text-xl">
            I'm a Computer Science student building backend systems and
            full-stack web applications — REST APIs, databases, and
            production-oriented software. I care about code that's clean,
            fast, and actually ships.
          </p>
          <p className="mt-6 leading-relaxed text-muted">
            I work extensively with modern AI tools throughout my
            development process — for coding, debugging, understanding
            unfamiliar codebases, technical research, and rapid
            prototyping — treating them as part of a professional
            engineering workflow rather than a shortcut.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <dl className="grid grid-cols-2 gap-6 border-t border-border pt-6 font-mono text-sm md:border-none md:pt-0">
            <div>
              <dt className="text-muted">Education</dt>
              <dd className="mt-1 text-ink">B.Tech CS (Data Science + AI)</dd>
            </div>
            <div>
              <dt className="text-muted">University</dt>
              <dd className="mt-1 text-ink">SRM University, Lucknow</dd>
            </div>
            <div>
              <dt className="text-muted">Batch</dt>
              <dd className="mt-1 text-ink">2023 — 2027</dd>
            </div>
            <div>
              <dt className="text-muted">Location</dt>
              <dd className="mt-1 text-ink">Lucknow, India</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}
