/**
 * Planta de la ciudad para el minimapa (espejo de components/world/City.tsx
 * y Hospital.tsx). Rectángulos centrados: [x, z, ancho, largo].
 * En la Fase 3 la ciudad se generará desde aquí para que no se desincronice.
 */

export type Rect = [number, number, number, number];

export const ROADS: Rect[] = [
  [0, 18, 120, 8],
  [20, 0, 8, 120],
  [-25, 0, 8, 60],
  [0, -20, 80, 8],
];

export const BUILDINGS: { rect: Rect; color: string }[] = [
  { rect: [-15, 32, 8, 7], color: '#F8BBD0' },
  { rect: [-3, 34, 10, 8], color: '#FFF9C4' },
  { rect: [12, 33, 9, 8], color: '#BBDEFB' },
  { rect: [35, 32, 14, 10], color: '#C8E6C9' },
  { rect: [35, -5, 8, 8], color: '#E0E0E0' },
  { rect: [35, 8, 7, 6], color: '#CE93D8' },
  { rect: [-38, 5, 7, 7], color: '#FFE0B2' },
  { rect: [-38, -8, 8, 7], color: '#B2DFDB' },
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
];
