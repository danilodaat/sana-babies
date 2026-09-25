'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useGameStore, xpForLevelStart } from '@/store/gameStore';
import { input, world } from '@/lib/runtime';
import { setMuted as setAudioMuted, sfx } from '@/lib/audio';

const JOYSTICK_RADIUS = 60;
const KNOB_RADIUS = 28;
const CAMERA_SENSITIVITY = 0.006;
const MOUSE_SENSITIVITY = 0.005;

/** Chip que "salta" cuando cambia su valor */
function PopChip({ value, children }: { value: number; children: React.ReactNode }) {
  const [pop, setPop] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) setPop((p) => p + 1);
    prev.current = value;
  }, [value]);
  return (
    <div key={pop} className={`sb-chip${pop ? ' sb-pop' : ''}`}>
      {children}
    </div>
  );
}

/** Reloj del día: sol/luna y hora del juego, se actualiza 2 veces por segundo */
function DayClock() {
  const [t, setT] = useState(world.time);
  useEffect(() => {
    const id = setInterval(() => setT(world.time), 500);
    return () => clearInterval(id);
  }, []);
  const hours = Math.floor(t * 24);
  const mins = Math.floor((t * 24 * 60) % 60 / 10) * 10;
  const isNight = t < 0.23 || t > 0.79;
  return (
    <div className="sb-chip" style={{ fontSize: 13 }}>
      {isNight ? '🌙' : t < 0.3 || t > 0.72 ? '🌅' : '☀️'} {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}
    </div>
  );
}

export default function TouchControls() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const cameraTouchId = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const lastCameraX = useRef(0);
  const mouseDragging = useRef(false);
  const lastMouseX = useRef(0);
  const [toast, setToast] = useState<string | null>(null);

  const currentInteraction = useGameStore((s) => s.currentInteraction);
  const triggerAction = useGameStore((s) => s.triggerAction);
  const coins = useGameStore((s) => s.coins);
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);
  const busy = useGameStore((s) => s.modal);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  // --- Joystick logic ---
  const updateKnob = useCallback((touchX: number, touchY: number) => {
    const dx = touchX - centerRef.current.x;
    const dy = touchY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const force = Math.min(dist / JOYSTICK_RADIUS, 1);
    if (force > 0.1) {
      input.touch.x = (clampedX / JOYSTICK_RADIUS) * force;
      input.touch.y = (clampedY / JOYSTICK_RADIUS) * force;
    } else {
      input.touch.x = 0;
      input.touch.y = 0;
    }
  }, []);

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!joystickRef.current) return;
    joystickTouchId.current = touch.identifier;
    const rect = joystickRef.current.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateKnob(touch.clientX, touch.clientY);
  }, [updateKnob]);

  // --- Camera swipe zone ---
  const handleCameraStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    cameraTouchId.current = touch.identifier;
    lastCameraX.current = touch.clientX;
  }, []);

  // --- Global touch + mouse handlers ---
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouchId.current) {
          e.preventDefault();
          updateKnob(t.clientX, t.clientY);
        }
        if (t.identifier === cameraTouchId.current) {
          e.preventDefault();
          const deltaX = t.clientX - lastCameraX.current;
          lastCameraX.current = t.clientX;
          input.cameraAngle -= deltaX * CAMERA_SENSITIVITY;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
          input.touch.x = 0;
          input.touch.y = 0;
        }
        if (t.identifier === cameraTouchId.current) cameraTouchId.current = null;
      }
    };

    // Escritorio: arrastrar con el mouse gira la cámara, E / Enter atiende
    // Mouse: se calcula el delta con clientX (movementX falla en algunos trackpads/navegadores)
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDragging.current) return;
      const dx = e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;
      input.cameraAngle -= dx * MOUSE_SENSITIVITY;
    };
    const onMouseUp = () => {
      mouseDragging.current = false;
      document.body.style.cursor = '';
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) {
        const s = useGameStore.getState();
        if (s.currentInteraction && !s.modal) {
          sfx.click();
          s.triggerAction();
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [updateKnob]);

  const handleAction = useCallback(() => {
    if (currentInteraction) {
      sfx.click();
      triggerAction();
    }
  }, [currentInteraction, triggerAction]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    if (!next) sfx.click();
  };

  const toggleQuality = () => {
    const next = quality === 'alto' ? 'bajo' : 'alto';
    setQuality(next);
    sfx.click();
    showToast(next === 'alto' ? '✨ Gráficos: alto' : '🔋 Gráficos: ahorro');
  };

  const actionEnabled = !!currentInteraction && !busy;
  const xpInto = xp - xpForLevelStart(level);
  const xpPercent = Math.min(100, (xpInto / (level * 100)) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Girar la cámara: arrastrar (dedo o mouse) en cualquier parte libre de la pantalla.
          Joystick y botones están encima y no dejan pasar el toque. */}
      <div
        onTouchStart={handleCameraStart}
        onMouseDown={(e) => {
          mouseDragging.current = true;
          lastMouseX.current = e.clientX;
          document.body.style.cursor = 'grabbing';
        }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', touchAction: 'none', cursor: 'grab' }}
      />

      {/* HUD — barra superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'max(env(safe-area-inset-top), 10px) 12px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(to bottom, rgba(30,20,50,0.35), transparent)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PopChip value={level}>
            <span style={{ color: '#ffd54f' }}>★</span> Nv. {level}
          </PopChip>
          <PopChip value={coins}>
            <span>🪙</span> <span style={{ color: '#ffe082' }}>{coins}</span>
          </PopChip>
          <div className="sb-chip" style={{ padding: '6px 10px' }}>
            <span style={{ fontSize: 11 }}>XP</span>
            <div
              style={{
                width: 70,
                height: 9,
                borderRadius: 5,
                background: 'rgba(255,255,255,0.25)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(4, xpPercent)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7ee081, #43c06a)',
                  borderRadius: 5,
                  transition: 'width 0.6s cubic-bezier(0.2, 1.4, 0.4, 1)',
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <DayClock />
          <button className="sb-icon-btn" onClick={toggleMute} onTouchEnd={(e) => { e.preventDefault(); toggleMute(); }} aria-label="Sonido">
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="sb-icon-btn" onClick={toggleQuality} onTouchEnd={(e) => { e.preventDefault(); toggleQuality(); }} aria-label="Calidad gráfica">
            {quality === 'alto' ? '✨' : '🔋'}
          </button>
        </div>
      </div>

      {toast && <div className="sb-toast">{toast}</div>}

      {/* Joystick — abajo a la izquierda */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        style={{
          position: 'absolute',
          left: 24,
          bottom: 'max(env(safe-area-inset-bottom), 24px)',
          width: JOYSTICK_RADIUS * 2 + 20,
          height: JOYSTICK_RADIUS * 2 + 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.35)',
          pointerEvents: 'auto',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          ref={knobRef}
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.35) 100%)',
            border: '2px solid rgba(255,255,255,0.7)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Botón de salto */}
      <div
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          input.jumpQueued = true;
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          input.jumpQueued = true;
        }}
        style={{
          position: 'absolute',
          right: 124,
          bottom: 'max(env(safe-area-inset-bottom), 24px)',
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.8)',
          background: 'radial-gradient(circle, #ffd76a 0%, #ff9f1c 100%)',
          boxShadow: '0 4px 0 #d17a00, 0 6px 16px rgba(0,0,0,0.25)',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 26,
          fontWeight: 900,
          textShadow: '0 2px 0 rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}
        aria-label="Saltar"
      >
        ⤒
      </div>

      {/* Botón de acción */}
      <div
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleAction();
        }}
        style={{
          position: 'absolute',
          right: 24,
          bottom: 'max(env(safe-area-inset-bottom), 44px)',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.85)',
          background: actionEnabled
            ? 'radial-gradient(circle, #4fc3f7 0%, #0288d1 100%)'
            : 'radial-gradient(circle, rgba(150,150,150,0.4) 0%, rgba(80,80,80,0.4) 100%)',
          color: '#fff',
          fontSize: 30,
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: actionEnabled ? '0 0 0 0 rgba(79,195,247,0.7), 0 0 28px rgba(79,195,247,0.7)' : '0 4px 12px rgba(0,0,0,0.3)',
          opacity: actionEnabled ? 1 : 0.45,
          transform: actionEnabled ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.2, 1.8, 0.4, 1), opacity 0.2s',
        }}
        aria-label="Atender"
      >
        {actionEnabled ? '❤️‍🩹' : '👋'}
      </div>
    </div>
  );
}
