'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface BabyProps {
  id: string;
  position: [number, number, number];
  bodyColor?: string;
  name?: string;
}

const INTERACTION_DISTANCE = 2.5;
const FLOAT_SPEED = 2;
const FLOAT_AMPLITUDE = 0.05;

export default function Baby({
  id,
  position,
  bodyColor = '#fce4ec',
  name = 'Bebé',
}: BabyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isNear, setIsNear] = useState(false);
  const floatPhase = useRef(Math.random() * Math.PI * 2);

  const { playerPosition, interact, currentInteraction } = useGameStore();

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#ffe0bd' }),
      body: new THREE.MeshStandardMaterial({ color: bodyColor }),
      eye: new THREE.MeshStandardMaterial({ color: '#2c2c2c' }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      cheek: new THREE.MeshStandardMaterial({
        color: '#ffb3b3',
        transparent: true,
        opacity: 0.5,
      }),
      diaper: new THREE.MeshStandardMaterial({ color: '#e3f2fd' }),
    }),
    [bodyColor]
  );

  const geometries = useMemo(
    () => ({
      head: new THREE.SphereGeometry(0.2, 16, 16),
      body: new THREE.SphereGeometry(0.15, 16, 16),
      eye: new THREE.SphereGeometry(0.04, 8, 8),
      eyeWhite: new THREE.SphereGeometry(0.06, 8, 8),
      cheek: new THREE.SphereGeometry(0.04, 8, 8),
      arm: new THREE.CylinderGeometry(0.035, 0.03, 0.15, 8),
      leg: new THREE.CylinderGeometry(0.04, 0.035, 0.12, 8),
      diaper: new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.5),
    }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Floating idle animation
    floatPhase.current += delta * FLOAT_SPEED;
    groupRef.current.position.y = Math.sin(floatPhase.current) * FLOAT_AMPLITUDE;

    // Check distance to player for interaction
    const [px, py, pz] = playerPosition;
    const dx = px - position[0];
    const dz = pz - position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    const near = dist < INTERACTION_DISTANCE;
    if (near !== isNear) {
      setIsNear(near);
      if (near) {
        interact(id);
      } else if (currentInteraction === id) {
        interact(null);
      }
    }
  });

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
    >
      <CapsuleCollider args={[0.15, 0.12]} position={[0, 0.3, 0]} sensor />

      <group ref={groupRef}>
        {/* === HEAD (big, baby proportion) === */}
        <group position={[0, 0.55, 0]}>
          <mesh geometry={geometries.head} material={materials.skin} />

          {/* Left eye white */}
          <mesh
            geometry={geometries.eyeWhite}
            material={materials.eyeWhite}
            position={[-0.08, 0.03, 0.16]}
          />
          {/* Left pupil */}
          <mesh
            geometry={geometries.eye}
            material={materials.eye}
            position={[-0.08, 0.03, 0.2]}
          />

          {/* Right eye white */}
          <mesh
            geometry={geometries.eyeWhite}
            material={materials.eyeWhite}
            position={[0.08, 0.03, 0.16]}
          />
          {/* Right pupil */}
          <mesh
            geometry={geometries.eye}
            material={materials.eye}
            position={[0.08, 0.03, 0.2]}
          />

          {/* Left cheek */}
          <mesh
            geometry={geometries.cheek}
            material={materials.cheek}
            position={[-0.14, -0.04, 0.13]}
          />
          {/* Right cheek */}
          <mesh
            geometry={geometries.cheek}
            material={materials.cheek}
            position={[0.14, -0.04, 0.13]}
          />
        </group>

        {/* === BODY (small, round) === */}
        <group position={[0, 0.3, 0]}>
          <mesh geometry={geometries.body} material={materials.body} />
          {/* Diaper */}
          <mesh
            geometry={geometries.diaper}
            material={materials.diaper}
            position={[0, -0.04, 0]}
          />
        </group>

        {/* === ARMS === */}
        <mesh
          geometry={geometries.arm}
          material={materials.skin}
          position={[-0.18, 0.32, 0]}
          rotation={[0, 0, 0.3]}
        />
        <mesh
          geometry={geometries.arm}
          material={materials.skin}
          position={[0.18, 0.32, 0]}
          rotation={[0, 0, -0.3]}
        />

        {/* === LEGS === */}
        <mesh
          geometry={geometries.leg}
          material={materials.skin}
          position={[-0.08, 0.12, 0]}
        />
        <mesh
          geometry={geometries.leg}
          material={materials.skin}
          position={[0.08, 0.12, 0]}
        />

        {/* === FLOATING ICON when player is nearby === */}
        {isNear && (
          <Html
            position={[0, 0.85, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                fontSize: 28,
                animation: 'bounce 0.6s ease-in-out infinite alternate',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              ❤️
            </div>
            <style>{`
              @keyframes bounce {
                from { transform: translateY(0); }
                to { transform: translateY(-8px); }
              }
            `}</style>
          </Html>
        )}

        {/* Name tag */}
        <Html
          position={[0, 0.95, 0]}
          center
          style={{ pointerEvents: 'none' }}
          occlude={false}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              opacity: isNear ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {name}
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}
