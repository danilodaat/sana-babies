'use client';

import { useEffect, useRef } from 'react';
import { useGameStore, TUTORIAL_DONE } from '@/store/gameStore';
import { player } from '@/lib/runtime';
import { sfx } from '@/lib/audio';

/*
 * Tutorial guiado por la enfermera Lucía, solo en la primera partida:
 *   0 bienvenida → 1 caminar → 2 hablar con Rosa → 3 atender a Luciana → 4 tienda y álbum
 * Cada paso avanza solo cuando el jugador hace la acción; se puede saltar.
 */

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

function Bubble({ text, onSkip, action }: { text: React.ReactNode; onSkip: () => void; action?: { label: string; onClick: () => void } }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(max(env(safe-area-inset-bottom), 20px) + 168px)',
        transform: 'translateX(-50%)',
        width: 'min(92%, 380px)',
        pointerEvents: 'auto',
        animation: 'sb-pop 0.4s cubic-bezier(0.2, 1.5, 0.4, 1)',
      }}
    >
      <div
        className="flex items-start gap-3 rounded-3xl p-3"
        style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 0 0 3px #f9a8d4, 0 10px 30px rgba(0,0,0,0.25)' }}
      >
        <div className="text-4xl shrink-0" style={{ animation: 'sb-bob 2s ease-in-out infinite' }}>
          👩‍⚕️
        </div>
        <div className="flex-1">
          <div className="text-xs font-extrabold text-pink-500">Enfermera Lucía</div>
          <div className="text-sm text-gray-700 leading-snug">{text}</div>
          <div className="flex items-center justify-between mt-2">
            <button className="text-[11px] font-bold text-gray-400 underline" onClick={onSkip}>
              Saltar tutorial
            </button>
            {action && (
              <button
                className="px-4 py-1.5 rounded-full text-sm font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #ff6b9d, #ff8e53)', boxShadow: '0 3px 0 #d9507f' }}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tutorial() {
  const step = useGameStore((s) => s.tutorialStep);
  const setStep = useGameStore((s) => s.setTutorialStep);
  const started = useGameStore((s) => s.started);
  const activeCase = useGameStore((s) => s.activeCase);
  const completed = useGameStore((s) => s.completedMissions);
  const modal = useGameStore((s) => s.modal);
  const setModal = useGameStore((s) => s.setModal);
  const startPos = useRef<{ x: number; z: number } | null>(null);

  const skip = () => {
    sfx.click();
    setModal(false);
    setStep(TUTORIAL_DONE);
  };

  // La bienvenida bloquea el movimiento hasta tocar "¡Vamos!"
  useEffect(() => {
    if (started && step === 0) setModal(true);
  }, [started, step, setModal]);

  // Paso 1: caminar 3 metros
  useEffect(() => {
    if (step !== 1) return;
    startPos.current = { x: player.position.x, z: player.position.z };
    const id = setInterval(() => {
      const p = startPos.current!;
      if (Math.hypot(player.position.x - p.x, player.position.z - p.z) > 3) {
        sfx.pop();
        setStep(2);
      }
    }, 200);
    return () => clearInterval(id);
  }, [step, setStep]);

  // Pasos 2 y 3 avanzan con el estado del juego
  useEffect(() => {
    if (step === 2 && activeCase) setStep(3);
    if (step === 3 && completed.includes('mission-primer-paciente')) setStep(4);
    // Si alguien ya avanzó por su cuenta (p. ej. aceptó otro caso), no trabar el tutorial
    if (step >= 2 && step < 4 && completed.length > 0 && !completed.includes('mission-primer-paciente')) setStep(4);
  }, [step, activeCase, completed, setStep]);

  if (!started || step >= TUTORIAL_DONE) return null;

  if (step === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto" onTouchStart={(e) => e.stopPropagation()}>
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
        <div
          className="relative z-10 w-[92%] max-w-sm rounded-3xl p-5 flex flex-col items-center gap-3 text-center"
          style={{ background: 'linear-gradient(#fff, #fff1f5)', boxShadow: '0 0 0 3px #f9a8d4, 0 14px 40px rgba(0,0,0,0.25)', animation: 'sb-pop 0.45s cubic-bezier(0.2, 1.5, 0.4, 1)' }}
        >
          <div className="text-6xl" style={{ animation: 'sb-bob 2s ease-in-out infinite' }}>
            👩‍⚕️
          </div>
          <div className="text-xs font-extrabold tracking-widest text-pink-500">ENFERMERA LUCÍA</div>
          <div className="text-xl font-extrabold text-violet-700">¡Bienvenido a Ciudad Sana, doctor!</div>
          <div className="text-sm text-gray-600 leading-snug">
            Aquí los bebés y los niños cuentan contigo. Yo te voy a acompañar en tu primer día. ¿Empezamos?
          </div>
          <div className="flex w-full gap-2 mt-1">
            <button className="flex-1 py-3 rounded-2xl font-extrabold text-gray-500 bg-gray-100" style={{ boxShadow: '0 3px 0 #cbd5e1' }} onClick={skip}>
              Ya sé jugar
            </button>
            <button
              className="flex-1 py-3 rounded-2xl font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #ff6b9d, #ff8e53)', boxShadow: '0 4px 0 #d9507f' }}
              onClick={() => {
                sfx.success();
                setModal(false);
                setStep(1);
              }}
            >
              ¡Vamos!
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal) return null; // no tapar diálogos ni minijuegos

  if (step === 1)
    return (
      <Bubble
        onSkip={skip}
        text={isTouch() ? <>Arrastra el <b>joystick</b> de la izquierda para caminar. ¡Prueba!</> : <>Camina con <b>W A S D</b> o las flechas. Arrastra el mouse para girar la cámara.</>}
      />
    );
  if (step === 2)
    return (
      <Bubble
        onSkip={skip}
        text={
          <>
            ¿Ves la <b style={{ color: '#e0a800' }}>flecha amarilla</b>? Te lleva con <b>Rosa</b>, que necesita ayuda. Acércate y toca{' '}
            {isTouch() ? 'el botón ❤️‍🩹' : <b>E</b>}.
          </>
        }
      />
    );
  if (step === 3)
    return (
      <Bubble
        onSkip={skip}
        text={
          <>
            ¡Tu primer caso! Sigue la <b style={{ color: '#ff4f7b' }}>flecha rosada</b> hasta <b>Luciana</b>. Examínala y elige el mejor tratamiento en el
            informe.
          </>
        }
      />
    );
  return (
    <Bubble
      onSkip={skip}
      text={
        <>
          ¡Excelente trabajo! Con tus monedas compra batas y mejoras en la tienda 🛍️. En el álbum 📔 verás a todos tus pacientes. ¡Y atento al teléfono, que a
          veces hay emergencias!
        </>
      }
      action={{
        label: '¡Entendido!',
        onClick: () => {
          sfx.success();
          setStep(TUTORIAL_DONE);
        },
      }}
    />
  );
}
