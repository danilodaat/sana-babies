'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { player } from '@/lib/runtime';
import { sfx } from '@/lib/audio';

/*
 * Puerta automática del hospital: dos hojas de vidrio que se corren hacia los
 * costados cuando el doctor se acerca (por dentro o por fuera) y se cierran al
 * alejarse. Es solo visual, sin colisión: así nunca puede dejar a nadie encerrado.
 * Hueco de la entrada: x ∈ [-2, 2], z = 9 (pared frontal), 5 m de alto.
 */

const DOOR_Z = 9;
const OPEN_RADIUS = 4.5;
const LEAF_W = 1.95;

export default function HospitalDoor() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  const wasOpen = useRef(false);

  const mats = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.45, emissive: '#bfe8ff', emissiveIntensity: 0.15 }),
      frame: new THREE.MeshStandardMaterial({ color: '#90a4ae' }),
      cross: new THREE.MeshStandardMaterial({ color: '#ef4b6c' }),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const dx = player.position.x;
    const dz = player.position.z - DOOR_Z;
    const near = Math.hypot(dx, dz) < OPEN_RADIUS;
    if (near !== wasOpen.current) {
      wasOpen.current = near;
      sfx.whoosh();
    }
    open.current += ((near ? 1 : 0) - open.current) * (1 - Math.exp(-7 * delta));
    const slide = open.current * (LEAF_W - 0.15);
    if (left.current) left.current.position.x = -LEAF_W / 2 - slide;
    if (right.current) right.current.position.x = LEAF_W / 2 + slide;
  });

  const Leaf = ({ side }: { side: 1 | -1 }) => (
    <>
      <mesh material={mats.glass} userData={{ noToon: true }}>
        <boxGeometry args={[LEAF_W - 0.05, 4.4, 0.06]} />
      </mesh>
      {/* Marco de la hoja */}
      <mesh material={mats.frame} position={[side * (LEAF_W / 2 - 0.05), 0, 0]}>
        <boxGeometry args={[0.08, 4.4, 0.1]} />
      </mesh>
      {/* Cruz roja a la altura de los ojos */}
      <group position={[-side * 0.3, 0.4, 0.05]}>
        <mesh material={mats.cross}>
          <boxGeometry args={[0.5, 0.14, 0.02]} />
        </mesh>
        <mesh material={mats.cross}>
          <boxGeometry args={[0.14, 0.5, 0.02]} />
        </mesh>
      </group>
    </>
  );

  return (
    <group position={[0, 2.2, DOOR_Z]} userData={{ noBatch: true }}>
      <group ref={left}>
        <Leaf side={-1} />
      </group>
      <group ref={right}>
        <Leaf side={1} />
      </group>
      {/* Riel superior y tapete de entrada */}
      <mesh material={mats.frame} position={[0, 2.3, 0]}>
        <boxGeometry args={[4.2, 0.2, 0.25]} />
      </mesh>
      <mesh position={[0, -2.16, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 1.6]} />
        <meshStandardMaterial color="#7cb3d9" />
      </mesh>
    </group>
  );
}
