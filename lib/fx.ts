import * as THREE from 'three';

export type FxKind = 'hearts' | 'confetti' | 'dust' | 'sparkle';

interface FxRequest {
  kind: FxKind;
  position: THREE.Vector3;
  count: number;
}

/** Cola que consume <Particles /> en su useFrame. Se puede llamar desde cualquier lado (UI incluida). */
export const fxQueue: FxRequest[] = [];

export function emit(kind: FxKind, position: THREE.Vector3 | [number, number, number], count = 12) {
  const p = Array.isArray(position) ? new THREE.Vector3(...position) : position.clone();
  fxQueue.push({ kind, position: p, count });
}
