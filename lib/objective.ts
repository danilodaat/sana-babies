import { CASE_BY_ID, availableStoryCases } from './cases';
import * as THREE from 'three';
import { npcPositions, player } from './runtime';
import { ELEVATOR_FRONT, FLOORS, MAIN_DOOR, floorBase, floorOf, insideHospital } from './hospital';

export type ObjectiveKind = 'patient' | 'emergency' | 'offer';

export interface Objective {
  kind: ObjectiveKind;
  /** NPCs candidatos; la flecha y el minimapa apuntan al más cercano */
  ids: string[];
  caseId?: string;
}

interface ObjState {
  activeCase: string | null;
  emergency: unknown;
  level: number;
  completedMissions: string[];
}

/** Qué debería hacer el jugador ahora: ir con su paciente o buscar a alguien que pide ayuda */
export function getObjective(s: ObjState): Objective | null {
  if (s.activeCase) {
    const c = CASE_BY_ID[s.activeCase];
    if (!c) return null;
    return { kind: s.emergency ? 'emergency' : 'patient', ids: [c.patientId], caseId: c.id };
  }
  const givers = availableStoryCases(s.level, s.completedMissions)
    .map((c) => c.giverId!)
    .filter((id, i, a) => a.indexOf(id) === i);
  return givers.length ? { kind: 'offer', ids: givers } : null;
}

/**
 * Hacia dónde apuntar para llegar a `target`: si está en otro piso del hospital,
 * primero al ascensor (o a la puerta si el doctor está afuera).
 */
export function waypointFor(target: THREE.Vector3): { pos: THREE.Vector3; hint: string | null } {
  const p = player.position;
  const pIn = insideHospital(p.x, p.z);
  const tIn = insideHospital(target.x, target.z);
  const pf = pIn ? floorOf(p.y) : 0;
  const tf = tIn ? floorOf(target.y) : 0;
  if (tIn && !pIn && tf > 0) return { pos: MAIN_DOOR, hint: `Entra al hospital y sube al piso ${tf + 1} (${FLOORS[tf].name})` };
  if (pIn && pf !== tf) {
    const dir = tf > pf ? 'Sube' : 'Baja';
    const where = tIn ? `al piso ${tf + 1} (${FLOORS[tf].name})` : 'al piso 1 para salir';
    return { pos: ELEVATOR_FRONT.clone().setY(floorBase(pf)), hint: `${dir} ${where} por el ascensor 🛗 o la escalera` };
  }
  return { pos: target, hint: null };
}

export function nearestNpc(ids: string[]): { id: string; dist: number } | null {
  let best: { id: string; dist: number } | null = null;
  for (const id of ids) {
    const p = npcPositions.get(id);
    if (!p) continue;
    const d = Math.hypot(p.x - player.position.x, p.z - player.position.z);
    if (!best || d < best.dist) best = { id, dist: d };
  }
  return best;
}
