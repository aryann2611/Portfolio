import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, type LineSegments } from "three";
import { game } from "./data";

const N = 900;
const BOX = 40;
const TOP = 28;

/** Rain streaks that wrap in a box around the player; fades in/out with `game.rainMix`. */
export function Rain() {
  const ref = useRef<LineSegments>(null);
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const p = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * BOX, y = Math.random() * TOP, z = (Math.random() - 0.5) * BOX;
      p.set([x, y, z, x, y + 0.9, z], i * 6);
    }
    g.setAttribute("position", new BufferAttribute(p, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    game.rainMix += ((game.rain ? 1 : 0) - game.rainMix) * Math.min(dt * 1.5, 1);
    const m = ref.current;
    if (!m) return;
    m.visible = game.rainMix > 0.02;
    if (!m.visible) return;
    (m.material as { opacity: number }).opacity = game.rainMix * 0.45;
    m.position.set(game.pos.x, 0, game.pos.z);
    const a = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < N; i++) {
      const y = a.getY(i * 2) - 28 * dt;
      const ny = y < 0 ? y + TOP : y;
      a.setY(i * 2, ny);
      a.setY(i * 2 + 1, ny + 0.9);
    }
    a.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geo} frustumCulled={false} visible={false}>
      <lineBasicMaterial color="#cfe3f5" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  );
}
