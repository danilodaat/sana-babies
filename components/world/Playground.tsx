'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

/*
 * Juegos del Parque Central: columpios que se mecen solos, tobogán,
 * arenero con balde y carrito de helados con sombrilla.
 */

function Swing({ phase }: { phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 1.8 + phase) * 0.45;
  });
  return (
    <group ref={ref} position={[0, 2.6, 0]}>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, -0.95, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 4]} />
          <meshStandardMaterial color="#9e9e9e" />
        </mesh>
      ))}
      <mesh position={[0, -1.9, 0]} castShadow>
        <boxGeometry args={[0.8, 0.08, 0.35]} />
        <meshStandardMaterial color="#ff7043" />
      </mesh>
    </group>
  );
}

function SwingSet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ outline: 0.025 }}>
      {[-1.8, 1.8].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.6, 0.6].map((z) => (
            <mesh key={z} castShadow position={[0, 1.35, z * 0.9]} rotation={[z > 0 ? -0.35 : 0.35, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.9, 8]} />
              <meshStandardMaterial color="#42a5f5" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh castShadow position={[0, 2.65, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 3.9, 8]} />
        <meshStandardMaterial color="#1e88e5" />
      </mesh>
      <group position={[-0.85, 0, 0]}>
        <Swing phase={0} />
      </group>
      <group position={[0.85, 0, 0]}>
        <Swing phase={1.7} />
      </group>
    </group>
  );
}

function Slide({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={{ outline: 0.025 }}>
      {/* Torre */}
      {[-0.5, 0.5].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, 1, z]}>
            <cylinderGeometry args={[0.07, 0.07, 2, 8]} />
            <meshStandardMaterial color="#ffca28" />
          </mesh>
        )),
      )}
      <mesh castShadow position={[0, 1.9, 0]}>
        <boxGeometry args={[1.2, 0.12, 1.2]} />
        <meshStandardMaterial color="#ab47bc" />
      </mesh>
      <mesh castShadow position={[0, 2.5, 0]}>
        <coneGeometry args={[0.95, 0.8, 4]} />
        <meshStandardMaterial color="#ef5350" />
      </mesh>
      {/* Escalera */}
      {[0.3, 0.75, 1.2, 1.65].map((y) => (
        <mesh key={y} position={[0, y, -0.75]}>
          <boxGeometry args={[0.8, 0.06, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* Rampa */}
      <mesh castShadow position={[0, 1.0, 1.75]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[0.8, 0.08, 2.9]} />
        <meshStandardMaterial color="#26c6da" />
      </mesh>
    </group>
  );
}

function Sandbox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[
        [0, 1.25, 2.6, 0.1],
        [0, -1.25, 2.6, 0.1],
        [1.25, 0, 0.1, 2.6],
        [-1.25, 0, 0.1, 2.6],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} castShadow position={[x, 0.18, z]}>
          <boxGeometry args={[w, 0.36, d]} />
          <meshStandardMaterial color="#8d6e63" />
        </mesh>
      ))}
      <mesh receiveShadow position={[0, 0.12, 0]}>
        <boxGeometry args={[2.4, 0.2, 2.4]} />
        <meshStandardMaterial color="#f3dca0" />
      </mesh>
      {/* Balde y castillo */}
      <mesh position={[0.5, 0.35, 0.3]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 10]} />
        <meshStandardMaterial color="#ef5350" />
      </mesh>
      <mesh position={[-0.4, 0.4, -0.3]} castShadow>
        <coneGeometry args={[0.35, 0.5, 6]} />
        <meshStandardMaterial color="#e8c77e" />
      </mesh>
    </group>
  );
}

function IceCreamCart({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.4, 0]} userData={{ outline: 0.025 }}>
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[1.6, 0.9, 0.9]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.8, 0.46]}>
        <boxGeometry args={[1.6, 0.25, 0.02]} />
        <meshStandardMaterial color="#f48fb1" />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.25, 0.48]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 12]} />
          <meshStandardMaterial color="#455a64" />
        </mesh>
      ))}
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
        <meshStandardMaterial color="#9e9e9e" />
      </mesh>
      <mesh castShadow position={[0, 2.7, 0]}>
        <coneGeometry args={[1.3, 0.5, 8]} />
        <meshStandardMaterial color="#ff8a65" />
      </mesh>
      {/* Helado gigante de adorno */}
      <mesh position={[0.5, 1.45, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.4, 8]} />
        <meshStandardMaterial color="#d7a86e" />
      </mesh>
      <mesh position={[0.5, 1.7, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#f8bbd0" />
      </mesh>
    </group>
  );
}

export default function Playground() {
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <SwingSet position={[-50, 0, 37.5]} />
      <Slide position={[-30, 0, 32]} rotation={Math.PI} />
      <Sandbox position={[-47, 0, 44]} />
      <IceCreamCart position={[-37.5, 0, 28.3]} />
    </RigidBody>
  );
}
