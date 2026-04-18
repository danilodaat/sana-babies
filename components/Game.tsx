'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Hospital } from './world/Hospital';
import { City } from './world/City';
import { Ground } from './world/Ground';
import { Sky } from './world/Sky';
import Doctor from './player/Doctor';
import Baby from './npcs/Baby';
import Parent from './npcs/Parent';
import { useGameStore } from '@/store/gameStore';

/** Key‑map for KeyboardControls */
const KEY_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];

/* ─── Camera rig that follows the player ─── */
function CameraRig() {
  const { camera } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);
  const smoothPos = useRef(new THREE.Vector3(0, 12, 18));

  useFrame((_, delta) => {
    const target = new THREE.Vector3(
      playerPosition[0],
      playerPosition[1] + 12,
      playerPosition[2] + 18,
    );
    smoothPos.current.lerp(target, 1 - Math.exp(-3 * delta));
    camera.position.copy(smoothPos.current);
    camera.lookAt(
      playerPosition[0],
      playerPosition[1] + 1.5,
      playerPosition[2],
    );
  });

  return null;
}

/* ─── Loading fallback ─── */
function LoadingScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#87CEEB',
        color: '#fff',
        fontSize: 32,
        fontWeight: 700,
        fontFamily: 'sans-serif',
        zIndex: 100,
      }}
    >
      Cargando mundo...
    </div>
  );
}

/* ─── UI overlay ─── */
function UIOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 16,
        fontFamily: 'sans-serif',
        fontSize: 16,
        fontWeight: 700,
        color: '#5D4E7A',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 10,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Sana Babies
    </div>
  );
}

/* ─── Main Game component ─── */
export default function Game() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <UIOverlay />
      <Suspense fallback={<LoadingScreen />}>
        <KeyboardControls map={KEY_MAP}>
          <Canvas
            shadows
            style={{ width: '100%', height: '100%' }}
            camera={{ fov: 55, near: 0.1, far: 500, position: [0, 12, 18] }}
          >
            {/* Lighting */}
            <ambientLight intensity={0.6} color="#FFF8E7" />
            <directionalLight
              castShadow
              position={[40, 60, 30]}
              intensity={1.2}
              color="#FFFBE6"
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-80}
              shadow-camera-right={80}
              shadow-camera-top={80}
              shadow-camera-bottom={-80}
              shadow-camera-far={200}
            />
            <hemisphereLight
              args={['#87CEEB', '#4CAF50', 0.3]}
            />
            <fog attach="fog" args={['#C8E6FF', 80, 200]} />

            {/* Physics world */}
            <Physics gravity={[0, -20, 0]}>
              <Ground />
              <Hospital />
              <City />
              <Doctor />
              {/* NPCs */}
              <Baby id="baby-1" position={[5, 0.5, 5]} name="Luciana" />
              <Parent id="parent-1" position={[-5, 0, 8]} variant="mother" hasBaby name="Rosa" dialogue="Doctor, mi beb&eacute; tiene fiebre..." />
            </Physics>

            <Sky />
            <CameraRig />
          </Canvas>
        </KeyboardControls>
      </Suspense>
    </div>
  );
}
