'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

interface MissionDialogProps {
  /** 'offer' = new mission prompt, 'complete' = mission finished */
  mode: 'offer' | 'complete';
  onAccept: () => void;
  onReject?: () => void;
}

export default function MissionDialog({
  mode,
  onAccept,
  onReject,
}: MissionDialogProps) {
  const showDialog = useGameStore((s) => s.showMissionDialog);
  const mission = useGameStore((s) => s.currentMission);
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Slide-in animation
  useEffect(() => {
    if (showDialog) {
      requestAnimationFrame(() => setVisible(true));
      if (mode === 'complete') {
        const t = setTimeout(() => setShowConfetti(true), 200);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
      setShowConfetti(false);
    }
  }, [showDialog, mode]);

  if (!showDialog || !mission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onTouchStart={(e) => e.stopPropagation()}
      />

      {/* Dialog */}
      <div
        className={`
          relative z-10 w-[85%] max-w-sm mx-auto mb-6 sm:mb-0
          bg-gradient-to-b from-white to-[#FFF8DC] rounded-3xl
          shadow-xl border-2 border-pink-200
          p-6 flex flex-col items-center gap-4
          transition-all duration-500 ease-out
          ${visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}
        `}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Completion confetti / stars */}
        {showConfetti && mode === 'complete' && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-2 animate-bounce">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="text-2xl animate-spin"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.5s',
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        )}

        {/* Icon */}
        <div className="text-5xl">
          {mode === 'complete' ? '🎉' : '📋'}
        </div>

        {/* Title */}
        <h2 className="text-xl font-extrabold text-purple-700 text-center leading-tight">
          {mode === 'complete' ? '¡Misión Completada!' : mission.title}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          {mode === 'complete'
            ? `¡Excelente trabajo! Completaste "${mission.title}".`
            : mission.description}
        </p>

        {/* Rewards */}
        <div className="flex items-center gap-6 py-2">
          <div className="flex items-center gap-1">
            <span className="text-lg">🪙</span>
            <span className="text-lg font-bold text-yellow-600">
              +{mission.reward.coins}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">✨</span>
            <span className="text-lg font-bold text-purple-600">
              +{mission.reward.xp} XP
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          {mode === 'offer' ? (
            <>
              <button
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-400 text-white font-bold text-base shadow-md active:scale-95 transition-transform pointer-events-auto"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onAccept();
                }}
                onClick={onAccept}
              >
                ¡Aceptar!
              </button>
              {onReject && (
                <button
                  className="flex-1 py-3 rounded-2xl bg-gray-200 text-gray-500 font-bold text-base shadow-sm active:scale-95 transition-transform pointer-events-auto"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    onReject();
                  }}
                  onClick={onReject}
                >
                  Ahora no
                </button>
              )}
            </>
          ) : (
            <button
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-base shadow-md active:scale-95 transition-transform pointer-events-auto"
              onTouchStart={(e) => {
                e.stopPropagation();
                onAccept();
              }}
              onClick={onAccept}
            >
              ¡Continuar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
