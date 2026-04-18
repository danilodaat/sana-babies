'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MiniGameResult {
  stars: 1 | 2 | 3;
  timeElapsed: number;
  precision: number; // 0-1
}

interface MiniGameProps {
  /** Title shown at the top */
  title: string;
  /** Short instructions */
  instructions: string;
  /** Duration in seconds (default 20) */
  duration?: number;
  /** The actual mini-game content (render prop) */
  children: (props: {
    timeLeft: number;
    onComplete: (precision: number) => void;
  }) => React.ReactNode;
  /** Fires when mini-game finishes */
  onFinish: (result: MiniGameResult) => void;
  /** Fires when player cancels / closes */
  onClose?: () => void;
}

function starsFromScore(precision: number, timeFraction: number): 1 | 2 | 3 {
  const score = precision * 0.7 + timeFraction * 0.3;
  if (score >= 0.8) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

export default function MiniGame({
  title,
  instructions,
  duration = 20,
  children,
  onFinish,
  onClose,
}: MiniGameProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const startTime = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Timer
  useEffect(() => {
    startTime.current = Date.now();
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          // Time's up — auto-complete with 0 precision
          handleComplete(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = useCallback(
    (precision: number) => {
      if (finished) return;
      setFinished(true);
      clearInterval(intervalRef.current);

      const elapsed = (Date.now() - startTime.current) / 1000;
      const timeFraction = Math.max(0, 1 - elapsed / duration);
      const stars = starsFromScore(precision, timeFraction);
      const res: MiniGameResult = {
        stars,
        timeElapsed: elapsed,
        precision,
      };
      setResult(res);

      // Give time to see result, then callback
      setTimeout(() => onFinish(res), 1800);
    },
    [finished, duration, onFinish],
  );

  const progressPercent = (timeLeft / duration) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Container */}
      <div className="relative z-10 w-[90%] max-w-md flex flex-col items-center gap-4 p-5 bg-gradient-to-b from-white to-[#FFF8DC] rounded-3xl shadow-2xl border-2 border-sky-200">
        {/* Close button */}
        {onClose && !finished && (
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm active:scale-90 transition-transform"
            onTouchStart={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onClick={onClose}
          >
            ✕
          </button>
        )}

        {/* Title */}
        <h3 className="text-lg font-extrabold text-sky-700">{title}</h3>

        {/* Instructions */}
        <p className="text-sm text-gray-600 text-center leading-snug px-2">
          {instructions}
        </p>

        {/* Timer bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              timeLeft <= 5
                ? 'bg-red-400'
                : timeLeft <= 10
                  ? 'bg-yellow-400'
                  : 'bg-green-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-500 tabular-nums">
          {timeLeft}s
        </span>

        {/* Mini-game content area */}
        <div className="w-full min-h-[250px] flex items-center justify-center">
          {!finished ? (
            children({ timeLeft, onComplete: handleComplete })
          ) : result ? (
            <div className="flex flex-col items-center gap-3 animate-bounce">
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`text-4xl transition-opacity duration-300 ${
                      s <= result.stars ? 'opacity-100' : 'opacity-20'
                    }`}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-lg font-bold text-purple-700">
                {result.stars === 3
                  ? '¡Perfecto!'
                  : result.stars === 2
                    ? '¡Bien hecho!'
                    : '¡Sigue practicando!'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
