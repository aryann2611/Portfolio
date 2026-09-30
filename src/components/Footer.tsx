import { GithubIcon } from "./icons/GithubIcon";

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl border-t border-border px-6 py-8 md:px-10">
      <div className="flex flex-col items-center justify-between gap-4 font-mono text-xs text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Aryan Singh.</p>
        <a
          href="https://github.com/aryans2611"
          className="flex items-center gap-2 transition-colors hover:text-accent"
        >
          <GithubIcon size={14} /> aryans2611
        </a>
      </div>
    </footer>
  );
}
