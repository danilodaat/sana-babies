'use client';

import { useEffect, useState } from 'react';
import { useCloud, login, logout, register, resolveConflict, startCloud, type SaveSummary } from '@/lib/cloud';
import { sfx } from '@/lib/audio';

/*
 * Cuenta: entrar / crear cuenta con usuario y contraseña, estado del
 * guardado en la nube, y el selector cuando hay dos partidas distintas.
 * Se abre desde la pantalla de inicio o desde el botón 👤 del juego.
 */

const ago = (t: number | null) => {
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return 'recién';
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};

function Summary({ s, title, emoji }: { s: SaveSummary; title: string; emoji: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white p-3 text-center" style={{ boxShadow: 'inset 0 0 0 2px #e9d5ff' }}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-xs font-extrabold text-violet-600">{title}</div>
      <div className="text-lg font-extrabold text-gray-800">Nivel {s.level}</div>
      <div className="text-xs text-gray-500">
        🪙 {s.coins} · ❤️ {s.healed} curados
      </div>
      {s.updatedAt && <div className="text-[10px] text-gray-400 mt-0.5">{ago(s.updatedAt)}</div>}
    </div>
  );
}

export default function Account() {
  const open = useCloud((s) => s.open);
  const setOpen = useCloud((s) => s.setOpen);
  const username = useCloud((s) => s.username);
  const status = useCloud((s) => s.status);
  const lastSavedAt = useCloud((s) => s.lastSavedAt);
  const conflict = useCloud((s) => s.conflict);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    startCloud();
  }, []);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, [open]);

  if (!open && !conflict) return null;

  const submit = async () => {
    setError(null);
    if (tab === 'register' && pass !== pass2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    const err = tab === 'login' ? await login(user, pass) : await register(user, pass);
    setBusy(false);
    if (err) {
      sfx.wrong();
      setError(err);
    } else {
      sfx.success();
      setPass('');
      setPass2('');
    }
  };

  const shell = (children: React.ReactNode) => (
    <div data-panel="account" className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-auto" onTouchStart={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !conflict && setOpen(false)} />
      <div
        className="relative z-10 w-[92%] max-w-sm rounded-3xl p-5 flex flex-col gap-3"
        style={{ background: 'linear-gradient(#fff, #f5f3ff)', boxShadow: '0 0 0 3px #c4b5fd, 0 14px 40px rgba(0,0,0,0.3)', animation: 'sb-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1)' }}
      >
        {children}
      </div>
    </div>
  );

  // ─── Dos partidas distintas: elegir ───
  if (conflict) {
    return shell(
      <>
        <div className="text-center text-lg font-extrabold text-violet-700">¿Con qué partida sigues?</div>
        <div className="text-center text-sm text-gray-600">Tu cuenta tiene una partida guardada y en este dispositivo hay otra distinta.</div>
        <div className="flex gap-2">
          <Summary s={conflict.cloudSummary} title="En la nube" emoji="☁️" />
          <Summary s={conflict.localSummary} title="En este dispositivo" emoji="📱" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 py-3 rounded-2xl font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 0 #4c1d95' }} onClick={() => { sfx.click(); void resolveConflict('cloud'); }}>
            Usar la de la nube
          </button>
          <button className="flex-1 py-3 rounded-2xl font-extrabold text-violet-700 bg-violet-100" style={{ boxShadow: '0 4px 0 #ddd6fe' }} onClick={() => { sfx.click(); void resolveConflict('local'); }}>
            Usar esta
          </button>
        </div>
        <div className="text-[11px] text-center text-gray-400">La que no elijas se reemplaza.</div>
      </>,
    );
  }

  // ─── Conectado ───
  if (username) {
    const statusText = status === 'syncing' ? 'Guardando…' : status === 'error' ? 'Sin conexión: se guardará cuando vuelva internet' : `Guardado en la nube ${ago(lastSavedAt)}`;
    return shell(
      <>
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-violet-700">👤 Mi cuenta</div>
          <button className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-bold" onClick={() => setOpen(false)} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center" style={{ boxShadow: 'inset 0 0 0 2px #e9d5ff' }}>
          <div className="text-4xl">👩‍⚕️</div>
          <div className="text-xl font-extrabold text-gray-800">{username}</div>
          <div className="text-sm font-bold" style={{ color: status === 'error' ? '#d97706' : '#059669' }}>
            {status === 'saved' ? '☁️✓ ' : status === 'syncing' ? '☁️↻ ' : '☁️ '}
            {statusText}
          </div>
        </div>
        <div className="text-xs text-gray-500 text-center">Entra con este usuario en cualquier celular o computadora y sigue donde quedaste.</div>
        <button className="py-2.5 rounded-2xl font-extrabold text-gray-600 bg-gray-100" style={{ boxShadow: '0 3px 0 #d1d5db' }} onClick={async () => { sfx.click(); await logout(); }}>
          Cerrar sesión
        </button>
      </>,
    );
  }

  // ─── Entrar / crear cuenta ───
  return shell(
    <>
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold text-violet-700">👤 Guardar en la nube</div>
        <button className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-bold" onClick={() => setOpen(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="text-xs text-gray-500">Con una cuenta tu doctor, tus monedas y tus gatitos te siguen a cualquier dispositivo.</div>
      <div className="flex gap-1.5">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className="flex-1 py-2 rounded-full text-sm font-extrabold"
            style={{ background: tab === t ? '#8b5cf6' : '#ede9fe', color: tab === t ? '#fff' : '#6d28d9' }}
          >
            {t === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        ))}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="text-xs font-bold text-gray-600">
          Usuario
          <input
            className="mt-1 w-full rounded-xl border-2 border-violet-200 px-3 py-2 text-base text-gray-800 outline-none focus:border-violet-500"
            value={user}
            onChange={(e) => setUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            maxLength={20}
            autoComplete="username"
            autoCapitalize="none"
            placeholder="ej: doctora_ana"
          />
        </label>
        <label className="text-xs font-bold text-gray-600">
          Contraseña
          <input
            className="mt-1 w-full rounded-xl border-2 border-violet-200 px-3 py-2 text-base text-gray-800 outline-none focus:border-violet-500"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            placeholder="mínimo 6 caracteres"
          />
        </label>
        {tab === 'register' && (
          <label className="text-xs font-bold text-gray-600">
            Repite la contraseña
            <input
              className="mt-1 w-full rounded-xl border-2 border-violet-200 px-3 py-2 text-base text-gray-800 outline-none focus:border-violet-500"
              type="password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={busy || user.length < 3 || pass.length < 6}
          className="mt-1 py-3 rounded-2xl font-extrabold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 0 #4c1d95' }}
        >
          {busy ? '…' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      {tab === 'register' && <div className="text-[11px] text-gray-400">No pedimos email ni datos personales. Anota tu usuario y contraseña: si los olvidas no se pueden recuperar.</div>}
    </>,
  );
}
