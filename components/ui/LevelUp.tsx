'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { player } from '@/lib/runtime';
import { emit } from '@/lib/fx';
import { sfx } from '@/lib/audio';

/** Celebración a pantalla completa al subir de nivel */
export default function LevelUp() {
  const levelUp = useGameStore((s) => s.levelUp);
  const clearLevelUp = useGameStore((s) => s.clearLevelUp);
  // Solo celebrar cuando no hay diálogos encima
  const busy = useGameStore((s) => s.showMissionDialog || s.activeMiniGame !== null);

  useEffect(() => {
    if (levelUp === null || busy) return;
    sfx.levelUp();
    emit('confetti', player.position, 120);
    emit('sparkle', player.position, 30);
    const t = setTimeout(clearLevelUp, 2800);
    return () => clearTimeout(t);
  }, [levelUp, busy, clearLevelUp]);

  if (levelUp === null || busy) return null;

  return (
    <div className="sb-levelup" aria-live="polite">
      <div className="sb-levelup-rays" />
      <div className="sb-levelup-card">
        <div className="sb-levelup-kicker">¡Subiste de nivel!</div>
        <div className="sb-levelup-num">{levelUp}</div>
        <div className="sb-levelup-sub">Los bebés de Ciudad Sana confían más en ti</div>
      </div>
    </div>
  );
}
