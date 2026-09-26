import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { DEFAULT_OWNED, ITEM_BY_ID } from '@/lib/shop';
import { CASES } from '@/lib/cases';

/** Pacientes que cuentan para el álbum (todos los que aparecen en algún caso) */
export const ALBUM_PATIENTS = [...new Set(CASES.map((c) => c.patientId))];

export interface Equipped {
  coat: string;
  hat: string | null;
  extras: string[];
}

/** Paso del tutorial de Lucía. 99 = terminado */
export const TUTORIAL_DONE = 99;

export type Quality = 'alto' | 'bajo';

export interface EmergencyState {
  caseId: string;
  /** Date.now() límite para llegar con bonus */
  endsAt: number;
  /** Se fija al empezar a atender: true si llegó a tiempo */
  onTime: boolean | null;
}

/*
 * Ojo: la posición del jugador, el joystick y el ángulo de cámara NO viven aquí.
 * Cambian cada frame y están en lib/runtime.ts para no re-renderizar React.
 */
interface GameState {
  started: boolean;

  /** NPC cerca del doctor (el botón de acción lo atiende) */
  currentInteraction: string | null;
  actionTriggered: number; // se incrementa en cada pulsación de acción
  /** Hay un diálogo/minijuego abierto: el doctor no se mueve y el HUD se atenúa */
  modal: boolean;

  // Casos clínicos
  activeCase: string | null;
  completedMissions: string[];
  emergency: EmergencyState | null;
  /** Date.now() del último caso terminado, para espaciar emergencias */
  lastCaseEndedAt: number;
  /** Cuántos pacientes curados en total (incluye emergencias repetidas) */
  patientsHealed: number;
  /** Mejor puntaje (estrellas) por caso */
  caseStars: Record<string, number>;
  /** Veces que se curó a cada paciente (álbum) */
  npcHealed: Record<string, number>;

  // Tienda
  owned: string[];
  equipped: Equipped;

  tutorialStep: number;
  /** Caricias por gatito (álbum de gatitos) */
  catsPetted: Record<string, number>;
  /** Gatito adoptado que sigue al doctor */
  petCat: string | null;
  /** UI abierta desde el HUD */
  panel: 'shop' | 'album' | null;

  // Progresión
  coins: number;
  xp: number;
  level: number;
  /** Nivel recién alcanzado, para la celebración. null = nada que mostrar */
  levelUp: number | null;

  // Ajustes
  muted: boolean;
  quality: Quality;

  // Acciones
  setStarted: (started: boolean) => void;
  interact: (npcId: string | null) => void;
  triggerAction: () => void;
  setModal: (modal: boolean) => void;
  startCase: (caseId: string, emergency?: EmergencyState) => void;
  markArrival: (onTime: boolean) => void;
  finishCase: (caseId: string, repeatable: boolean, stars?: number, patientId?: string) => void;
  buy: (itemId: string) => boolean;
  equip: (itemId: string) => void;
  setTutorialStep: (step: number) => void;
  petCatOnce: (catId: string) => number;
  adoptCat: (catId: string | null) => void;
  setPanel: (panel: 'shop' | 'album' | null) => void;
  cancelEmergency: () => void;
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  clearLevelUp: () => void;
  setMuted: (muted: boolean) => void;
  setQuality: (quality: Quality) => void;
  resetProgress: () => void;
}

/** XP total acumulado necesario para llegar a `level` */
export function xpForLevelStart(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += i * 100;
  return total;
}

function calculateLevel(xp: number): number {
  // Curva: pasar del nivel N al N+1 cuesta N*100 XP
  let level = 1;
  while (xpForLevelStart(level + 1) <= xp) level++;
  return level;
}

function defaultQuality(): Quality {
  if (typeof window === 'undefined') return 'alto';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  return coarse && cores <= 4 ? 'bajo' : 'alto';
}

// localStorage puede no existir o lanzar (modo privado, SSR): nunca debe romper el juego
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* sin guardado, se sigue jugando */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignorar */
    }
  },
};

const initialProgress = {
  activeCase: null as string | null,
  completedMissions: [] as string[],
  emergency: null as EmergencyState | null,
  patientsHealed: 0,
  caseStars: {} as Record<string, number>,
  npcHealed: {} as Record<string, number>,
  owned: [...DEFAULT_OWNED],
  equipped: { coat: 'coat-white', hat: null, extras: [] } as Equipped,
  tutorialStep: 0,
  catsPetted: {} as Record<string, number>,
  petCat: null as string | null,
  coins: 0,
  xp: 0,
  level: 1,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      started: false,
      currentInteraction: null,
      actionTriggered: 0,
      modal: false,
      lastCaseEndedAt: 0,
      ...initialProgress,
      levelUp: null,
      panel: null,
      muted: false,
      quality: defaultQuality(),

      setStarted: (started) => set({ started, lastCaseEndedAt: Date.now() }),
      interact: (npcId) => set({ currentInteraction: npcId }),
      triggerAction: () => set((s) => ({ actionTriggered: s.actionTriggered + 1 })),
      setModal: (modal) => set({ modal }),

      startCase: (caseId, emergency) => set({ activeCase: caseId, emergency: emergency ?? null }),

      markArrival: (onTime) =>
        set((s) => (s.emergency && s.emergency.onTime === null ? { emergency: { ...s.emergency, onTime } } : {})),

      finishCase: (caseId, repeatable, stars = 1, patientId) =>
        set((s) => {
          const npcHealed = patientId ? { ...s.npcHealed, [patientId]: (s.npcHealed[patientId] ?? 0) + 1 } : s.npcHealed;
          // Álbum completo → bata dorada de regalo (una sola vez)
          const albumDone = ALBUM_PATIENTS.every((id) => (npcHealed[id] ?? 0) > 0);
          const owned = albumDone && !s.owned.includes('coat-gold') ? [...s.owned, 'coat-gold'] : s.owned;
          return {
            activeCase: null,
            emergency: null,
            lastCaseEndedAt: Date.now(),
            patientsHealed: s.patientsHealed + 1,
            caseStars: { ...s.caseStars, [caseId]: Math.max(s.caseStars[caseId] ?? 0, stars) },
            npcHealed,
            owned,
            completedMissions:
              repeatable || s.completedMissions.includes(caseId) ? s.completedMissions : [...s.completedMissions, caseId],
          };
        }),

      buy: (itemId) => {
        const item = ITEM_BY_ID[itemId];
        let ok = false;
        set((s) => {
          if (!item || item.reward || s.owned.includes(itemId) || s.coins < item.price || s.level < item.minLevel) return {};
          ok = true;
          return { coins: s.coins - item.price, owned: [...s.owned, itemId] };
        });
        if (ok) get().equip(itemId);
        return ok;
      },

      equip: (itemId) =>
        set((s) => {
          const item = ITEM_BY_ID[itemId];
          if (!item || !s.owned.includes(itemId)) return {};
          const e = s.equipped;
          if (item.slot === 'coat') return { equipped: { ...e, coat: itemId } };
          if (item.slot === 'hat') return { equipped: { ...e, hat: e.hat === itemId ? null : itemId } };
          if (item.slot === 'extra')
            return { equipped: { ...e, extras: e.extras.includes(itemId) ? e.extras.filter((x) => x !== itemId) : [...e.extras, itemId] } };
          return {}; // mejoras y decoración funcionan con solo tenerlas
        }),

      setTutorialStep: (tutorialStep) => set({ tutorialStep }),
      petCatOnce: (catId) => {
        const n = (get().catsPetted[catId] ?? 0) + 1;
        set((s) => ({ catsPetted: { ...s.catsPetted, [catId]: n } }));
        return n;
      },
      adoptCat: (petCat) => set({ petCat }),
      setPanel: (panel) => set({ panel, modal: panel !== null }),

      cancelEmergency: () => set({ activeCase: null, emergency: null, lastCaseEndedAt: Date.now() }),

      addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

      addXP: (amount) =>
        set((s) => {
          const newXP = s.xp + amount;
          const newLevel = calculateLevel(newXP);
          return { xp: newXP, level: newLevel, levelUp: newLevel > s.level ? newLevel : s.levelUp };
        }),

      clearLevelUp: () => set({ levelUp: null }),
      setMuted: (muted) => set({ muted }),
      setQuality: (quality) => set({ quality }),
      resetProgress: () => set({ ...initialProgress, levelUp: null }),
    }),
    {
      // Nombre interno del guardado: no cambiar aunque el juego se renombre (se perdería el progreso)
      name: 'sana-babies-save',
      version: 4,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        activeCase: s.activeCase,
        completedMissions: s.completedMissions,
        patientsHealed: s.patientsHealed,
        caseStars: s.caseStars,
        npcHealed: s.npcHealed,
        owned: s.owned,
        equipped: s.equipped,
        tutorialStep: s.tutorialStep,
        catsPetted: s.catsPetted,
        petCat: s.petCat,
        coins: s.coins,
        xp: s.xp,
        level: s.level,
        muted: s.muted,
        quality: s.quality,
      }),
      // v1 (Fase 1) guardaba una lista de misiones aceptadas: la primera pasa a ser el caso activo
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const accepted = (p.acceptedMissions as string[] | undefined) ?? [];
          p.activeCase = accepted[0] ?? null;
          p.patientsHealed = ((p.completedMissions as string[] | undefined) ?? []).length;
          delete p.acceptedMissions;
        }
        if (version < 3) {
          // Quien ya jugó no necesita el tutorial; su progreso previo cuenta para el álbum
          const done = (p.completedMissions as string[] | undefined) ?? [];
          p.tutorialStep = done.length > 0 ? TUTORIAL_DONE : 0;
          const healed: Record<string, number> = {};
          done.forEach((id) => {
            const c = CASES.find((x) => x.id === id);
            if (c) healed[c.patientId] = (healed[c.patientId] ?? 0) + 1;
          });
          p.npcHealed = healed;
          p.caseStars = Object.fromEntries(done.map((id) => [id, 2]));
          p.owned = [...DEFAULT_OWNED];
          p.equipped = { coat: 'coat-white', hat: null, extras: [] };
        }
        if (version < 4) {
          p.catsPetted = {};
          p.petCat = null;
        }
        return p as unknown as GameState;
      },
    },
  ),
);

/**
 * Mudanza de dominio (sana-babies → sanna-babys): el guardado vive en localStorage,
 * que es por dominio. El dominio viejo manda la partida en el link (#save=...);
 * aquí se importa si en este dominio todavía no hay progreso, y se limpia el link.
 */
export function importSaveFromLink(): boolean {
  if (typeof window === 'undefined') return false;
  const m = window.location.hash.match(/^#save=(.+)$/);
  if (!m) return false;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const parsed = JSON.parse(json);
    if (!parsed?.state || hasSavedProgress()) return false;
    window.localStorage.setItem('sana-babies-save', json);
    void useGameStore.persist.rehydrate();
    return true;
  } catch {
    return false;
  }
}

/** true si hay una partida guardada con algo de progreso */
export function hasSavedProgress(): boolean {
  const s = useGameStore.getState();
  return s.xp > 0 || s.coins > 0 || s.completedMissions.length > 0 || s.activeCase !== null;
}
