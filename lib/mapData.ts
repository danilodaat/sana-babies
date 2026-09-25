/**
 * Planta de la ciudad para el minimapa y la vegetación. Rectángulos
 * centrados: [x, z, ancho, largo]. Residencial Sol y la escuela se generan
 * desde aquí; el resto de City.tsx está copiado a mano (mantener en sync).
 */

export type Rect = [number, number, number, number];

/** Calle Sol, la calle interna del barrio residencial */
export const RESIDENCIAL_LANE: Rect = [-45.5, -9, 33, 6];

export const RESIDENCIAL_HOUSES: { x: number; z: number; facing: 1 | -1; color: string; roof: string }[] = [
  { x: -36, z: 0, facing: -1, color: '#FFE082', roof: '#F57C00' },
  { x: -45, z: 0, facing: -1, color: '#F8BBD0', roof: '#C2185B' },
  { x: -54, z: 0, facing: -1, color: '#B3E5FC', roof: '#0277BD' },
  { x: -36, z: -18, facing: 1, color: '#C8E6C9', roof: '#2E7D32' },
  { x: -45, z: -18, facing: 1, color: '#E1BEE7', roof: '#6A1B9A' },
  { x: -54, z: -18, facing: 1, color: '#FFCCBC', roof: '#D84315' },
];

export const SCHOOL: Rect = [36, 33, 16, 9];

export const ROADS: Rect[] = [
  [0, 18, 120, 8],
  [20, 0, 8, 120],
  [-25, 0, 8, 60],
  [0, -20, 80, 8],
  RESIDENCIAL_LANE,
];

export const BUILDINGS: { rect: Rect; color: string }[] = [
  { rect: [-15, 32, 8, 7], color: '#F8BBD0' },
  { rect: [-3, 34, 10, 8], color: '#FFF9C4' },
  { rect: [12, 33, 9, 8], color: '#BBDEFB' },
  { rect: SCHOOL, color: '#FFF3C4' },
  { rect: [35, -5, 8, 8], color: '#E0E0E0' },
  { rect: [35, 8, 7, 6], color: '#CE93D8' },
  ...RESIDENCIAL_HOUSES.map((h) => ({ rect: [h.x, h.z, 6, 5.5] as Rect, color: h.color })),
  { rect: [-10, -28, 8, 7], color: '#FFAB91' },
  { rect: [5, -30, 9, 6], color: '#FFF3E0' },
];

export const HOSPITAL: Rect = [0, 0, 24, 18];
export const PARK: Rect = [-40, 38, 28, 22];
export const POND = { x: -33, z: 38, r: 3 };

export const LABELS: { x: number; z: number; text: string }[] = [
  { x: 0, z: 0, text: '🏥' },
  { x: -40, z: 38, text: '🌳' },
  { x: 35, z: 32, text: '🏫' },
  { x: 35, z: 8, text: '💊' },
  { x: -45, z: -9, text: '🌞' },
];
