import * as THREE from 'three';

/**
 * Red de calles de Ciudad Sana como grafo (esquinas y paradas).
 * Las ambulancias buscan el camino más corto con Dijkstra; así pueden ir
 * desde donde estén a cualquier emergencia, patrullar y volver a la base.
 * Coordenadas = centro de la calle (la carrocería no tiene colisión).
 */

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  /** nombre para mostrar como destino */
  label?: string;
}

export const NODES: RoadNode[] = [
  // Base de ambulancias (costado este del hospital, junto a Emergencias)
  { id: 'base', x: 20, z: 0, label: 'Hospital Sana · Emergencias' },
  // Avenida principal E-O (z = 18)
  { id: 'A', x: 20, z: 18 },
  { id: 'B', x: -25, z: 18 },
  { id: 'P1', x: -36, z: 18, label: 'Parque Central' },
  { id: 'P2', x: -44, z: 18, label: 'Parque Central' },
  { id: 'G', x: -58, z: 18 },
  { id: 'S1', x: 32, z: 18, label: 'Escuela Arcoíris' },
  { id: 'H', x: 56, z: 18 },
  { id: 'HOSP', x: 0, z: 18, label: 'Hospital Sana' },
  // Avenida N-S (x = 20)
  { id: 'N', x: 20, z: -56 },
  { id: 'S', x: 20, z: 56 },
  { id: 'PH', x: 20, z: 8, label: 'Farmacia de Don Pepe' },
  // Calle oeste (x = -25) y Calle Sol
  { id: 'E', x: -25, z: -9 },
  { id: 'R0', x: -36, z: -9, label: 'Residencial Sol' },
  { id: 'R1', x: -52, z: -9, label: 'Residencial Sol' },
  { id: 'R2', x: -60, z: -9 },
  // Calle sur (z = -20)
  { id: 'C', x: -25, z: -20 },
  { id: 'W', x: -38, z: -20 },
  { id: 'D', x: 20, z: -20 },
  { id: 'BK', x: 0, z: -20, label: 'Panadería' },
];

const EDGES: [string, string][] = [
  ['base', 'PH'],
  ['PH', 'A'],
  ['base', 'D'],
  ['A', 'HOSP'],
  ['HOSP', 'B'],
  ['B', 'P1'],
  ['P1', 'P2'],
  ['P2', 'G'],
  ['A', 'S1'],
  ['S1', 'H'],
  ['A', 'S'],
  ['D', 'N'],
  ['B', 'E'],
  ['E', 'R0'],
  ['R0', 'R1'],
  ['R1', 'R2'],
  ['E', 'C'],
  ['C', 'W'],
  ['C', 'BK'],
  ['BK', 'D'],
];

export const NODE_BY_ID: Record<string, RoadNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

const adj = new Map<string, { to: string; w: number }[]>();
for (const [a, b] of EDGES) {
  const na = NODE_BY_ID[a];
  const nb = NODE_BY_ID[b];
  const w = Math.hypot(na.x - nb.x, na.z - nb.z);
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a)!.push({ to: b, w });
  adj.get(b)!.push({ to: a, w });
}

/** Camino más corto entre dos esquinas (lista de ids, incluye ambas puntas) */
export function shortestPath(from: string, to: string, avoid?: Set<string>): string[] {
  if (from === to) return [from];
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const todo = new Set(NODES.map((n) => n.id));
  while (todo.size) {
    let u: string | null = null;
    for (const id of todo) if (dist.has(id) && (u === null || dist.get(id)! < dist.get(u)!)) u = id;
    if (u === null) break;
    todo.delete(u);
    if (u === to) break;
    for (const { to: v, w } of adj.get(u) ?? []) {
      if (avoid?.has(v) && v !== to) continue;
      const d = dist.get(u)! + w;
      if (d < (dist.get(v) ?? Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
      }
    }
  }
  const path = [to];
  while (path[0] !== from) {
    const p = prev.get(path[0]);
    if (!p) return [from, to];
    path.unshift(p);
  }
  return path;
}

/** Esquina más cercana a un punto */
export function nearestNode(x: number, z: number, onlyLabeled = false, avoid?: Set<string>): RoadNode {
  let best = NODES[0];
  let bd = Infinity;
  for (const n of NODES) {
    if (onlyLabeled && !n.label) continue;
    if (avoid?.has(n.id)) continue;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

/** Ruta en puntos 3D desde una posición cualquiera hasta un nodo destino */
export function routeTo(fromX: number, fromZ: number, toId: string): THREE.Vector3[] {
  const start = nearestNode(fromX, fromZ);
  return shortestPath(start.id, toId).map((id) => new THREE.Vector3(NODE_BY_ID[id].x, 0, NODE_BY_ID[id].z));
}

/** Vuelta de patrulla alrededor del centro */
export const PATROL = ['base', 'PH', 'A', 'HOSP', 'B', 'E', 'C', 'BK', 'D', 'base'];

/** Lugares de estacionamiento en la base (carril junto al hospital) */
export const BAY_SLOTS: [number, number][] = [
  [17.3, -5],
  [17.3, 0.2],
  [17.3, 5.4],
];

/** Los autos no pasan por la base de ambulancias (se evita ese tramo de la avenida N-S) */
export const CAR_AVOID = new Set(['base', 'PH']);
export const CAR_NODES = NODES.filter((n) => !CAR_AVOID.has(n.id));
