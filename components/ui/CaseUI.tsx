'use client';

import { useEffect, useState } from 'react';
import type { Case, Finding, TreatmentOption } from '@/lib/cases';
import { isEmergency } from '@/lib/cases';
import { npcName } from '@/lib/npcs';
import { useArmed } from '@/lib/useArmed';

/*
 * Tarjetas de la interfaz de casos clínicos. Todas comparten el mismo
 * contenedor (Sheet) que sube desde abajo, cómodo para el pulgar en celular.
 */

const TYPE_BADGE: Record<Case['type'], { label: string; emoji: string; color: string }> = {
  consulta: { label: 'Consulta', emoji: '📅', color: '#3b82f6' },
  visita: { label: 'Visita', emoji: '🏠', color: '#10b981' },
  campana: { label: 'Campaña de salud', emoji: '📣', color: '#f59e0b' },
  emergencia: { label: 'Emergencia', emoji: '🚨', color: '#ef4444' },
};

function Sheet({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'alert' }) {
  const [shown, setShown] = useState(false);
  const armed = useArmed();
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto" onTouchStart={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-[92%] max-w-sm mb-5 sm:mb-0 rounded-3xl p-5 flex flex-col items-center gap-3 text-center"
        style={{
          background: tone === 'alert' ? 'linear-gradient(#fff, #fff1f2)' : 'linear-gradient(#fff, #fff8e6)',
          boxShadow: tone === 'alert' ? '0 0 0 3px #fca5a5, 0 14px 40px rgba(0,0,0,0.25)' : '0 0 0 3px #fbcfe8, 0 14px 40px rgba(0,0,0,0.2)',
          transform: shown ? 'translateY(0)' : 'translateY(120px)',
          opacity: shown ? 1 : 0,
          transition: 'transform 0.45s cubic-bezier(0.2, 1.4, 0.4, 1), opacity 0.25s',
          pointerEvents: armed ? 'auto' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Badge({ c }: { c: Case }) {
  const b = TYPE_BADGE[c.type];
  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <span className="px-2.5 py-1 rounded-full text-white" style={{ background: b.color }}>
        {b.emoji} {b.label}
      </span>
      <span className="text-gray-500">📍 {c.zone}</span>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'ghost' | 'alert' }) {
  const styles = {
    primary: { background: 'linear-gradient(135deg, #ff6b9d, #ff8e53)', boxShadow: '0 4px 0 #d9507f', color: '#fff' },
    alert: { background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 4px 0 #b91c1c', color: '#fff' },
    ghost: { background: '#f1f5f9', boxShadow: '0 3px 0 #cbd5e1', color: '#475569' },
  }[variant];
  return (
    <button
      className="flex-1 py-3 rounded-2xl font-extrabold text-base active:translate-y-1 transition-transform"
      style={styles}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RewardChips({ coins, xp }: { coins: number; xp: number }) {
  return (
    <div className="flex gap-3 text-sm font-extrabold">
      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">🪙 +{coins}</span>
      <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700">✨ +{xp} XP</span>
    </div>
  );
}

// ─── Oferta de un caso (hablando con quien pide ayuda) ───
export function OfferCard({ c, onAccept, onReject }: { c: Case; onAccept: () => void; onReject: () => void }) {
  return (
    <Sheet>
      <Badge c={c} />
      <div className="text-xl font-extrabold text-violet-700">{c.title}</div>
      <div className="w-full rounded-2xl bg-white px-4 py-3 text-left" style={{ boxShadow: 'inset 0 0 0 2px #fde68a' }}>
        <div className="text-xs font-extrabold text-amber-600 mb-1">{npcName(c.giverId ?? c.patientId)}</div>
        <div className="text-sm text-gray-700 leading-snug">{c.giverDialogue}</div>
      </div>
      <div className="text-sm text-gray-500">{c.description}</div>
      <RewardChips coins={c.reward.coins} xp={c.reward.xp} />
      <div className="flex gap-2 w-full mt-1">
        <Btn variant="ghost" onClick={onReject}>
          Ahora no
        </Btn>
        <Btn onClick={onAccept}>¡Yo me encargo!</Btn>
      </div>
    </Sheet>
  );
}

// ─── Llamada de emergencia ───
export function PhoneCall({ c, onAccept, onReject }: { c: Case; onAccept: () => void; onReject: () => void }) {
  return (
    <Sheet tone="alert">
      <div className="text-5xl" style={{ animation: 'sb-ring 0.25s ease-in-out infinite alternate' }}>
        📱
      </div>
      <div className="text-xs font-extrabold tracking-widest text-red-500">LLAMADA DE EMERGENCIA</div>
      <div className="text-xl font-extrabold text-red-600">{c.title}</div>
      <div className="text-sm text-gray-700 leading-snug">{c.giverDialogue}</div>
      <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
        <span>📍 {c.zone}</span>
        <span>⏱️ {c.timeLimit} s</span>
      </div>
      <RewardChips coins={c.reward.coins} xp={c.reward.xp} />
      <div className="text-xs text-gray-500">¡La ambulancia sale contigo! Si llegas a tiempo ganas +50% de monedas.</div>
      <div className="flex gap-2 w-full mt-1">
        <Btn variant="ghost" onClick={onReject}>
          Ahora no
        </Btn>
        <Btn variant="alert" onClick={onAccept}>
          ¡Voy en camino!
        </Btn>
      </div>
    </Sheet>
  );
}

// ─── Adoptar un gatito ───
export function AdoptCard({ name, text, replacing, onYes, onNo }: { name: string; text: string; replacing: string | null; onYes: () => void; onNo: () => void }) {
  return (
    <Sheet>
      <div className="text-5xl" style={{ animation: 'sb-bob 1.4s ease-in-out infinite' }}>
        🐱
      </div>
      <div className="text-xl font-extrabold text-violet-700">¡{name} te quiere mucho!</div>
      <div className="text-sm text-gray-600 leading-snug">{text}</div>
      <div className="text-sm font-bold text-gray-700">¿Quieres que {name} te acompañe a todas partes?</div>
      {replacing && <div className="text-xs text-amber-700">{replacing} volverá a su casita (lo puedes adoptar de nuevo cuando quieras).</div>}
      <div className="flex gap-2 w-full mt-1">
        <Btn variant="ghost" onClick={onNo}>
          Ahora no
        </Btn>
        <Btn onClick={onYes}>¡Sí, adoptar!</Btn>
      </div>
    </Sheet>
  );
}

// ─── Charla simple ───
export function ChatCard({ name, text, onClose }: { name: string; text: string; onClose: () => void }) {
  return (
    <Sheet>
      <div className="text-sm font-extrabold text-violet-600">{name}</div>
      <div className="text-base text-gray-700 leading-snug">{text}</div>
      <div className="flex w-full">
        <Btn variant="ghost" onClick={onClose}>
          OK
        </Btn>
      </div>
    </Sheet>
  );
}

// ─── Diagnóstico: hallazgos + elegir tratamiento ───
export function DiagnosisCard({
  c,
  findings,
  wrong,
  onPick,
}: {
  c: Case;
  findings: Finding[];
  wrong: string[];
  onPick: (option: TreatmentOption) => void;
}) {
  const [shake, setShake] = useState<string | null>(null);
  useEffect(() => {
    if (!wrong.length) return;
    const last = wrong[wrong.length - 1];
    setShake(last);
    const t = setTimeout(() => setShake(null), 450);
    return () => clearTimeout(t);
  }, [wrong]);

  return (
    <Sheet>
      <div className="text-xs font-extrabold tracking-widest text-sky-600">📋 INFORME MÉDICO</div>
      <div className="text-lg font-extrabold text-violet-700">{npcName(c.patientId)}</div>
      <div className="w-full flex flex-col gap-1.5">
        {findings.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-left text-sm font-bold text-sky-900"
            style={{ animation: `sb-pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) ${i * 0.12}s both` }}
          >
            <span className="text-lg">{f.emoji}</span>
            {f.text}
          </div>
        ))}
      </div>
      <div className="text-sm font-extrabold text-gray-700 mt-1">¿Qué tratamiento le das?</div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {c.treatment.options.map((o) => {
          const isWrong = wrong.includes(o.id);
          return (
            <button
              key={o.id}
              disabled={isWrong}
              onClick={() => onPick(o)}
              className="flex flex-col items-center gap-1 rounded-2xl px-1 py-3 font-bold text-xs active:translate-y-1 transition-transform"
              style={{
                background: isWrong ? '#f1f5f9' : '#fff',
                color: isWrong ? '#94a3b8' : '#334155',
                boxShadow: isWrong ? 'inset 0 0 0 2px #e2e8f0' : '0 0 0 2px #fbcfe8, 0 4px 0 #f9a8d4',
                animation: shake === o.id ? 'sb-shake 0.4s' : undefined,
              }}
            >
              <span className="text-3xl" style={{ filter: isWrong ? 'grayscale(1)' : 'none' }}>
                {o.emoji}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      {wrong.length > 0 && (
        <div className="w-full rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 text-left" style={{ boxShadow: 'inset 0 0 0 2px #fde68a' }}>
          💡 {c.treatment.hint}
        </div>
      )}
    </Sheet>
  );
}

// ─── Aplicación de tratamiento sin minijuego ───
export function ApplyCard({ c, option, onDone }: { c: Case; option: TreatmentOption; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <Sheet>
      <div className="text-6xl" style={{ animation: 'sb-bob 0.9s ease-in-out infinite' }}>
        {option.emoji}
      </div>
      <div className="text-base font-extrabold text-violet-700">{option.label}</div>
      <div className="text-sm text-gray-600">{c.treatment.applyText ?? '¡Aplicando tratamiento!'}</div>
      <div className="w-full h-2 rounded-full bg-violet-100 overflow-hidden">
        <div className="h-full bg-violet-400 rounded-full" style={{ animation: 'sb-grow 2.1s linear forwards' }} />
      </div>
    </Sheet>
  );
}

// ─── Resultado final ───
export function ResultCard({
  c,
  stars,
  coins,
  xp,
  onTime,
  onContinue,
}: {
  c: Case;
  stars: 1 | 2 | 3;
  coins: number;
  xp: number;
  onTime: boolean | null;
  onContinue: () => void;
}) {
  return (
    <Sheet>
      <div className="flex gap-1 -mt-10">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="text-5xl"
            style={{
              display: 'inline-block',
              opacity: s <= stars ? 1 : 0.25,
              filter: s <= stars ? 'drop-shadow(0 3px 0 #e0a800)' : 'grayscale(1)',
              animation: s <= stars ? `sb-pop 0.5s cubic-bezier(0.2, 1.8, 0.4, 1) ${0.15 + s * 0.2}s both` : undefined,
              transform: s === 2 ? 'translateY(-10px)' : undefined,
            }}
          >
            ⭐
          </span>
        ))}
      </div>
      <div className="text-xl font-extrabold text-violet-700">
        {stars === 3 ? '¡Diagnóstico perfecto!' : stars === 2 ? '¡Muy bien, doctor!' : '¡Paciente curado!'}
      </div>
      <div className="w-full rounded-2xl bg-white px-4 py-3 text-left" style={{ boxShadow: 'inset 0 0 0 2px #bbf7d0' }}>
        <div className="text-xs font-extrabold text-emerald-600 mb-1">{npcName(c.patientId)}</div>
        <div className="text-sm text-gray-700 leading-snug">{c.thanks}</div>
      </div>
      {isEmergency(c) && onTime !== null && (
        <div className={`text-xs font-extrabold ${onTime ? 'text-emerald-600' : 'text-amber-600'}`}>
          {onTime ? '🚑 ¡Llegaste a tiempo! Bonus +50% de monedas' : '🚑 Llegaste un poquito tarde, pero todo salió bien'}
        </div>
      )}
      <RewardChips coins={coins} xp={xp} />
      <div className="flex w-full mt-1">
        <Btn onClick={onContinue}>¡Continuar!</Btn>
      </div>
    </Sheet>
  );
}
