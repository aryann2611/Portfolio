import { Flame, Code2, Server } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

const ITEMS = [
  {
    icon: Flame,
    title: "400+ Day CSSBattle Streak",
    desc: "Sustained daily practice solving CSSBattle challenges for over 400 consecutive days.",
  },
  {
    icon: Code2,
    title: "LeetCode Practice",
    desc: "Consistent problem-solving practice to sharpen data structures and algorithms fundamentals.",
  },
  {
    icon: Server,
    title: "Backend & API Development",
    desc: "Hands-on experience building and testing backend services and REST APIs.",
  },
];

export function Achievements() {
  return (
    <Section id="achievements" index="05" title="Achievements">
      <div className="grid gap-6 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, title, desc }, i) => (
          <Reveal key={title} delay={i * 0.08}>
            <div className="group h-full rounded-2xl border border-border p-6 transition-colors duration-300 hover:border-accent/60">
              <Icon
                className="text-accent transition-transform duration-300 group-hover:-translate-y-0.5"
                size={22}
              />
              <h3 className="mt-4 font-display text-base font-medium text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
