'use client';

import { create } from 'zustand';
import { useGameStore } from '@/store/gameStore';

/*
 * Guardado en la nube (cliente).
 *  - Al entrar: se compara la partida de la nube con la de este dispositivo.
 *    Si solo una tiene progreso, se usa esa; si ambas, se pregunta.
 *  - Después, cada cambio del progreso se sube solo (con 3 s de espera) y
 *    al cerrar/ocultar la pestaña.
 *  - Al abrir el juego ya conectado: si la nube tiene algo más nuevo y este
 *    dispositivo no cambió desde la última subida, se baja sin preguntar.
 */

const SAVE_KEY = 'sana-babies-save';
const META_KEY = 'sb-cloud-meta';

export interface CloudSave {
  state: Record<string, unknown>;
  version: number;
  updatedAt: number;
}

export interface SaveSummary {
  level: number;
  coins: number;
  healed: number;
  updatedAt?: number;
}

interface Meta {
  username: string;
  /** updatedAt de la nube la última vez que quedamos sincronizados */
  syncedAt: number;
  /** hubo cambios locales sin subir */
  dirty: boolean;
}

type Status = 'offline' | 'syncing' | 'saved' | 'error';

interface CloudState {
  username: string | null;
  status: Status;
  lastSavedAt: number | null;
  conflict: { cloud: CloudSave; cloudSummary: SaveSummary; localSummary: SaveSummary } | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCloud = create<CloudState>()((set) => ({
  username: null,
  status: 'offline',
  lastSavedAt: null,
  conflict: null,
  open: false,
  setOpen: (open) => set({ open }),
}));

// ─── utilidades ───

function readMeta(): Meta | null {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || 'null');
  } catch {
    return null;
  }
}
function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* sin almacenamiento local: igual funciona en memoria */
  }
}

/** La partida local tal como la guarda zustand (lo mismo que se sube) */
function localSave(): { state: Record<string, unknown>; version: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function summarize(state: Record<string, unknown> | undefined, updatedAt?: number): SaveSummary {
  return {
    level: Number(state?.level ?? 1),
    coins: Number(state?.coins ?? 0),
    healed: Number(state?.patientsHealed ?? 0),
    updatedAt,
  };
}

const hasProgress = (s: SaveSummary) => s.level > 1 || s.coins > 0 || s.healed > 0;

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

function applyCloud(save: CloudSave) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state: save.state, version: save.version }));
  } catch {
    /* ignorar */
  }
  void useGameStore.persist.rehydrate();
}

// ─── subida ───

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

export async function pushNow(keepalive = false) {
  const username = useCloud.getState().username;
  const local = localSave();
  if (!username || !local || pushing) return;
  pushing = true;
  useCloud.setState({ status: 'syncing' });
  try {
    const res = await api<{ updatedAt?: number; error?: string }>('/api/save', {
      method: 'PUT',
      body: JSON.stringify({ state: local.state, version: local.version }),
      keepalive,
    });
    if (res.ok && res.data.updatedAt) {
      writeMeta({ username, syncedAt: res.data.updatedAt, dirty: false });
      useCloud.setState({ status: 'saved', lastSavedAt: res.data.updatedAt });
    } else if (res.status === 401) {
      useCloud.setState({ username: null, status: 'offline' });
      writeMeta(null);
    } else useCloud.setState({ status: 'error' });
  } catch {
    useCloud.setState({ status: 'error' });
  } finally {
    pushing = false;
  }
}

function schedulePush() {
  const username = useCloud.getState().username;
  if (!username) return;
  const meta = readMeta();
  writeMeta({ username, syncedAt: meta?.syncedAt ?? 0, dirty: true });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), 3000);
}

// ─── sesión ───

/** Decide qué partida usar tras entrar (o al abrir el juego ya conectado) */
async function reconcile(username: string, fresh: boolean) {
  const res = await api<{ save: CloudSave | null }>('/api/save');
  if (!res.ok) {
    useCloud.setState({ status: 'error' });
    return;
  }
  const cloud = res.data.save;
  const local = localSave();
  const localSum = summarize(local?.state);
  const meta = readMeta();

  if (!cloud) {
    // Primera vez en la nube: subir lo que hay en este dispositivo
    await pushNow();
    return;
  }
  const cloudSum = summarize(cloud.state, cloud.updatedAt);

  if (!fresh && meta?.username === username) {
    // Ya conectado antes en este dispositivo
    if (cloud.updatedAt > meta.syncedAt) {
      if (!meta.dirty) {
        applyCloud(cloud);
        writeMeta({ username, syncedAt: cloud.updatedAt, dirty: false });
        useCloud.setState({ status: 'saved', lastSavedAt: cloud.updatedAt });
      } else useCloud.setState({ conflict: { cloud, cloudSummary: cloudSum, localSummary: localSum }, open: true });
    } else if (meta.dirty) await pushNow();
    else useCloud.setState({ status: 'saved', lastSavedAt: cloud.updatedAt });
    return;
  }

  // Recién entró en este dispositivo
  if (!hasProgress(localSum) || JSON.stringify(local?.state) === JSON.stringify(cloud.state)) {
    applyCloud(cloud);
    writeMeta({ username, syncedAt: cloud.updatedAt, dirty: false });
    useCloud.setState({ status: 'saved', lastSavedAt: cloud.updatedAt });
  } else if (!hasProgress(cloudSum)) {
    await pushNow();
  } else {
    useCloud.setState({ conflict: { cloud, cloudSummary: cloudSum, localSummary: localSum }, open: true });
  }
}

export async function resolveConflict(use: 'cloud' | 'local') {
  const c = useCloud.getState().conflict;
  const username = useCloud.getState().username;
  if (!c || !username) return;
  useCloud.setState({ conflict: null });
  if (use === 'cloud') {
    applyCloud(c.cloud);
    writeMeta({ username, syncedAt: c.cloud.updatedAt, dirty: false });
    useCloud.setState({ status: 'saved', lastSavedAt: c.cloud.updatedAt });
  } else await pushNow();
}

export async function register(username: string, password: string) {
  const res = await api<{ username?: string; error?: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
  if (!res.ok || !res.data.username) return res.data.error ?? 'No se pudo crear la cuenta';
  useCloud.setState({ username: res.data.username, status: 'syncing' });
  await reconcile(res.data.username, true);
  return null;
}

export async function login(username: string, password: string) {
  const res = await api<{ username?: string; error?: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  if (!res.ok || !res.data.username) return res.data.error ?? 'No se pudo entrar';
  useCloud.setState({ username: res.data.username, status: 'syncing' });
  await reconcile(res.data.username, true);
  return null;
}

export async function logout() {
  await pushNow();
  await api('/api/auth/logout', { method: 'POST', body: '{}' });
  writeMeta(null);
  useCloud.setState({ username: null, status: 'offline', lastSavedAt: null });
}

// ─── arranque: sesión existente + subida automática ───

let started = false;
export function startCloud() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Subir cuando cambia algo que se guarda (lo mismo que persiste zustand).
  // Se compara el estado "partializado" (el localStorage se escribe un instante después).
  const partialize = useGameStore.persist.getOptions().partialize!;
  let last = JSON.stringify(partialize(useGameStore.getState()));
  useGameStore.subscribe((st) => {
    const now = JSON.stringify(partialize(st));
    if (now !== last) {
      last = now;
      schedulePush();
    }
  });

  const flush = () => {
    if (readMeta()?.dirty) void pushNow(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  void (async () => {
    try {
      const me = await api<{ username: string | null }>('/api/auth/me');
      if (me.ok && me.data.username) {
        useCloud.setState({ username: me.data.username, status: 'syncing' });
        await reconcile(me.data.username, false);
      }
    } catch {
      /* sin red: se juega igual, se sube después */
    }
  })();
}
