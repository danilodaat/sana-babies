'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

const MOVE_SPEED = 4;
const ROTATION_LERP = 0.15;
const WALK_CYCLE_SPEED = 8;
const LIMB_SWING = 0.4;

// Skin, clothing, and accessory colors
const SKIN_COLOR = '#f5c6a0';
const COAT_COLOR = '#f0f0f0';
const PANTS_COLOR = '#3b5998';
const HAIR_COLOR = '#5a3825';
const EYE_COLOR = '#1a1a1a';
const STETHOSCOPE_COLOR = '#6b7b8d';
const SHOE_COLOR = '#2a2a2a';

export default function Doctor() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);
  const walkPhase = useRef(0);

  const { moveDirection, isMoving, cameraAngle, setPlayerPosition } = useGameStore();

  // Memoize materials so they don't re-create each frame
  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN_COLOR }),
      coat: new THREE.MeshStandardMaterial({ color: COAT_COLOR }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR_COLOR }),
      eye: new THREE.MeshStandardMaterial({ color: EYE_COLOR }),
      stethoscope: new THREE.MeshStandardMaterial({ color: STETHOSCOPE_COLOR, metalness: 0.6, roughness: 0.3 }),
      shoe: new THREE.MeshStandardMaterial({ color: SHOE_COLOR }),
    }),
    []
  );

  // Memoize geometries
  const geometries = useMemo(
    () => ({
      head: new THREE.SphereGeometry(0.22, 16, 16),
      eye: new THREE.SphereGeometry(0.04, 8, 8),
      pupil: new THREE.SphereGeometry(0.02, 8, 8),
      hairTop: new THREE.SphereGeometry(0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      body: new THREE.BoxGeometry(0.4, 0.5, 0.25, 2, 2, 2),
      arm: new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8),
      hand: new THREE.SphereGeometry(0.06, 8, 8),
      leg: new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8),
      shoe: new THREE.BoxGeometry(0.1, 0.06, 0.14),
      stethTube: new THREE.TorusGeometry(0.12, 0.012, 8, 16, Math.PI),
      stethPiece: new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8),
    }),
    []
  );

  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !groupRef.current) return;

    // Calculate movement direction relative to camera angle
    const angle = cameraAngle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Rotate joystick input by camera angle
    const worldX = moveDirection.x * cos - moveDirection.y * sin;
    const worldZ = moveDirection.x * sin + moveDirection.y * cos;

    const magnitude = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const moving = magnitude > 0.01;

    if (moving) {
      // Apply velocity via Rapier
      const currentVel = rigidBodyRef.current.linvel();
      rigidBodyRef.current.setLinvel(
        { x: worldX * MOVE_SPEED, y: currentVel.y, z: worldZ * MOVE_SPEED },
        true
      );

      // Target rotation: face movement direction
      targetRotation.current = Math.atan2(worldX, worldZ);
    } else {
      // Stop horizontal movement, keep gravity
      const currentVel = rigidBodyRef.current.linvel();
      rigidBodyRef.current.setLinvel(
        { x: 0, y: currentVel.y, z: 0 },
        true
      );
    }

    // Smooth rotation towards movement direction
    const currentRot = groupRef.current.rotation.y;
    let rotDiff = targetRotation.current - currentRot;
    // Normalize angle difference to [-PI, PI]
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    groupRef.current.rotation.y += rotDiff * ROTATION_LERP;

    // Walk animation
    if (moving) {
      walkPhase.current += delta * WALK_CYCLE_SPEED;
      const swing = Math.sin(walkPhase.current) * LIMB_SWING;

      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      // Reset limbs to idle
      walkPhase.current = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x *= 0.85;
      if (rightArmRef.current) rightArmRef.current.rotation.x *= 0.85;
      if (leftLegRef.current) leftLegRef.current.rotation.x *= 0.85;
      if (rightLegRef.current) rightLegRef.current.rotation.x *= 0.85;
    }

    // Update store with current position
    const pos = rigidBodyRef.current.translation();
    setPlayerPosition([pos.x, pos.y, pos.z]);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      mass={1}
      colliders={false}
    >
      <CapsuleCollider args={[0.4, 0.2]} position={[0, 0.6, 0]} />

      <group ref={groupRef}>
        {/* === HEAD === */}
        <group position={[0, 1.3, 0]}>
          {/* Head sphere */}
          <mesh geometry={geometries.head} material={materials.skin} />

          {/* Hair (half-sphere on top) */}
          <mesh
            geometry={geometries.hairTop}
            material={materials.hair}
            position={[0, 0.02, 0]}
            rotation={[0, 0, 0]}
          />

          {/* Left eye */}
          <mesh
            geometry={geometries.eye}
            material={materials.coat}
            position={[-0.08, 0.03, 0.18]}
          />
          <mesh
            geometry={geometries.pupil}
            material={materials.eye}
            position={[-0.08, 0.03, 0.2]}
          />

          {/* Right eye */}
          <mesh
            geometry={geometries.eye}
            material={materials.coat}
            position={[0.08, 0.03, 0.18]}
          />
          <mesh
            geometry={geometries.pupil}
            material={materials.eye}
            position={[0.08, 0.03, 0.2]}
          />
        </group>

        {/* === STETHOSCOPE === */}
        <group position={[0, 1.08, 0.05]}>
          {/* Tube around neck */}
          <mesh
            geometry={geometries.stethTube}
            material={materials.stethoscope}
            rotation={[0, 0, Math.PI]}
          />
          {/* Chest piece hanging */}
          <mesh
            geometry={geometries.stethPiece}
            material={materials.stethoscope}
            position={[0, -0.12, 0.05]}
          />
        </group>

        {/* === BODY (white coat) === */}
        <mesh
          geometry={geometries.body}
          material={materials.coat}
          position={[0, 0.85, 0]}
        />

        {/* === ARMS === */}
        {/* Left arm */}
        <group ref={leftArmRef} position={[-0.28, 1.0, 0]}>
          <mesh
            geometry={geometries.arm}
            material={materials.coat}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.hand}
            material={materials.skin}
            position={[0, -0.38, 0]}
          />
        </group>

        {/* Right arm */}
        <group ref={rightArmRef} position={[0.28, 1.0, 0]}>
          <mesh
            geometry={geometries.arm}
            material={materials.coat}
            position={[0, -0.17, 0]}
          />
          <mesh
            geometry={geometries.hand}
            material={materials.skin}
            position={[0, -0.38, 0]}
          />
        </group>

        {/* === LEGS === */}
        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.1, 0.58, 0]}>
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

        {/* Right leg */}
        <group ref={rightLegRef} position={[0.1, 0.58, 0]}>
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
      </group>
    </RigidBody>
  );
}
