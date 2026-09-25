'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { CASE_BY_ID, availableStoryCases, emergencyPool, isEmergency, scoreCase, zoneIn, zoneTo, type Case, type TreatmentOption } from '@/lib/cases';
import { NPC_BY_ID, npcName } from '@/lib/npcs';
import { getObjective, nearestNpc } from '@/lib/objective';
import { sfx, duckMusic } from '@/lib/audio';
import { emit } from '@/lib/fx';
import { toast } from '@/lib/toast';
import { npcPositions, cheerNpc } from '@/lib/runtime';
import type { MiniGameResult } from './ui/MiniGame';
import Thermometer from './minigames/Thermometer';
import BandAid from './minigames/BandAid';
import Vaccine from './minigames/Vaccine';
import Stethoscope from './minigames/Stethoscope';
import Flashlight from './minigames/Flashlight';
import Syrup from './minigames/Syrup';
import { ApplyCard, ChatCard, DiagnosisCard, OfferCard, PhoneCall, ResultCard } from './ui/CaseUI';

/*
 * Máquina de estados de un caso clínico:
 *   idle → offer | phone → (caminar) → exam[0..n] → diagnosis → treat | apply → result → idle
 * El caso activo y la emergencia viven en el store (persisten / los leen minimapa y flecha);
 * el paso actual del caso vive aquí.
 */

type Flow =
  | { t: 'idle' }
  | { t: 'chat'; npcId: string; text: string }
  | { t: 'offer'; c: Case }
  | { t: 'phone'; c: Case }
  | { t: 'exam'; c: Case; step: number; scores: number[] }
  | { t: 'diagnosis'; c: Case; scores: number[]; wrong: string[] }
  | { t: 'treat'; c: Case; scores: number[]; wrong: string[] }
  | { t: 'apply'; c: Case; scores: number[]; wrong: string[]; option: TreatmentOption }
  | { t: 'result'; c: Case; stars: 1 | 2 | 3; coins: number; xp: number; onTime: boolean | null };

const EMERGENCY_MIN_GAP = 55_000;
const EMERGENCY_MAX_GAP = 110_000;

/** Festejo en el paciente: corazones, destellos y su baile */
function celebrateAt(npcId: string, stars: number) {
  const p = npcPositions.get(npcId);
  if (p) {
    const at = new THREE.Vector3(p.x, p.y + 1, p.z);
    emit('hearts', at, 6 + stars * 4);
    emit('sparkle', at, 8 + stars * 4);
    if (stars === 3) emit('confetti', p, 60);
  }
  cheerNpc(npcId);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GameFlow() {
  const [flow, setFlow] = useState<Flow>({ t: 'idle' });

  const actionTriggered = useGameStore((s) => s.actionTriggered);
  const setModal = useGameStore((s) => s.setModal);
  const startCase = useGameStore((s) => s.startCase);
  const markArrival = useGameStore((s) => s.markArrival);
  const finishCase = useGameStore((s) => s.finishCase);
  const cancelEmergency = useGameStore((s) => s.cancelEmergency);
  const addCoins = useGameStore((s) => s.addCoins);
  const addXP = useGameStore((s) => s.addXP);
  const assist = useGameStore((s) => s.owned.includes('upgrade-kit'));

  const flowRef = useRef(flow);
  flowRef.current = flow;
  const prevAction = useRef(actionTriggered);
  const nextEmergencyGap = useRef(EMERGENCY_MIN_GAP);
  const lastEmergencyId = useRef<string | null>(null);

  // El doctor se congela y el HUD se atenúa mientras haya algo abierto
  useEffect(() => {
    setModal(flow.t !== 'idle');
    const minigame = flow.t === 'exam' || flow.t === 'treat';
    duckMusic(minigame);
  }, [flow.t, setModal]);

  // Una emergencia no sobrevive a recargar la página (su reloj se perdió)
  useEffect(() => {
    const s = useGameStore.getState();
    if (s.activeCase && isEmergency(CASE_BY_ID[s.activeCase]) && !s.emergency) cancelEmergency();
  }, [cancelEmergency]);

  // ─── Botón de acción junto a un NPC ───
  useEffect(() => {
    if (actionTriggered === prevAction.current) return;
    prevAction.current = actionTriggered;
    if (flowRef.current.t !== 'idle') return;

    const s = useGameStore.getState();
    const npcId = s.currentInteraction;
    if (!npcId) return;
    const active = s.activeCase ? CASE_BY_ID[s.activeCase] : null;

    // 1) Es mi paciente: empezar a atender
    if (active && active.patientId === npcId) {
      if (s.emergency) markArrival(Date.now() <= s.emergency.endsAt);
      sfx.pop();
      setFlow(active.exam.length ? { t: 'exam', c: active, step: 0, scores: [] } : { t: 'diagnosis', c: active, scores: [], wrong: [] });
      return;
    }

    // 2) Tengo un caso activo y hablo con otro NPC
    if (active) {
      const who = npcName(active.patientId);
      const text =
        active.giverId === npcId
          ? `¡${who} te está esperando! Sigue la flecha.`
          : `${pick(NPC_BY_ID[npcId]?.chat ?? ['¡Hola doctor!'])} (Tu paciente ${who} te espera ${zoneIn(active.zone)})`;
      setFlow({ t: 'chat', npcId, text });
      return;
    }

    // La farmacia de Don Pepe abre la tienda
    if (NPC_BY_ID[npcId]?.role === 'shop') {
      sfx.pop();
      s.setPanel('shop');
      return;
    }

    // 3) ¿Este NPC pide ayuda?
    const offer = availableStoryCases(s.level, s.completedMissions).find((c) => c.giverId === npcId);
    if (offer) {
      sfx.pop();
      setFlow({ t: 'offer', c: offer });
      return;
    }

    // 4) Charla
    setFlow({ t: 'chat', npcId, text: pick(NPC_BY_ID[npcId]?.chat ?? ['¡Hola doctor!']) });
  }, [actionTriggered, markArrival]);

  // ─── Director de emergencias: cada tanto suena el teléfono ───
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGameStore.getState();
      if (!s.started || s.modal || s.activeCase || s.levelUp !== null || flowRef.current.t !== 'idle') return;
      if (Date.now() - s.lastCaseEndedAt < nextEmergencyGap.current) return;
      // Mientras queden casos de historia en el nivel 2, no interrumpir tan seguido
      const pool = emergencyPool(s.level).filter((c) => c.id !== lastEmergencyId.current);
      if (!pool.length) return;
      const c = pick(pool);
      lastEmergencyId.current = c.id;
      nextEmergencyGap.current = EMERGENCY_MIN_GAP + Math.random() * (EMERGENCY_MAX_GAP - EMERGENCY_MIN_GAP);
      sfx.phone();
      setFlow({ t: 'phone', c });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Acciones de las tarjetas ───
  const acceptOffer = useCallback(() => {
    const f = flowRef.current;
    if (f.t !== 'offer') return;
    sfx.success();
    startCase(f.c.id);
    setFlow({ t: 'idle' });
  }, [startCase]);

  const acceptEmergency = useCallback(() => {
    const f = flowRef.current;
    if (f.t !== 'phone') return;
    sfx.alarm();
    startCase(f.c.id, { caseId: f.c.id, endsAt: Date.now() + (f.c.timeLimit ?? 60) * 1000, onTime: null });
    setFlow({ t: 'idle' });
  }, [startCase]);

  const rejectEmergency = useCallback(() => {
    sfx.click();
    // Reinicia la espera para la próxima llamada
    useGameStore.setState({ lastCaseEndedAt: Date.now() });
    setFlow({ t: 'idle' });
  }, []);

  const close = useCallback(() => {
    sfx.click();
    setFlow({ t: 'idle' });
  }, []);

  const examDone = useCallback((r: MiniGameResult) => {
    const f = flowRef.current;
    if (f.t !== 'exam') return;
    const scores = [...f.scores, r.precision];
    if (f.step + 1 < f.c.exam.length) setFlow({ t: 'exam', c: f.c, step: f.step + 1, scores });
    else setFlow({ t: 'diagnosis', c: f.c, scores, wrong: [] });
  }, []);

  const finishTreatment = useCallback(
    (c: Case, scores: number[], wrong: string[], treatPrecision: number) => {
      const s = useGameStore.getState();
      const onTime = s.emergency ? s.emergency.onTime ?? false : null;
      const { stars } = scoreCase({ exam: scores, treat: treatPrecision, wrongPicks: wrong.length, emergency: s.emergency ? { onTime: !!onTime } : undefined });
      const mult = stars === 3 ? 1 : stars === 2 ? 0.75 : 0.5;
      let coins = Math.round(c.reward.coins * mult);
      if (onTime) coins = Math.round(coins * 1.5);
      if (s.owned.includes('upgrade-bag')) coins = Math.round(coins * 1.2);
      const xp = Math.round(c.reward.xp * mult);

      if (stars >= 2) sfx.heal();
      else sfx.success();
      setTimeout(() => sfx.coin(), 350);
      celebrateAt(c.patientId, stars);
      setFlow({ t: 'result', c, stars, coins, xp, onTime });
    },
    [],
  );

  const pickTreatment = useCallback(
    (o: TreatmentOption) => {
      const f = flowRef.current;
      if (f.t !== 'diagnosis') return;
      if (o.id !== f.c.treatment.correct) {
        sfx.wrong();
        setFlow({ ...f, wrong: [...f.wrong, o.id] });
        return;
      }
      sfx.success();
      if (f.c.treatment.game) setFlow({ t: 'treat', c: f.c, scores: f.scores, wrong: f.wrong });
      else setFlow({ t: 'apply', c: f.c, scores: f.scores, wrong: f.wrong, option: o });
    },
    [],
  );

  const treatDone = useCallback(
    (r: MiniGameResult) => {
      const f = flowRef.current;
      if (f.t !== 'treat') return;
      finishTreatment(f.c, f.scores, f.wrong, r.precision);
    },
    [finishTreatment],
  );

  const applyDone = useCallback(() => {
    const f = flowRef.current;
    if (f.t !== 'apply') return;
    finishTreatment(f.c, f.scores, f.wrong, 1);
  }, [finishTreatment]);

  // Cerrar un minijuego a medias: el caso sigue activo, se puede reintentar
  const abortMinigame = useCallback(() => {
    sfx.click();
    setFlow({ t: 'idle' });
  }, []);

  const collect = useCallback(() => {
    const f = flowRef.current;
    if (f.t !== 'result') return;
    sfx.click();
    const hadGold = useGameStore.getState().owned.includes('coat-gold');
    addCoins(f.coins);
    addXP(f.xp);
    finishCase(f.c.id, !!f.c.repeatable, f.stars, f.c.patientId);
    if (!hadGold && useGameStore.getState().owned.includes('coat-gold')) {
      toast('¡Álbum completo! Ganaste la bata dorada 🏆', '📔', { big: true, ms: 4200 });
      sfx.levelUp();
    }
    setFlow({ t: 'idle' });
  }, [addCoins, addXP, finishCase]);

  // ─── Render ───
  let content: React.ReactNode = null;
  switch (flow.t) {
    case 'chat':
      content = <ChatCard name={npcName(flow.npcId)} text={flow.text} onClose={close} />;
      break;
    case 'offer':
      content = <OfferCard c={flow.c} onAccept={acceptOffer} onReject={close} />;
      break;
    case 'phone':
      content = <PhoneCall c={flow.c} onAccept={acceptEmergency} onReject={rejectEmergency} />;
      break;
    case 'exam': {
      const game = flow.c.exam[flow.step];
      const key = `${flow.c.id}-exam-${flow.step}`;
      if (game === 'thermometer') content = <Thermometer key={key} assist={assist} onFinish={examDone} onClose={abortMinigame} />;
      if (game === 'stethoscope') content = <Stethoscope key={key} assist={assist} onFinish={examDone} onClose={abortMinigame} />;
      if (game === 'flashlight') content = <Flashlight key={key} onFinish={examDone} onClose={abortMinigame} />;
      break;
    }
    case 'diagnosis':
      content = <DiagnosisCard c={flow.c} findings={flow.c.findings} wrong={flow.wrong} onPick={pickTreatment} />;
      break;
    case 'treat': {
      const t = flow.c.treatment;
      if (t.game === 'bandaid') content = <BandAid onFinish={treatDone} onClose={abortMinigame} />;
      if (t.game === 'vaccine') content = <Vaccine onFinish={treatDone} onClose={abortMinigame} />;
      if (t.game === 'syrup') {
        const label = t.options.find((o) => o.id === t.correct)?.label.toLowerCase() ?? 'jarabe';
        content = <Syrup dose={t.dose ?? 5} label={label} assist={assist} onFinish={treatDone} onClose={abortMinigame} />;
      }
      break;
    }
    case 'apply':
      content = <ApplyCard c={flow.c} option={flow.option} onDone={applyDone} />;
      break;
    case 'result':
      content = <ResultCard c={flow.c} stars={flow.stars} coins={flow.coins} xp={flow.xp} onTime={flow.onTime} onContinue={collect} />;
      break;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: 'none' }}>
      {flow.t === 'idle' && <ObjectiveBanner />}
      {content && <div style={{ pointerEvents: 'auto' }}>{content}</div>}
    </div>
  );
}

// ─── Banner de objetivo: qué hacer, a cuántos metros y, en emergencias, el reloj ───
function ObjectiveBanner() {
  const activeCase = useGameStore((s) => s.activeCase);
  const emergency = useGameStore((s) => s.emergency);
  const level = useGameStore((s) => s.level);
  const completed = useGameStore((s) => s.completedMissions);
  const near = useGameStore((s) => s.currentInteraction);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const obj = getObjective({ activeCase, emergency, level, completedMissions: completed });
  if (!obj) {
    return (
      <div style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 10px) + 48px)', left: 12, right: 136 }}>
        <div className="sb-banner">🌟 ¡Todos sanos por ahora! Pasea por Ciudad Sana, pronto sonará el teléfono.</div>
      </div>
    );
  }
  const target = nearestNpc(obj.ids);
  const dist = target ? Math.round(target.dist) : null;
  const name = target ? npcName(target.id) : '';
  const c = obj.caseId ? CASE_BY_ID[obj.caseId] : null;

  let icon = '❗';
  let text = `${name} necesita ayuda`;
  let alert = false;
  if (obj.kind === 'patient' && c) {
    icon = '➕';
    text = near === c.patientId ? `Toca ❤️‍🩹 para atender a ${name}` : `${c.title}: ve con ${name}`;
  }
  if (obj.kind === 'emergency' && c && emergency) {
    alert = true;
    icon = '🚨';
    const left = Math.max(0, Math.ceil((emergency.endsAt - Date.now()) / 1000));
    const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    text =
      near === c.patientId
        ? `¡Llegaste! Toca ❤️‍🩹 para atender a ${name}`
        : left > 0
          ? `${clock} · ¡Corre con ${name} ${zoneTo(c.zone)}!`
          : `¡${name} todavía te necesita ${zoneIn(c.zone)}!`;
  }

  return (
    <div style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 10px) + 48px)', left: 12, right: 136 }}>
      <div className={`sb-banner${alert ? ' sb-banner-alert' : ''}`}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ flex: 1 }}>{text}</span>
        {dist !== null && near !== target?.id && <span style={{ opacity: 0.8, whiteSpace: 'nowrap' }}>{dist} m</span>}
      </div>
    </div>
  );
}
