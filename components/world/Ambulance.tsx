'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { CASE_BY_ID } from '@/lib/cases';
import { player } from '@/lib/runtime';
import { setSiren } from '@/lib/audio';

/*
 * Ambulancia: estacionada frente al hospital. Cuando entra una emergencia
 * sale por la avenida con sirena y luces hasta la escena, espera ahí hasta
 * que el caso termina y vuelve. Es solo visual (sin colisión) para que nunca
 * atrape al jugador.
 */

const HOME: [number, number] = [6, 16];
const SPEED = 11;

/** Estado compartido (lo lee el minimapa) */
export const ambulance = {
  position: new THREE.Vector3(HOME[0], 0, HOME[1]),
  moving: false,
  atScene: false,
};

type Mode = 'home' | 'going' | 'scene' | 'returning';

export default function Ambulance() {
  const group = useRef<THREE.Group>(null);
  const lightA = useRef<THREE.Mesh>(null);
  const lightB = useRef<THREE.Mesh>(null);
  const mode = useRef<Mode>('home');
  const path = useRef<THREE.Vector3[]>([]);
  const seg = useRef(0);
  const heading = useRef(-Math.PI / 2); // mirando al oeste
  const wheelSpin = useRef(0);
  const wheels = useRef<THREE.Group>(null);

  const mats = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: '#fbfbff' }),
      stripe: new THREE.MeshStandardMaterial({ color: '#ef3b4f' }),
      glass: new THREE.MeshStandardMaterial({ color: '#8fd3ff', emissive: '#8fd3ff', emissiveIntensity: 0.2 }),
      tire: new THREE.MeshStandardMaterial({ color: '#2b2b33' }),
      hub: new THREE.MeshStandardMaterial({ color: '#c9ccd6' }),
      red: new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff2a2a', emissiveIntensity: 0.2, toneMapped: false }),
      blue: new THREE.MeshStandardMaterial({ color: '#2f6bff', emissive: '#2f6bff', emissiveIntensity: 0.2, toneMapped: false }),
    }),
    [],
  );

  const setPath = (pts: [number, number][]) => {
    path.current = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
    seg.current = 0;
  };

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, 0.05);
    const s = useGameStore.getState();
    const c = s.emergency ? CASE_BY_ID[s.emergency.caseId] : null;

    // ─── Transiciones ───
    if (mode.current === 'home' && c?.ambulanceRoute) {
      setPath(c.ambulanceRoute);
      mode.current = 'going';
    }
    if ((mode.current === 'going' || mode.current === 'scene') && !s.emergency) {
      // Volver por el mismo camino, desde donde esté
      const back = [...path.current].slice(0, seg.current + 1).reverse();
      path.current = [ambulance.position.clone(), ...back];
      seg.current = 0;
      mode.current = 'returning';
    }

    // ─── Movimiento por la ruta ───
    const moving = mode.current === 'going' || mode.current === 'returning';
    if (moving) {
      const target = path.current[seg.current + 1];
      if (!target) {
        mode.current = mode.current === 'going' ? 'scene' : 'home';
        if (mode.current === 'home') {
          heading.current = -Math.PI / 2;
          ambulance.position.set(HOME[0], 0, HOME[1]);
        }
      } else {
        const to = target.clone().sub(ambulance.position);
        const dist = to.length();
        const step = SPEED * delta;
        if (dist <= step) {
          ambulance.position.copy(target);
          seg.current++;
        } else {
          ambulance.position.addScaledVector(to.normalize(), step);
          const want = Math.atan2(to.x, to.z);
          let diff = want - heading.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          heading.current += diff * (1 - Math.exp(-8 * delta));
        }
        wheelSpin.current += step * 2.4;
      }
    }
    ambulance.moving = moving;
    ambulance.atScene = mode.current === 'scene';

    g.position.copy(ambulance.position);
    g.rotation.y = heading.current;
    // Suspensión: leve rebote al andar
    g.position.y = moving ? Math.abs(Math.sin(state.clock.elapsedTime * 14)) * 0.03 : 0;
    if (wheels.current) wheels.current.children.forEach((w) => (w.rotation.x = wheelSpin.current));

    // ─── Sirena: luces y sonido mientras el caso no se atiende ───
    const sirenOn = !!s.emergency && s.emergency.onTime === null && mode.current !== 'home';
    const blink = Math.floor(state.clock.elapsedTime * 6) % 2 === 0;
    const [ma, mb] = [mats.red, mats.blue];
    ma.emissiveIntensity = sirenOn && blink ? 3.5 : 0.2;
    mb.emissiveIntensity = sirenOn && !blink ? 3.5 : 0.2;
    const d = ambulance.position.distanceTo(player.position);
    setSiren(sirenOn && s.started ? THREE.MathUtils.clamp(1 - d / 70, 0, 1) : 0);
  });

  return (
    <group ref={group} position={[HOME[0], 0, HOME[1]]} userData={{ outline: 0.03, batchLocal: true }}>
      {/* Carrocería (el frente mira hacia +z local) */}
      <mesh material={mats.body} position={[0, 1.15, -0.4]} castShadow>
        <boxGeometry args={[2.1, 1.7, 3.4]} />
      </mesh>
      <mesh material={mats.body} position={[0, 0.85, 1.75]} castShadow>
        <boxGeometry args={[2.0, 1.1, 1.3]} />
      </mesh>
      {/* Parabrisas y ventanas */}
      <mesh material={mats.glass} position={[0, 1.15, 2.41]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.7, 0.55, 0.05]} />
      </mesh>
      {/* Franja roja y cruces */}
      <mesh material={mats.stripe} position={[0, 0.75, -0.4]}>
        <boxGeometry args={[2.14, 0.22, 3.44]} />
      </mesh>
      {([-1.07, 1.07] as const).map((x) => (
        <group key={x} position={[x * 1.01, 1.45, -0.6]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <mesh material={mats.stripe}>
            <boxGeometry args={[0.7, 0.22, 0.02]} />
          </mesh>
          <mesh material={mats.stripe}>
            <boxGeometry args={[0.22, 0.7, 0.02]} />
          </mesh>
        </group>
      ))}
      {/* Barra de luces */}
      <mesh ref={lightA} material={mats.red} position={[-0.45, 2.1, 0.9]} userData={{ noToon: true }}>
        <boxGeometry args={[0.7, 0.22, 0.4]} />
      </mesh>
      <mesh ref={lightB} material={mats.blue} position={[0.45, 2.1, 0.9]} userData={{ noToon: true }}>
        <boxGeometry args={[0.7, 0.22, 0.4]} />
      </mesh>
      {/* Ruedas */}
      <group ref={wheels} userData={{ noBatch: true }}>
        {[
          [-1, 0.38, 1.5],
          [1, 0.38, 1.5],
          [-1, 0.38, -1.4],
          [1, 0.38, -1.4],
        ].map((p, i) => (
          <group key={i} position={p as [number, number, number]}>
            <mesh material={mats.tire} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.3, 14]} />
            </mesh>
            <mesh material={mats.hub} rotation={[0, 0, Math.PI / 2]} position={[p[0] > 0 ? 0.16 : -0.16, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.02, 10]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
