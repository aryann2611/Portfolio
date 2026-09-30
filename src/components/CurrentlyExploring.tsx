import { Reveal } from "./Reveal";
import { Section } from "./Section";

const TOPICS = [
  "Cybersecurity",
  "Bug Bounty",
  "Web Security",
  "Backend Architecture",
  "AI-Assisted Development",
  "Local LLMs",
  "Load Testing",
  "Modern Web Technologies",
];

export function CurrentlyExploring() {
  return (
    <Section id="exploring" index="06" title="Currently Exploring">
      <Reveal>
        <div className="flex flex-wrap gap-3">
          {TOPICS.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-surface-2 px-4 py-2 font-mono text-sm text-ink/80 ring-1 ring-inset ring-border transition-all duration-200 hover:-translate-y-0.5 hover:text-accent hover:ring-accent/50"
            >
              {topic}
            </span>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
