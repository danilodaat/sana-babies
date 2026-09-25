/**
 * Audio 100% sintetizado con WebAudio: efectos y música sin un solo archivo.
 * El AudioContext solo puede arrancar tras un gesto del usuario, por eso
 * todo pasa por unlock() (se llama al tocar "Jugar").
 */

import { world } from './runtime';

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let noiseBuffer: AudioBuffer;
let muted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let duck = 1;

const MUSIC_VOLUME = 0.32;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;

  // Compresor suave para que nada sature en parlantes de celular
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_VOLUME;
  musicBus.connect(master);

  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05);
}

/** Baja la música (p. ej. durante un minijuego) */
export function duckMusic(on: boolean) {
  duck = on ? 0.35 : 1;
  if (ctx) musicBus.gain.setTargetAtTime(MUSIC_VOLUME * duck, ctx.currentTime, 0.3);
}

// ─── Primitivas ───

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  release?: number;
  slideTo?: number;
  when?: number;
  bus?: GainNode;
  detune?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const c = ensure();
  if (!c) return;
  const t = o.when ?? c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.detune) osc.detune.value = o.detune;
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  const vol = o.vol ?? 0.3;
  const a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.release ?? 0.05));
  osc.connect(g).connect(o.bus ?? sfxBus);
  osc.start(t);
  osc.stop(t + dur + (o.release ?? 0.05) + 0.02);
}

/** Campanita: fundamental + armónico inarmónico, suena a marimba/celesta */
function bell(freq: number, dur: number, vol: number, when?: number, bus?: GainNode) {
  tone(freq, dur, { vol, when, bus, release: dur * 0.6 });
  tone(freq * 2.76, dur * 0.4, { vol: vol * 0.25, when, bus });
}

function noise(dur: number, o: { vol?: number; freq?: number; q?: number; type?: BiquadFilterType; when?: number; bus?: GainNode } = {}) {
  const c = ensure();
  if (!c) return;
  const t = o.when ?? c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.value = o.freq ?? 1200;
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.bus ?? sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ─── Efectos de sonido ───

export const sfx = {
  step() {
    noise(0.05, { vol: 0.08, freq: 700 + Math.random() * 500, q: 2 });
  },
  jump() {
    tone(320, 0.16, { type: 'sine', vol: 0.18, slideTo: 720 });
  },
  land() {
    tone(140, 0.12, { type: 'sine', vol: 0.3, slideTo: 60 });
    noise(0.1, { vol: 0.12, freq: 400, q: 0.8 });
  },
  pop() {
    tone(620, 0.08, { type: 'sine', vol: 0.18, slideTo: 980 });
  },
  click() {
    tone(900, 0.04, { type: 'triangle', vol: 0.15 });
  },
  tick() {
    tone(1400, 0.03, { type: 'square', vol: 0.05 });
  },
  coin() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(midi(83), 0.07, { type: 'square', vol: 0.09, when: t });
    tone(midi(88), 0.22, { type: 'square', vol: 0.09, when: t + 0.07 });
  },
  star(i: number) {
    const c = ensure();
    if (!c) return;
    bell(midi(76 + i * 4), 0.35, 0.25, c.currentTime);
  },
  heal() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [79, 83, 86, 91].forEach((n, i) => bell(midi(n), 0.3, 0.18, t + i * 0.06));
  },
  success() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    [72, 76, 79, 84].forEach((n, i) => {
      tone(midi(n), 0.16, { type: 'triangle', vol: 0.22, when: t + i * 0.1 });
    });
    bell(midi(88), 0.6, 0.2, t + 0.4);
  },
  fail() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    tone(midi(67), 0.18, { type: 'triangle', vol: 0.2, when: t });
    tone(midi(63), 0.3, { type: 'triangle', vol: 0.2, when: t + 0.18, slideTo: midi(60) });
  },
  levelUp() {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const seq = [72, 76, 79, 84, 79, 84, 88];
    seq.forEach((n, i) => {
      tone(midi(n), 0.14, { type: 'square', vol: 0.08, when: t + i * 0.09 });
      tone(midi(n - 12), 0.14, { type: 'triangle', vol: 0.15, when: t + i * 0.09 });
    });
    bell(midi(96), 0.9, 0.2, t + seq.length * 0.09);
    noise(0.6, { vol: 0.06, freq: 6000, type: 'highpass', when: t + seq.length * 0.09 });
  },
  whoosh() {
    noise(0.35, { vol: 0.1, freq: 900, q: 0.6 });
  },
};

// ─── Música procedural ───
// I–vi–IV–V en Do mayor, 96 BPM. De día: marimba + bajo + shaker + melodía.
// De noche: se apaga la percusión y la melodía se vuelve más espaciada.

const BPM = 96;
const BEAT = 60 / BPM;
const CHORDS = [
  [48, 52, 55], // C
  [45, 48, 52], // Am
  [41, 45, 48], // F
  [43, 47, 50], // G
];
const PENTA = [72, 74, 76, 79, 81, 84];

// Motivo fijo (semilla) para que la melodía sea pegajosa y no aleatoria pura
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seeded(7);
const MOTIFS: (number | null)[][] = Array.from({ length: 2 }, () =>
  Array.from({ length: 8 }, (_, i) => (i % 2 === 1 && rand() < 0.45 ? null : PENTA[Math.floor(rand() * PENTA.length)])),
);
// Forma AABA sobre 4 compases
const FORM = [0, 0, 1, 0];

let nextBarTime = 0;
let bar = 0;

function scheduleBar(t: number) {
  const chord = CHORDS[bar % 4];
  const night = world.night;
  const bus = musicBus;

  // Bajo: tiempos 1 y 3
  tone(midi(chord[0] - 12), BEAT * 1.6, { type: 'triangle', vol: 0.32, when: t, bus, release: 0.2 });
  tone(midi(chord[0] - 12 + (bar % 2 ? 7 : 0)), BEAT * 1.6, { type: 'triangle', vol: 0.26, when: t + BEAT * 2, bus, release: 0.2 });

  // Pad suave (más presente de noche)
  chord.forEach((n) =>
    tone(midi(n + 12), BEAT * 3.8, { type: 'sine', vol: 0.035 + night * 0.04, attack: 0.4, release: 0.6, when: t, bus }),
  );

  // Arpegio de marimba en corcheas
  const arpVol = 0.1 * (1 - night * 0.6);
  for (let i = 0; i < 8; i++) {
    if (night > 0.5 && i % 2 === 1) continue;
    const n = chord[[0, 1, 2, 1, 0, 2, 1, 2][i]] + 24;
    bell(midi(n), BEAT * 0.4, arpVol, t + i * BEAT * 0.5, bus);
  }

  // Melodía
  const motif = MOTIFS[FORM[bar % 4]];
  motif.forEach((n, i) => {
    if (n === null) return;
    if (night > 0.5 && i % 4 !== 0) return;
    bell(midi(n), BEAT * 0.6, 0.13, t + i * BEAT * 0.5, bus);
  });

  // Shaker en contratiempos (solo de día)
  if (night < 0.5) {
    for (let i = 0; i < 4; i++) {
      noise(0.05, { vol: 0.05, freq: 8000, type: 'highpass', when: t + i * BEAT + BEAT * 0.5, bus });
    }
  }
  bar++;
}

export function startMusic() {
  const c = ensure();
  if (!c || musicTimer) return;
  nextBarTime = c.currentTime + 0.1;
  // Scheduler con lookahead: programa compases con 1s de anticipación
  musicTimer = setInterval(() => {
    if (!ctx) return;
    // Si la pestaña estuvo en segundo plano no recuperar compases atrasados de golpe
    if (nextBarTime < ctx.currentTime - 0.1) nextBarTime = ctx.currentTime + 0.05;
    while (nextBarTime < ctx.currentTime + 1) {
      scheduleBar(nextBarTime);
      nextBarTime += BEAT * 4;
    }
  }, 200);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
