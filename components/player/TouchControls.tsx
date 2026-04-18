'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function TouchControls() {
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const joystickManagerRef = useRef<ReturnType<typeof import('nipplejs').create> | null>(null);

  const {
    setMoveDirection,
    currentInteraction,
    setShowMissionDialog,
    coins,
    xp,
    level,
  } = useGameStore();

  useEffect(() => {
    const container = joystickContainerRef.current;
    if (!container) return;

    let manager: ReturnType<typeof import('nipplejs').create> | null = null;

    import('nipplejs').then((nipplejs) => {
      manager = nipplejs.create({
        zone: container,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(255, 255, 255, 0.6)',
        size: 140,
        restOpacity: 0.7,
        fadeTime: 0,
        dynamicPage: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any).on('move', (_evt: any, data: any) => {
        if (!data?.vector) return;
        const force = Math.min(data.force ?? 0, 2) / 2;
        setMoveDirection({
          x: data.vector.x * force,
          y: -data.vector.y * force,
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any).on('end', () => {
        setMoveDirection({ x: 0, y: 0 });
      });

      joystickManagerRef.current = manager;
    });

    return () => {
      if (manager) manager.destroy();
      joystickManagerRef.current = null;
    };
  }, [setMoveDirection]);

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
        zIndex: 10,
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
          padding: 'env(safe-area-inset-top, 8px) 16px 8px',
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
              fontFamily: 'sans-serif',
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
              fontFamily: 'sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            🪙 {coins}
          </div>
        </div>

        {/* XP bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'sans-serif' }}>XP</span>
          <div
            style={{
              width: 100,
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
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Zone name — bottom center */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 20px) + 180px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 12,
          padding: '4px 16px',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'sans-serif',
          letterSpacing: 0.5,
        }}
      >
        🏥 Hospital Sana
      </div>

      {/* Joystick area — bottom left, bigger for mobile */}
      <div
        ref={joystickContainerRef}
        style={{
          position: 'absolute',
          left: 16,
          bottom: 'calc(env(safe-area-inset-bottom, 10px) + 16px)',
          width: 170,
          height: 170,
          pointerEvents: 'auto',
          touchAction: 'none',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 60%, transparent 75%)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
      />

      {/* Action button — bottom right */}
      <button
        onTouchStart={(e) => {
          e.stopPropagation();
          handleAction();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleAction();
        }}
        style={{
          position: 'absolute',
          right: 24,
          bottom: 'calc(env(safe-area-inset-bottom, 10px) + 50px)',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.8)',
          background: actionEnabled
            ? 'radial-gradient(circle, #4fc3f7 0%, #0288d1 100%)'
            : 'radial-gradient(circle, rgba(150,150,150,0.4) 0%, rgba(80,80,80,0.4) 100%)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: 0.5,
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: actionEnabled
            ? '0 0 24px rgba(79,195,247,0.6)'
            : '0 4px 12px rgba(0,0,0,0.3)',
          opacity: actionEnabled ? 1 : 0.4,
          transition: 'all 0.15s ease',
        }}
      >
        {actionEnabled ? '❤️‍🩹' : '👋'}
      </button>
    </div>
  );
}
