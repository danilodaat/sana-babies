'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore, hasSavedProgress } from '@/store/gameStore';
import { unlock, startMusic, setMuted, sfx } from '@/lib/audio';
import { resetRuntime } from '@/lib/runtime';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

const TITLE = 'Sana Babies';

/*
 * El mundo 3D se renderiza desde el principio: la pantalla de inicio es un
 * overlay sobre la ciudad viva, con la cámara orbitando y el día pasando rápido.
 */
export default function Home() {
  const started = useGameStore((s) => s.started);
  const setStarted = useGameStore((s) => s.setStarted);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const level = useGameStore((s) => s.level);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasSave(hasSavedProgress());
  }, []);

  const play = (fresh: boolean) => {
    unlock();
    setMuted(useGameStore.getState().muted);
    startMusic();
    sfx.whoosh();
    if (fresh) {
      resetProgress();
      resetRuntime();
    }
    setLeaving(true);
    setTimeout(() => setStarted(true), 450);
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <Game />

      {!started && (
        <div
          className={leaving ? 'sb-fade-out' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(40,20,70,0.35) 100%)',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <h1 className="sb-title" aria-label={TITLE}>
            {TITLE.split('').map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.09}s`, width: ch === ' ' ? '0.3em' : undefined }}>
                {ch}
              </span>
            ))}
          </h1>

          <p
            style={{
              fontSize: 20,
              color: '#fff',
              fontWeight: 700,
              margin: '0 0 28px',
              textShadow: '0 2px 8px rgba(40,20,70,0.6)',
            }}
          >
            Cuidando al mundo, un pasito a la vez
          </p>

          {mounted && (
            <>
              <button className="sb-btn sb-btn-primary" onClick={() => play(false)}>
                {hasSave ? 'Continuar' : 'Jugar'}
              </button>
              {hasSave && (
                <>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                    Doctor nivel {level}
                  </div>
                  <button
                    className="sb-btn sb-btn-ghost"
                    onClick={() => {
                      if (window.confirm('¿Empezar de cero? Se borrará tu progreso.')) play(true);
                    }}
                  >
                    Nueva partida
                  </button>
                </>
              )}
            </>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: 'max(env(safe-area-inset-bottom), 20px)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontWeight: 600,
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            🔊 Con sonido · Joystick para caminar · Botón azul para atender
          </div>
        </div>
      )}
    </div>
  );
}
