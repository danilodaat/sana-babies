// ─── Mission & Step interfaces ───

export type MissionStepType = 'go_to' | 'diagnose' | 'treat' | 'talk';

export type MissionType =
  | 'consulta'
  | 'emergencia'
  | 'visita'
  | 'campana'
  | 'historia';

export type MissionStatus = 'available' | 'active' | 'completed' | 'failed';

export interface MissionStep {
  id: string;
  type: MissionStepType;
  target: string;
  description: string;
  completed: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  zone: string;
  type: MissionType;
  xpReward: number;
  coinReward: number;
  steps: MissionStep[];
  status: MissionStatus;
}

// ─── MVP Missions ───

export const MISSIONS: Mission[] = [
  {
    id: 'mission-primer-paciente',
    title: 'Primer Paciente',
    description:
      'Un bebé llegó al hospital con fiebre. Necesitas tomarle la temperatura y darle su medicina. ¡Tu primera misión como doctor!',
    zone: 'hospital',
    type: 'consulta',
    xpReward: 100,
    coinReward: 50,
    steps: [
      {
        id: 'pp-step-1',
        type: 'go_to',
        target: 'hospital',
        description: 'Ve al hospital',
        completed: false,
      },
      {
        id: 'pp-step-2',
        type: 'talk',
        target: 'enfermera',
        description: 'Habla con la enfermera',
        completed: false,
      },
      {
        id: 'pp-step-3',
        type: 'diagnose',
        target: 'bebe-fiebre',
        description: 'Toma la temperatura del bebé',
        completed: false,
      },
      {
        id: 'pp-step-4',
        type: 'treat',
        target: 'bebe-fiebre',
        description: 'Dale la medicina al bebé',
        completed: false,
      },
    ],
    status: 'available',
  },
  {
    id: 'mission-emergencia-parque',
    title: 'Emergencia en el Parque',
    description:
      'Un niño se cayó jugando en el parque y se raspó la rodilla. Necesita que lo examines y le pongas una curita. ¡Corre!',
    zone: 'parque',
    type: 'emergencia',
    xpReward: 150,
    coinReward: 75,
    steps: [
      {
        id: 'ep-step-1',
        type: 'go_to',
        target: 'parque',
        description: 'Ve al parque',
        completed: false,
      },
      {
        id: 'ep-step-2',
        type: 'talk',
        target: 'nino-herido',
        description: 'Habla con el niño herido',
        completed: false,
      },
      {
        id: 'ep-step-3',
        type: 'diagnose',
        target: 'rodilla-raspada',
        description: 'Examina la herida en la rodilla',
        completed: false,
      },
      {
        id: 'ep-step-4',
        type: 'treat',
        target: 'rodilla-raspada',
        description: 'Limpia la herida y pon la curita',
        completed: false,
      },
    ],
    status: 'available',
  },
  {
    id: 'mission-vacunacion-escolar',
    title: 'Vacunación Escolar',
    description:
      'Hoy es día de vacunación en la escuela. Debes vacunar a 3 niños para protegerlos. ¡Ellos confían en ti!',
    zone: 'escuela',
    type: 'campana',
    xpReward: 200,
    coinReward: 100,
    steps: [
      {
        id: 've-step-1',
        type: 'go_to',
        target: 'escuela',
        description: 'Ve a la escuela',
        completed: false,
      },
      {
        id: 've-step-2',
        type: 'talk',
        target: 'directora',
        description: 'Habla con la directora',
        completed: false,
      },
      {
        id: 've-step-3',
        type: 'treat',
        target: 'nino-vacuna-1',
        description: 'Vacuna al primer niño',
        completed: false,
      },
      {
        id: 've-step-4',
        type: 'treat',
        target: 'nino-vacuna-2',
        description: 'Vacuna al segundo niño',
        completed: false,
      },
      {
        id: 've-step-5',
        type: 'treat',
        target: 'nino-vacuna-3',
        description: 'Vacuna al tercer niño',
        completed: false,
      },
    ],
    status: 'available',
  },
];

// ─── Helpers ───

/** Returns the current (first incomplete) step of a mission, or null */
export function getCurrentStep(mission: Mission): MissionStep | null {
  return mission.steps.find((s) => !s.completed) ?? null;
}

/** Returns progress as a number between 0 and 1 */
export function getMissionProgress(mission: Mission): number {
  const total = mission.steps.length;
  if (total === 0) return 1;
  const done = mission.steps.filter((s) => s.completed).length;
  return done / total;
}

/** Deep-clone a mission resetting step completion */
export function resetMission(mission: Mission): Mission {
  return {
    ...mission,
    status: 'active',
    steps: mission.steps.map((s) => ({ ...s, completed: false })),
  };
}
