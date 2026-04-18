'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

const CAMERA_OFFSET = new THREE.Vector3(0, 6, 8);
const LOOK_OFFSET = new THREE.Vector3(0, 1, 0);
const LERP_SPEED = 0.08;

export default function CameraFollow() {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());

  const { playerPosition, cameraAngle } = useGameStore();

  useFrame(() => {
    const [px, py, pz] = playerPosition;
    const playerPos = new THREE.Vector3(px, py, pz);

    // Rotate camera offset around the player based on cameraAngle
    const rotatedOffset = CAMERA_OFFSET.clone().applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      cameraAngle
    );

    // Target camera position
    targetPos.current.copy(playerPos).add(rotatedOffset);

    // Smooth interpolation
    currentPos.current.lerp(targetPos.current, LERP_SPEED);
    camera.position.copy(currentPos.current);

    // Look at player (slightly above center)
    lookTarget.current.copy(playerPos).add(LOOK_OFFSET);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
