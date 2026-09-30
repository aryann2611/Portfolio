import { Reveal } from "./Reveal";
import { Section } from "./Section";

const ITEMS = [
  {
    period: "2023 — 2027",
    title: "B.Tech, Computer Science (Data Science + AI)",
    org: "Shri Ramswaroop Memorial University, Lucknow",
    desc: "Undergraduate study focused on data science, AI, and core computer science fundamentals — applied primarily toward backend and full-stack web development.",
  },
  {
    period: "Ongoing",
    title: "Backend & API Development",
    org: "Self-directed / academic projects",
    desc: "Building REST APIs, authentication flows, and database-backed services using Node.js, Express, Fastify, and MySQL.",
  },
];

export function Experience() {
  return (
    <Section id="experience" index="04" title="Experience">
      <div className="space-y-10 border-l border-border pl-8">
        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.1} className="relative">
            <span className="absolute -left-[2.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-bg" />
            <p className="font-mono text-xs uppercase tracking-wider text-accent">
              {item.period}
            </p>
            <h3 className="mt-2 font-display text-lg font-medium text-ink">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-muted">{item.org}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
              {item.desc}
            </p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
