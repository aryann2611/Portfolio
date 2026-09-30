import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 md:px-10 md:py-32">
      <Reveal className="mb-12 flex items-baseline gap-4 md:mb-16">
        <span className="font-mono text-sm text-accent">{index}</span>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </h2>
        <span className="h-px flex-1 bg-border" />
      </Reveal>
      {children}
    </section>
  );
}
