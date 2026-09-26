import * as THREE from 'three';

/**
 * Gatitos de Ciudad Sana. Cada uno pasea dentro de su "casa" (un círculo),
 * se sienta, se lame, duerme de noche y se acerca al doctor por curiosidad.
 * Se pueden acariciar (botón de atender) y, después de varias caricias,
 * adoptar uno para que te siga.
 */

export type CatPattern = 'solid' | 'tabby' | 'siamese' | 'calico' | 'tuxedo';

export interface CatDef {
  id: string;
  name: string;
  /** color principal / secundario (manchas, rayas, puntas) */
  fur: string;
  accent: string;
  eyes: string;
  pattern: CatPattern;
  home: { x: number; z: number; r: number };
  personality: string;
}

export const CATS: CatDef[] = [
  { id: 'michi', name: 'Michi', fur: '#FF9F43', accent: '#E07A1F', eyes: '#7CB342', pattern: 'tabby', home: { x: 8.5, z: 11, r: 2.2 }, personality: 'Le encanta tomar sol frente al hospital.' },
  { id: 'luna', name: 'Luna', fur: '#3A3A48', accent: '#2A2A34', eyes: '#FFD54F', pattern: 'solid', home: { x: -45, z: 45, r: 4.5 }, personality: 'Misteriosa, sale más de noche.' },
  { id: 'nieve', name: 'Nieve', fur: '#F7F7FA', accent: '#E8E8EE', eyes: '#4FC3F7', pattern: 'solid', home: { x: -33, z: 33, r: 3.5 }, personality: 'Blanquita y dormilona, siempre cerca del lago.' },
  { id: 'tigre', name: 'Tigre', fur: '#A1A1A8', accent: '#5F5F68', eyes: '#AED581', pattern: 'tabby', home: { x: -45, z: 7, r: 4 }, personality: 'Juguetón, persigue mariposas en los jardines.' },
  { id: 'miso', name: 'Miso', fur: '#F3E5CF', accent: '#6D4C41', eyes: '#29B6F6', pattern: 'siamese', home: { x: 41, z: 25.8, r: 2.4 }, personality: 'Espera a los niños a la salida de la escuela.' },
  { id: 'pelusa', name: 'Pelusa', fur: '#FFFFFF', accent: '#E67E22', eyes: '#8BC34A', pattern: 'calico', home: { x: -2.6, z: -27.5, r: 2 }, personality: 'Pide pancito afuera de la panadería.' },
  { id: 'canela', name: 'Canela', fur: '#E8C39E', accent: '#FFFFFF', eyes: '#FFB300', pattern: 'tuxedo', home: { x: -58, z: -9.4, r: 2.4 }, personality: 'Tranquila, cuida la Calle Sol.' },
];

export const CAT_BY_ID: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));

/** Caricias necesarias para que un gatito quiera seguirte */
export const PETS_TO_ADOPT = 3;

/** Posiciones en vivo (las escribe cada gatito cada frame) */
export const catPositions = new Map<string, THREE.Vector3>();

export const catInteractionId = (id: string) => `cat:${id}`;
export const isCatInteraction = (id: string | null) => !!id && id.startsWith('cat:');
export const catIdFrom = (interactionId: string) => interactionId.slice(4);

/** Pedidos a un gatito desde la UI (festejar la caricia) */
export const catPetAt = new Map<string, number>();
