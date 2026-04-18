'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface ParentProps {
  id: string;
  position: [number, number, number];
  variant?: 'mother' | 'father';
  hasBaby?: boolean;
  name?: string;
  dialogue?: string;
}

const INTERACTION_DISTANCE = 2.5;
const IDLE_SWAY_SPEED = 1.5;
const IDLE_SWAY_AMOUNT = 0.015;

export default function Parent({
  id,
  position,
  variant = 'mother',
  hasBaby = false,
  name = 'Mamá Rosa',
  dialogue = 'Doctor, necesito su ayuda...',
}: ParentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isNear, setIsNear] = useState(false);
  const idlePhase = useRef(Math.random() * Math.PI * 2);

  const { playerPosition, interact, currentInteraction, showMissionDialog } =
    useGameStore();

  const isMother = variant === 'mother';

  const colors = useMemo(
    () =>
      isMother
        ? {
            shirt: '#e91e63',
            pants: '#5c6bc0',
            hair: '#3e2723',
            skin: '#f5c6a0',
          }
        : {
            shirt: '#1565c0',
            pants: '#37474f',
            hair: '#212121',
            skin: '#d7a87e',
          },
    [isMother]
  );

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: colors.skin }),
      shirt: new THREE.MeshStandardMaterial({ color: colors.shirt }),
      pants: new THREE.MeshStandardMaterial({ color: colors.pants }),
      hair: new THREE.MeshStandardMaterial({ color: colors.hair }),
      eye: new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      shoe: new THREE.MeshStandardMaterial({ color: '#4e342e' }),
      // Baby colors (if hasBaby)
      babySkin: new THREE.MeshStandardMaterial({ color: '#ffe0bd' }),
      babyCloth: new THREE.MeshStandardMaterial({ color: '#fff9c4' }),
    }),
    [colors]
  );

  const geometries = useMemo(
    () => ({
      head: new THREE.SphereGeometry(0.2, 16, 16),
      hairTop: new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairLong: new THREE.CylinderGeometry(0.18, 0.14, 0.25, 12),
      eye: new THREE.SphereGeometry(0.03, 8, 8),
      eyeWhite: new THREE.SphereGeometry(0.045, 8, 8),
      body: new THREE.BoxGeometry(0.38, 0.45, 0.22, 2, 2, 2),
      arm: new THREE.CylinderGeometry(0.055, 0.06, 0.35, 8),
      hand: new THREE.SphereGeometry(0.055, 8, 8),
      leg: new THREE.CylinderGeometry(0.065, 0.065, 0.35, 8),
      shoe: new THREE.BoxGeometry(0.1, 0.06, 0.13),
      // Baby parts
      babyHead: new THREE.SphereGeometry(0.1, 12, 12),
      babyBody: new THREE.SphereGeometry(0.08, 12, 12),
    }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Idle sway animation
    idlePhase.current += delta * IDLE_SWAY_SPEED;
    groupRef.current.rotation.z =
      Math.sin(idlePhase.current) * IDLE_SWAY_AMOUNT;

    // Check distance to player
    const [px, , pz] = playerPosition;
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

    // Face the player when nearby
    if (near) {
      const angle = Math.atan2(dx, dz);
      const currentY = groupRef.current.rotation.y;
      let diff = angle - currentY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.05;
    }
  });

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CapsuleCollider args={[0.4, 0.18]} position={[0, 0.6, 0]} sensor />

      <group ref={groupRef}>
        {/* === HEAD === */}
        <group position={[0, 1.25, 0]}>
          <mesh geometry={geometries.head} material={materials.skin} />

          {/* Hair */}
          <mesh
            geometry={geometries.hairTop}
            material={materials.hair}
            position={[0, 0.02, 0]}
          />
          {/* Long hair for mother */}
          {isMother && (
            <mesh
              geometry={geometries.hairLong}
              material={materials.hair}
              position={[0, -0.12, -0.05]}
            />
          )}

          {/* Eyes */}
          <mesh
            geometry={geometries.eyeWhite}
            material={materials.eyeWhite}
            position={[-0.07, 0.02, 0.17]}
          />
          <mesh
            geometry={geometries.eye}
            material={materials.eye}
            position={[-0.07, 0.02, 0.19]}
          />
          <mesh
            geometry={geometries.eyeWhite}
            material={materials.eyeWhite}
            position={[0.07, 0.02, 0.17]}
          />
          <mesh
            geometry={geometries.eye}
            material={materials.eye}
            position={[0.07, 0.02, 0.19]}
          />
        </group>

        {/* === BODY (shirt) === */}
        <mesh
          geometry={geometries.body}
          material={materials.shirt}
          position={[0, 0.82, 0]}
        />

        {/* === ARMS === */}
        {/* Left arm */}
        <group position={[-0.26, 0.95, 0]}>
          <mesh
            geometry={geometries.arm}
            material={materials.shirt}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.hand}
            material={materials.skin}
            position={[0, -0.38, 0]}
          />
        </group>

        {/* Right arm — bent if holding baby */}
        <group
          position={[0.26, 0.95, 0]}
          rotation={hasBaby ? [-0.8, 0, 0] : [0, 0, 0]}
        >
          <mesh
            geometry={geometries.arm}
            material={materials.shirt}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.hand}
            material={materials.skin}
            position={[0, -0.38, 0]}
          />
        </group>

        {/* === BABY IN ARMS === */}
        {hasBaby && (
          <group position={[0.2, 0.72, 0.15]}>
            <mesh geometry={geometries.babyHead} material={materials.babySkin} />
            <mesh
              geometry={geometries.babyBody}
              material={materials.babyCloth}
              position={[0, -0.12, 0]}
            />
          </group>
        )}

        {/* === LEGS === */}
        <group position={[-0.09, 0.55, 0]}>
          <mesh
            geometry={geometries.leg}
            material={materials.pants}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.shoe}
            material={materials.shoe}
            position={[0, -0.38, 0.02]}
          />
        </group>

        <group position={[0.09, 0.55, 0]}>
          <mesh
            geometry={geometries.leg}
            material={materials.pants}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.shoe}
            material={materials.shoe}
            position={[0, -0.38, 0.02]}
          />
        </group>

        {/* === INTERACTION ICON === */}
        {isNear && !showMissionDialog && (
          <Html
            position={[0, 1.65, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                fontSize: 24,
                animation: 'pulse 0.8s ease-in-out infinite alternate',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              ❗
            </div>
            <style>{`
              @keyframes pulse {
                from { transform: scale(1); }
                to { transform: scale(1.2); }
              }
            `}</style>
          </Html>
        )}

        {/* Name tag */}
        <Html
          position={[0, 1.55, 0]}
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

        {/* Dialogue bubble when interacting */}
        {isNear && showMissionDialog && currentInteraction === id && (
          <Html
            position={[0, 1.85, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.95)',
                color: '#333',
                padding: '8px 14px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                maxWidth: 180,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                lineHeight: 1.4,
              }}
            >
              {dialogue}
            </div>
          </Html>
        )}
      </group>
    </RigidBody>
  );
}
