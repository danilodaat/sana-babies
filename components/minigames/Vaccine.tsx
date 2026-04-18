'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';

interface VaccineProps {
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

// Timing circle config
const SHRINK_DURATION = 1500; // ms for one shrink cycle
const TARGET_RADIUS = 24; // px — inner target
const PERFECT_THRESHOLD = 8; // px from target radius for 3 stars
const GOOD_THRESHOLD = 20; // px from target radius for 2 stars

function getPrecision(radiusDiff: number): number {
  if (radiusDiff <= PERFECT_THRESHOLD) return 1.0;
  if (radiusDiff <= GOOD_THRESHOLD) return 0.6;
  return 0.2;
}

export default function Vaccine({ onFinish, onClose }: VaccineProps) {
  return (
    <MiniGame
      title="Poner Vacuna"
      instructions="Toca justo cuando el círculo se alinee con el punto. ¡Timing perfecto!"
      duration={20}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => (
        <VaccineGame onComplete={onComplete} />
      )}
    </MiniGame>
  );
}

// ─── Inner game component ───

function VaccineGame({
  onComplete,
}: {
  onComplete: (precision: number) => void;
}) {
  const [circleRadius, setCircleRadius] = useState(80);
  const [tapped, setTapped] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const animRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef(Date.now());

  // Animate shrinking circle
  useEffect(() => {
    if (tapped) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const cycle = (elapsed % SHRINK_DURATION) / SHRINK_DURATION;
      // Circle goes from 80px radius down to ~TARGET_RADIUS, then resets
      const radius = 80 - cycle * (80 - TARGET_RADIUS);
      setCircleRadius(radius);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [tapped]);

  const handleTap = useCallback(() => {
    if (tapped) return;
    setTapped(true);
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const diff = Math.abs(circleRadius - TARGET_RADIUS);
    const precision = getPrecision(diff);

    if (precision >= 1.0) setFeedback('¡Perfecto!');
    else if (precision >= 0.6) setFeedback('¡Bien!');
    else setFeedback('Casi...');

    setTimeout(() => onComplete(precision), 500);
  }, [tapped, circleRadius, onComplete]);

  // Target position (center of the arm area)
  const centerX = 50; // percent
  const centerY = 50; // percent

  return (
    <div
      className="relative w-full h-64 rounded-2xl overflow-hidden select-none touch-none flex items-center justify-center"
      style={{ background: '#FFF8DC' }}
      onTouchStart={(e) => {
        e.preventDefault();
        handleTap();
      }}
      onClick={handleTap}
    >
      {/* Arm (rectangle) */}
      <div
        className="absolute rounded-2xl"
        style={{
          width: '70%',
          height: '45%',
          left: '15%',
          top: '28%',
          background: 'linear-gradient(135deg, #FDEBD0 0%, #F5CBA7 100%)',
          border: '3px solid #E8C88A',
          borderRadius: 20,
        }}
      />

      {/* Syringe icon (SVG) */}
      <svg
        className="absolute pointer-events-none"
        style={{ top: '5%', right: '10%', width: 50, height: 50, opacity: 0.6 }}
        viewBox="0 0 50 50"
      >
        <rect x="20" y="5" width="10" height="30" rx="2" fill="#87CEEB" />
        <rect x="22" y="0" width="6" height="8" rx="1" fill="#B0BEC5" />
        <rect x="18" y="32" width="14" height="4" rx="1" fill="#90A4AE" />
        <line x1="25" y1="36" x2="25" y2="48" stroke="#90A4AE" strokeWidth="2" />
        <circle cx="25" cy="48" r="1.5" fill="#78909C" />
      </svg>

      {/* Target dot (pulsing) */}
      <div
        className={`absolute rounded-full ${!tapped ? 'animate-pulse' : ''}`}
        style={{
          width: TARGET_RADIUS * 2,
          height: TARGET_RADIUS * 2,
          left: `calc(${centerX}% - ${TARGET_RADIUS}px)`,
          top: `calc(${centerY}% - ${TARGET_RADIUS}px)`,
          background: 'radial-gradient(circle, #e74c3c 40%, #c0392b 100%)',
          boxShadow: '0 0 12px 4px rgba(231,76,60,0.4)',
        }}
      />

      {/* Shrinking circle */}
      {!tapped && (
        <div
          className="absolute rounded-full border-4 border-green-400 pointer-events-none"
          style={{
            width: circleRadius * 2,
            height: circleRadius * 2,
            left: `calc(${centerX}% - ${circleRadius}px)`,
            top: `calc(${centerY}% - ${circleRadius}px)`,
            transition: 'none',
            opacity: 0.8,
          }}
        />
      )}

      {/* Feedback on tap */}
      {tapped && feedback && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-purple-700 animate-bounce drop-shadow-sm">
            {feedback}
          </span>
        </div>
      )}

      {/* Tap instruction */}
      {!tapped && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-semibold text-gray-500">
          ¡Toca ahora!
        </p>
      )}
    </div>
  );
}
