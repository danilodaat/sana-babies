'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import { Hospital } from './world/Hospital';
import { City } from './world/City';
import { Ground } from './world/Ground';
import { Sky } from './world/Sky';
import Doctor from './player/Doctor';
import CameraFollow from './player/CameraFollow';
import TouchControls from './player/TouchControls';
import GameFlow from './GameFlow';
import Baby from './npcs/Baby';
import Parent from './npcs/Parent';

/** Key‑map for KeyboardControls */
const KEY_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];

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

/* ─── Main Game component ─── */
export default function Game() {
  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      {/* Touch controls overlay (joystick + action button + HUD) */}
      <TouchControls />

      {/* Game flow overlay (missions, dialogs, mini-games) */}
      <GameFlow />

      <Suspense fallback={<LoadingScreen />}>
        <KeyboardControls map={KEY_MAP}>
          <Canvas
            shadows
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            camera={{ fov: 60, near: 0.1, far: 500, position: [0, 6, 8] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            events={(store) => ({
              ...store,
              priority: 0,
              enabled: true,
              connected: undefined,
            })}
          >
            {/* Lighting */}
            <ambientLight intensity={0.7} color="#FFF8E7" />
            <directionalLight
              castShadow
              position={[40, 60, 30]}
              intensity={1.2}
              color="#FFFBE6"
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-left={-40}
              shadow-camera-right={40}
              shadow-camera-top={40}
              shadow-camera-bottom={-40}
              shadow-camera-far={150}
            />
            <hemisphereLight args={['#87CEEB', '#4CAF50', 0.3]} />
            <fog attach="fog" args={['#C8E6FF', 60, 150]} />

            {/* Physics world */}
            <Physics gravity={[0, -20, 0]}>
              <Ground />
              <Hospital />
              <City />
              <Doctor />
              {/* NPCs */}
              <Baby id="baby-1" position={[5, 0.5, 5]} name="Luciana" />
              <Baby id="baby-2" position={[-3, 0.5, -4]} name="Mateo" bodyColor="#B3E5FC" />
              <Parent id="parent-1" position={[-5, 0, 8]} variant="mother" hasBaby name="Rosa" dialogue="Doctor, mi bebé tiene fiebre..." />
              <Parent id="parent-2" position={[8, 0, -3]} variant="father" name="Carlos" dialogue="¿Puede revisar a mi hijo?" />
            </Physics>

            <Sky />
            <CameraFollow />
          </Canvas>
        </KeyboardControls>
      </Suspense>
    </div>
  );
}
