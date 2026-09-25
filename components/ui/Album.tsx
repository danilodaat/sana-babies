'use client';

import { useGameStore, ALBUM_PATIENTS } from '@/store/gameStore';
import { CASES } from '@/lib/cases';
import { NPC_BY_ID } from '@/lib/npcs';
import { sfx } from '@/lib/audio';

const KIND_EMOJI: Record<string, string> = { baby: '👶', girl: '👧', boy: '👦', mother: '👩', father: '👨', nurse: '👩‍⚕️' };

/** Álbum de pacientes: figurita por paciente, con sus casos y mejores estrellas */
export default function Album() {
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  const npcHealed = useGameStore((s) => s.npcHealed);
  const caseStars = useGameStore((s) => s.caseStars);
  const patientsHealed = useGameStore((s) => s.patientsHealed);

  if (panel !== 'album') return null;

  const got = ALBUM_PATIENTS.filter((id) => (npcHealed[id] ?? 0) > 0).length;
  const total = ALBUM_PATIENTS.length;
  const pct = Math.round((got / total) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto" onTouchStart={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setPanel(null)} />
      <div
        className="relative z-10 w-[94%] max-w-md mb-4 sm:mb-0 rounded-3xl p-4 flex flex-col gap-3"
        style={{ background: 'linear-gradient(#fff, #fdf2f8)', boxShadow: '0 0 0 3px #f9a8d4, 0 14px 40px rgba(0,0,0,0.25)', maxHeight: '82dvh', animation: 'sb-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-pink-600">📔 Álbum de pacientes</div>
            <div className="text-xs text-gray-500">{patientsHealed} curaciones en total</div>
          </div>
          <button className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-bold" onClick={() => { sfx.click(); setPanel(null); }} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div>
          <div className="flex justify-between text-xs font-extrabold text-pink-700 mb-1">
            <span>
              {got} / {total} pacientes
            </span>
            <span>{got === total ? '🏆 ¡Bata dorada ganada!' : '🏆 Complétalo y gana la bata dorada'}</span>
          </div>
          <div className="h-3 rounded-full bg-pink-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f472b6, #fb923c)', transition: 'width 0.6s' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
          {ALBUM_PATIENTS.map((id) => {
            const npc = NPC_BY_ID[id];
            const n = npcHealed[id] ?? 0;
            const cases = CASES.filter((c) => c.patientId === id);
            const best = Math.max(0, ...cases.map((c) => caseStars[c.id] ?? 0));
            const known = n > 0;
            return (
              <div
                key={id}
                className="flex flex-col items-center gap-0.5 rounded-2xl p-2 text-center"
                style={{
                  background: known ? '#fff' : '#f3f4f6',
                  boxShadow: known ? '0 0 0 2px #fbcfe8, 0 3px 0 #f9a8d4' : 'inset 0 0 0 2px #e5e7eb',
                }}
              >
                <span className="text-4xl" style={{ filter: known ? 'none' : 'brightness(0) opacity(0.25)' }}>
                  {KIND_EMOJI[npc?.kind ?? 'baby']}
                </span>
                <span className="text-xs font-extrabold text-gray-800">{known ? npc?.name : '???'}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{known ? cases.map((c) => c.title).join(' · ') : cases[0]?.zone}</span>
                {known && (
                  <span className="text-xs">
                    {[1, 2, 3].map((s) => (
                      <span key={s} style={{ opacity: s <= best ? 1 : 0.2 }}>
                        ⭐
                      </span>
                    ))}
                  </span>
                )}
                {n > 1 && <span className="text-[10px] font-bold text-pink-500">×{n}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
