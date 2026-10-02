/** Shared by the download fallback (App) and the in-world title screen, so the hand-off is seamless. */
export function TitleBlock() {
  return (
    <>
      <p className="mb-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-accent">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> An explorable portfolio
      </p>
      <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">
        Aryan Singh<span className="text-accent">.</span>
      </h1>
      <p className="mt-5 max-w-md text-base text-white/75 md:text-lg">
        Backend &amp; Full-Stack Developer. Explore the island. Every building holds a part of my story.
      </p>
    </>
  );
}

export function LoadingBar({ label, progress }: { label: string; progress: number }) {
  return (
    <div className="mt-9 w-64" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</p>
    </div>
  );
}

/** Full-screen layout used by both screens: content anchored at a fixed height so nothing jumps. */
export const SCREEN = "fixed inset-0 z-40 flex items-end px-6 pb-14 md:items-start md:px-16 md:pb-0 md:pt-[24vh]";

export function Splash({ label, progress }: { label: string; progress: number }) {
  return (
    <div className={`${SCREEN} bg-bg`}>
      <div className="max-w-xl">
        <TitleBlock />
        <LoadingBar label={label} progress={progress} />
      </div>
    </div>
  );
}
