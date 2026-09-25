/**
 * Todos los personajes del mundo en un solo lugar. Game.tsx los instancia
 * desde aquí y los casos clínicos (lib/cases.ts) los referencian por id.
 */

export type NpcKind = 'baby' | 'mother' | 'father' | 'girl' | 'boy';

export interface NpcDef {
  id: string;
  name: string;
  kind: NpcKind;
  position: [number, number, number];
  /** Color de ropa (bebés: cuerpo) */
  color?: string;
  /** Mamá con bebé en brazos */
  hasBaby?: boolean;
  /** Frases de charla cuando no hay nada que atender (se elige una al azar) */
  chat: string[];
}

export const NPCS: NpcDef[] = [
  // ─── Hospital ───
  {
    id: 'baby-1',
    name: 'Luciana',
    kind: 'baby',
    position: [5, 0.5, 5],
    chat: ['¡Hola doctor! Estoy jugando.', '¡Ga ga! 👶', '¡Me gusta tu bata blanca!'],
  },
  {
    id: 'baby-2',
    name: 'Mateo',
    kind: 'baby',
    position: [-3, 0.5, -4],
    color: '#B3E5FC',
    chat: ['¡Hola! ¿Quieres jugar conmigo?', '¡Ya no me duele nada!', '¿Me das otra curita de dinosaurio?'],
  },
  {
    id: 'parent-1',
    name: 'Rosa',
    kind: 'mother',
    position: [-5, 0, 8],
    hasBaby: true,
    chat: ['Gracias por cuidar a los niños, doctor.', 'En el parque siempre hay niños jugando.', 'Usted es el mejor doctor de Ciudad Sana.'],
  },
  {
    id: 'parent-2',
    name: 'Carlos',
    kind: 'father',
    position: [8, 0, -3],
    chat: ['Buenos días, doctor.', 'La escuela Arcoíris queda al este, cruzando la avenida.', '¡Qué rápido corre usted, doctor!'],
  },

  // ─── Parque (-40, 38) ───
  {
    id: 'kid-sofi',
    name: 'Sofi',
    kind: 'girl',
    position: [-33, 0, 29],
    color: '#FF8FB1',
    chat: ['¡Hola doc! ¿Jugamos a la pelota?', 'El pato del lago se llama Pepe.'],
  },
  {
    id: 'kid-diego',
    name: 'Diego',
    kind: 'boy',
    position: [-46, 0, 36],
    color: '#FFB74D',
    chat: ['¡Mira qué rápido corro!', 'Cuando sea grande quiero ser doctor como tú.'],
  },
  {
    id: 'baby-valentina',
    name: 'Valentina',
    kind: 'baby',
    position: [-36, 0.5, 45],
    color: '#FFF59D',
    chat: ['¡Agú! 🌞', '*se ríe y aplaude*'],
  },

  // ─── Escuela Arcoíris (35, 32) ───
  {
    id: 'kid-tomas',
    name: 'Tomás',
    kind: 'boy',
    position: [32, 0, 25.5],
    color: '#81C784',
    chat: ['¡Hoy aprendimos los planetas!', 'La maestra Sofía dice que hay que lavarse las manos.'],
  },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

export function npcName(id: string) {
  return NPC_BY_ID[id]?.name ?? 'el paciente';
}
