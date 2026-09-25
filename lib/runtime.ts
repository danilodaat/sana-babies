import * as THREE from 'three';

/**
 * Estado "caliente" del juego que cambia cada frame (posición del jugador,
 * input, hora del día). Vive fuera de zustand a propósito: si esto estuviera
 * en el store, cada componente suscrito se re-renderizaría 60 veces por segundo.
 * Se lee dentro de useFrame, nunca en el render de React.
 */

export const player = {
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(),
  grounded: true,
  /** 0..1 — qué tan rápido se mueve respecto a la velocidad máxima */
  speed01: 0,
};

export const input = {
  /** Joystick táctil, rango -1..1 (y positivo = hacia la cámara) */
  touch: { x: 0, y: 0 },
  /** Se consume en Doctor: true mientras haya un salto pendiente */
  jumpQueued: false,
  cameraAngle: 0,
  /** Solo para pruebas (?debug): mueve al doctor a este punto en el próximo frame */
  teleport: null as THREE.Vector3 | null,
};

/** Duración de un día completo, en segundos reales */
export const DAY_LENGTH = 360;

export const world = {
  /** Fracción del día: 0 = medianoche, 0.25 = amanecer, 0.5 = mediodía, 0.75 = atardecer */
  time: 0.34,
  /** 0 = pleno día, 1 = plena noche (suavizado) */
  night: 0,
  timeScale: 1,
};

/** Posiciones de los NPCs para partículas, marcadores y reacciones */
export const npcPositions = new Map<string, THREE.Vector3>();

/** Momento (clock.elapsedTime) en que cada NPC fue curado, para animar su festejo */
export const npcCheer = new Map<string, number>();

export function cheerNpc(id: string) {
  npcCheer.set(id, performance.now() / 1000);
}

export function resetRuntime() {
  player.position.set(0, 0, 0);
  player.velocity.set(0, 0, 0);
  input.touch.x = 0;
  input.touch.y = 0;
  input.jumpQueued = false;
  input.cameraAngle = 0;
  world.time = 0.34;
}
