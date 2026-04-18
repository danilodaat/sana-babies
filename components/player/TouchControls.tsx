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
  } = useGameStore();

  // Initialize nipplejs joystick
  useEffect(() => {
    const container = joystickContainerRef.current;
    if (!container) return;

    let manager: ReturnType<typeof import('nipplejs').create> | null = null;

    // Dynamic import for nipplejs (avoids SSR issues)
    import('nipplejs').then((nipplejs) => {
      manager = nipplejs.create({
        zone: container,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(255, 255, 255, 0.5)',
        size: 120,
        restOpacity: 0.6,
        fadeTime: 100,
      });

      manager.on('move', (evt) => {
        const data = evt.data;
        if (!data.vector) return;
        // nipplejs gives x (-1 to 1) and y (-1 to 1)
        // y is inverted: up = positive in nipplejs, but we want forward = negative z
        const force = Math.min(data.force ?? 0, 2) / 2; // Normalize 0-1
        setMoveDirection({
          x: data.vector.x * force,
          y: -data.vector.y * force, // Invert y for 3D world
        });
      });

      manager.on('end', () => {
        setMoveDirection({ x: 0, y: 0 });
      });

      joystickManagerRef.current = manager;
    });

    return () => {
      if (manager) {
        manager.destroy();
      }
      joystickManagerRef.current = null;
    };
  }, [setMoveDirection]);

  const handleAction = useCallback(() => {
    if (currentInteraction) {
      setShowMissionDialog(true);
    }
  }, [currentInteraction, setShowMissionDialog]);

  // Determine action button label based on context
  const actionLabel = currentInteraction ? 'Atender' : 'Hablar';
  const actionEnabled = !!currentInteraction;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        touchAction: 'none',
      }}
    >
      {/* Joystick area — bottom left */}
      <div
        ref={joystickContainerRef}
        style={{
          position: 'absolute',
          left: 20,
          bottom: 30,
          width: 150,
          height: 150,
          pointerEvents: 'auto',
          touchAction: 'none',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Action button — bottom right */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          handleAction();
        }}
        style={{
          position: 'absolute',
          right: 30,
          bottom: 50,
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.7)',
          background: actionEnabled
            ? 'radial-gradient(circle, #4fc3f7 0%, #0288d1 100%)'
            : 'radial-gradient(circle, rgba(150,150,150,0.5) 0%, rgba(80,80,80,0.5) 100%)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: actionEnabled
            ? '0 0 20px rgba(79,195,247,0.5)'
            : '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease',
          opacity: actionEnabled ? 1 : 0.5,
        }}
      >
        {actionLabel}
      </button>

      {/* HUD — top bar */}
      <HUD />
    </div>
  );
}

function HUD() {
  const { coins, xp, level } = useGameStore();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {/* Level */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            padding: '4px 12px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Nv. {level}
        </div>

        {/* Coins */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#ffd54f',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: 16 }}>&#x1FA99;</span>
          {coins}
        </div>
      </div>

      {/* XP bar */}
      <div
        style={{
          width: 100,
          height: 8,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(xp % (level * 100)) / (level * 100) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #66bb6a, #43a047)',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
