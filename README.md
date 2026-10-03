# Aryan Singh — 3D Open-World Portfolio

An explorable portfolio: instead of scrolling through sections, you walk around a small 3D island. Each building holds a part of the story.

**Live:** https://portfolio.aryans8095.workers.dev

| Building | Section |
|---|---|
| Home | About |
| Skill Tower | Skills |
| Workshop | Projects |
| Academy | Experience |
| Eternal Flame | Achievements |
| Observatory | Currently exploring |
| Lighthouse | Contact |

## Features

- Walk, sprint, jump, swim, or click/tap to travel; drag to orbit the camera
- Drivable car on a paved road network, plus a rowboat that can go out to sea
- Day/night cycle, rain, sunset bench cinematic, photo mode
- 31 hidden code orbs, villagers to talk to, discoverable areas and a quest log with fast travel
- Procedural sound (Web Audio, no audio files)
- Touch joystick for phones
- Adaptive quality: phones and low-core devices skip MSAA and ambient occlusion; a runtime monitor lowers quality if frames drop
- SEO: crawlable static fallback in `index.html`, canonical, Open Graph / Twitter cards, `Person` + `WebSite` JSON-LD, `robots.txt`, `sitemap.xml`

## Controls

| Input | Action |
|---|---|
| `W A S D` / arrows | Move (steer in car/boat) |
| `Shift` | Sprint / car boost |
| `Space` | Jump / car brake |
| `E` or `Enter` | Interact (enter building, board car/boat, sit) |
| `N` / `R` / `M` / `P` | Night / rain / mute / photo |
| `Esc` | Close panel |
| Mouse drag, tap | Orbit camera, walk to point |

## Tech stack

React 19 · TypeScript · Vite · Three.js · @react-three/fiber · @react-three/drei · @react-three/postprocessing · Tailwind CSS 4 · framer-motion · lucide-react · oxlint

It is a frontend-only project: no backend, database or authentication.

## Getting started

Requires Node.js 18+ and a browser with WebGL 2.

```bash
npm install
npm run dev      # dev server
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## Project structure

```
index.html            page shell, SEO tags, crawlable fallback content
public/               favicon, og-image, manifest, robots.txt, sitemap.xml
src/main.tsx          entry; starts loading the 3D chunk early
src/App.tsx           WebGL2 check, lazy-loads the world
src/components/       2D content shown in the building panels
src/world/            the 3D world
  World.tsx           canvas, state, input, HUD wiring, shader warm-up
  data.ts             island layout + shared mutable `game` state
  Terrain.tsx         terrain, roads, grass, trees, water, clouds
  Landmarks.tsx       the seven buildings
  Player.tsx          movement, camera, collisions
  Car.tsx Boat.tsx Sunset.tsx   vehicles and the sunset bench
  DayNight.tsx Weather.tsx      lighting, sky, rain
  Life.tsx Props.tsx            villagers, orbs, particles, decor
  Hud.tsx audio.ts              2D overlay and sound
```

## How it works (short version)

- **Two kinds of state.** React state drives the UI (open panel, discovered places, toasts). A plain mutable `game` object in `data.ts` holds per-frame values (position, keys, night/rain) and is read in `useFrame` loops, so nothing re-renders 60 times a second.
- **Baked terrain.** Height and road distance are computed once into grids; collisions, grass and scatter placement sample them instead of re-evaluating formulas.
- **Roads.** A ring road plus spokes to every building, flattened in the terrain data so the car drives smoothly.
- **Shader warm-up.** Materials compile behind the loading screen, then a few frames render under a cover to avoid stutter on first play.
- **Instancing.** Trees, grass and road markings are instanced meshes to keep draw calls low.

## Deployment

Static build (`dist/`) served by Cloudflare Workers with static assets at the URL above. The deploy settings live in Cloudflare, not in this repository. GitHub Actions (`.github/workflows/webpack.yml`) runs `npm ci && npm run build` on Node 18/20/22 as a build check.

## Known limitations

- The Projects section is a placeholder until case studies are added.
- The 3D chunk is large (~1.5 MB, ~450 KB gzipped); first load includes shader compilation.
- Progress (orbs, discovered places) is not persisted between visits.
- The world is a canvas with keyboard/mouse/touch controls; screen-reader users get the static fallback in `index.html`.

## Contact

[aryans8095@gmail.com](mailto:aryans8095@gmail.com) · [GitHub](https://github.com/aryann2611)
