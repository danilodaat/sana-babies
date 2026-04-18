'use client';

import { useState } from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [pressed, setPressed] = useState(false);

  const handlePlay = () => {
    setPressed(true);
    // Small delay for the press animation
    setTimeout(onStart, 300);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center select-none"
      style={{
        background: 'linear-gradient(135deg, #87CEEB 0%, #FFB6C1 50%, #FFF8DC 100%)',
      }}
    >
      {/* Floating decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Heart */}
        <span
          className="absolute text-4xl animate-bounce"
          style={{ top: '10%', left: '15%', animationDelay: '0s', animationDuration: '3s' }}
        >
          ❤️
        </span>
        {/* Star */}
        <span
          className="absolute text-3xl animate-bounce"
          style={{ top: '20%', right: '12%', animationDelay: '0.5s', animationDuration: '2.5s' }}
        >
          ⭐
        </span>
        {/* Stethoscope */}
        <span
          className="absolute text-3xl animate-bounce"
          style={{ bottom: '25%', left: '10%', animationDelay: '1s', animationDuration: '3.5s' }}
        >
          🩺
        </span>
        {/* Syringe */}
        <span
          className="absolute text-3xl animate-bounce"
          style={{ bottom: '30%', right: '15%', animationDelay: '1.5s', animationDuration: '2.8s' }}
        >
          💉
        </span>
        {/* Pill */}
        <span
          className="absolute text-2xl animate-bounce"
          style={{ top: '40%', left: '8%', animationDelay: '0.7s', animationDuration: '3.2s' }}
        >
          💊
        </span>
        {/* Band-aid */}
        <span
          className="absolute text-2xl animate-bounce"
          style={{ top: '35%', right: '8%', animationDelay: '1.2s', animationDuration: '2.6s' }}
        >
          🩹
        </span>
      </div>

      {/* Logo & title */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8">
        {/* Icon */}
        <div className="text-7xl sm:text-8xl mb-2">👶🏥</div>

        {/* Title */}
        <h1
          className="text-5xl sm:text-6xl font-extrabold text-center leading-tight"
          style={{
            background: 'linear-gradient(135deg, #5D4E7A 0%, #FF69B4 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 4px 8px rgba(93,78,122,0.2))',
          }}
        >
          Sana Babies
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl font-semibold text-purple-700/80 text-center">
          ¡Cuida a los más pequeños!
        </p>

        {/* Play button */}
        <button
          className={`
            mt-8 px-12 py-4 rounded-full
            bg-gradient-to-r from-green-400 to-emerald-500
            text-white text-2xl sm:text-3xl font-extrabold
            shadow-xl border-4 border-white/50
            transition-all duration-200
            ${pressed ? 'scale-90 opacity-70' : 'animate-pulse hover:scale-105 active:scale-95'}
          `}
          onTouchStart={(e) => {
            e.preventDefault();
            handlePlay();
          }}
          onClick={handlePlay}
        >
          JUGAR
        </button>

        {/* Version */}
        <p className="mt-6 text-xs text-purple-500/60 font-medium">
          v0.1 MVP
        </p>
      </div>
    </div>
  );
}
