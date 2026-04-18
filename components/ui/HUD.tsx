'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

// ─── Coin pop animation helper ───
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined as T);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// ─── XP needed for next level ───
function xpForLevel(level: number): number {
  return level * 100;
}

function xpInCurrentLevel(xp: number, level: number): number {
  let totalForPrevLevels = 0;
  for (let i = 1; i < level; i++) totalForPrevLevels += i * 100;
  return xp - totalForPrevLevels;
}

export default function HUD() {
  const coins = useGameStore((s) => s.coins);
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);
  const currentMission = useGameStore((s) => s.currentMission);
  const missions = useGameStore((s) => s.missions);

  const prevCoins = usePrevious(coins);
  const prevXP = usePrevious(xp);
  const [coinPop, setCoinPop] = useState(false);
  const [xpPop, setXpPop] = useState(false);

  // Coin gain animation
  useEffect(() => {
    if (prevCoins !== undefined && coins > prevCoins) {
      setCoinPop(true);
      const t = setTimeout(() => setCoinPop(false), 600);
      return () => clearTimeout(t);
    }
  }, [coins, prevCoins]);

  // XP gain animation
  useEffect(() => {
    if (prevXP !== undefined && xp > prevXP) {
      setXpPop(true);
      const t = setTimeout(() => setXpPop(false), 600);
      return () => clearTimeout(t);
    }
  }, [xp, prevXP]);

  const xpCurrent = xpInCurrentLevel(xp, level);
  const xpNeeded = xpForLevel(level);
  const xpPercent = Math.min((xpCurrent / xpNeeded) * 100, 100);

  // Find active mission (from store missions or currentMission)
  const activeMission =
    currentMission ?? missions.find((m) => !m.completed) ?? null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* ─── Top Left: Coins + XP + Level ─── */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {/* Coins */}
        <div
          className={`
            flex items-center gap-2 px-4 py-2
            bg-white/85 backdrop-blur-sm rounded-2xl
            shadow-md border border-yellow-200
            transition-transform duration-300
            ${coinPop ? 'scale-110' : 'scale-100'}
          `}
        >
          <span className="text-xl">🪙</span>
          <span className="text-lg font-bold text-yellow-700 tabular-nums">
            {coins}
          </span>
          {coinPop && (
            <span className="absolute -top-2 right-0 text-sm font-bold text-yellow-500 animate-bounce">
              +$
            </span>
          )}
        </div>

        {/* Level + XP bar */}
        <div className="flex flex-col gap-1 px-4 py-2 bg-white/85 backdrop-blur-sm rounded-2xl shadow-md border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">
              Nivel {level}
            </span>
            <span
              className={`text-xs font-semibold text-purple-500 tabular-nums transition-transform duration-300 ${xpPop ? 'scale-125' : 'scale-100'}`}
            >
              {xpCurrent}/{xpNeeded} XP
            </span>
          </div>
          <div className="h-3 w-36 sm:w-44 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Top Right: Active Mission ─── */}
      {activeMission && (
        <div className="absolute top-3 right-3 max-w-[200px] sm:max-w-[260px]">
          <div className="px-4 py-3 bg-white/85 backdrop-blur-sm rounded-2xl shadow-md border border-sky-200">
            <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-1">
              Misión
            </p>
            <p className="text-sm font-semibold text-gray-700 leading-snug">
              {activeMission.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">
              {activeMission.description.length > 80
                ? activeMission.description.slice(0, 80) + '...'
                : activeMission.description}
            </p>
          </div>
        </div>
      )}

      {/* ─── Bottom Center: Zone name ─── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <div className="px-6 py-2 bg-white/75 backdrop-blur-sm rounded-full shadow border border-green-200">
          <p className="text-sm font-bold text-green-700 text-center">
            {activeMission?.zone
              ? activeMission.zone.charAt(0).toUpperCase() +
                activeMission.zone.slice(1)
              : 'Ciudad'}
          </p>
        </div>
      </div>
    </div>
  );
}
