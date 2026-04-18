'use client';

import { useCallback, useRef, useState } from 'react';
import MiniGame, { type MiniGameResult } from '../ui/MiniGame';

interface ThermometerProps {
  onFinish: (result: MiniGameResult) => void;
  onClose?: () => void;
}

// Temperature ranges (mapped to 0-100% of the bar)
const TEMP_MIN = 35.0;
const TEMP_MAX = 42.0;
const GREEN_LOW = 36.5;
const GREEN_HIGH = 37.5;
const YELLOW_LOW = 36.0;
const YELLOW_HIGH = 38.0;

function tempToPercent(temp: number): number {
  return ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100;
}

function percentToTemp(pct: number): number {
  return TEMP_MIN + (pct / 100) * (TEMP_MAX - TEMP_MIN);
}

function getZoneColor(pct: number): string {
  const temp = percentToTemp(pct);
  if (temp >= GREEN_LOW && temp <= GREEN_HIGH) return '#4ade80'; // green
  if (temp >= YELLOW_LOW && temp <= YELLOW_HIGH) return '#facc15'; // yellow
  return '#f87171'; // red
}

function getPrecision(pct: number): number {
  const temp = percentToTemp(pct);
  if (temp >= GREEN_LOW && temp <= GREEN_HIGH) return 1.0;
  if (temp >= YELLOW_LOW && temp <= YELLOW_HIGH) return 0.6;
  return 0.2;
}

export default function Thermometer({ onFinish, onClose }: ThermometerProps) {
  return (
    <MiniGame
      title="Tomar Temperatura"
      instructions="Mantén presionado para subir el mercurio. ¡Suelta cuando esté en la zona verde!"
      duration={20}
      onFinish={onFinish}
      onClose={onClose}
    >
      {({ onComplete }) => (
        <ThermometerGame onComplete={onComplete} />
      )}
    </MiniGame>
  );
}

// ─── Inner game component ───

function ThermometerGame({
  onComplete,
}: {
  onComplete: (precision: number) => void;
}) {
  const [mercuryPct, setMercuryPct] = useState(0);
  const [released, setReleased] = useState(false);
  const holdingRef = useRef(false);
  const animRef = useRef<number | undefined>(undefined);

  const startHold = useCallback(() => {
    if (released) return;
    holdingRef.current = true;

    const tick = () => {
      if (!holdingRef.current) return;
      setMercuryPct((prev) => {
        const next = Math.min(prev + 0.8, 100);
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [released]);

  const endHold = useCallback(() => {
    if (released) return;
    holdingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setReleased(true);

    // Small delay to show final position
    setTimeout(() => {
      setMercuryPct((current) => {
        onComplete(getPrecision(current));
        return current;
      });
    }, 300);
  }, [released, onComplete]);

  const greenLow = tempToPercent(GREEN_LOW);
  const greenHigh = tempToPercent(GREEN_HIGH);
  const yellowLow = tempToPercent(YELLOW_LOW);
  const yellowHigh = tempToPercent(YELLOW_HIGH);

  const currentTemp = percentToTemp(mercuryPct).toFixed(1);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Temperature readout */}
      <div className="text-2xl font-bold tabular-nums" style={{ color: getZoneColor(mercuryPct) }}>
        {currentTemp}°C
      </div>

      {/* Thermometer visual */}
      <div className="relative w-16 h-56 flex items-end justify-center">
        {/* Background tube */}
        <div className="absolute inset-x-4 inset-y-0 bg-gray-200 rounded-full border-2 border-gray-300 overflow-hidden">
          {/* Zone indicators */}
          {/* Red top */}
          <div
            className="absolute left-0 right-0 bg-red-200"
            style={{ bottom: `${yellowHigh}%`, top: 0 }}
          />
          {/* Yellow top */}
          <div
            className="absolute left-0 right-0 bg-yellow-200"
            style={{ bottom: `${greenHigh}%`, height: `${yellowHigh - greenHigh}%` }}
          />
          {/* Green zone */}
          <div
            className="absolute left-0 right-0 bg-green-200"
            style={{ bottom: `${greenLow}%`, height: `${greenHigh - greenLow}%` }}
          />
          {/* Yellow bottom */}
          <div
            className="absolute left-0 right-0 bg-yellow-200"
            style={{ bottom: `${yellowLow}%`, height: `${greenLow - yellowLow}%` }}
          />
          {/* Red bottom */}
          <div
            className="absolute left-0 right-0 bg-red-200"
            style={{ bottom: 0, height: `${yellowLow}%` }}
          />

          {/* Mercury fill */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-75 ease-linear rounded-b-full"
            style={{
              height: `${mercuryPct}%`,
              background: `linear-gradient(to top, #ef4444, ${getZoneColor(mercuryPct)})`,
            }}
          />
        </div>

        {/* Bulb at bottom */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-red-500 border-2 border-red-600 shadow-md" />

        {/* Zone labels */}
        <div className="absolute -right-12 text-[10px] font-bold text-green-600" style={{ bottom: `${(greenLow + greenHigh) / 2}%` }}>
          ✓ OK
        </div>
      </div>

      {/* Hold button */}
      <button
        className={`
          w-40 h-14 rounded-2xl font-bold text-lg shadow-lg
          transition-all duration-150 select-none
          ${
            released
              ? 'bg-gray-300 text-gray-500'
              : holdingRef.current
                ? 'bg-red-400 text-white scale-95'
                : 'bg-gradient-to-r from-sky-400 to-sky-500 text-white active:scale-95'
          }
        `}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={() => {
          if (holdingRef.current) endHold();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          endHold();
        }}
        disabled={released}
      >
        {released ? `${currentTemp}°C` : 'MANTENER'}
      </button>
    </div>
  );
}
