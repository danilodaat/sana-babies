'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { FLOORS, floorBase, floorOf, inElevator, insideHospital, ELEVATOR } from '@/lib/hospital';
import { input, player } from '@/lib/runtime';
import { sfx } from '@/lib/audio';
import { toast } from '@/lib/toast';

/*
 * Ascensor del hospital: al pararse en la cabina aparece un panel con los
 * 3 pisos (botones grandes, pensados para niños). Al elegir: fundido a
 * blanco, "ding" y el doctor aparece en el mismo lugar del otro piso.
 * También avisa el nombre del piso al cambiar (por ascensor o escalera).
 */
export default function Elevator() {
  const modal = useGameStore((s) => s.modal);
  const started = useGameStore((s) => s.started);
  const [inside, setInside] = useState(false);
  const [floor, setFloor] = useState(0);
  const [fade, setFade] = useState(false);
  const lastFloor = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const p = player.position;
      const inHosp = insideHospital(p.x, p.z);
      const f = inHosp ? floorOf(p.y) : 0;
      setInside(inHosp && inElevator(p.x, p.z));
      setFloor(f);
      // Aviso de piso al cambiar (ascensor o escalera)
      if (inHosp) {
        if (lastFloor.current !== null && lastFloor.current !== f) toast(`Piso ${f + 1} · ${FLOORS[f].name}`, FLOORS[f].emoji);
        lastFloor.current = f;
      } else lastFloor.current = null;
    }, 150);
    return () => clearInterval(id);
  }, []);

  const go = (target: number) => {
    if (busy.current || target === floor) return;
    busy.current = true;
    sfx.click();
    setFade(true);
    setTimeout(() => {
      input.teleport = new THREE.Vector3(ELEVATOR.x, floorBase(target) + 0.3, ELEVATOR.z);
      sfx.star(2);
    }, 380);
    setTimeout(() => {
      setFade(false);
      busy.current = false;
    }, 800);
  };

  if (!started) return null;

  return (
    <>
      {fade && <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 70, animation: 'sb-fade-in 0.35s ease', pointerEvents: 'none' }} />}
      {inside && !modal && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '26%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            padding: 12,
            borderRadius: 24,
            background: 'rgba(38,50,56,0.88)',
            boxShadow: '0 0 0 3px #ffd54f, 0 12px 30px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'stretch',
            animation: 'sb-pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1)',
            minWidth: 230,
          }}
        >
          <div style={{ color: '#ffd54f', fontWeight: 800, fontSize: 13, textAlign: 'center' }}>🛗 ¿A qué piso vamos?</div>
          {[2, 1, 0].map((f) => {
            const info = FLOORS[f];
            const here = f === floor;
            return (
              <button
                key={f}
                onClick={() => go(f)}
                disabled={here}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: here ? 'default' : 'pointer',
                  background: here ? 'rgba(255,255,255,0.12)' : info.color,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: 'inherit',
                  boxShadow: here ? 'none' : '0 4px 0 rgba(0,0,0,0.25)',
                  opacity: here ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 22, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {f + 1}
                </span>
                <span style={{ fontSize: 20 }}>{info.emoji}</span>
                {info.name}
                {here && <span style={{ marginLeft: 'auto', fontSize: 11 }}>estás aquí</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
