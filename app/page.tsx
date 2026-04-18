'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/components/Game'), { ssr: false });

export default function Home() {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return <Game />;
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 60%, #A5D6A7 100%)',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Decorative clouds */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '10%',
          width: 120,
          height: 50,
          borderRadius: 50,
          background: 'rgba(255,255,255,0.8)',
          boxShadow: '30px -10px 0 10px rgba(255,255,255,0.8), 60px 0 0 5px rgba(255,255,255,0.7)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: '15%',
          width: 90,
          height: 40,
          borderRadius: 40,
          background: 'rgba(255,255,255,0.7)',
          boxShadow: '25px -8px 0 8px rgba(255,255,255,0.7), 50px 0 0 4px rgba(255,255,255,0.6)',
        }}
      />

      {/* Title */}
      <h1
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: '#FF6B9D',
          textShadow: '3px 3px 0 #FF9CC2, 6px 6px 0 rgba(0,0,0,0.1)',
          marginBottom: 8,
          letterSpacing: -2,
        }}
      >
        Sana Babies
      </h1>

      <p
        style={{
          fontSize: 22,
          color: '#5D4E7A',
          marginBottom: 48,
          fontWeight: 600,
        }}
      >
        Cuidando al mundo, un pasito a la vez
      </p>

      {/* Play button */}
      <button
        onClick={() => setPlaying(true)}
        style={{
          padding: '18px 64px',
          fontSize: 28,
          fontWeight: 800,
          color: '#fff',
          background: 'linear-gradient(135deg, #FF6B9D 0%, #FF8E53 100%)',
          border: 'none',
          borderRadius: 50,
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(255,107,157,0.4), 0 4px 0 #E05580',
          transform: 'translateY(0)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow =
            '0 12px 30px rgba(255,107,157,0.5), 0 6px 0 #E05580';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow =
            '0 8px 25px rgba(255,107,157,0.4), 0 4px 0 #E05580';
        }}
      >
        Jugar
      </button>

      {/* Small hearts decoration */}
      <div style={{ position: 'absolute', bottom: 40, fontSize: 32, opacity: 0.4 }}>
        &#10084; &#10084; &#10084;
      </div>
    </div>
  );
}
