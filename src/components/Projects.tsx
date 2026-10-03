import { FolderGit2 } from "lucide-react";
import { Reveal } from "./Reveal";
import { Section } from "./Section";

export function Projects() {
  return (
    <Section id="projects" index="03" title="Projects">
      <Reveal>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-20 text-center">
          <FolderGit2 className="text-muted" size={28} />
          <p className="font-display text-lg text-ink">Projects coming soon</p>
          <p className="max-w-md text-sm text-muted">
            This section is being prepared — case studies will be added
            here shortly. In the meantime, see ongoing work on{" "}
            <a
              href="https://github.com/aryann2611"
              className="text-accent underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
