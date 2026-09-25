import type { Rect } from './mapData';

/**
 * Zonas de Ciudad Sana. Se desbloquean por nivel: mientras estén cerradas
 * tienen conos alrededor y el doctor no puede entrar (components/world/Zones.tsx).
 */
export interface Zone {
  id: string;
  name: string;
  emoji: string;
  /** [x, z, ancho, largo] */
  rect: Rect;
  minLevel: number;
}

export const ZONES: Zone[] = [
  { id: 'hospital', name: 'Hospital Sana', emoji: '🏥', rect: [0, 0, 30, 26], minLevel: 1 },
  { id: 'parque', name: 'Parque Central', emoji: '🌳', rect: [-40, 38, 30, 24], minLevel: 2 },
  { id: 'escuela', name: 'Escuela Arcoíris', emoji: '🏫', rect: [36, 32, 22, 16], minLevel: 3 },
  { id: 'residencial', name: 'Residencial Sol', emoji: '🌞', rect: [-47.5, -8, 35, 40], minLevel: 4 },
];

export function zoneAt(x: number, z: number, margin = 0): Zone | null {
  for (const zn of ZONES) {
    const [cx, cz, w, d] = zn.rect;
    if (Math.abs(x - cx) < w / 2 + margin && Math.abs(z - cz) < d / 2 + margin) return zn;
  }
  return null;
}

export function zonesUnlockedAt(level: number) {
  return ZONES.filter((z) => z.minLevel === level);
}
