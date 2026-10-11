import { GithubIcon } from "./icons/GithubIcon";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const PROJECTS = [
  {
    name: "NEXUS",
    tagline: "See what your APIs feel like under pressure.",
    desc: "Real-time API intelligence platform. Register any HTTP API and an in-process monitoring engine checks it on a schedule, tracking uptime, latency percentiles and incidents across 24h / 7d / 30d reports. Built-in k6 load tests stream live metrics back to the dashboard.",
    stack: ["React", "TypeScript", "Fastify", "MySQL", "k6", "Recharts", "Tailwind CSS"],
    repo: "https://github.com/aryann2611/NEXUS-PLATFORM",
  },
];

export function Projects() {
  return (
    <Section id="projects" index="03" title="Projects">
      <div className="space-y-6">
        {PROJECTS.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.1}>
            <article className="rounded-2xl border border-border p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-ink">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-accent">{p.tagline}</p>
                </div>
                <a
                  href={p.repo}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${p.name} on GitHub`}
                  className="text-muted transition-colors hover:text-ink"
                >
                  <GithubIcon size={20} />
                </a>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/80">
                {p.desc}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {p.stack.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
