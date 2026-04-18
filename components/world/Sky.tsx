'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Single cloud made of overlapping spheres ─── */
function Cloud({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Gentle floating motion
    groupRef.current.position.x =
      position[0] + Math.sin(state.clock.elapsedTime * 0.15 + position[2]) * 1.5;
    groupRef.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.2 + position[0]) * 0.4;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[2.5, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" flatShading />
      </mesh>
      <mesh position={[2.2, 0.3, 0]}>
        <sphereGeometry args={[2, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" flatShading />
      </mesh>
      <mesh position={[-2, 0.2, 0.5]}>
        <sphereGeometry args={[2.2, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" flatShading />
      </mesh>
      <mesh position={[0.8, 1, 0]}>
        <sphereGeometry args={[1.8, 12, 12]} />
        <meshStandardMaterial color="#F8F8FF" flatShading />
      </mesh>
      <mesh position={[-0.5, -0.5, 1]}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" flatShading />
      </mesh>
    </group>
  );
}

/* ─── Sun ─── */
function Sun() {
  return (
    <mesh position={[70, 80, -60]}>
      <sphereGeometry args={[8, 16, 16]} />
      <meshStandardMaterial
        color="#FFE066"
        emissive="#FFD54F"
        emissiveIntensity={1.5}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ─── Sky dome ─── */
export function Sky() {
  return (
    <group>
      {/* Sky sphere */}
      <mesh>
        <sphereGeometry args={[180, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </mesh>

      <Sun />

      {/* Clouds scattered around */}
      <Cloud position={[-30, 40, -50]} scale={1.2} />
      <Cloud position={[25, 45, -65]} scale={1} />
      <Cloud position={[60, 38, -40]} scale={0.9} />
      <Cloud position={[-55, 42, -30]} scale={1.1} />
      <Cloud position={[0, 50, -80]} scale={1.4} />
      <Cloud position={[-40, 35, 20]} scale={0.8} />
      <Cloud position={[45, 48, 10]} scale={1} />
      <Cloud position={[10, 44, 40]} scale={0.7} />
    </group>
  );
}
