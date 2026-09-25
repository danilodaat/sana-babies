'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import MissionDialog from './ui/MissionDialog';
import Thermometer from './minigames/Thermometer';
import BandAid from './minigames/BandAid';
import Vaccine from './minigames/Vaccine';
import type { MiniGameResult } from './ui/MiniGame';
import { GAME_MISSIONS, NPC_NAMES, NPC_CHAT_DIALOGUES, type GameMission } from '@/lib/gameMissions';
import { sfx, duckMusic } from '@/lib/audio';
import { emit } from '@/lib/fx';
import { npcPositions, cheerNpc } from '@/lib/runtime';
import * as THREE from 'three';

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
  const acceptedList = useGameStore((s) => s.acceptedMissions);
  const acceptMission = useGameStore((s) => s.acceptMission);
  const acceptedMissions = { has: (id: string) => acceptedList.includes(id) };

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
      duckMusic(true);
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
      sfx.pop();
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
      duckMusic(true);
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
    acceptedList,
    setShowMissionDialog,
    setCurrentMission,
    setActiveMiniGame,
    setDialogMode,
  ]);

  // ─── Mission accepted ───
  const handleAcceptMission = useCallback(() => {
    if (flow.type !== 'offer') return;
    const mission = flow.mission;

    acceptMission(mission.id);
    sfx.success();
    setShowMissionDialog(false);
    setDialogMode(null);

    // If the giver IS the target, we stay idle and wait for next action
    // If the giver and target are different, player needs to walk to target
    setFlow({ type: 'active', mission });
  }, [flow, acceptMission, setShowMissionDialog, setDialogMode]);

  // ─── Mission rejected ───
  const handleRejectMission = useCallback(() => {
    sfx.click();
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
      duckMusic(false);

      // Festejo en el mundo + sonido según las estrellas
      if (result.stars >= 2) sfx.heal();
      else sfx.fail();
      setTimeout(() => sfx.coin(), 350);
      celebrateAt(mission.npcTarget, result.stars);

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
    duckMusic(false);
    sfx.click();
    // Go back to active state — player can retry
    setFlow({ type: 'active', mission: flow.mission });
  }, [flow, setActiveMiniGame]);

  // ─── Completion dialog accepted ───
  const handleCompletionContinue = useCallback(() => {
    if (flow.type !== 'complete') return;
    sfx.click();
    completeMission(flow.mission.id);
    setShowMissionDialog(false);
    setCurrentMission(null);
    setDialogMode(null);
    setFlow({ type: 'idle' });
  }, [flow, completeMission, setShowMissionDialog, setCurrentMission, setDialogMode]);

  // ─── Chat dialog dismissed ───
  const handleChatDismiss = useCallback(() => {
    sfx.click();
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
