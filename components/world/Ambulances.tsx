'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { CASE_BY_ID } from '@/lib/cases';
import { player, input, npcPositions } from '@/lib/runtime';
import { setSiren, sfx } from '@/lib/audio';
import { BAY_SLOTS, NODE_BY_ID, PATROL, nearestNode, routeTo } from '@/lib/roads';
import { getObjective, nearestNpc } from '@/lib/objective';
import { insideHospital } from '@/lib/hospital';
import { npcName } from '@/lib/npcs';
import { toast } from '@/lib/toast';

/*
 * Flota de 3 ambulancias con base junto a Emergencias.
 *   estacionada → patrulla (vuelta al centro) → estacionada ...
 *   emergencia: sale la más cercana con sirena, espera en la escena y al
 *   terminar el caso vuelve trayendo al paciente a Emergencias
 *   viaje: el doctor se sube (botón 🚑) y la ambulancia lo lleva a su
 *   paciente o emergencia; "Bajar" lo deja al costado
 * Solo visuales (sin colisión): nunca encierran ni empujan al jugador.
 */

type Mode = 'parked' | 'patrol' | 'dispatch' | 'scene' | 'return' | 'ride' | 'wait';

export interface Unit {
  id: number;
  pos: THREE.Vector3;
  heading: number;
  path: THREE.Vector3[];
  seg: number;
  mode: Mode;
  slot: number;
  caseId: string | null;
  patientId: string | null;
  /** destino del viaje con el doctor */
  dest: { label: string; target: THREE.Vector3 | null; tour: boolean } | null;
  waitUntil: number;
  wheel: number;
}

const SPEED: Record<Mode, number> = { parked: 0, patrol: 7, dispatch: 13, scene: 0, return: 10, ride: 12, wait: 0 };
const BOARD_DIST = 3.4;

const slotPos = (i: number) => new THREE.Vector3(BAY_SLOTS[i][0], 0, BAY_SLOTS[i][1]);

export const fleet: Unit[] = [0, 1, 2].map((i) => ({
  id: i,
  pos: slotPos(i),
  heading: Math.PI, // mirando al sur, estacionadas en fila
  path: [],
  seg: 0,
  mode: 'parked' as Mode,
  slot: i,
  caseId: null,
  patientId: null,
  dest: null,
  waitUntil: 0,
  wheel: 0,
}));

export const ambInteractionId = (i: number) => `amb:${i}`;
export const isAmbInteraction = (id: string | null) => !!id && id.startsWith('amb:');
export const ambIdFrom = (id: string) => Number(id.slice(4));

function setRoute(u: Unit, pts: THREE.Vector3[]) {
  u.path = [u.pos.clone(), ...pts];
  u.seg = 0;
}

function goBase(u: Unit) {
  u.mode = 'return';
  setRoute(u, [...routeTo(u.pos.x, u.pos.z, 'base'), slotPos(u.slot)]);
}

/** Subir al doctor a la ambulancia `i` y decidir a dónde lo lleva */
export function boardAmbulance(i: number) {
  const u = fleet[i];
  const s = useGameStore.getState();
  if (s.riding !== null) return;
  const obj = getObjective(s);
  const near = obj ? nearestNpc(obj.ids) : null;
  const target = near ? npcPositions.get(near.id) ?? null : null;

  if (target && !insideHospital(target.x, target.z)) {
    // Al paciente / emergencia: la esquina con nombre más cercana
    const c = s.activeCase ? CASE_BY_ID[s.activeCase] : null;
    const node = nearestNode(target.x, target.z);
    const last = c && c.patientId === near!.id ? c.ambulanceRoute?.at(-1) : undefined;
    const final = last ? new THREE.Vector3(last[0], 0, last[1]) : null;
    u.dest = { label: `${npcName(near!.id)} · ${c?.zone ?? nearestNode(target.x, target.z, true).label ?? 'Ciudad Sana'}`, target, tour: false };
    setRoute(u, [...routeTo(u.pos.x, u.pos.z, node.id), ...(final ? [final] : [])]);
  } else if (target) {
    u.dest = { label: `${npcName(near!.id)} · Hospital Sana`, target, tour: false };
    setRoute(u, [...routeTo(u.pos.x, u.pos.z, 'base'), slotPos(u.slot)]);
  } else {
    u.dest = { label: 'Paseo por Ciudad Sana', target: null, tour: true };
    setRoute(u, PATROL.map((id) => new THREE.Vector3(NODE_BY_ID[id].x, 0, NODE_BY_ID[id].z)));
  }
  // Si estaba atendiendo una emergencia, otra unidad toma su lugar en el próximo frame
  u.caseId = null;
  u.patientId = null;
  u.mode = 'ride';
  sfx.whoosh();
  useGameStore.getState().setRiding(i);
}

/** Bajar al doctor al costado de la ambulancia (del lado del destino si hay uno) */
export function leaveAmbulance(reason: 'arrived' | 'manual') {
  const s = useGameStore.getState();
  if (s.riding === null) return;
  const u = fleet[s.riding];
  const right = new THREE.Vector3(Math.cos(u.heading), 0, -Math.sin(u.heading));
  let side = 1;
  if (u.dest?.target) {
    const toT = u.dest.target.clone().sub(u.pos);
    side = toT.dot(right) >= 0 ? 1 : -1;
  }
  const exit = u.pos.clone().addScaledVector(right, 2.6 * side).setY(0.6);
  input.teleport = exit;
  if (reason === 'arrived') toast(u.dest?.tour ? '¡Qué lindo paseo!' : '¡Llegamos! Bájate y atiende a tu paciente', '🚑');
  useGameStore.getState().setRiding(null);
  u.mode = 'wait';
  u.waitUntil = performance.now() / 1000 + 10;
  u.dest = null;
}

/* ─── Modelo ─── */

function AmbulanceModel({ unit }: { unit: Unit }) {
  const group = useRef<THREE.Group>(null);
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

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const moving = SPEED[unit.mode] > 0 && unit.seg < unit.path.length - 1;
    g.position.copy(unit.pos);
    g.position.y = moving ? Math.abs(Math.sin(state.clock.elapsedTime * 14 + unit.id)) * 0.03 : 0;
    g.rotation.y = unit.heading;
    if (wheels.current) wheels.current.children.forEach((w) => (w.rotation.x = unit.wheel));
    const s = useGameStore.getState();
    const emergencyRide = unit.mode === 'ride' && !!s.emergency;
    const siren = unit.mode === 'dispatch' || emergencyRide || (unit.mode === 'scene' && s.emergency?.onTime === null);
    const blink = Math.floor(state.clock.elapsedTime * 6 + unit.id) % 2 === 0;
    mats.red.emissiveIntensity = siren && blink ? 3.5 : 0.2;
    mats.blue.emissiveIntensity = siren && !blink ? 3.5 : 0.2;
  });

  return (
    <group ref={group} userData={{ outline: 0.03, batchLocal: true }}>
      <mesh material={mats.body} position={[0, 1.15, -0.4]} castShadow>
        <boxGeometry args={[2.1, 1.7, 3.4]} />
      </mesh>
      <mesh material={mats.body} position={[0, 0.85, 1.75]} castShadow>
        <boxGeometry args={[2.0, 1.1, 1.3]} />
      </mesh>
      <mesh material={mats.glass} position={[0, 1.15, 2.41]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.7, 0.55, 0.05]} />
      </mesh>
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
      {/* Número de unidad en el techo */}
      <mesh material={mats.stripe} position={[0, 2.01, -1.2]}>
        <boxGeometry args={[0.5 + unit.id * 0.2, 0.02, 0.5]} />
      </mesh>
      <mesh material={mats.red} position={[-0.45, 2.1, 0.9]} userData={{ noToon: true, noBatch: true }}>
        <boxGeometry args={[0.7, 0.22, 0.4]} />
      </mesh>
      <mesh material={mats.blue} position={[0.45, 2.1, 0.9]} userData={{ noToon: true, noBatch: true }}>
        <boxGeometry args={[0.7, 0.22, 0.4]} />
      </mesh>
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

/* ─── Cerebro de la flota ─── */

export default function Ambulances() {
  const nearUnit = useRef<number | null>(null);
  const nextPatrolAt = useRef(20);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const now = performance.now() / 1000;
    const s = useGameStore.getState();

    // ─── Emergencias: despachar la unidad libre más cercana ───
    if (s.emergency && s.emergency.onTime === null && !fleet.some((u) => u.caseId === s.emergency!.caseId)) {
      const c = CASE_BY_ID[s.emergency.caseId];
      const route = c?.ambulanceRoute;
      if (route) {
        const stop = route.at(-1)!;
        const free = fleet.filter((u) => u.mode !== 'ride');
        const u = free.sort((a, b) => a.pos.distanceTo(new THREE.Vector3(stop[0], 0, stop[1])) - b.pos.distanceTo(new THREE.Vector3(stop[0], 0, stop[1])))[0];
        if (u) {
          u.mode = 'dispatch';
          u.caseId = c.id;
          u.patientId = c.patientId;
          const node = nearestNode(stop[0], stop[1]);
          setRoute(u, [...routeTo(u.pos.x, u.pos.z, node.id), new THREE.Vector3(stop[0], 0, stop[1])]);
        }
      }
    }
    // Caso terminado: la unidad vuelve con el paciente
    for (const u of fleet) {
      if (u.caseId && (!s.emergency || s.emergency.caseId !== u.caseId)) {
        u.caseId = null;
        goBase(u);
      }
    }

    // ─── Patrullas: cada tanto sale una unidad estacionada ───
    if (state.clock.elapsedTime > nextPatrolAt.current) {
      nextPatrolAt.current = state.clock.elapsedTime + 35 + Math.random() * 40;
      const patrolling = fleet.filter((u) => u.mode === 'patrol').length;
      const parked = fleet.filter((u) => u.mode === 'parked');
      if (patrolling < 1 && parked.length > 1) {
        const u = parked[Math.floor(Math.random() * parked.length)];
        u.mode = 'patrol';
        setRoute(u, PATROL.map((id) => new THREE.Vector3(NODE_BY_ID[id].x, 0, NODE_BY_ID[id].z)));
      }
    }

    // ─── Mover cada unidad por su ruta ───
    let sirenVol = 0;
    for (const u of fleet) {
      if (u.mode === 'wait' && now > u.waitUntil) goBase(u);
      const speed = SPEED[u.mode];
      const target = u.path[u.seg + 1];
      if (speed > 0 && target) {
        const to = target.clone().sub(u.pos);
        const d = to.length();
        const step = speed * dt;
        if (d <= step) {
          u.pos.copy(target);
          u.seg++;
        } else {
          u.pos.addScaledVector(to.normalize(), step);
          const want = Math.atan2(to.x, to.z);
          let diff = want - u.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          u.heading += diff * (1 - Math.exp(-7 * dt));
        }
        u.wheel += step * 2.6;
      } else if (speed > 0 && !target) {
        // Fin de la ruta
        if (u.mode === 'dispatch') u.mode = 'scene';
        else if (u.mode === 'return') {
          if (u.patientId) toast(`${npcName(u.patientId)} llegó a Emergencias para su control`, '🚑');
          u.patientId = null;
          u.mode = 'parked';
          u.heading = Math.PI;
        } else if (u.mode === 'patrol') goBase(u);
        else if (u.mode === 'ride') leaveAmbulance('arrived');
      }

      const siren = u.mode === 'dispatch' || (u.mode === 'ride' && !!s.emergency) || (u.mode === 'scene' && s.emergency?.onTime === null);
      if (siren) sirenVol = Math.max(sirenVol, THREE.MathUtils.clamp(1 - u.pos.distanceTo(player.position) / 70, 0, 1) * (u.mode === 'ride' ? 0.5 : 1));
    }
    setSiren(s.started ? sirenVol : 0);

    // ─── ¿El doctor está junto a una ambulancia? (botón 🚑) ───
    let close: number | null = null;
    if (s.riding === null && !insideHospital(player.position.x, player.position.z) && player.position.y < 1.5) {
      let best = BOARD_DIST;
      for (const u of fleet) {
        const d = Math.hypot(u.pos.x - player.position.x, u.pos.z - player.position.z);
        if (d < best) {
          best = d;
          close = u.id;
        }
      }
    }
    if (close !== nearUnit.current) {
      const prev = nearUnit.current;
      nearUnit.current = close;
      if (close !== null) s.interact(ambInteractionId(close));
      else if (prev !== null && s.currentInteraction === ambInteractionId(prev)) s.interact(null);
    }
  });

  return (
    <group>
      {fleet.map((u) => (
        <AmbulanceModel key={u.id} unit={u} />
      ))}
    </group>
  );
}
