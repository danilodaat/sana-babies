'use client';

import { useEffect, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';
import { sfx } from '@/lib/audio';

interface Props {
  dose: number;
  label?: string;
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

/*
 * Dosificar jarabe: mantener presionado inclina el frasco y sirve. El chorro
 * empieza suave y se acelera mientras sigas presionando, así que la dosis
 * exacta se logra con toquecitos al final. Si se rebalsa, se derrama.
 */

const MAX_ML = 10;
const RATE_MIN = 0.8; // ml/s al empezar a servir
const RATE_MAX = 4.2; // ml/s tras mantener presionado
const RAMP = 0.9; // segundos hasta el caudal máximo

export default function Syrup({ dose, label = 'jarabe', onFinish, onClose }: Props) {
  return (
    <MiniGame
      title={`Servir ${dose} ml de ${label}`}
      instructions="Mantén presionado para servir. Suelta en la línea y toca ¡Listo!"
      duration={25}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => <SyrupGame dose={dose} onComplete={onComplete} />}
    </MiniGame>
  );
}

function SyrupGame({ dose, onComplete }: { dose: number; onComplete: (precision: number) => void }) {
  const [ml, setMl] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [spilled, setSpilled] = useState(false);
  const holdStart = useRef(0);
  const last = useRef(0);
  const mlRef = useRef(0);
  const done = useRef(false);
  const bubbleAt = useRef(0);

  useEffect(() => {
    if (!pouring) return;
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;
      const held = (now - holdStart.current) / 1000;
      const rate = RATE_MIN + (RATE_MAX - RATE_MIN) * Math.min(held / RAMP, 1);
      mlRef.current = Math.min(mlRef.current + rate * dt, MAX_ML + 0.5);
      setMl(mlRef.current);
      if (now > bubbleAt.current) {
        sfx.bubble();
        bubbleAt.current = now + 130 + Math.random() * 90;
      }
      if (mlRef.current > MAX_ML) {
        setSpilled(true);
        setPouring(false);
        sfx.wrong();
        if (!done.current) {
          done.current = true;
          setTimeout(() => onComplete(0.15), 900);
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pouring, onComplete]);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    if (done.current || spilled) return;
    holdStart.current = performance.now();
    last.current = holdStart.current;
    setPouring(true);
  };
  const stop = () => setPouring(false);

  const submit = () => {
    if (done.current) return;
    done.current = true;
    setPouring(false);
    const err = Math.abs(mlRef.current - dose);
    const precision = err <= 0.35 ? 1 : err <= 0.8 ? 0.75 : err <= 1.6 ? 0.45 : 0.2;
    if (precision >= 0.75) sfx.found();
    else sfx.wrong();
    setTimeout(() => onComplete(precision), 500);
  };

  const pct = (v: number) => (Math.min(v, MAX_ML) / MAX_ML) * 100;
  const err = Math.abs(ml - dose);
  const status = spilled ? '¡Se derramó!' : err <= 0.35 ? '¡Justo!' : ml < dose ? 'Falta un poquito' : 'Te pasaste un poco';

  return (
    <div className="flex items-end justify-center gap-6 w-full select-none">
      {/* Frasco */}
      <div
        className="relative flex flex-col items-center"
        style={{ touchAction: 'none', cursor: 'pointer' }}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        <div
          style={{
            transform: `rotate(${pouring ? -105 : -15}deg)`,
            transformOrigin: '70% 20%',
            transition: 'transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1)',
            fontSize: 64,
            lineHeight: 1,
            filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.12))',
          }}
        >
          🍯
        </div>
        {/* Chorro */}
        <div
          style={{
            position: 'absolute',
            right: -34,
            top: 44,
            width: 7,
            height: pouring ? 118 : 0,
            borderRadius: 4,
            background: 'linear-gradient(#f59e0b, #ea580c)',
            transition: 'height 0.12s',
          }}
        />
        <div className="mt-3 text-xs font-bold text-gray-500">Mantén aquí</div>
      </div>

      {/* Vasito medidor */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative overflow-hidden"
          style={{
            width: 92,
            height: 160,
            borderRadius: '10px 10px 26px 26px',
            background: 'rgba(224,242,254,0.7)',
            boxShadow: 'inset 0 0 0 3px #7dd3fc, 0 6px 16px rgba(14,165,233,0.2)',
          }}
        >
          {/* Líquido */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: `${pct(ml)}%`,
              background: 'linear-gradient(#fbbf24, #ea580c)',
              transition: pouring ? 'none' : 'height 0.2s',
            }}
          >
            <div
              className="absolute -top-2 left-0 right-0 h-4 rounded-full"
              style={{ background: '#fcd34d', animation: pouring ? 'sb-bob 0.5s ease-in-out infinite' : undefined }}
            />
          </div>
          {/* Marcas */}
          {Array.from({ length: MAX_ML }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0"
              style={{ bottom: `${pct(i + 1)}%`, width: (i + 1) % 5 === 0 ? 26 : 14, height: 2, background: '#0ea5e9', opacity: 0.6 }}
            />
          ))}
          {/* Línea objetivo */}
          <div
            className="absolute left-0 right-0"
            style={{ bottom: `${pct(dose)}%`, height: 3, background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)' }}
          />
          <div
            className="absolute right-1 text-[11px] font-extrabold text-green-600"
            style={{ bottom: `calc(${pct(dose)}% + 4px)` }}
          >
            {dose} ml
          </div>
        </div>
        <div className="text-lg font-extrabold tabular-nums text-orange-600">{ml.toFixed(1)} ml</div>
        <div className="text-xs font-bold" style={{ color: spilled ? '#dc2626' : err <= 0.35 ? '#16a34a' : '#6b7280' }}>
          {status}
        </div>
        <button
          className="px-6 h-11 rounded-2xl font-extrabold text-white active:scale-95 transition-transform disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', boxShadow: '0 4px 0 #047857' }}
          disabled={ml < 0.2 || spilled}
          onClick={submit}
        >
          ¡Listo!
        </button>
      </div>
    </div>
  );
}
