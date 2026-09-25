'use client';

import { Suspense, useEffect } from 'react';
import * as runtime from '@/lib/runtime';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Hospital } from './world/Hospital';
import { City } from './world/City';
import { Ground } from './world/Ground';
import { Sky } from './world/Sky';
import DayNight from './world/DayNight';
import Foliage from './world/Foliage';
import Doctor from './player/Doctor';
import CameraFollow from './player/CameraFollow';
import TouchControls from './player/TouchControls';
import GameFlow from './GameFlow';
import Baby from './npcs/Baby';
import Parent from './npcs/Parent';
import Toonify from './fx/Toonify';
import Particles from './fx/Particles';
import PostFX from './fx/PostFX';
import LevelUp from './ui/LevelUp';
import { useGameStore } from '@/store/gameStore';

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
  const quality = useGameStore((s) => s.quality);
  const started = useGameStore((s) => s.started);
  const setQuality = useGameStore((s) => s.setQuality);

  // ?debug expone el runtime en la consola (adelantar la hora, teletransportar, etc.)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('debug')) {
      (window as unknown as Record<string, unknown>).__sb = { ...runtime, store: useGameStore };
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      {started && <TouchControls />}
      {started && <GameFlow />}
      <LevelUp />

      <Suspense fallback={<LoadingScreen />}>
        <KeyboardControls map={KEY_MAP}>
          <Canvas
            shadows={{ type: THREE.PCFShadowMap }}
            dpr={quality === 'alto' ? [1, 2] : [1, 1.25]}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            camera={{ fov: 50, near: 0.1, far: 500, position: [0, 13, 30] }}
            gl={{ antialias: quality !== 'alto', powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
          >
            {/* Si el celular no aguanta, baja la calidad sola una vez */}
            <PerformanceMonitor onDecline={() => started && quality === 'alto' && setQuality('bajo')} />

            <DayNight />

            <Physics gravity={[0, -24, 0]}>
              <Ground />
              <Hospital />
              <City />
              <Doctor />
              {/* NPCs */}
              <Baby id="baby-1" position={[5, 0.5, 5]} name="Luciana" />
              <Baby id="baby-2" position={[-3, 0.5, -4]} name="Mateo" bodyColor="#B3E5FC" />
              <Parent id="parent-1" position={[-5, 0, 8]} variant="mother" hasBaby name="Rosa" dialogue="Doctor, mi bebé tiene fiebre..." />
              <Parent id="parent-2" position={[8, 0, -3]} variant="father" name="Carlos" dialogue="¿Puede revisar a mi hijo?" />
              <CameraFollow />
            </Physics>

            <Foliage />
            <Sky />
            <Particles />
            <Toonify />
            <PostFX />
          </Canvas>
        </KeyboardControls>
      </Suspense>
    </div>
  );
}
