import type { Mission } from '@/store/gameStore';

// Misiones jugables. En la Fase 2 esto se unifica con lib/missions.ts.


export interface GameMission extends Mission {
  npcGiver: string;    // NPC that offers the mission
  npcTarget: string;   // NPC to interact with for the mini-game
  miniGame: 'thermometer' | 'bandaid' | 'vaccine';
  giverDialogue: string;
}

export const GAME_MISSIONS: GameMission[] = [
  {
    id: 'mission-primer-paciente',
    title: 'Primer Paciente',
    description: 'La bebé Luciana tiene fiebre. Necesitas tomarle la temperatura con el termómetro.',
    zone: 'hospital',
    type: 'consulta',
    reward: { coins: 50, xp: 100 },
    completed: false,
    npcGiver: 'parent-1',   // Rosa te pide que atiendas a su bebé
    npcTarget: 'baby-1',    // Luciana es el target
    miniGame: 'thermometer',
    giverDialogue: 'Doctor, mi bebé Luciana tiene fiebre... Por favor, revísela.',
  },
  {
    id: 'mission-emergencia-parque',
    title: 'Emergencia en el Parque',
    description: 'Mateo se raspó jugando. Necesita que le pongas una curita en la herida.',
    zone: 'parque',
    type: 'emergencia',
    reward: { coins: 75, xp: 150 },
    completed: false,
    npcGiver: 'baby-2',    // Mateo mismo te pide ayuda
    npcTarget: 'baby-2',   // Mateo es el target
    miniGame: 'bandaid',
    giverDialogue: '¡Ay, me raspé la rodilla! ¿Me puedes poner una curita?',
  },
  {
    id: 'mission-vacunacion',
    title: 'Vacunación',
    description: 'Carlos trajo a su hijo para vacunarse. Necesitas ponerle la vacuna con buen timing.',
    zone: 'hospital',
    type: 'campana',
    reward: { coins: 100, xp: 200 },
    completed: false,
    npcGiver: 'parent-2',  // Carlos te pide
    npcTarget: 'parent-2', // Carlos mismo (su hijo)
    miniGame: 'vaccine',
    giverDialogue: '¿Puede revisar a mi hijo? Necesita su vacuna.',
  },
];

// NPC names for chat dialogues
export const NPC_NAMES: Record<string, string> = {
  'baby-1': 'Luciana',
  'baby-2': 'Mateo',
  'parent-1': 'Rosa',
  'parent-2': 'Carlos',
};

export const NPC_CHAT_DIALOGUES: Record<string, string> = {
  'baby-1': '¡Hola doctor! Estoy jugando.',
  'baby-2': '¡Hola! ¿Quieres jugar conmigo?',
  'parent-1': 'Gracias por cuidar a los niños, doctor.',
  'parent-2': 'Buenos días, doctor.',
};

