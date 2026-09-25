'use client';

import { useEffect, useState } from 'react';
import { useGameStore, ALBUM_PATIENTS } from '@/store/gameStore';
import { subscribeToasts, type Toast } from '@/lib/toast';
import { sfx } from '@/lib/audio';

/** Botones de tienda y álbum (debajo del minimapa) */
export function HudButtons() {
  const setPanel = useGameStore((s) => s.setPanel);
  const modal = useGameStore((s) => s.modal);
  const npcHealed = useGameStore((s) => s.npcHealed);
  const got = ALBUM_PATIENTS.filter((id) => (npcHealed[id] ?? 0) > 0).length;
  const open = (p: 'shop' | 'album') => {
    if (useGameStore.getState().modal) return;
    sfx.click();
    setPanel(p);
  };
  const style: React.CSSProperties = { width: 46, height: 46, fontSize: 22, position: 'relative', opacity: modal ? 0.4 : 1 };
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(max(env(safe-area-inset-top), 10px) + 166px)',
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      <button className="sb-icon-btn" style={style} onClick={() => open('shop')} aria-label="Tienda" data-tutorial="shop">
        🛍️
      </button>
      <button className="sb-icon-btn" style={style} onClick={() => open('album')} aria-label="Álbum" data-tutorial="album">
        📔
        <span
          style={{
            position: 'absolute',
            bottom: -4,
            right: -6,
            fontSize: 10,
            fontWeight: 800,
            color: '#fff',
            background: '#ec4899',
            borderRadius: 8,
            padding: '1px 5px',
          }}
        >
          {got}/{ALBUM_PATIENTS.length}
        </span>
      </button>
    </div>
  );
}

/** Pila de avisos arriba al centro */
export function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setList), []);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '30%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
        padding: '0 16px',
      }}
    >
      {list.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: t.big ? '12px 20px' : '8px 16px',
            borderRadius: 999,
            background: t.big ? 'linear-gradient(135deg, #ff6b9d, #ff8e53)' : 'rgba(30,20,50,0.72)',
            color: '#fff',
            fontWeight: 800,
            fontSize: t.big ? 18 : 14,
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            animation: 'sb-pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: t.big ? 24 : 18 }}>{t.icon}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
