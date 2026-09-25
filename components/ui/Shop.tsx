'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ITEMS, SLOT_LABEL, type ItemSlot, type ShopItem } from '@/lib/shop';
import { sfx } from '@/lib/audio';
import { toast } from '@/lib/toast';
import { emit } from '@/lib/fx';
import { player } from '@/lib/runtime';

const TABS: ItemSlot[] = ['coat', 'hat', 'extra', 'upgrade', 'decor'];

/** Tienda de la farmacia de Don Pepe: batas, gorros, accesorios, mejoras y decoración */
export default function Shop() {
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  const coins = useGameStore((s) => s.coins);
  const level = useGameStore((s) => s.level);
  const owned = useGameStore((s) => s.owned);
  const equipped = useGameStore((s) => s.equipped);
  const buy = useGameStore((s) => s.buy);
  const equip = useGameStore((s) => s.equip);
  const [tab, setTab] = useState<ItemSlot>('coat');

  if (panel !== 'shop') return null;

  const isEquipped = (i: ShopItem) =>
    i.slot === 'coat' ? equipped.coat === i.id : i.slot === 'hat' ? equipped.hat === i.id : i.slot === 'extra' ? equipped.extras.includes(i.id) : false;

  const onItem = (i: ShopItem) => {
    if (owned.includes(i.id)) {
      if (i.slot === 'upgrade' || i.slot === 'decor') return;
      sfx.click();
      equip(i.id);
      return;
    }
    if (i.reward) {
      sfx.wrong();
      toast('Se gana completando el álbum de pacientes', '📔');
      return;
    }
    if (level < i.minLevel) {
      sfx.wrong();
      toast(`Disponible desde el nivel ${i.minLevel}`, '🔒');
      return;
    }
    if (coins < i.price) {
      sfx.wrong();
      toast(`Te faltan ${i.price - coins} monedas`, '🪙');
      return;
    }
    if (buy(i.id)) {
      sfx.coin();
      setTimeout(() => sfx.success(), 150);
      emit('sparkle', player.position, 24);
      toast(`¡Compraste ${i.name}!`, i.emoji);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto" onTouchStart={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setPanel(null)} />
      <div
        className="relative z-10 w-[94%] max-w-md mb-4 sm:mb-0 rounded-3xl p-4 flex flex-col gap-3"
        style={{ background: 'linear-gradient(#fff, #f0fdf4)', boxShadow: '0 0 0 3px #86efac, 0 14px 40px rgba(0,0,0,0.25)', maxHeight: '82dvh', animation: 'sb-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-emerald-700">💊 Farmacia de Don Pepe</div>
            <div className="text-xs text-gray-500">Toca lo que ya tienes para ponértelo o quitártelo</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm">🪙 {coins}</span>
            <button className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-bold" onClick={() => { sfx.click(); setPanel(null); }} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { sfx.click(); setTab(t); }}
              className="px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap"
              style={{ background: tab === t ? '#10b981' : '#e7f8ef', color: tab === t ? '#fff' : '#047857' }}
            >
              {SLOT_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
          {ITEMS.filter((i) => i.slot === tab).map((i) => {
            const have = owned.includes(i.id);
            const on = isEquipped(i);
            const lockedLvl = level < i.minLevel;
            const cant = !have && !i.reward && !lockedLvl && coins < i.price;
            return (
              <button
                key={i.id}
                onClick={() => onItem(i)}
                className="relative flex flex-col items-center gap-1 rounded-2xl p-3 text-center active:translate-y-0.5 transition-transform"
                style={{
                  background: on ? '#ecfdf5' : '#fff',
                  boxShadow: on ? '0 0 0 3px #10b981' : '0 0 0 2px #d1fae5, 0 3px 0 #a7f3d0',
                  opacity: lockedLvl && !have ? 0.6 : 1,
                }}
              >
                <span className="text-4xl" style={{ filter: lockedLvl && !have ? 'grayscale(1)' : 'none' }}>
                  {i.emoji}
                </span>
                <span className="text-sm font-extrabold text-gray-800 leading-tight">{i.name}</span>
                <span className="text-[11px] text-gray-500 leading-snug">{i.description}</span>
                <span
                  className="mt-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold"
                  style={{
                    background: have ? (on ? '#10b981' : '#d1fae5') : lockedLvl ? '#e5e7eb' : cant ? '#fee2e2' : '#fef3c7',
                    color: have ? (on ? '#fff' : '#047857') : lockedLvl ? '#6b7280' : cant ? '#b91c1c' : '#92400e',
                  }}
                >
                  {have
                    ? i.slot === 'upgrade' || i.slot === 'decor'
                      ? '✓ Activo'
                      : on
                        ? '✓ Puesto'
                        : 'Ponerme'
                    : i.reward
                      ? '🏆 Premio del álbum'
                      : lockedLvl
                        ? `🔒 Nivel ${i.minLevel}`
                        : `🪙 ${i.price}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
