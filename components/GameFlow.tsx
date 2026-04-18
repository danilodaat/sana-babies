'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore, type Mission } from '@/store/gameStore';
import MissionDialog from './ui/MissionDialog';
import Thermometer from './minigames/Thermometer';
import BandAid from './minigames/BandAid';
import Vaccine from './minigames/Vaccine';
import type { MiniGameResult } from './ui/MiniGame';

// ─── Mission definitions (inline, using store's Mission type) ───

interface GameMission extends Mission {
  npcGiver: string;    // NPC that offers the mission
  npcTarget: string;   // NPC to interact with for the mini-game
  miniGame: 'thermometer' | 'bandaid' | 'vaccine';
  giverDialogue: string;
}

const GAME_MISSIONS: GameMission[] = [
  {
    id: 'mission-primer-paciente',
    title: 'Primer Paciente',
    description: 'La bebé Luciana tiene fiebre. Necesitas tomarle la temperatura con el termómetro.',
    zone: 'hospital',
    type: 'consulta',
    reward: { coins: 50, xp: 100 },
    completed: false,
    npcGiver: 'parent-1',   // Rosa te pide que atiendas a su bebé
    npcTarget: 'baby-1',    // Luciana es el target
    miniGame: 'thermometer',
    giverDialogue: 'Doctor, mi bebé Luciana tiene fiebre... Por favor, revísela.',
  },
  {
    id: 'mission-emergencia-parque',
    title: 'Emergencia en el Parque',
    description: 'Mateo se raspó jugando. Necesita que le pongas una curita en la herida.',
    zone: 'parque',
    type: 'emergencia',
    reward: { coins: 75, xp: 150 },
    completed: false,
    npcGiver: 'baby-2',    // Mateo mismo te pide ayuda
    npcTarget: 'baby-2',   // Mateo es el target
    miniGame: 'bandaid',
    giverDialogue: '¡Ay, me raspé la rodilla! ¿Me puedes poner una curita?',
  },
  {
    id: 'mission-vacunacion',
    title: 'Vacunación',
    description: 'Carlos trajo a su hijo para vacunarse. Necesitas ponerle la vacuna con buen timing.',
    zone: 'hospital',
    type: 'campana',
    reward: { coins: 100, xp: 200 },
    completed: false,
    npcGiver: 'parent-2',  // Carlos te pide
    npcTarget: 'parent-2', // Carlos mismo (su hijo)
    miniGame: 'vaccine',
    giverDialogue: '¿Puede revisar a mi hijo? Necesita su vacuna.',
  },
];

// NPC names for chat dialogues
const NPC_NAMES: Record<string, string> = {
  'baby-1': 'Luciana',
  'baby-2': 'Mateo',
  'parent-1': 'Rosa',
  'parent-2': 'Carlos',
};

const NPC_CHAT_DIALOGUES: Record<string, string> = {
  'baby-1': '¡Hola doctor! Estoy jugando.',
  'baby-2': '¡Hola! ¿Quieres jugar conmigo?',
  'parent-1': 'Gracias por cuidar a los niños, doctor.',
  'parent-2': 'Buenos días, doctor.',
};

// ─── Flow states ───
type FlowState =
  | { type: 'idle' }
  | { type: 'chat'; npcId: string; text: string }
  | { type: 'offer'; mission: GameMission }
  | { type: 'active'; mission: GameMission }
  | { type: 'ready-to-treat'; mission: GameMission }
  | { type: 'minigame'; mission: GameMission }
  | { type: 'complete'; mission: GameMission; result: MiniGameResult };

export default function GameFlow() {
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' });
  const [acceptedMissions, setAcceptedMissions] = useState<Set<string>>(new Set());

  const actionTriggered = useGameStore((s) => s.actionTriggered);
  const currentInteraction = useGameStore((s) => s.currentInteraction);
  const completedMissions = useGameStore((s) => s.completedMissions);
  const setShowMissionDialog = useGameStore((s) => s.setShowMissionDialog);
  const setCurrentMission = useGameStore((s) => s.setCurrentMission);
  const setActiveMiniGame = useGameStore((s) => s.setActiveMiniGame);
  const setDialogMode = useGameStore((s) => s.setDialogMode);
  const completeMission = useGameStore((s) => s.completeMission);
  const addCoins = useGameStore((s) => s.addCoins);
  const addXP = useGameStore((s) => s.addXP);

  // Track previous actionTriggered to detect changes
  const prevActionRef = useRef(actionTriggered);

  // ─── Handle action button press ───
  useEffect(() => {
    if (actionTriggered === prevActionRef.current) return;
    prevActionRef.current = actionTriggered;

    // Don't do anything if we're in a dialog/minigame/completion
    if (flow.type !== 'idle' && flow.type !== 'active') return;

    const npcId = currentInteraction;
    if (!npcId) return;

    // Check if there's an accepted mission where this NPC is the target
    if (flow.type === 'active' && flow.mission.npcTarget === npcId) {
      // Ready to treat — open the mini-game
      setFlow({ type: 'minigame', mission: flow.mission });
      setActiveMiniGame(flow.mission.miniGame);
      return;
    }

    // Check if there's an available mission from this NPC (giver)
    const availableMission = GAME_MISSIONS.find(
      (m) =>
        m.npcGiver === npcId &&
        !completedMissions.includes(m.id) &&
        !acceptedMissions.has(m.id)
    );

    if (availableMission) {
      // Offer the mission
      setFlow({ type: 'offer', mission: availableMission });
      setCurrentMission({
        id: availableMission.id,
        title: availableMission.title,
        description: availableMission.giverDialogue + '\n\n' + availableMission.description,
        zone: availableMission.zone,
        type: availableMission.type,
        reward: availableMission.reward,
        completed: false,
      });
      setDialogMode('offer');
      setShowMissionDialog(true);
      return;
    }

    // Check if there's an accepted mission where this NPC is the target (idle state)
    const activeMission = GAME_MISSIONS.find(
      (m) =>
        m.npcTarget === npcId &&
        acceptedMissions.has(m.id) &&
        !completedMissions.includes(m.id)
    );

    if (activeMission) {
      // Go directly to minigame
      setFlow({ type: 'minigame', mission: activeMission });
      setActiveMiniGame(activeMission.miniGame);
      return;
    }

    // No mission — just show a chat dialogue
    const chatText = NPC_CHAT_DIALOGUES[npcId] || '...';
    setFlow({ type: 'chat', npcId, text: chatText });
    setDialogMode('chat');
  }, [
    actionTriggered,
    currentInteraction,
    flow,
    completedMissions,
    acceptedMissions,
    setShowMissionDialog,
    setCurrentMission,
    setActiveMiniGame,
    setDialogMode,
  ]);

  // ─── Mission accepted ───
  const handleAcceptMission = useCallback(() => {
    if (flow.type !== 'offer') return;
    const mission = flow.mission;

    setAcceptedMissions((prev) => new Set(prev).add(mission.id));
    setShowMissionDialog(false);
    setDialogMode(null);

    // If the giver IS the target, we stay idle and wait for next action
    // If the giver and target are different, player needs to walk to target
    setFlow({ type: 'active', mission });
  }, [flow, setShowMissionDialog, setDialogMode]);

  // ─── Mission rejected ───
  const handleRejectMission = useCallback(() => {
    setShowMissionDialog(false);
    setCurrentMission(null);
    setDialogMode(null);
    setFlow({ type: 'idle' });
  }, [setShowMissionDialog, setCurrentMission, setDialogMode]);

  // ─── Mini-game finished ───
  const handleMiniGameFinish = useCallback(
    (result: MiniGameResult) => {
      if (flow.type !== 'minigame') return;
      const mission = flow.mission;

      setActiveMiniGame(null);

      // Give rewards scaled by stars
      const starMultiplier = result.stars === 3 ? 1.0 : result.stars === 2 ? 0.7 : 0.4;
      const earnedCoins = Math.round(mission.reward.coins * starMultiplier);
      const earnedXP = Math.round(mission.reward.xp * starMultiplier);
      addCoins(earnedCoins);
      addXP(earnedXP);

      // Show completion dialog
      setCurrentMission({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        zone: mission.zone,
        type: mission.type,
        reward: { coins: earnedCoins, xp: earnedXP },
        completed: true,
      });
      setDialogMode('complete');
      setShowMissionDialog(true);

      setFlow({ type: 'complete', mission, result });
    },
    [flow, setActiveMiniGame, setCurrentMission, setDialogMode, setShowMissionDialog, addCoins, addXP],
  );

  // ─── Mini-game closed without finishing ───
  const handleMiniGameClose = useCallback(() => {
    if (flow.type !== 'minigame') return;
    setActiveMiniGame(null);
    // Go back to active state — player can retry
    setFlow({ type: 'active', mission: flow.mission });
  }, [flow, setActiveMiniGame]);

  // ─── Completion dialog accepted ───
  const handleCompletionContinue = useCallback(() => {
    if (flow.type !== 'complete') return;
    completeMission(flow.mission.id);
    setShowMissionDialog(false);
    setCurrentMission(null);
    setDialogMode(null);
    setFlow({ type: 'idle' });
  }, [flow, completeMission, setShowMissionDialog, setCurrentMission, setDialogMode]);

  // ─── Chat dialog dismissed ───
  const handleChatDismiss = useCallback(() => {
    setDialogMode(null);
    setFlow({ type: 'idle' });
  }, [setDialogMode]);

  // ─── Active mission hint banner ───
  const activeMission = flow.type === 'active' ? flow.mission : null;
  const isNearTarget =
    activeMission && currentInteraction === activeMission.npcTarget;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      {/* ─── Active mission hint ─── */}
      {activeMission && flow.type === 'active' && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {isNearTarget
            ? `Toca el boton para atender a ${NPC_NAMES[activeMission.npcTarget] || 'el paciente'}`
            : `Ve hacia ${NPC_NAMES[activeMission.npcTarget] || 'el paciente'}`}
        </div>
      )}

      {/* ─── Chat dialog ─── */}
      {flow.type === 'chat' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.2)',
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleChatDismiss();
            }}
            onClick={handleChatDismiss}
          />
          {/* Chat bubble */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              width: '85%',
              maxWidth: 360,
              marginBottom: 24,
              background: 'linear-gradient(to bottom, #fff, #FFF8DC)',
              borderRadius: 24,
              border: '2px solid #E8C88A',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#7c3aed',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {NPC_NAMES[flow.npcId] || 'NPC'}
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#555',
                textAlign: 'center',
                lineHeight: 1.5,
                fontFamily: 'system-ui, sans-serif',
                margin: 0,
              }}
            >
              {flow.text}
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 16,
                border: 'none',
                background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'system-ui, sans-serif',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleChatDismiss();
              }}
              onClick={handleChatDismiss}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ─── Mission offer dialog ─── */}
      {flow.type === 'offer' && (
        <div style={{ pointerEvents: 'auto' }}>
          <MissionDialog
            mode="offer"
            onAccept={handleAcceptMission}
            onReject={handleRejectMission}
          />
        </div>
      )}

      {/* ─── Mission complete dialog ─── */}
      {flow.type === 'complete' && (
        <div style={{ pointerEvents: 'auto' }}>
          <MissionDialog
            mode="complete"
            onAccept={handleCompletionContinue}
          />
        </div>
      )}

      {/* ─── Mini-games ─── */}
      {flow.type === 'minigame' && (
        <div style={{ pointerEvents: 'auto' }}>
          {flow.mission.miniGame === 'thermometer' && (
            <Thermometer
              onFinish={handleMiniGameFinish}
              onClose={handleMiniGameClose}
            />
          )}
          {flow.mission.miniGame === 'bandaid' && (
            <BandAid
              onFinish={handleMiniGameFinish}
              onClose={handleMiniGameClose}
            />
          )}
          {flow.mission.miniGame === 'vaccine' && (
            <Vaccine
              onFinish={handleMiniGameFinish}
              onClose={handleMiniGameClose}
            />
          )}
        </div>
      )}
    </div>
  );
}
