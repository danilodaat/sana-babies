import * as THREE from 'three';

/**
 * Vecinos que pasean por las veredas. No son pacientes: le dan vida a la
 * ciudad, se detienen si el doctor se acerca y lo saludan al hablarles.
 * Cada uno recorre un circuito (ida y vuelta o cerrado) desde un punto distinto.
 */

export interface WalkerDef {
  id: string;
  name: string;
  loop: [number, number][];
  closed: boolean;
  /** 0..1: dónde del circuito empieza */
  start: number;
  speed: number;
  kid?: boolean;
  shirt: string;
  pants: string;
  hair: string;
  skin: string;
  extra?: 'hat' | 'bag' | 'glasses' | 'balloon' | 'cane';
  lines: string[];
}

const HOSP: [number, number][] = [[15.2, 12.5], [-20.2, 12.5], [-20.2, -14.6], [15.2, -14.6]];
const AVENUE: [number, number][] = [[-55, 23.3], [55, 23.3]];
const EAST: [number, number][] = [[24.9, -28], [24.9, 28]];
const PARK: [number, number][] = [[-41.6, 28.5], [-41.6, 48], [-38.4, 48], [-38.4, 28.5]];
const SOL: [number, number][] = [[-30.5, -6.5], [-60, -6.5], [-60, -11.5], [-30.5, -11.5]];
const NORTH: [number, number][] = [[-24, -15.2], [40, -15.2]];
const SOUTH2: [number, number][] = [[-18, 42], [44, 42]];
const SHOPS: [number, number][] = [[26, -25.6], [46, -25.6]];

export const WALKERS: WalkerDef[] = [
  { id: 'w-marta', name: 'Doña Marta', loop: HOSP, closed: true, start: 0, speed: 1.0, shirt: '#9575CD', pants: '#5D4037', hair: '#E0E0E0', skin: '#F1C7A5', extra: 'cane', lines: ['¡Buenos días, doctor! Qué lindo día.', 'Mi nieto dice que usted es su héroe.'] },
  { id: 'w-jorge', name: 'Jorge', loop: HOSP, closed: true, start: 0.5, speed: 1.4, shirt: '#4CAF50', pants: '#263238', hair: '#3E2723', skin: '#C68E65', extra: 'bag', lines: ['Voy al supermercado, ¿necesita algo?', '¡Hola doc!'] },
  { id: 'w-ana', name: 'Ana', loop: AVENUE, closed: false, start: 0.1, speed: 1.3, shirt: '#F06292', pants: '#37474F', hair: '#6D4C41', skin: '#F8D0B0', extra: 'glasses', lines: ['¡Hola! Trabajo en la librería.', 'Qué buena bata, doctor.'] },
  { id: 'w-pedro', name: 'Pedro', loop: AVENUE, closed: false, start: 0.65, speed: 1.2, shirt: '#FFB74D', pants: '#455A64', hair: '#212121', skin: '#D7A87E', extra: 'hat', lines: ['Ando paseando, ¡saludos!', '¿Vio los gatitos de la veterinaria?'] },
  { id: 'w-lucy', name: 'Lucy', loop: AVENUE, closed: false, start: 0.35, speed: 2.0, kid: true, shirt: '#4FC3F7', pants: '#EC407A', hair: '#FFCA28', skin: '#F8D0B0', extra: 'balloon', lines: ['¡Mira mi globo!', '¡Cuando sea grande seré doctora!'] },
  { id: 'w-raul', name: 'Raúl', loop: EAST, closed: false, start: 0.2, speed: 1.3, shirt: '#E57373', pants: '#1E88E5', hair: '#4E342E', skin: '#E0B48E', lines: ['¡Buenas tardes, doctor!', 'La farmacia de Don Pepe tiene de todo.'] },
  { id: 'w-sara', name: 'Sara', loop: EAST, closed: false, start: 0.8, speed: 1.1, shirt: '#AED581', pants: '#5D4037', hair: '#8D6E63', skin: '#F1C7A5', extra: 'bag', lines: ['¡Hola! Vengo de la heladería.', 'Qué lindo está el barrio.'] },
  { id: 'w-toby', name: 'Toby', loop: PARK, closed: true, start: 0.3, speed: 1.8, kid: true, shirt: '#FF7043', pants: '#3949AB', hair: '#3E2723', skin: '#C68E65', lines: ['¡Estoy jugando a la pinta!', '¡Doc, doc! ¡Míreme correr!'] },
  { id: 'w-elsa', name: 'Elsa', loop: PARK, closed: true, start: 0.8, speed: 0.9, shirt: '#BA68C8', pants: '#424242', hair: '#FAFAFA', skin: '#F8D0B0', extra: 'hat', lines: ['Vengo todos los días a ver los patos.', 'Cuídese mucho, doctor.'] },
  { id: 'w-hugo', name: 'Hugo', loop: SOL, closed: true, start: 0.1, speed: 1.2, shirt: '#26A69A', pants: '#37474F', hair: '#212121', skin: '#E0B48E', lines: ['¡Bienvenido a la Calle Sol!', 'Mi casa es la celeste.'] },
  { id: 'w-nina', name: 'Nina', loop: SOL, closed: true, start: 0.6, speed: 1.9, kid: true, shirt: '#FFEE58', pants: '#7E57C2', hair: '#5D4037', skin: '#F1C7A5', extra: 'balloon', lines: ['¡Hola doctor! ¿Vio a Canela?', '¡Me encanta mi barrio!'] },
  { id: 'w-leo', name: 'Leo', loop: NORTH, closed: false, start: 0.4, speed: 1.4, shirt: '#5C6BC0', pants: '#212121', hair: '#6D4C41', skin: '#D7A87E', extra: 'glasses', lines: ['Voy a comprar pan a la panadería.', '¡Saludos doctor!'] },
  { id: 'w-rosi', name: 'Rosi', loop: SOUTH2, closed: false, start: 0.5, speed: 1.2, shirt: '#FF8A65', pants: '#4E342E', hair: '#212121', skin: '#C68E65', extra: 'bag', lines: ['¡Hola! Me acabo de mudar al barrio.', 'Qué tranquilo es aquí.'] },
  { id: 'w-beto', name: 'Beto', loop: SHOPS, closed: false, start: 0.3, speed: 1.6, kid: true, shirt: '#66BB6A', pants: '#1565C0', hair: '#FFB300', skin: '#F8D0B0', lines: ['¡La juguetería tiene un dinosaurio gigante!', '¿Me compra un helado, doc? ¡Jaja!'] },
];

export const walkerPositions = new Map<string, THREE.Vector3>();
export const walkerInteractionId = (id: string) => `walker:${id}`;
export const isWalkerInteraction = (id: string | null) => !!id && id.startsWith('walker:');
export const walkerIdFrom = (id: string) => id.slice(7);
/** Momento en que saludó (para la animación de saludo) */
export const walkerWaveAt = new Map<string, number>();
export const WALKER_BY_ID: Record<string, WalkerDef> = Object.fromEntries(WALKERS.map((w) => [w.id, w]));
