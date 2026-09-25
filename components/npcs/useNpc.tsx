'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { player, npcPositions, npcCheer } from '@/lib/runtime';
import { GAME_MISSIONS } from '@/lib/gameMissions';
import { sfx } from '@/lib/audio';

const INTERACTION_DISTANCE = 2.5;
const CHEER_DURATION = 1.6;

/**
 * Lógica común de NPC: cercanía al jugador (sin re-render por frame),
 * registro de posición para partículas y festejo al ser curado.
 * Aplica el salto/giro de festejo al grupo `cheerRef`.
 */
export function useNpc(id: string, position: [number, number, number]) {
  const [isNear, setIsNear] = useState(false);
  const nearRef = useRef(false);
  const cheerRef = useRef<THREE.Group>(null);
  const interact = useGameStore((s) => s.interact);
  const worldPos = useMemo(() => new THREE.Vector3(...position), [position]);

  useEffect(() => {
    npcPositions.set(id, worldPos);
    return () => {
      npcPositions.delete(id);
    };
  }, [id, worldPos]);

  useFrame(() => {
    const dx = player.position.x - position[0];
    const dz = player.position.z - position[2];
    const near = dx * dx + dz * dz < INTERACTION_DISTANCE * INTERACTION_DISTANCE;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setIsNear(near);
      if (near) {
        interact(id);
        if (useGameStore.getState().started) sfx.pop();
      } else if (useGameStore.getState().currentInteraction === id) {
        interact(null);
      }
    }

    // Festejo: saltitos con giro completo
    const g = cheerRef.current;
    if (!g) return;
    const since = npcCheer.has(id) ? performance.now() / 1000 - npcCheer.get(id)! : Infinity;
    if (since < CHEER_DURATION) {
      const t = since / CHEER_DURATION;
      g.position.y = Math.abs(Math.sin(t * Math.PI * 3)) * 0.45 * (1 - t);
      g.rotation.y = t * Math.PI * 2;
      const s = 1 + Math.sin(t * Math.PI * 6) * 0.06 * (1 - t);
      g.scale.set(s, 2 - s, s);
    } else if (g.position.y !== 0 || g.rotation.y !== 0) {
      g.position.y = 0;
      g.rotation.y = 0;
      g.scale.set(1, 1, 1);
    }
  });

  return { isNear, cheerRef };
}

/** Qué marcador mostrar sobre un NPC según el estado de las misiones */
export function useMarker(id: string): 'offer' | 'target' | null {
  const accepted = useGameStore((s) => s.acceptedMissions);
  const completed = useGameStore((s) => s.completedMissions);
  return useMemo(() => {
    const target = GAME_MISSIONS.some((m) => m.npcTarget === id && accepted.includes(m.id) && !completed.includes(m.id));
    if (target) return 'target';
    const offer = GAME_MISSIONS.some((m) => m.npcGiver === id && !accepted.includes(m.id) && !completed.includes(m.id));
    return offer ? 'offer' : null;
  }, [id, accepted, completed]);
}

const markerMats = {
  offer: new THREE.MeshStandardMaterial({ color: '#FFC928', emissive: '#FFB300', emissiveIntensity: 0.6 }),
  target: new THREE.MeshStandardMaterial({ color: '#FF4F7B', emissive: '#FF2D6B', emissiveIntensity: 0.6 }),
};
const markerGeo = {
  bar: new THREE.CapsuleGeometry(0.07, 0.22, 4, 10),
  dot: new THREE.SphereGeometry(0.085, 12, 12),
  cross: new THREE.BoxGeometry(0.34, 0.11, 0.11),
};

/** Signo "!" (misión disponible) o cruz médica (paciente por atender), flotando y girando */
export function MissionMarker({ kind, height }: { kind: 'offer' | 'target'; height: number }) {
  const ref = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 10);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + phase.current;
    ref.current.position.y = height + Math.sin(t * 3) * 0.08;
    ref.current.rotation.y = t * 2;
    const s = 1 + Math.sin(t * 6) * 0.05;
    ref.current.scale.setScalar(s);
  });
  return (
    <group ref={ref} position={[0, height, 0]} userData={{ outline: 0.02 }}>
      {kind === 'offer' ? (
        <>
          <mesh geometry={markerGeo.bar} material={markerMats.offer} position={[0, 0.12, 0]} />
          <mesh geometry={markerGeo.dot} material={markerMats.offer} position={[0, -0.16, 0]} />
        </>
      ) : (
        <>
          <mesh geometry={markerGeo.cross} material={markerMats.target} />
          <mesh geometry={markerGeo.cross} material={markerMats.target} rotation={[0, 0, Math.PI / 2]} />
        </>
      )}
    </group>
  );
}
