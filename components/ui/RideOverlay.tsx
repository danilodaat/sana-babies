'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { fleet, leaveAmbulance } from '@/components/world/Ambulances';
import { player } from '@/lib/runtime';
import { sfx } from '@/lib/audio';

/** Panel mientras el doctor viaja en ambulancia: destino, distancia y botón para bajarse */
export default function RideOverlay() {
  const riding = useGameStore((s) => s.riding);
  const emergency = useGameStore((s) => s.emergency);
  const [, tick] = useState(0);

  useEffect(() => {
    if (riding === null) return;
    const id = setInterval(() => tick((n) => n + 1), 300);
    return () => clearInterval(id);
  }, [riding]);

  if (riding === null) return null;
  const u = fleet[riding];
  const target = u.dest?.target;
  const dist = target ? Math.round(Math.hypot(target.x - player.position.x, target.z - player.position.z)) : null;
  const left = emergency ? Math.max(0, Math.ceil((emergency.endsAt - Date.now()) / 1000)) : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 12px)',
        transform: 'translateX(-50%)',
        width: 'min(92%, 380px)',
        pointerEvents: 'auto',
        animation: 'sb-pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1)',
      }}
    >
      <div
        className="flex items-center gap-3 rounded-3xl p-3"
        style={{ background: 'rgba(255,255,255,0.96)', boxShadow: `0 0 0 3px ${emergency ? '#ef4444' : '#60a5fa'}, 0 10px 30px rgba(0,0,0,0.25)` }}
      >
        <div className="text-4xl" style={{ animation: 'sb-bob 0.6s ease-in-out infinite' }}>
          🚑
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-extrabold" style={{ color: emergency ? '#dc2626' : '#2563eb' }}>
            {emergency ? `EMERGENCIA${left !== null ? ` · ${left} s` : ''}` : `UNIDAD ${riding + 1} · EN CAMINO`}
          </div>
          <div className="text-sm font-bold text-gray-800 truncate">{u.dest?.label ?? 'Ciudad Sana'}</div>
          {dist !== null && <div className="text-xs text-gray-500">{dist} m</div>}
        </div>
        <button
          className="px-4 py-2 rounded-2xl font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, #ff6b9d, #ff8e53)', boxShadow: '0 3px 0 #d9507f' }}
          onClick={() => {
            sfx.click();
            leaveAmbulance('manual');
          }}
        >
          Bajar
        </button>
      </div>
    </div>
  );
}
