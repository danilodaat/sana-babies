'use client';

import { useCallback, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';

interface BandAidProps {
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

// Target zone (center of the wound)
const TARGET_X = 50; // percent
const TARGET_Y = 50; // percent
const TOLERANCE_PERFECT = 8; // percent distance for 3 stars
const TOLERANCE_GOOD = 20; // percent distance for 2 stars

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function getPrecision(dist: number): number {
  if (dist <= TOLERANCE_PERFECT) return 1.0;
  if (dist <= TOLERANCE_GOOD) return 0.6;
  return 0.2;
}

export default function BandAid({ onFinish, onClose }: BandAidProps) {
  return (
    <MiniGame
      title="Poner Curita"
      instructions="Arrastra la curita sobre la herida. ¡Colócala justo encima!"
      duration={20}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => (
        <BandAidGame onComplete={onComplete} />
      )}
    </MiniGame>
  );
}

// ─── Inner game component ───

function BandAidGame({
  onComplete,
}: {
  onComplete: (precision: number) => void;
}) {
  const [bandX, setBandX] = useState(20); // percent
  const [bandY, setBandY] = useState(85); // percent — starts at bottom
  const [dragging, setDragging] = useState(false);
  const [placed, setPlaced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const getRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: bandX, y: bandY };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    [bandX, bandY],
  );

  // ─── Mouse events ───
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (placed) return;
      e.preventDefault();
      const pos = getRelativePos(e.clientX, e.clientY);
      dragOffsetRef.current = { x: pos.x - bandX, y: pos.y - bandY };
      setDragging(true);
    },
    [placed, getRelativePos, bandX, bandY],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || placed) return;
      const pos = getRelativePos(e.clientX, e.clientY);
      setBandX(Math.max(0, Math.min(100, pos.x - dragOffsetRef.current.x)));
      setBandY(Math.max(0, Math.min(100, pos.y - dragOffsetRef.current.y)));
    },
    [dragging, placed, getRelativePos],
  );

  const onMouseUp = useCallback(() => {
    if (!dragging || placed) return;
    setDragging(false);
    setPlaced(true);
    const dist = getDistance(bandX, bandY, TARGET_X, TARGET_Y);
    setTimeout(() => onComplete(getPrecision(dist)), 400);
  }, [dragging, placed, bandX, bandY, onComplete]);

  // ─── Touch events ───
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (placed) return;
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getRelativePos(touch.clientX, touch.clientY);
      dragOffsetRef.current = { x: pos.x - bandX, y: pos.y - bandY };
      setDragging(true);
    },
    [placed, getRelativePos, bandX, bandY],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || placed) return;
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getRelativePos(touch.clientX, touch.clientY);
      setBandX(Math.max(0, Math.min(100, pos.x - dragOffsetRef.current.x)));
      setBandY(Math.max(0, Math.min(100, pos.y - dragOffsetRef.current.y)));
    },
    [dragging, placed, getRelativePos],
  );

  const onTouchEnd = useCallback(() => {
    if (!dragging || placed) return;
    setDragging(false);
    setPlaced(true);
    const dist = getDistance(bandX, bandY, TARGET_X, TARGET_Y);
    setTimeout(() => onComplete(getPrecision(dist)), 400);
  }, [dragging, placed, bandX, bandY, onComplete]);

  const dist = getDistance(bandX, bandY, TARGET_X, TARGET_Y);
  const isClose = dist <= TOLERANCE_GOOD;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-64 rounded-2xl overflow-hidden select-none touch-none"
      style={{ background: '#FDEBD0' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Knee / skin area */}
      <div
        className="absolute rounded-full border-4 border-[#F5CBA7]"
        style={{
          width: '60%',
          height: '70%',
          left: '20%',
          top: '15%',
          background: 'radial-gradient(circle, #FDEBD0 40%, #F5CBA7 100%)',
        }}
      />

      {/* Wound */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          left: `calc(${TARGET_X}% - 20px)`,
          top: `calc(${TARGET_Y}% - 20px)`,
          background: 'radial-gradient(circle, #c0392b 30%, #e74c3c 70%)',
          boxShadow: isClose && !placed
            ? '0 0 20px 8px rgba(74,222,128,0.5)'
            : '0 0 8px 2px rgba(231,76,60,0.3)',
          transition: 'box-shadow 0.2s',
        }}
      />

      {/* Target glow ring */}
      {!placed && (
        <div
          className="absolute rounded-full border-2 border-dashed border-green-400 animate-pulse pointer-events-none"
          style={{
            width: 70,
            height: 70,
            left: `calc(${TARGET_X}% - 35px)`,
            top: `calc(${TARGET_Y}% - 35px)`,
          }}
        />
      )}

      {/* Band-aid (draggable) */}
      <div
        className={`
          absolute cursor-grab transition-transform duration-75
          ${dragging ? 'scale-110 cursor-grabbing' : ''}
          ${placed ? 'cursor-default' : ''}
        `}
        style={{
          left: `calc(${bandX}% - 30px)`,
          top: `calc(${bandY}% - 15px)`,
          width: 60,
          height: 30,
          zIndex: 10,
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Band-aid SVG */}
        <svg
          viewBox="0 0 60 30"
          className="w-full h-full drop-shadow-md"
          style={{ filter: placed ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        >
          {/* Ends */}
          <rect x="0" y="0" width="15" height="30" rx="4" fill="#F5CBA7" />
          <rect x="45" y="0" width="15" height="30" rx="4" fill="#F5CBA7" />
          {/* Center pad */}
          <rect x="12" y="0" width="36" height="30" rx="2" fill="#FDEBD0" />
          {/* Gauze */}
          <rect x="18" y="6" width="24" height="18" rx="2" fill="#FAD7A0" />
          {/* Dots */}
          <circle cx="24" cy="12" r="1.5" fill="#E8C88A" />
          <circle cx="30" cy="18" r="1.5" fill="#E8C88A" />
          <circle cx="36" cy="12" r="1.5" fill="#E8C88A" />
        </svg>
      </div>

      {/* Hint text */}
      {!placed && !dragging && (
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-gray-500">
          Arrastra la curita ↑
        </p>
      )}

      {/* Placed feedback */}
      {placed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl animate-bounce">
            {dist <= TOLERANCE_PERFECT ? '👏' : dist <= TOLERANCE_GOOD ? '👍' : '😅'}
          </span>
        </div>
      )}
    </div>
  );
}
