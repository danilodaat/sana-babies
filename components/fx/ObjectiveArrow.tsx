'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { getObjective, nearestNpc, waypointFor } from '@/lib/objective';
import { npcPositions, player } from '@/lib/runtime';

/*
 * Flecha en el suelo alrededor del doctor que apunta al objetivo actual.
 * Se esconde al llegar cerca (ahí manda el marcador sobre el NPC).
 */

const COLORS = {
  offer: new THREE.Color('#FFC928'),
  patient: new THREE.Color('#FF4F7B'),
  emergency: new THREE.Color('#FF2D2D'),
};

export default function ObjectiveArrow() {
  const group = useRef<THREE.Group>(null);
  const fade = useRef(0);

  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.55);
    s.lineTo(0.42, 0.05);
    s.lineTo(0.18, 0.05);
    s.lineTo(0.18, -0.35);
    s.lineTo(-0.18, -0.35);
    s.lineTo(-0.18, 0.05);
    s.lineTo(-0.42, 0.05);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2); // acostada, la punta mira hacia -z
    g.rotateY(Math.PI); // la punta hacia +z
    return g;
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.offer.clone(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    [],
  );

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);
    const s = useGameStore.getState();
    const obj = s.started && !s.modal ? getObjective(s) : null;
    const target = obj ? nearestNpc(obj.ids) : null;
    const npc = target ? npcPositions.get(target.id) : null;
    const way = npc ? waypointFor(npc) : null;
    const p = way?.pos ?? null;
    const dist = p ? Math.hypot(p.x - player.position.x, p.z - player.position.z) : 0;

    const visible = !!(obj && target && p && dist > (way?.hint ? 1.2 : 3.5));
    fade.current += ((visible ? 1 : 0) - fade.current) * (1 - Math.exp(-8 * delta));
    material.opacity = fade.current * 0.9;
    g.visible = fade.current > 0.02;
    if (!obj || !p) return;

    material.color.lerp(COLORS[obj.kind], 0.2);
    const angle = Math.atan2(p.x - player.position.x, p.z - player.position.z);
    const t = state.clock.elapsedTime;
    const radius = 1.25 + Math.sin(t * 5) * 0.08;
    g.position.set(player.position.x + Math.sin(angle) * radius, player.position.y + 0.12, player.position.z + Math.cos(angle) * radius);
    g.rotation.y = angle;
    const pulse = obj.kind === 'emergency' ? 1 + Math.abs(Math.sin(t * 8)) * 0.25 : 1;
    g.scale.setScalar(pulse);
  });

  return (
    <group ref={group} userData={{ noToon: true }}>
      <mesh geometry={geometry} material={material} userData={{ noToon: true }} renderOrder={5} />
    </group>
  );
}
