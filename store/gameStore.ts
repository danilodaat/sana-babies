import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

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
  finishCase: (caseId: string, repeatable: boolean) => void;
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
  coins: 0,
  xp: 0,
  level: 1,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      started: false,
      currentInteraction: null,
      actionTriggered: 0,
      modal: false,
      lastCaseEndedAt: 0,
      ...initialProgress,
      levelUp: null,
      muted: false,
      quality: defaultQuality(),

      setStarted: (started) => set({ started, lastCaseEndedAt: Date.now() }),
      interact: (npcId) => set({ currentInteraction: npcId }),
      triggerAction: () => set((s) => ({ actionTriggered: s.actionTriggered + 1 })),
      setModal: (modal) => set({ modal }),

      startCase: (caseId, emergency) => set({ activeCase: caseId, emergency: emergency ?? null }),

      markArrival: (onTime) =>
        set((s) => (s.emergency && s.emergency.onTime === null ? { emergency: { ...s.emergency, onTime } } : {})),

      finishCase: (caseId, repeatable) =>
        set((s) => ({
          activeCase: null,
          emergency: null,
          lastCaseEndedAt: Date.now(),
          patientsHealed: s.patientsHealed + 1,
          completedMissions:
            repeatable || s.completedMissions.includes(caseId) ? s.completedMissions : [...s.completedMissions, caseId],
        })),

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
      name: 'sana-babies-save',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        activeCase: s.activeCase,
        completedMissions: s.completedMissions,
        patientsHealed: s.patientsHealed,
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
        return p as unknown as GameState;
      },
    },
  ),
);

/** true si hay una partida guardada con algo de progreso */
export function hasSavedProgress(): boolean {
  const s = useGameStore.getState();
  return s.xp > 0 || s.coins > 0 || s.completedMissions.length > 0 || s.activeCase !== null;
}
