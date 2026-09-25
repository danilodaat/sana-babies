'use client';

import { useMemo, useRef } from 'react';
import { useRapier } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { player, input } from '@/lib/runtime';

const CAMERA_OFFSET = new THREE.Vector3(0, 5.2, 7.5);
const LOOK_OFFSET = new THREE.Vector3(0, 1.1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const flatVel = new THREE.Vector3();
const toCam = new THREE.Vector3();
const CAM_MARGIN = 0.35;

// Pantalla de inicio: órbita lenta alrededor del hospital
const ORBIT_CENTER = new THREE.Vector3(0, 2, 6);
const ORBIT_RADIUS = 30;
const ORBIT_HEIGHT = 13;

export default function CameraFollow() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const started = useGameStore((s) => s.started);
  const pos = useRef(new THREE.Vector3(0, ORBIT_HEIGHT, ORBIT_RADIUS));
  const look = useRef(ORBIT_CENTER.clone());
  const desired = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const fov = useRef(60);
  const camDist = useRef(10);
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    if (!started) {
      const a = state.clock.elapsedTime * 0.07;
      desired.current.set(
        ORBIT_CENTER.x + Math.sin(a) * ORBIT_RADIUS,
        ORBIT_HEIGHT + Math.sin(a * 2) * 2,
        ORBIT_CENTER.z + Math.cos(a) * ORBIT_RADIUS,
      );
      desiredLook.current.copy(ORBIT_CENTER);
      pos.current.lerp(desired.current, 1 - Math.exp(-1.5 * delta));
      look.current.lerp(desiredLook.current, 1 - Math.exp(-1.5 * delta));
    } else {
      // Se aleja un poco al correr y mira ligeramente hacia adelante
      const speed = player.speed01;
      // En vertical (celular) el campo horizontal es angosto: alejar la cámara
      const portrait = camera.aspect < 1 ? Math.min(Math.pow(1 / camera.aspect, 0.5), 1.6) : 1;
      offset.current.copy(CAMERA_OFFSET).multiplyScalar((1 + speed * 0.12) * portrait);
      offset.current.applyAxisAngle(UP, input.cameraAngle);
      desired.current.copy(player.position).add(offset.current);
      desiredLook.current
        .copy(player.position)
        .add(LOOK_OFFSET)
        .addScaledVector(flatVel.copy(player.velocity).setY(0), 0.18);

      // Teletransporte / reaparición: saltar directo en vez de viajar por el mapa
      if (pos.current.distanceTo(desired.current) > 20) {
        pos.current.copy(desired.current);
        look.current.copy(desiredLook.current);
      }

      // La altura se suaviza más lento que XZ: los saltos no marean
      const kXZ = 1 - Math.exp(-6 * delta);
      const kY = 1 - Math.exp(-3 * delta);
      pos.current.x += (desired.current.x - pos.current.x) * kXZ;
      pos.current.z += (desired.current.z - pos.current.z) * kXZ;
      pos.current.y += (desired.current.y - pos.current.y) * kY;
      look.current.x += (desiredLook.current.x - look.current.x) * kXZ;
      look.current.z += (desiredLook.current.z - look.current.z) * kXZ;
      look.current.y += (desiredLook.current.y - look.current.y) * kY;
    }

    // Colisión de cámara: si una pared tapa al doctor, la cámara se acerca
    let finalPos = pos.current;
    if (started) {
      toCam.copy(pos.current).sub(look.current);
      const full = toCam.length();
      toCam.divideScalar(full);
      ray.origin = { x: look.current.x, y: look.current.y, z: look.current.z };
      ray.dir = { x: toCam.x, y: toCam.y, z: toCam.z };
      const hit = world.castRay(ray, full, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      const allowed = hit ? Math.max(1.2, hit.timeOfImpact - CAM_MARGIN) : full;
      // Acercarse rápido, alejarse suave
      const k = allowed < camDist.current ? 1 - Math.exp(-25 * delta) : 1 - Math.exp(-3 * delta);
      camDist.current += (allowed - camDist.current) * k;
      camDist.current = Math.min(camDist.current, full);
      finalPos = toCam.multiplyScalar(camDist.current).add(look.current);
    }

    camera.position.copy(finalPos);
    camera.lookAt(look.current);

    const targetFov = started ? 58 + player.speed01 * 5 : 50;
    fov.current += (targetFov - fov.current) * (1 - Math.exp(-3 * delta));
    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
