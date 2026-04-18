'use client';

import { RigidBody } from '@react-three/rapier';

/* ─── A single hospital bed ─── */
function Bed({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Frame */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.1, 2.2]} />
        <meshStandardMaterial color="#DDDDDD" />
      </mesh>
      {/* Mattress */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[1, 0.15, 2]} />
        <meshStandardMaterial color="#81D4FA" />
      </mesh>
      {/* Pillow */}
      <mesh castShadow position={[0, 0.55, -0.7]}>
        <boxGeometry args={[0.7, 0.12, 0.4]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Legs */}
      {([-0.5, 0.5] as const).map((x) =>
        ([-0.9, 0.9] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.12, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#AAAAAA" />
          </mesh>
        )),
      )}
      {/* Head rail */}
      <mesh position={[0, 0.65, -1]}>
        <boxGeometry args={[1.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#CCCCCC" />
      </mesh>
    </group>
  );
}

/* ─── Reception desk ─── */
function Reception({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk body */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[4, 1, 1.2]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
      {/* Desk top */}
      <mesh castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[4.2, 0.1, 1.4]} />
        <meshStandardMaterial color="#A1887F" />
      </mesh>
      {/* Computer screen */}
      <mesh castShadow position={[0.8, 1.5, -0.1]}>
        <boxGeometry args={[0.8, 0.6, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Screen glow */}
      <mesh position={[0.8, 1.5, -0.07]}>
        <boxGeometry args={[0.7, 0.5, 0.01]} />
        <meshStandardMaterial color="#B3E5FC" emissive="#B3E5FC" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/* ─── Red cross symbol on the facade ─── */
function RedCross({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Vertical bar */}
      <mesh>
        <boxGeometry args={[0.8, 2.4, 0.15]} />
        <meshStandardMaterial color="#E53935" />
      </mesh>
      {/* Horizontal bar */}
      <mesh>
        <boxGeometry args={[2.4, 0.8, 0.15]} />
        <meshStandardMaterial color="#E53935" />
      </mesh>
    </group>
  );
}

/* ─── Main Hospital component ─── */
export function Hospital() {
  const W = 24; // width
  const D = 18; // depth
  const H = 7; // wall height

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <group position={[0, 0, 0]}>
        {/* ── Floor ── */}
        <mesh receiveShadow position={[0, 0.01, 0]}>
          <boxGeometry args={[W, 0.15, D]} />
          <meshStandardMaterial color="#E8E8E8" />
        </mesh>

        {/* Floor tiles pattern */}
        {Array.from({ length: 8 }).map((_, ix) =>
          Array.from({ length: 6 }).map((_, iz) => (
            <mesh
              key={`tile-${ix}-${iz}`}
              receiveShadow
              position={[
                -W / 2 + 1.5 + ix * 3,
                0.1,
                -D / 2 + 1.5 + iz * 3,
              ]}
            >
              <boxGeometry args={[2.8, 0.02, 2.8]} />
              <meshStandardMaterial
                color={(ix + iz) % 2 === 0 ? '#F5F5F5' : '#E0F2F1'}
              />
            </mesh>
          )),
        )}

        {/* ── Back wall ── */}
        <mesh castShadow position={[0, H / 2, -D / 2]}>
          <boxGeometry args={[W, H, 0.4]} />
          <meshStandardMaterial color="#FAFAFA" />
        </mesh>

        {/* ── Left wall ── */}
        <mesh castShadow position={[-W / 2, H / 2, 0]}>
          <boxGeometry args={[0.4, H, D]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>

        {/* ── Right wall ── */}
        <mesh castShadow position={[W / 2, H / 2, 0]}>
          <boxGeometry args={[0.4, H, D]} />
          <meshStandardMaterial color="#F5F5F5" />
        </mesh>

        {/* ── Front wall — left section ── */}
        <mesh castShadow position={[-W / 4 - 1.5, H / 2, D / 2]}>
          <boxGeometry args={[W / 2 - 1, H, 0.4]} />
          <meshStandardMaterial color="#FAFAFA" />
        </mesh>

        {/* ── Front wall — right section ── */}
        <mesh castShadow position={[W / 4 + 1.5, H / 2, D / 2]}>
          <boxGeometry args={[W / 2 - 1, H, 0.4]} />
          <meshStandardMaterial color="#FAFAFA" />
        </mesh>

        {/* ── Front wall — top (above door) ── */}
        <mesh castShadow position={[0, H - 1, D / 2]}>
          <boxGeometry args={[4, 2, 0.4]} />
          <meshStandardMaterial color="#FAFAFA" />
        </mesh>

        {/* ── Door ── */}
        <mesh position={[0, 2, D / 2 + 0.1]}>
          <boxGeometry args={[3.5, 4, 0.1]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>

        {/* Door frame */}
        <mesh position={[0, 2, D / 2 + 0.15]}>
          <boxGeometry args={[3.8, 4.3, 0.05]} />
          <meshStandardMaterial color="#795548" />
        </mesh>

        {/* ── Roof ── */}
        <mesh castShadow position={[0, H + 0.15, 0]}>
          <boxGeometry args={[W + 1, 0.3, D + 1]} />
          <meshStandardMaterial color="#B0BEC5" />
        </mesh>

        {/* Roof edge accent */}
        <mesh position={[0, H + 0.35, D / 2 + 0.3]}>
          <boxGeometry args={[W + 1.2, 0.15, 0.5]} />
          <meshStandardMaterial color="#90A4AE" />
        </mesh>

        {/* ── Red Cross on facade ── */}
        <RedCross position={[0, H - 1.8, D / 2 + 0.35]} />

        {/* ── "HOSPITAL" sign board ── */}
        <mesh position={[0, H - 0.3, D / 2 + 0.3]}>
          <boxGeometry args={[8, 0.8, 0.15]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>

        {/* ── Interior: Beds ── */}
        <Bed position={[-8, 0.1, -4]} />
        <Bed position={[-8, 0.1, 0]} />
        <Bed position={[-8, 0.1, 4]} />
        <Bed position={[8, 0.1, -4]} />
        <Bed position={[8, 0.1, 0]} />
        <Bed position={[8, 0.1, 4]} />

        {/* ── Interior: Reception ── */}
        <Reception position={[0, 0.1, -5]} />

        {/* ── Windows (back wall) ── */}
        {[-6, 0, 6].map((x) => (
          <mesh key={`win-${x}`} position={[x, 4, -D / 2 + 0.3]}>
            <boxGeometry args={[2, 2, 0.1]} />
            <meshStandardMaterial
              color="#B3E5FC"
              emissive="#B3E5FC"
              emissiveIntensity={0.15}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}

        {/* Window frames */}
        {[-6, 0, 6].map((x) => (
          <group key={`winframe-${x}`}>
            <mesh position={[x, 4, -D / 2 + 0.35]}>
              <boxGeometry args={[2.2, 0.1, 0.05]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[x, 4, -D / 2 + 0.35]}>
              <boxGeometry args={[0.1, 2.2, 0.05]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          </group>
        ))}
      </group>
    </RigidBody>
  );
}
