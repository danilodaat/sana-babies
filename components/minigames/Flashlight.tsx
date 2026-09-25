'use client';

import { useMemo, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';
import { sfx } from '@/lib/audio';

interface Props {
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

/*
 * Linterna: todo está oscuro y la luz sigue al dedo. Hay 3 bichitos
 * escondidos en la garganta; hay que alumbrarlos y tocarlos. Los toques
 * al aire restan un poco de precisión.
 */

const W = 280;
const H = 230;
const LIGHT_R = 62;
const GERMS = 3;
const HIT_R = 30;

export default function Flashlight({ onFinish, onClose }: Props) {
  return (
    <MiniGame
      title="Revisar con la linterna"
      instructions="Mueve la luz con el dedo y toca los 3 bichitos escondidos."
      duration={25}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => <FlashlightGame onComplete={onComplete} />}
    </MiniGame>
  );
}

function FlashlightGame({ onComplete }: { onComplete: (precision: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [light, setLight] = useState({ x: W / 2, y: H * 0.35 });
  const [found, setFound] = useState<boolean[]>(() => Array(GERMS).fill(false));
  const [misses, setMisses] = useState(0);
  const [pops, setPops] = useState<{ x: number; y: number; key: number }[]>([]);
  const done = useRef(false);

  // Bichitos dentro de la garganta (elipse central), separados entre sí
  const germs = useMemo(() => {
    const out: { x: number; y: number; rot: number }[] = [];
    let guard = 0;
    while (out.length < GERMS && guard++ < 200) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const x = W / 2 + Math.cos(a) * r * 88;
      const y = H * 0.52 + Math.sin(a) * r * 58;
      if (out.every((g) => Math.hypot(g.x - x, g.y - y) > 60)) out.push({ x, y, rot: Math.random() * 40 - 20 });
    }
    return out;
  }, []);

  const toLocal = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (done.current) return;
    const p = toLocal(e);
    setLight(p);
    const idx = germs.findIndex((g, i) => !found[i] && Math.hypot(g.x - p.x, g.y - p.y) < HIT_R);
    if (idx < 0) {
      setMisses((m) => m + 1);
      sfx.tick();
      return;
    }
    const next = [...found];
    next[idx] = true;
    setFound(next);
    setPops((ps) => [...ps, { x: germs[idx].x, y: germs[idx].y, key: Date.now() }]);
    sfx.found();
    if (next.every(Boolean)) {
      done.current = true;
      const precision = Math.max(0.3, 1 - Math.max(0, misses - 1) * 0.1);
      setTimeout(() => onComplete(precision), 700);
    }
  };

  const allFound = found.every(Boolean);

  return (
    <div className="flex flex-col items-center gap-3 w-full select-none">
      <div
        ref={box}
        className="relative rounded-3xl overflow-hidden"
        style={{ width: W, height: H, maxWidth: '100%', background: '#f9a8b8', touchAction: 'none', cursor: 'none' }}
        onPointerDown={onDown}
        onPointerMove={(e) => setLight(toLocal(e))}
      >
        {/* Boca abierta */}
        <div className="absolute" style={{ inset: 0, background: 'radial-gradient(ellipse at 50% 55%, #7f1d1d 0%, #b91c1c 38%, #f87171 62%, #fda4af 80%)' }} />
        {/* Dientes */}
        <div className="absolute left-6 right-6 top-0 h-7 flex justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-7 h-7 bg-white rounded-b-xl" style={{ boxShadow: 'inset 0 -3px 0 #e5e7eb' }} />
          ))}
        </div>
        {/* Campanilla */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 26, width: 22, height: 44, background: '#f43f5e', borderRadius: '40% 40% 50% 50% / 30% 30% 70% 70%' }} />
        {/* Lengua */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -40, width: 200, height: 110, background: 'radial-gradient(ellipse at 50% 30%, #fb7185, #e11d48)', borderRadius: '50%' }} />

        {/* Bichitos */}
        {germs.map((g, i) =>
          found[i] ? null : (
            <div
              key={i}
              className="absolute text-3xl"
              style={{ left: g.x, top: g.y, transform: `translate(-50%, -50%) rotate(${g.rot}deg)`, animation: 'sb-bob 1.4s ease-in-out infinite' }}
            >
              🦠
            </div>
          ),
        )}
        {pops.map((p) => (
          <div
            key={p.key}
            className="absolute text-3xl pointer-events-none"
            style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)', animation: 'sb-pop 0.5s cubic-bezier(0.2, 1.8, 0.4, 1)' }}
          >
            ✨
          </div>
        ))}

        {/* Oscuridad con el círculo de luz */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: allFound
              ? 'transparent'
              : `radial-gradient(circle at ${light.x}px ${light.y}px, rgba(255,250,220,0.08) 0px, rgba(0,0,0,0) ${LIGHT_R * 0.7}px, rgba(8,4,20,0.96) ${LIGHT_R}px)`,
            transition: 'background 0.5s',
          }}
        />
        {!allFound && (
          <div
            className="absolute pointer-events-none text-2xl"
            style={{ left: light.x + 26, top: light.y + 26, transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            🔦
          </div>
        )}
      </div>

      <div className="flex gap-2 text-2xl">
        {found.map((f, i) => (
          <span key={i} style={{ opacity: f ? 1 : 0.25, filter: f ? 'none' : 'grayscale(1)' }}>
            🦠
          </span>
        ))}
      </div>
    </div>
  );
}
