import { create } from 'zustand';

export interface Mission {
  id: string;
  title: string;
  description: string;
  zone: string;
  type: 'consulta' | 'emergencia' | 'visita' | 'campana' | 'historia';
  reward: { coins: number; xp: number };
  completed: boolean;
}

interface GameState {
  // Player movement
  playerPosition: [number, number, number];
  moveDirection: { x: number; y: number };
  isMoving: boolean;

  // Interaction
  currentInteraction: string | null;
  showMissionDialog: boolean;
  currentMission: Mission | null;

  // GameFlow state
  activeMiniGame: string | null;
  dialogMode: 'offer' | 'complete' | 'chat' | null;
  actionTriggered: number; // increments on each action press

  // Missions
  missions: Mission[];
  completedMissions: string[];

  // Progression
  coins: number;
  xp: number;
  level: number;

  // Camera
  cameraAngle: number;

  // Actions
  setPlayerPosition: (pos: [number, number, number]) => void;
  setMoveDirection: (dir: { x: number; y: number }) => void;
  setIsMoving: (moving: boolean) => void;
  setCameraAngle: (angle: number) => void;
  interact: (npcId: string | null) => void;
  setShowMissionDialog: (show: boolean) => void;
  setCurrentMission: (mission: Mission | null) => void;
  completeMission: (missionId: string) => void;
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  addMission: (mission: Mission) => void;
  setActiveMiniGame: (game: string | null) => void;
  setDialogMode: (mode: 'offer' | 'complete' | 'chat' | null) => void;
  triggerAction: () => void;
}

function calculateLevel(xp: number): number {
  // XP curve: level N requires N*100 XP total
  let totalXp = 0;
  let level = 1;
  while (totalXp + level * 100 <= xp) {
    totalXp += level * 100;
    level++;
  }
  return level;
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  playerPosition: [0, 1, 0],
  moveDirection: { x: 0, y: 0 },
  isMoving: false,

  currentInteraction: null,
  showMissionDialog: false,
  currentMission: null,

  activeMiniGame: null,
  dialogMode: null,
  actionTriggered: 0,

  missions: [],
  completedMissions: [],

  coins: 0,
  xp: 0,
  level: 1,

  cameraAngle: 0,

  // Actions
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  setMoveDirection: (dir) =>
    set({
      moveDirection: dir,
      isMoving: Math.abs(dir.x) > 0.01 || Math.abs(dir.y) > 0.01,
    }),

  setIsMoving: (moving) => set({ isMoving: moving }),

  setCameraAngle: (angle) => set({ cameraAngle: angle }),

  interact: (npcId) => set({ currentInteraction: npcId }),

  setShowMissionDialog: (show) => set({ showMissionDialog: show }),

  setCurrentMission: (mission) =>
    set({ currentMission: mission, showMissionDialog: mission !== null }),

  completeMission: (missionId) =>
    set((state) => ({
      missions: state.missions.filter((m) => m.id !== missionId),
      completedMissions: [...state.completedMissions, missionId],
      showMissionDialog: false,
      currentMission: null,
    })),

  addCoins: (amount) =>
    set((state) => ({ coins: state.coins + amount })),

  addXP: (amount) =>
    set((state) => {
      const newXP = state.xp + amount;
      return { xp: newXP, level: calculateLevel(newXP) };
    }),

  addMission: (mission) =>
    set((state) => ({ missions: [...state.missions, mission] })),

  setActiveMiniGame: (game) => set({ activeMiniGame: game }),

  setDialogMode: (mode) => set({ dialogMode: mode }),

  triggerAction: () =>
    set((state) => ({ actionTriggered: state.actionTriggered + 1 })),
}));
