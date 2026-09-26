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
  { id: 'oreo', name: 'Oreo', fur: '#26262E', accent: '#FFFFFF', eyes: '#AED581', pattern: 'tuxedo', home: { x: -38, z: -29.6, r: 1.8 }, personality: 'Vive en la veterinaria y conoce a todas las mascotas.' },
  { id: 'bigotes', name: 'Bigotes', fur: '#B0B0B8', accent: '#6F6F78', eyes: '#FFCA28', pattern: 'tabby', home: { x: 31, z: -25.6, r: 1.5 }, personality: 'Se esconde entre los peluches de la juguetería.' },
  { id: 'mandarina', name: 'Mandarina', fur: '#FFB74D', accent: '#F57C00', eyes: '#66BB6A', pattern: 'tabby', home: { x: 42, z: -25.6, r: 1.5 }, personality: 'Siempre espera que se caiga un poquito de helado.' },
  { id: 'copito', name: 'Copito', fur: '#FFFFFF', accent: '#F1F1F5', eyes: '#FFB300', pattern: 'solid', home: { x: 12, z: 41, r: 2 }, personality: 'Toma sol en la puerta de los departamentos.' },
  { id: 'sombra', name: 'Sombra', fur: '#2E2E38', accent: '#1F1F26', eyes: '#4FC3F7', pattern: 'solid', home: { x: 26, z: 40.6, r: 1.4 }, personality: 'Duerme sobre los libros de la librería.' },
  { id: 'panchito', name: 'Panchito', fur: '#FFFFFF', accent: '#8D6E63', eyes: '#8BC34A', pattern: 'calico', home: { x: 46.2, z: 6, r: 2 }, personality: 'Acompaña a los vecinos a hacer las compras.' },
  { id: 'galleta', name: 'Galleta', fur: '#E6C9A8', accent: '#A1887F', eyes: '#FFD54F', pattern: 'siamese', home: { x: 4, z: -37.6, r: 1.8 }, personality: 'Huele cada flor de la florería.' },
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
