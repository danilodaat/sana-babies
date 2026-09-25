'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { player, input } from '@/lib/runtime';
import { emit } from '@/lib/fx';
import { sfx } from '@/lib/audio';

const MOVE_SPEED = 4.6;
const ACCEL = 14; // qué tan rápido alcanza la velocidad (1/s)
const JUMP_SPEED = 8.5;
const COYOTE_TIME = 0.12; // margen para saltar justo después de dejar el borde
const WALK_CYCLE_SPEED = 11;
const LIMB_SWING = 0.7;
const SPAWN = new THREE.Vector3(0, 1.5, 1);

// Skin, clothing, and accessory colors
const SKIN_COLOR = '#f5c6a0';
const COAT_COLOR = '#f7f7fb';
const PANTS_COLOR = '#3b5998';
const HAIR_COLOR = '#5a3825';
const EYE_COLOR = '#1a1a1a';
const STETHOSCOPE_COLOR = '#6b7b8d';
const SHOE_COLOR = '#2a2a2a';
const CHEEK_COLOR = '#f7a1a1';

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

export default function Doctor() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null); // squash & stretch + inclinación
  const headRef = useRef<THREE.Group>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const targetRotation = useRef(0);
  const walkPhase = useRef(0);
  const lastStepSign = useRef(1);
  const squash = useRef({ value: 0, vel: 0 }); // resorte: >0 aplasta, <0 estira
  const airTime = useRef(0);
  const wasGrounded = useRef(true);
  const minVy = useRef(0);
  const blink = useRef({ next: 2, t: -1 });
  const vel = useRef(new THREE.Vector3());
  const jumpHeld = useRef(false);

  const started = useGameStore((s) => s.started);
  const frozen = useGameStore((s) => s.modal);
  const [, getKeys] = useKeyboardControls();
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }), [rapier]);

  // Memoize materials so they don't re-create each frame
  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN_COLOR }),
      coat: new THREE.MeshStandardMaterial({ color: COAT_COLOR }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR_COLOR }),
      eye: new THREE.MeshStandardMaterial({ color: EYE_COLOR }),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      cheek: new THREE.MeshStandardMaterial({ color: CHEEK_COLOR }),
      stethoscope: new THREE.MeshStandardMaterial({ color: STETHOSCOPE_COLOR, metalness: 0.6, roughness: 0.3 }),
      shoe: new THREE.MeshStandardMaterial({ color: SHOE_COLOR }),
      cross: new THREE.MeshStandardMaterial({ color: '#ef4b6c' }),
    }),
    []
  );

  // Proporciones chibi: cabeza grande, cuerpo chico
  const geometries = useMemo(
    () => ({
      head: new THREE.SphereGeometry(0.27, 20, 20),
      eye: new THREE.SphereGeometry(0.05, 10, 10),
      pupil: new THREE.SphereGeometry(0.028, 8, 8),
      cheek: new THREE.SphereGeometry(0.04, 8, 8),
      hairTop: new THREE.SphereGeometry(0.285, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.48),
      hairTuft: new THREE.ConeGeometry(0.08, 0.16, 8),
      body: new THREE.CapsuleGeometry(0.19, 0.24, 6, 12),
      arm: new THREE.CapsuleGeometry(0.06, 0.24, 4, 8),
      hand: new THREE.SphereGeometry(0.065, 10, 10),
      leg: new THREE.CapsuleGeometry(0.07, 0.2, 4, 8),
      shoe: new THREE.SphereGeometry(0.085, 10, 8),
      stethTube: new THREE.TorusGeometry(0.13, 0.014, 8, 20, Math.PI),
      stethPiece: new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12),
      crossBar: new THREE.BoxGeometry(0.1, 0.03, 0.01),
    }),
    []
  );

  useFrame((state, rawDelta) => {
    const rb = rigidBodyRef.current;
    if (!rb || !groupRef.current || !bodyRef.current) return;
    const delta = Math.min(rawDelta, 0.05);

    // ─── Input: joystick táctil + teclado ───
    let ix = input.touch.x;
    let iy = input.touch.y;
    const keys = getKeys() as Record<string, boolean>;
    if (keys.forward) iy -= 1;
    if (keys.backward) iy += 1;
    if (keys.left) ix -= 1;
    if (keys.right) ix += 1;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const canMove = started && !frozen;
    if (!canMove) {
      ix = 0;
      iy = 0;
    }

    if (keys.jump && !jumpHeld.current) input.jumpQueued = true;
    jumpHeld.current = !!keys.jump;

    // Rotar el input según el ángulo de cámara
    const cos = Math.cos(input.cameraAngle);
    const sin = Math.sin(input.cameraAngle);
    const worldX = ix * cos + iy * sin;
    const worldZ = -ix * sin + iy * cos;
    const magnitude = Math.hypot(worldX, worldZ);
    const moving = magnitude > 0.05;

    // ─── Suelo (raycast hacia abajo desde los pies) ───
    const pos = rb.translation();
    ray.origin = { x: pos.x, y: pos.y + 0.15, z: pos.z };
    const hit = world.castRay(ray, 0.3, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, rb);
    const lin = rb.linvel();
    const grounded = hit !== null && lin.y < 1.5;
    if (grounded) airTime.current = 0;
    else airTime.current += delta;

    // ─── Velocidad horizontal con aceleración suave ───
    vel.current.x = damp(vel.current.x, worldX * MOVE_SPEED, ACCEL, delta);
    vel.current.z = damp(vel.current.z, worldZ * MOVE_SPEED, ACCEL, delta);
    let vy = lin.y;

    // ─── Salto ───
    if (input.jumpQueued) {
      if (canMove && airTime.current < COYOTE_TIME) {
        vy = JUMP_SPEED;
        airTime.current = COYOTE_TIME; // evita doble salto
        squash.current.vel = -9; // estirón al despegar
        sfx.jump();
        emit('dust', [pos.x, pos.y, pos.z], 6);
      }
      input.jumpQueued = false;
    }

    rb.setLinvel({ x: vel.current.x, y: vy, z: vel.current.z }, true);

    // ─── Aterrizaje ───
    if (!grounded) minVy.current = Math.min(minVy.current, lin.y);
    if (grounded && !wasGrounded.current) {
      const impact = Math.min(Math.abs(minVy.current) / 12, 1);
      if (impact > 0.25) {
        squash.current.vel += 10 * impact;
        sfx.land();
        emit('dust', [pos.x, pos.y, pos.z], Math.round(6 + impact * 8));
      }
      minVy.current = 0;
    }
    wasGrounded.current = grounded;

    if (input.teleport) {
      rb.setTranslation(input.teleport, true);
      input.teleport = null;
    }

    // Red de seguridad si se cae del mundo
    if (pos.y < -15) {
      rb.setTranslation(SPAWN, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // ─── Estado compartido (sin React) ───
    player.position.set(pos.x, pos.y, pos.z);
    player.velocity.set(vel.current.x, vy, vel.current.z);
    player.grounded = grounded;
    const speed01 = Math.min(Math.hypot(vel.current.x, vel.current.z) / MOVE_SPEED, 1);
    player.speed01 = speed01;

    // ─── Rotación hacia donde camina ───
    if (moving) targetRotation.current = Math.atan2(worldX, worldZ);
    let rotDiff = targetRotation.current - groupRef.current.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    groupRef.current.rotation.y += rotDiff * (1 - Math.exp(-12 * delta));

    // ─── Resorte de squash & stretch ───
    const sq = squash.current;
    const airStretch = grounded ? 0 : THREE.MathUtils.clamp(-vy * 0.02, -0.15, 0.12);
    const force = -180 * (sq.value - airStretch) - 14 * sq.vel;
    sq.vel += force * delta;
    sq.value += sq.vel * delta;
    const breathe = speed01 < 0.1 ? Math.sin(state.clock.elapsedTime * 2.2) * 0.015 : 0;
    const sy = 1 - sq.value + breathe;
    const sxz = 1 + sq.value * 0.5 - breathe * 0.5;
    bodyRef.current.scale.set(sxz, sy, sxz);

    // Inclinación hacia adelante al correr
    bodyRef.current.rotation.x = damp(bodyRef.current.rotation.x, speed01 * 0.18, 10, delta);

    // ─── Ciclo de caminata ───
    if (grounded && speed01 > 0.1) {
      walkPhase.current += delta * WALK_CYCLE_SPEED * (0.5 + speed01 * 0.6);
      const s = Math.sin(walkPhase.current);
      const swing = s * LIMB_SWING * speed01;
      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
      // Rebote al pisar
      bodyRef.current.position.y = Math.abs(Math.cos(walkPhase.current)) * 0.07 * speed01;

      // Pasos: sonido + polvito en cada pisada
      const sign = Math.sign(s);
      if (sign !== lastStepSign.current) {
        lastStepSign.current = sign;
        sfx.step();
        if (speed01 > 0.6 && Math.random() < 0.6) emit('dust', [pos.x, pos.y, pos.z], 2);
      }
    } else {
      const k = 1 - Math.exp(-10 * delta);
      const armAir = grounded ? 0 : -2.4; // brazos arriba en el aire
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x += (0 - leftArmRef.current.rotation.x) * k;
        leftArmRef.current.rotation.z += ((grounded ? 0 : -armAir * 0.25) - leftArmRef.current.rotation.z) * k;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x += (0 - rightArmRef.current.rotation.x) * k;
        rightArmRef.current.rotation.z += ((grounded ? 0 : armAir * 0.25) - rightArmRef.current.rotation.z) * k;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x += ((grounded ? 0 : 0.4) - leftLegRef.current.rotation.x) * k;
      if (rightLegRef.current) rightLegRef.current.rotation.x += ((grounded ? 0 : -0.25) - rightLegRef.current.rotation.x) * k;
      bodyRef.current.position.y *= 1 - k;
    }

    // ─── Parpadeo ───
    const b = blink.current;
    const now = state.clock.elapsedTime;
    if (b.t < 0 && now > b.next) b.t = 0;
    if (b.t >= 0) {
      b.t += delta;
      const closed = b.t < 0.12 ? 1 - Math.abs(b.t - 0.06) / 0.06 : 0;
      if (eyesRef.current) eyesRef.current.scale.y = 1 - closed * 0.9;
      if (b.t >= 0.12) {
        b.t = -1;
        b.next = now + 2 + Math.random() * 3;
      }
    }

    // Cabeza: leve balanceo al correr
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(walkPhase.current) * 0.06 * speed01;
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={SPAWN.toArray()}
      enabledRotations={[false, false, false]}
      linearDamping={0}
      friction={0}
      mass={1}
      colliders={false}
      ccd
    >
      <CapsuleCollider args={[0.4, 0.22]} position={[0, 0.62, 0]} />

      <group ref={groupRef} userData={{ outline: 0.014 }}>
        <group ref={bodyRef}>
          {/* === HEAD === */}
          <group ref={headRef} position={[0, 1.28, 0]}>
            <mesh geometry={geometries.head} material={materials.skin} castShadow />
            <mesh geometry={geometries.hairTop} material={materials.hair} position={[0, 0.03, -0.02]} rotation={[-0.2, 0, 0]} />
            <mesh geometry={geometries.hairTuft} material={materials.hair} position={[0.05, 0.3, 0.02]} rotation={[0.3, 0, -0.4]} />

            <group ref={eyesRef} position={[0, 0.02, 0]}>
              {([-0.1, 0.1] as const).map((x) => (
                <group key={x} position={[x, 0, 0.22]}>
                  <mesh geometry={geometries.eye} material={materials.eyeWhite} />
                  <mesh geometry={geometries.pupil} material={materials.eye} position={[0, 0, 0.03]} />
                </group>
              ))}
            </group>
            {([-0.17, 0.17] as const).map((x) => (
              <mesh key={x} geometry={geometries.cheek} material={materials.cheek} position={[x, -0.07, 0.2]} scale={[1, 0.6, 0.5]} userData={{ noOutline: true }} />
            ))}
          </group>

          {/* === STETHOSCOPE === */}
          <group position={[0, 1.02, 0.06]}>
            <mesh geometry={geometries.stethTube} material={materials.stethoscope} rotation={[0.2, 0, Math.PI]} />
            <mesh geometry={geometries.stethPiece} material={materials.stethoscope} position={[0.05, -0.14, 0.13]} rotation={[Math.PI / 2, 0, 0]} />
          </group>

          {/* === BODY (bata blanca) === */}
          <mesh geometry={geometries.body} material={materials.coat} position={[0, 0.8, 0]} castShadow />
          {/* Cruz roja en el bolsillo */}
          <group position={[-0.1, 0.9, 0.19]}>
            <mesh geometry={geometries.crossBar} material={materials.cross} />
            <mesh geometry={geometries.crossBar} material={materials.cross} rotation={[0, 0, Math.PI / 2]} />
          </group>

          {/* === ARMS === */}
          <group ref={leftArmRef} position={[-0.26, 1.0, 0]}>
            <mesh geometry={geometries.arm} material={materials.coat} position={[0, -0.16, 0]} castShadow />
            <mesh geometry={geometries.hand} material={materials.skin} position={[0, -0.34, 0]} />
          </group>
          <group ref={rightArmRef} position={[0.26, 1.0, 0]}>
            <mesh geometry={geometries.arm} material={materials.coat} position={[0, -0.16, 0]} castShadow />
            <mesh geometry={geometries.hand} material={materials.skin} position={[0, -0.34, 0]} />
          </group>

          {/* === LEGS === */}
          <group ref={leftLegRef} position={[-0.1, 0.5, 0]}>
            <mesh geometry={geometries.leg} material={materials.pants} position={[0, -0.17, 0]} castShadow />
            <mesh geometry={geometries.shoe} material={materials.shoe} position={[0, -0.36, 0.03]} scale={[1, 0.6, 1.3]} />
          </group>
          <group ref={rightLegRef} position={[0.1, 0.5, 0]}>
            <mesh geometry={geometries.leg} material={materials.pants} position={[0, -0.17, 0]} castShadow />
            <mesh geometry={geometries.shoe} material={materials.shoe} position={[0, -0.36, 0.03]} scale={[1, 0.6, 1.3]} />
          </group>
        </group>
      </group>
    </RigidBody>
  );
}
