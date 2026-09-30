import { Reveal } from "./Reveal";
import { Section } from "./Section";

const GROUPS = [
  { title: "Languages", items: ["JavaScript", "TypeScript", "Java", "SQL"] },
  {
    title: "Frontend",
    items: ["HTML", "CSS", "React", "Vite", "Tailwind CSS", "Figma"],
  },
  {
    title: "Backend",
    items: [
      "Node.js",
      "Express.js",
      "Fastify",
      "Socket.IO",
      "REST APIs",
      "JWT Authentication",
    ],
  },
  { title: "Database", items: ["MySQL", "Kysely", "SQL", "PL/SQL"] },
  {
    title: "Tools",
    items: [
      "Git",
      "GitHub",
      "VS Code",
      "IntelliJ IDEA",
      "Vercel",
      "npm",
      "Swagger / OpenAPI",
      "k6",
    ],
  },
  {
    title: "AI-Assisted Development",
    items: [
      "AI-powered coding",
      "Code generation",
      "AI-assisted debugging",
      "Codebase understanding",
      "Technical research",
      "Rapid prototyping",
      "Documentation",
      "Local AI / LLM experimentation",
    ],
  },
];

export function Skills() {
  return (
    <Section id="skills" index="02" title="Skills">
      <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((group, i) => (
          <Reveal key={group.title} delay={i * 0.06}>
            <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {group.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-ink/85 transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
