'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function TouchControls() {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const {
    setMoveDirection,
    currentInteraction,
    setShowMissionDialog,
    coins,
    xp,
    level,
  } = useGameStore();

  const JOYSTICK_RADIUS = 60;
  const KNOB_RADIUS = 28;

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    if (!joystickRef.current) return;
    activeTouch.current = touch.identifier;
    const rect = joystickRef.current.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateKnob(touch.clientX, touch.clientY);
  }, []);

  const updateKnob = useCallback((touchX: number, touchY: number) => {
    const dx = touchX - centerRef.current.x;
    const dy = touchY - centerRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = JOYSTICK_RADIUS;

    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    const normalX = clampedX / maxDist;
    const normalY = clampedY / maxDist;
    const force = Math.min(dist / maxDist, 1);

    if (force > 0.1) {
      setMoveDirection({ x: normalX * force, y: normalY * force });
    } else {
      setMoveDirection({ x: 0, y: 0 });
    }
  }, [setMoveDirection]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (activeTouch.current === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouch.current) {
          e.preventDefault();
          updateKnob(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouch.current === null) return;
      let found = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouch.current) {
          found = true;
          break;
        }
      }
      if (!found) {
        activeTouch.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        setMoveDirection({ x: 0, y: 0 });
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [setMoveDirection, updateKnob]);

  const handleAction = useCallback(() => {
    if (currentInteraction) {
      setShowMissionDialog(true);
    }
  }, [currentInteraction, setShowMissionDialog]);

  const actionEnabled = !!currentInteraction;

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
      {/* HUD — top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'max(env(safe-area-inset-top, 8px), 8px) 16px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Nv. {level}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#ffd54f',
              fontSize: 16,
              fontWeight: 800,
              fontFamily: 'system-ui, sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            🪙 {coins}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>XP</span>
          <div
            style={{
              width: 90,
              height: 10,
              borderRadius: 5,
              background: 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <div
              style={{
                width: `${Math.max(5, (xp % (level * 100)) / (level * 100) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #66bb6a, #43a047)',
                borderRadius: 5,
              }}
            />
          </div>
        </div>
      </div>

      {/* Joystick — bottom left */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        style={{
          position: 'absolute',
          left: 24,
          bottom: 'max(env(safe-area-inset-bottom, 20px), 24px)',
          width: JOYSTICK_RADIUS * 2 + 20,
          height: JOYSTICK_RADIUS * 2 + 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          pointerEvents: 'auto',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Knob */}
        <div
          ref={knobRef}
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'none',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Action button — bottom right */}
      <div
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction();
        }}
        style={{
          position: 'absolute',
          right: 24,
          bottom: 'max(env(safe-area-inset-bottom, 20px), 44px)',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.8)',
          background: actionEnabled
            ? 'radial-gradient(circle, #4fc3f7 0%, #0288d1 100%)'
            : 'radial-gradient(circle, rgba(150,150,150,0.4) 0%, rgba(80,80,80,0.4) 100%)',
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: actionEnabled
            ? '0 0 24px rgba(79,195,247,0.6)'
            : '0 4px 12px rgba(0,0,0,0.3)',
          opacity: actionEnabled ? 1 : 0.4,
        }}
      >
        {actionEnabled ? '❤️‍🩹' : '👋'}
      </div>
    </div>
  );
}
