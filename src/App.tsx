import { lazy, Suspense } from "react";
import { Mail } from "lucide-react";
import { GithubIcon } from "./components/icons/GithubIcon";
import { Splash } from "./components/Splash";

const World = lazy(() => import("./world/World"));

const hasWebGL = (() => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
})();

export default function App() {
  if (!hasWebGL)
    return (
      <div className="fixed inset-0 grid place-items-center bg-bg px-6 text-center">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">
            Aryan Singh<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-muted">This portfolio is a 3D world and needs a browser with WebGL 2.</p>
          <div className="mt-6 flex justify-center gap-4 font-mono text-sm">
            <a href="https://github.com/aryann2611" className="flex items-center gap-2 text-ink hover:text-accent">
              <GithubIcon size={16} /> GitHub
            </a>
            <a href="mailto:aryans8095@gmail.com" className="flex items-center gap-2 text-ink hover:text-accent">
              <Mail size={16} /> Email
            </a>
          </div>
        </div>
      </div>
    );

  return (
    <Suspense fallback={<Splash label="Downloading the island" progress={25} />}>
      <World />
    </Suspense>
  );
}
