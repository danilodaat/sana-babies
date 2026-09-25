import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export interface Mission {
  id: string;
  title: string;
  description: string;
  zone: string;
  type: 'consulta' | 'emergencia' | 'visita' | 'campana' | 'historia';
  reward: { coins: number; xp: number };
  completed: boolean;
}

export type Quality = 'alto' | 'bajo';

/*
 * Ojo: la posición del jugador, el joystick y el ángulo de cámara NO viven aquí.
 * Cambian cada frame y están en lib/runtime.ts para no re-renderizar React.
 */
interface GameState {
  // Flujo general
  started: boolean;

  // Interacción
  currentInteraction: string | null;
  showMissionDialog: boolean;
  currentMission: Mission | null;

  activeMiniGame: string | null;
  dialogMode: 'offer' | 'complete' | 'chat' | null;
  actionTriggered: number; // se incrementa en cada pulsación de acción

  // Misiones
  missions: Mission[];
  acceptedMissions: string[];
  completedMissions: string[];

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
  setShowMissionDialog: (show: boolean) => void;
  setCurrentMission: (mission: Mission | null) => void;
  acceptMission: (missionId: string) => void;
  completeMission: (missionId: string) => void;
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  clearLevelUp: () => void;
  addMission: (mission: Mission) => void;
  setActiveMiniGame: (game: string | null) => void;
  setDialogMode: (mode: 'offer' | 'complete' | 'chat' | null) => void;
  triggerAction: () => void;
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
  acceptedMissions: [] as string[],
  completedMissions: [] as string[],
  coins: 0,
  xp: 0,
  level: 1,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      started: false,

      currentInteraction: null,
      showMissionDialog: false,
      currentMission: null,

      activeMiniGame: null,
      dialogMode: null,
      actionTriggered: 0,

      missions: [],
      ...initialProgress,
      levelUp: null,

      muted: false,
      quality: defaultQuality(),

      setStarted: (started) => set({ started }),

      interact: (npcId) => set({ currentInteraction: npcId }),

      setShowMissionDialog: (show) => set({ showMissionDialog: show }),

      setCurrentMission: (mission) =>
        set({ currentMission: mission, showMissionDialog: mission !== null }),

      acceptMission: (missionId) =>
        set((state) =>
          state.acceptedMissions.includes(missionId)
            ? {}
            : { acceptedMissions: [...state.acceptedMissions, missionId] },
        ),

      completeMission: (missionId) =>
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== missionId),
          acceptedMissions: state.acceptedMissions.filter((id) => id !== missionId),
          completedMissions: state.completedMissions.includes(missionId)
            ? state.completedMissions
            : [...state.completedMissions, missionId],
          showMissionDialog: false,
          currentMission: null,
        })),

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

      addXP: (amount) =>
        set((state) => {
          const newXP = state.xp + amount;
          const newLevel = calculateLevel(newXP);
          return {
            xp: newXP,
            level: newLevel,
            levelUp: newLevel > state.level ? newLevel : state.levelUp,
          };
        }),

      clearLevelUp: () => set({ levelUp: null }),

      addMission: (mission) => set((state) => ({ missions: [...state.missions, mission] })),

      setActiveMiniGame: (game) => set({ activeMiniGame: game }),

      setDialogMode: (mode) => set({ dialogMode: mode }),

      triggerAction: () => set((state) => ({ actionTriggered: state.actionTriggered + 1 })),

      setMuted: (muted) => set({ muted }),

      setQuality: (quality) => set({ quality }),

      resetProgress: () => set({ ...initialProgress, levelUp: null }),
    }),
    {
      name: 'sana-babies-save',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        acceptedMissions: s.acceptedMissions,
        completedMissions: s.completedMissions,
        coins: s.coins,
        xp: s.xp,
        level: s.level,
        muted: s.muted,
        quality: s.quality,
      }),
    },
  ),
);

/** true si hay una partida guardada con algo de progreso */
export function hasSavedProgress(): boolean {
  const s = useGameStore.getState();
  return s.xp > 0 || s.coins > 0 || s.completedMissions.length > 0 || s.acceptedMissions.length > 0;
}
