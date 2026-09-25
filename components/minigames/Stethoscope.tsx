'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';
import { sfx } from '@/lib/audio';

interface Props {
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

/*
 * Juego de ritmo: los latidos (❤️) viajan hacia el estetoscopio y hay que
 * tocar justo cuando llegan. Cada latido suena al cruzar la línea, así el
 * ritmo se puede seguir con el oído además de con la vista.
 */

const LEAD_IN = 1.6; // segundos antes del primer latido
const BEATS = [0, 0.75, 1.5, 2.25, 3.0, 3.5, 4.0, 4.75]; // incluye un "acelerón"
const TRAVEL = 1.6; // segundos que tarda un latido en cruzar la pista
const PERFECT = 0.09;
const GOOD = 0.19;
const WINDOW = 0.3;

type Judge = 'perfect' | 'good' | 'miss';

export default function Stethoscope({ onFinish, onClose }: Props) {
  return (
    <MiniGame
      title="Escuchar con el estetoscopio"
      instructions="Toca cuando cada corazón llegue al estetoscopio. ¡Sigue el ritmo del latido!"
      duration={20}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => <StethoscopeGame onComplete={onComplete} />}
    </MiniGame>
  );
}

function StethoscopeGame({ onComplete }: { onComplete: (precision: number) => void }) {
  const [now, setNow] = useState(0);
  const [judges, setJudges] = useState<(Judge | null)[]>(() => BEATS.map(() => null));
  const [flash, setFlash] = useState<{ text: string; color: string; key: number } | null>(null);
  const t0 = useRef(0);
  const played = useRef<boolean[]>(BEATS.map(() => false));
  const done = useRef(false);
  const judgesRef = useRef(judges);
  judgesRef.current = judges;

  const beatTime = (i: number) => LEAD_IN + BEATS[i];

  const finish = useCallback(
    (js: (Judge | null)[]) => {
      if (done.current) return;
      done.current = true;
      const score = js.reduce((acc, j) => acc + (j === 'perfect' ? 1 : j === 'good' ? 0.65 : 0), 0) / js.length;
      setTimeout(() => onComplete(score), 500);
    },
    [onComplete],
  );

  useEffect(() => {
    t0.current = performance.now();
    let raf = 0;
    const loop = () => {
      const t = (performance.now() - t0.current) / 1000;
      setNow(t);
      // Sonido del latido al cruzar la línea
      BEATS.forEach((_, i) => {
        if (!played.current[i] && t >= beatTime(i)) {
          played.current[i] = true;
          sfx.heartbeat();
        }
      });
      // Latidos que pasaron sin tocar = fallados
      const js = judgesRef.current;
      let changed = false;
      const next = js.map((j, i) => {
        if (j === null && t > beatTime(i) + WINDOW) {
          changed = true;
          return 'miss' as Judge;
        }
        return j;
      });
      if (changed) {
        judgesRef.current = next;
        setJudges(next);
        setFlash({ text: 'Uy...', color: '#94a3b8', key: Date.now() });
      }
      if (next.every((j) => j !== null)) {
        finish(next);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (done.current) return;
    const t = (performance.now() - t0.current) / 1000;
    let best = -1;
    let bestErr = Infinity;
    judgesRef.current.forEach((j, i) => {
      if (j !== null) return;
      const err = Math.abs(t - beatTime(i));
      if (err < bestErr) {
        bestErr = err;
        best = i;
      }
    });
    if (best < 0 || bestErr > WINDOW) {
      sfx.tick();
      return;
    }
    const judge: Judge = bestErr <= PERFECT ? 'perfect' : bestErr <= GOOD ? 'good' : 'miss';
    const next = [...judgesRef.current];
    next[best] = judge;
    judgesRef.current = next;
    setJudges(next);
    if (judge === 'perfect') {
      sfx.found();
      setFlash({ text: '¡Perfecto!', color: '#ec4899', key: Date.now() });
    } else if (judge === 'good') {
      sfx.pop();
      setFlash({ text: '¡Bien!', color: '#0ea5e9', key: Date.now() });
    } else {
      setFlash({ text: 'Uy...', color: '#94a3b8', key: Date.now() });
    }
    if (next.every((j) => j !== null)) finish(next);
  };

  const HIT_X = 14; // % desde la izquierda

  return (
    <div className="flex flex-col items-center gap-3 w-full select-none">
      <div
        className="relative w-full h-28 rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #fff1f5, #ffe4ec)', boxShadow: 'inset 0 0 0 2px #fbcfe8', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
      >
        {/* Línea de electrocardiograma decorativa */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
          <polyline
            points="0,55 40,55 50,55 58,30 66,78 74,55 120,55 130,55 138,30 146,78 154,55 200,55 210,55 218,30 226,78 234,55 300,55"
            fill="none"
            stroke="#f9a8d4"
            strokeWidth="2"
          />
        </svg>

        {/* Estetoscopio (zona de golpe) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ left: `${HIT_X}%`, background: '#fff', boxShadow: '0 0 0 4px #ec4899, 0 4px 12px rgba(236,72,153,0.35)' }}
        >
          🩺
        </div>

        {/* Latidos en camino */}
        {BEATS.map((_, i) => {
          const dt = beatTime(i) - now;
          const j = judges[i];
          if (j === 'perfect' || j === 'good') return null;
          if (dt > TRAVEL || dt < -WINDOW - 0.2) return null;
          const x = HIT_X + (dt / TRAVEL) * (100 - HIT_X);
          const pulse = 1 + Math.max(0, Math.sin(now * 8)) * 0.12;
          return (
            <div
              key={i}
              className="absolute top-1/2 text-4xl"
              style={{
                left: `${x}%`,
                transform: `translate(-50%, -50%) scale(${pulse})`,
                opacity: j === 'miss' ? 0.25 : 1,
                filter: 'drop-shadow(0 3px 0 rgba(190,24,93,0.35))',
              }}
            >
              ❤️
            </div>
          );
        })}

        {flash && (
          <div
            key={flash.key}
            className="absolute right-3 top-2 text-lg font-extrabold"
            style={{ color: flash.color, animation: 'sb-pop 0.4s cubic-bezier(0.2, 1.8, 0.4, 1)' }}
          >
            {flash.text}
          </div>
        )}
      </div>

      {/* Progreso */}
      <div className="flex gap-1.5">
        {judges.map((j, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{ background: j === 'perfect' ? '#ec4899' : j === 'good' ? '#38bdf8' : j === 'miss' ? '#cbd5e1' : '#fde2ea' }}
          />
        ))}
      </div>

      <button
        className="w-44 h-14 rounded-2xl font-extrabold text-lg text-white shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)', boxShadow: '0 4px 0 #be185d', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
      >
        ¡TUM-TUM!
      </button>
    </div>
  );
}
