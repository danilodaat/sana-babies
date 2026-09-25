import { CASE_BY_ID, availableStoryCases } from './cases';
import { npcPositions, player } from './runtime';

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
