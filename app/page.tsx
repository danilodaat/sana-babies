'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore, hasSavedProgress } from '@/store/gameStore';
import { unlock, startMusic, setMuted, sfx } from '@/lib/audio';
import { resetRuntime } from '@/lib/runtime';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

const TITLE = 'Sana Babies';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

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
  const [installEvt, setInstallEvt] = useState<InstallPrompt | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasSave(hasSavedProgress());
    setInstalled(isStandalone());

    // Juego sin conexión (solo en producción: en desarrollo el SW cachearía el hot reload)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }

    // Android/Chrome: guardar el aviso de instalación para mostrarlo con nuestro botón
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    sfx.click();
    if (installEvt) {
      await installEvt.prompt();
      const choice = await installEvt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallEvt(null);
    } else if (isIos()) {
      setShowIosHint((v) => !v);
    }
  };
  const canInstall = mounted && !installed && (installEvt !== null || isIos());

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

          {canInstall && (
            <button className="sb-btn sb-btn-ghost" style={{ marginTop: 6 }} onClick={install}>
              📲 Instalar como app
            </button>
          )}
          {showIosHint && (
            <div
              style={{
                maxWidth: 300,
                padding: '10px 14px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.92)',
                color: '#5b4a7a',
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              En el iPhone: toca <b>Compartir</b> (el cuadrito con la flecha ⬆️) y luego <b>“Agregar a inicio”</b>.
            </div>
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
