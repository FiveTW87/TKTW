import { useEffect, useRef, useState } from "react";
import type { Card } from "@tktw/shared";
import { useGameStore } from "../store/gameStore";
import { GameBoard } from "../components/board/GameBoard";
import { SelfDock } from "../components/board/SelfDock";
import { GameHistoryPanel } from "../components/board/GameHistoryPanel";
import { generalSkills } from "../data/generalSkills";
import type { EquipSlot } from "../data/cardMeta";
import { attackDistance, weaponRange } from "../data/distance";
import { useCountdown } from "../lib/useCountdown";
import { useIsNarrow } from "../lib/useIsNarrow";
import { useDeviceMode } from "../lib/useDeviceMode";
import { useInteraction } from "../hooks/useInteraction";
import { useDecisionController } from "../hooks/useDecisionController";
import { createMainActionController } from "../hooks/mainActionController";
import { useTableTransientUi } from "../hooks/useTableTransientUi";
import { useTableSfx } from "../hooks/useTableSfx";
import { useCombatPresentation } from "../hooks/useCombatPresentation";
import { useCardMotionPresentation } from "../hooks/useCardMotionPresentation";
import { useTableFeedbackPresentation } from "../hooks/useTableFeedbackPresentation";
import { TableActionCluster, TableUtilityRail, type TableActionViewModel } from "../components/board/TableControls";
import { TableOverlays, TableRecoveryPanel, type TableOverlayViewModel } from "../components/board/TableOverlays";
import { FirstTableWalkthrough } from "../components/FirstTableWalkthrough";
import { ContextHelpPanel } from "../components/board/ContextHelpPanel";
import { buildContextHelp } from "../data/contextHelp";
import { useAssistStore } from "../store/assistStore";

const PHASE_LABEL: Record<string, string> = {
  prepare: "เฟสเตรียมตัว",
  judge: "เฟสตัดสิน",
  draw: "เฟสจั่วไพ่",
  play: "เฟสลงการ์ด",
  discard: "เฟสทิ้งไพ่",
  end: "เฟสจบเทิร์น",
};

const EQUIP_SLOTS: { slot: EquipSlot; label: string; glyph: string }[] = [
  { slot: "weapon", label: "อาวุธ", glyph: "兵" },
  { slot: "armor", label: "เกราะ", glyph: "甲" },
  { slot: "horseMinus", label: "ม้า −1", glyph: "馬" },
  { slot: "horsePlus", label: "ม้า +1", glyph: "馬" },
];

export function Table() {
  const gameView = useGameStore((s) => s.gameView);
  const connected = useGameStore((s) => s.connected);
  const storeMatchId = useGameStore((s) => s.matchId);
  const answer = useGameStore((s) => s.answer);
  const error = useGameStore((s) => s.error);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const debug = useGameStore((s) => s.debug);
  const combatEffects = useCombatPresentation({
    connected,
    matchId: gameView?.matchId,
    logs: gameView?.gameLogs,
    players: gameView?.players,
  });
  const cardMotionEffects = useCardMotionPresentation({
    connected,
    matchId: gameView?.matchId,
    logs: gameView?.gameLogs,
  });
  const currentTurnPlayerName = gameView?.players.find((player) => player.id === gameView.currentTurnPlayerId)?.name;
  const feedbackCues = useTableFeedbackPresentation({
    connected,
    matchId: gameView?.matchId,
    logs: gameView?.gameLogs,
    turnNumber: gameView?.turnNumber,
    phase: gameView?.currentPhase,
    currentTurnPlayerName,
  });
  const [showDebug, setShowDebug] = useState(false);
  const narrow = useIsNarrow(); // mobile / small-tablet: stack the history sidebar
  const { compact } = useDeviceMode();
  const assistanceLevel = useAssistStore((state) => state.level);

  const pending = gameView?.pendingDecision;
  const decisionKey = pending?.id ?? null;

  // Feature C: once I've picked my own general, App.tsx sends me straight
  // here instead of leaving me on GeneralSelect for the rest of the table —
  // so pendingDecision can legitimately still be someone ELSE's pickGeneral
  // while I'm already looking at my own hand. Hooks must run unconditionally,
  // so this is computed here regardless of whether it's currently relevant.
  const generalPickPending = pending?.kind === "pickGeneral" ? pending : undefined;
  const generalPickRemaining = useCountdown(generalPickPending?.expiresAt, gameView?.serverNow ?? 0);

  // SPEC §11.1 — card/target/skill selection lives in a dedicated interaction
  // reducer, reset whenever the authoritative decision changes.
  const selection = useInteraction(decisionKey);
  const { selectedCardIds, selectedTargetIds, skillMode, zhangbaMode } = selection.state;
  const [drawnIds, setDrawnIds] = useState<Set<string>>(() => new Set());
  const prevHandIdsRef = useRef<Set<string>>(new Set());

  const me = gameView?.players.find((p) => p.id === gameView.viewerPlayerId);
  const transient = useTableTransientUi({ decisionKey, matchId: gameView?.matchId ?? storeMatchId ?? undefined, viewerAlive: me?.alive });
  const decision = useDecisionController({ gameView, me, answer, onAutoToast: transient.toast.show });
  const {
    isMyDecision,
    isMainAction,
    isDiscardTo,
    route,
    pendingActivateId,
    pendingActivateMode,
    busy,
    runAnswer,
    answerActivate,
  } = decision;
  const { notice, toast, inspectingPlayer: inspecting, inspectingCard, playChoice: playChoices, discardOpen: showDiscard, leaveConfirmOpen: confirmingLeave, showDeathDialog } = transient.state;
  const showNotice = transient.notice.show;
  useTableSfx({ connected, gameView, viewerPlayerId: me?.id });

  // ── Draw feel: flash the flip-in animation on cards that just entered the
  // hand. Diff current hand ids against last render's; animate only the newly
  // appeared ones (never on the initial deal / a reconnect snapshot, where
  // there's no "previous" to diff against, and never for cards leaving).
  const myHandIds = me && Array.isArray(me.hand) ? me.hand.map((c) => c.id) : [];
  const handKey = myHandIds.join(",");
  useEffect(() => {
    const prev = prevHandIdsRef.current;
    const added = myHandIds.filter((id) => !prev.has(id));
    prevHandIdsRef.current = new Set(myHandIds);
    if (prev.size === 0 || added.length === 0) return; // skip first snapshot
    setDrawnIds(new Set(added));
    const t = setTimeout(() => setDrawnIds(new Set()), 480);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handKey]);

  if (!gameView) return null;

  // SPEC 8.4: a finished match's own screen is <Result/>, driven by the
  // authoritative MatchResult broadcast (App.tsx routes there once it
  // arrives) — Table has nothing useful left to render once gameView.finished.
  if (gameView.finished) return null;

  if (!me) return null;

  // Safety net: the server always sends a view with a pending decision (or a
  // finished game). If we ever land with neither, the board would be a dead
  // frozen screen — surface a recovery panel (with the debug trace) instead.
  if (!pending && !gameView.finished) {
    return (
      <TableRecoveryPanel
        debugLines={debug}
        onReload={() => window.location.reload()}
        onLeave={leaveRoom}
      />
    );
  }

  const myHand: Card[] = Array.isArray(me.hand) ? me.hand : [];
  const others = gameView.players.filter((p) => p.id !== gameView.viewerPlayerId);
  const generalPickWaitingName = generalPickPending
    ? (gameView.players.find((p) => p.id === generalPickPending.playerId)?.name ?? generalPickPending.playerId)
    : null;


  // A judgment reveal AND a mandatory draw are both answered by tapping the
  // draw pile itself (see the mat) instead of a separate floating dialog.
  const pendingJudgmentReveal = route.kind === "pile" && route.action === "reveal";
  const pendingDraw = route.kind === "pile" && route.action === "draw";
  const pendingPileAction = pendingJudgmentReveal || pendingDraw;
  const pileActionTitle = route.kind === "pile" ? route.title : undefined;
  const drawActionPrompt = route.kind === "pile" && route.action === "draw" ? route.prompt ?? null : null;

  const mainAction = createMainActionController({
    gameView, me, pending, isMyDecision, isMainAction, isDiscardTo, selection,
    submit: runAnswer, notify: showNotice, requestPlayChoice: transient.playChoice.open,
  });
  const { activeSkill: activeSkillOptions } = mainAction.options;
  const { selecting, showConfirmBar, confirmOk, confirmText, mustDiscard, selfTargetable } = mainAction.selection;
  const onTapCard = mainAction.cards.tap;
  const getCardState = mainAction.cards.stateFor;
  const proceedPlay = mainAction.cards.proceedPlay;
  const targetableFor = mainAction.targets.isTargetable;
  const onTapTarget = mainAction.targets.tap;
  const resetSelection = mainAction.commands.reset;
  const submitConfirm = mainAction.commands.submitConfirm;
  const submitEndPhase = mainAction.commands.submitEndPhase;
  const submitDiscard = mainAction.commands.submitDiscard;
  const skills = generalSkills(me.generalId);
  const responderLabel = route.kind === "waiting" ? route.label : null;
  const contextHelp = buildContextHelp({
    level: assistanceLevel,
    route,
    legalActions: gameView.legalActions,
  });

  const selectingLabel = skillMode ? "เลือกการ์ดสำหรับสกิล" : zhangbaMode ? "เลือกการ์ด 2 ใบสำหรับทวน" : isDiscardTo ? "เลือกการ์ดที่จะทิ้ง" : "แตะการ์ดเพื่อเล่น";
  const phaseLabel = (gameView.currentPhase && PHASE_LABEL[gameView.currentPhase]) ?? gameView.currentPhase ?? "";
  const isMyTurn = gameView.currentTurnPlayerId === me.id;
  const equipSlotsWithCards = EQUIP_SLOTS.map((s) => ({ ...s, card: me.equipment[s.slot] }));
  const zhangbaAvailable = mainAction.zhangba.available;

  const tableAction: TableActionViewModel = showConfirmBar
    ? {
        kind: "confirm",
        caption: confirmText || "เลือกการ์ด/เป้าหมาย",
        busy,
        enabled: confirmOk,
        onCancel: resetSelection,
        onConfirm: submitConfirm,
      }
    : isMyDecision && isDiscardTo
      ? {
          kind: "discard",
          selectedCount: selectedCardIds.length,
          requiredCount: mustDiscard,
          busy,
          onSubmit: submitDiscard,
        }
      : isMyDecision && isMainAction
        ? {
            kind: "endPhase",
            turnNumber: gameView.turnNumber,
            busy,
            onSubmit: submitEndPhase,
          }
        : { kind: "hidden" };

  const overlayModel: TableOverlayViewModel = {
    toast,
    cardMotionEffects,
    combatEffects,
    feedbackCues,
    generalPick: generalPickPending && generalPickWaitingName
      ? { playerName: generalPickWaitingName, remainingSeconds: generalPickRemaining }
      : null,
    notice,
    decision: route.kind === "modal" && pending
      ? { pending, gameView, hand: myHand, onAnswer: runAnswer }
      : null,
    playerInspection: inspecting
      ? {
          player: inspecting,
          onClose: transient.inspection.closePlayer,
          onInspectCard: transient.inspection.openCard,
        }
      : null,
    cardInspection: inspectingCard
      ? {
          card: inspectingCard.card,
          onClose: transient.inspection.closeCard,
          ...(inspectingCard.canChoose
            ? {
                onChoose: () => {
                  const card = inspectingCard.card;
                  transient.inspection.closeCard();
                  onTapCard(card);
                },
              }
            : {}),
        }
      : null,
    death: showDeathDialog
      ? {
          role: me.role,
          onSpectate: transient.death.dismiss,
          onLeave: () => void leaveRoom(),
        }
      : null,
    leaveConfirm: confirmingLeave
      ? {
          onConfirm: () => {
            transient.leaveConfirm.close();
            void leaveRoom();
          },
          onCancel: transient.leaveConfirm.close,
        }
      : null,
    playChoice: playChoices
      ? {
          choice: playChoices,
          viewerName: me.name,
          onClose: transient.playChoice.close,
          onChoose: (card, option) => {
            transient.playChoice.close();
            proceedPlay(card, option);
          },
        }
      : null,
    discard: showDiscard
      ? {
          cardsNewestFirst: [...gameView.discardPile].reverse(),
          onInspect: transient.inspection.openCard,
          onClose: transient.discard.close,
        }
      : null,
    diagnostics: {
      open: showDebug,
      lines: debug,
      error,
      onToggle: () => setShowDebug((current) => !current),
    },
  };

  return (
    <div className="war-table-bg table-theme" style={{ position: "relative" }}>
      <div className="war-table-rays" />
      <TableUtilityRail onRequestLeave={transient.leaveConfirm.open} />
      {/* Board + history share ONE flex row (column when narrow) so history
          always owns its own reserved column and never floats over the board
          — previously a position:fixed sidebar could overlap GameBoard's own
          independently-centered viewport-height block at normal desktop widths. */}
      <div
        className="table-screen-shell"
        style={
          compact
            ? { display: "flex", flexDirection: narrow ? "column" : "row", height: "100vh", overflow: "hidden", position: "relative" }
            : { display: "flex", flexDirection: narrow ? "column" : "row", minHeight: "100vh", position: "relative" }
        }
      >
      <GameHistoryPanel gameView={gameView} narrow={narrow} />

      <GameBoard
        gameView={gameView}
        me={me}
        others={others}
        currentTurnPlayerId={gameView.currentTurnPlayerId}
        targetableFor={targetableFor}
        selectedTargetIds={selectedTargetIds}
        onTapTarget={onTapTarget}
        onInspect={transient.inspection.openPlayer}
        attackDistanceFor={(p) => attackDistance(me, p, gameView.players)}
        weaponRangeSelf={weaponRange(me)}
        phaseLabel={phaseLabel}
        responderLabel={responderLabel}
        actionPrompt={drawActionPrompt}
        pendingReveal={pendingPileAction}
        revealTitle={pileActionTitle}
        onReveal={() => {
          if (!pending) return;
          if (pending.kind === "drawCard") void runAnswer({ decisionId: pending.id, choice: "draw" });
          else void runAnswer({ decisionId: pending.id, choice: "reveal" });
        }}
        busy={busy}
        onOpenDiscard={transient.discard.open}
        contextHelp={contextHelp ? <ContextHelpPanel key={decisionKey ?? "no-decision"} model={contextHelp} /> : null}
        selfDock={
          <SelfDock
            me={me}
            isMyTurn={isMyTurn}
            skills={skills}
            myHand={myHand}
            drawnIds={drawnIds}
            selecting={selecting}
            selectingLabel={selectingLabel}
            getCardState={getCardState}
            selectedCardIds={selectedCardIds}
            onTapCard={onTapCard}
            onInspectCard={transient.inspection.openCard}
            selfTargetable={selfTargetable}
            selfTargetSelected={selectedTargetIds.includes(me.id)}
            onToggleSelfTarget={mainAction.targets.toggleSelf}
            pendingActivateId={pendingActivateId}
            pendingActivateMode={pendingActivateMode}
            skillMode={skillMode}
            activeSkillOptions={activeSkillOptions}
            busy={busy}
            onUseSkill={(skillId) => {
              selection.commands.beginSkill(skillId);
            }}
            onAnswerActivate={answerActivate}
            isMyDecision={isMyDecision}
            isMainAction={isMainAction}
            zhangbaAvailable={!!zhangbaAvailable}
            zhangbaMode={zhangbaMode}
            onToggleZhangba={mainAction.zhangba.toggle}
            onInspect={() => transient.inspection.openPlayer(me)}
            equipSlots={equipSlotsWithCards}
            showHero={compact}
          />
        }
      />
      </div>

      <TableActionCluster action={tableAction} />

      <TableOverlays model={overlayModel} />
      <FirstTableWalkthrough />
    </div>
  );
}
