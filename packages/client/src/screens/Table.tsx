import { useEffect, useRef, useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import { useGameStore } from "../store/gameStore";
import { GameBoard } from "../components/board/GameBoard";
import { SelfDock, SfxControl } from "../components/board/SelfDock";
import { RulesButton } from "../components/RulesModal";
import { GameHistoryPanel } from "../components/board/GameHistoryPanel";
import { DecisionModal } from "../components/DecisionModal";
import { InspectModal } from "../components/InspectModal";
import { DeathDialog } from "../components/DeathDialog";
import { ModalOverlay, ModalPanel, ModalGlyph } from "../components/Modal";
import { SkillToast } from "../components/SkillToast";
import { cardDisplay } from "../data/cardNames";
import { generalSkills } from "../data/generalSkills";
import type { EquipSlot } from "../data/cardMeta";
import { attackDistance, weaponRange } from "../data/distance";
import { useCountdown } from "../lib/useCountdown";
import { useIsNarrow } from "../lib/useIsNarrow";
import { useDeviceMode } from "../lib/useDeviceMode";
import { useInteraction } from "../hooks/useInteraction";
import { useDecisionController } from "../hooks/useDecisionController";
import { createMainActionController, type PlayChoice } from "../hooks/mainActionController";
import { HandCard } from "../components/HandCard";
import { CombatEffectLayer } from "../components/board/CombatEffectLayer";
import { playSfx } from "../lib/sfx";
import { CardInspectModal } from "../components/CardInspectModal";
import { useCombatPresentation } from "../hooks/useCombatPresentation";

const PHASE_LABEL: Record<string, string> = {
  prepare: "เฟสเตรียมตัว",
  judge: "เฟสตัดสิน",
  draw: "เฟสจั่วไพ่",
  play: "เฟสลงการ์ด",
  discard: "เฟสทิ้งไพ่",
  end: "เฟสจบเทิร์น",
};

function LeaveGameConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <ModalPanel width={380}>
        <ModalGlyph>退</ModalGlyph>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>ออกจากเกมตอนนี้?</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 18 }}>
          ตัวละครของคุณจะเสียชีวิตทันที และกลับเข้าเกมเดิมไม่ได้
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onConfirm} className="btn-danger" style={{ padding: "10px 22px", fontSize: 14 }}>
            ยืนยัน
          </button>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: "10px 22px", fontSize: 14 }}>
            ยกเลิก
          </button>
        </div>
      </ModalPanel>
    </ModalOverlay>
  );
}

const EQUIP_SLOTS: { slot: EquipSlot; label: string; glyph: string }[] = [
  { slot: "weapon", label: "อาวุธ", glyph: "兵" },
  { slot: "armor", label: "เกราะ", glyph: "甲" },
  { slot: "horseMinus", label: "ม้า −1", glyph: "馬" },
  { slot: "horsePlus", label: "ม้า +1", glyph: "馬" },
];

export function Table() {
  const gameView = useGameStore((s) => s.gameView);
  const answer = useGameStore((s) => s.answer);
  const error = useGameStore((s) => s.error);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const debug = useGameStore((s) => s.debug);
  const combatEffects = useCombatPresentation(gameView?.gameLogs, gameView?.players);
  const [showDebug, setShowDebug] = useState(false);
  const narrow = useIsNarrow(); // mobile / small-tablet: stack the history sidebar
  const { compact } = useDeviceMode();

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
  const [interaction, dispatch] = useInteraction(decisionKey);
  const { selectedCardIds, selectedTargetIds, skillMode, zhangbaMode } = interaction;

  // Dialog / animation state stays local (SPEC §11.1's 4-way split) — never
  // reset by the decision-change effect above.
  const [inspecting, setInspecting] = useState<PlayerView | null>(null);
  const [inspectingCard, setInspectingCard] = useState<{ card: Card; canChoose: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [playChoices, setPlayChoices] = useState<PlayChoice | null>(null);
  const [deathDialogDismissedFor, setDeathDialogDismissedFor] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [drawnIds, setDrawnIds] = useState<Set<string>>(() => new Set());
  const prevHandIdsRef = useRef<Set<string>>(new Set());
  const prevDiscardTopIdRef = useRef<string | null | undefined>(undefined);
  const prevLogCountRef = useRef<number | null>(null);
  const prevTurnPlayerIdRef = useRef<string | null | undefined>(undefined);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 1900);
  };

  const me = gameView?.players.find((p) => p.id === gameView.viewerPlayerId);
  const decision = useDecisionController({ gameView, me, answer });
  const {
    isMyDecision,
    isMainAction,
    isDiscardTo,
    route,
    pendingActivateId,
    pendingActivateMode,
    busy,
    toast,
    runAnswer,
    answerActivate,
  } = decision;

  useEffect(() => {
    return () => {
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    setInspectingCard(null);
  }, [decisionKey]);

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

  // ── Sound effects: card play, skill use, draw, damage, turn start ─────
  // Each diffs the current snapshot against the previous one and skips the
  // very first snapshot (mount / reconnect), same shape as the hand-draw
  // effect above — otherwise rejoining a match replays every past event.
  const discardTopId = gameView?.discardPileTop?.id ?? null;
  useEffect(() => {
    const prev = prevDiscardTopIdRef.current;
    prevDiscardTopIdRef.current = discardTopId;
    if (prev === undefined) return; // skip first snapshot
    if (discardTopId && discardTopId !== prev) playSfx("cardPlay");
  }, [discardTopId]);

  const logCount = gameView?.gameLogs.length ?? 0;
  useEffect(() => {
    const prev = prevLogCountRef.current;
    const logs = gameView?.gameLogs ?? [];
    prevLogCountRef.current = logCount;
    if (prev === null) return; // skip first snapshot
    for (const entry of logs.slice(prev)) {
      if (entry.eventType === "skillUse") playSfx("skillUse");
      else if (entry.eventType === "draw" && entry.actorId === me?.id) playSfx("draw");
      else if (entry.eventType === "damage" || entry.eventType === "hpLoss") playSfx("damage");
      else if (entry.eventType === "dodge") playSfx("dodge");
      else if (entry.eventType === "heal") playSfx("heal");
      else if (entry.eventType === "death") playSfx("death");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logCount]);

  useEffect(() => {
    const prev = prevTurnPlayerIdRef.current;
    prevTurnPlayerIdRef.current = gameView?.currentTurnPlayerId ?? null;
    if (prev === undefined) return; // skip first snapshot
    if (gameView?.currentTurnPlayerId && gameView.currentTurnPlayerId !== prev && gameView.currentTurnPlayerId === me?.id) {
      playSfx("turnStart");
    }
  }, [gameView?.currentTurnPlayerId, me?.id]);

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="panel-plain" style={{ width: 460, maxWidth: "100%", padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--red)" }}>เกมค้าง — ไม่มีตาให้เล่น</div>
          <div style={{ marginTop: 8, color: "var(--ink-muted)", fontSize: 14 }}>
            เซิร์ฟเวอร์ไม่ได้ส่งตาถัดไปมา ลองรีเฟรชหน้า หรือออกจากห้อง
          </div>
          <div style={{ marginTop: 16, textAlign: "left", background: "rgba(28,22,14,.92)", color: "#e8dcc0", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 11, maxHeight: 180, overflow: "auto" }}>
            {[...debug].reverse().slice(0, 12).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
            <button onClick={() => window.location.reload()} className="btn-secondary" style={{ padding: "11px 22px", fontSize: 14 }}>รีเฟรช</button>
            <button onClick={leaveRoom} className="btn-primary" style={{ padding: "11px 22px", fontSize: 14 }}>ออกจากห้อง</button>
          </div>
        </div>
      </div>
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
    gameView, me, pending, isMyDecision, isMainAction, isDiscardTo, interaction, dispatch,
    submit: runAnswer, notify: showNotice, requestPlayChoice: setPlayChoices,
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

  const selectingLabel = skillMode ? "เลือกการ์ดสำหรับสกิล" : zhangbaMode ? "เลือกการ์ด 2 ใบสำหรับทวน" : isDiscardTo ? "เลือกการ์ดที่จะทิ้ง" : "แตะการ์ดเพื่อเล่น";
  const phaseLabel = (gameView.currentPhase && PHASE_LABEL[gameView.currentPhase]) ?? gameView.currentPhase ?? "";
  const isMyTurn = gameView.currentTurnPlayerId === me.id;
  const equipSlotsWithCards = EQUIP_SLOTS.map((s) => ({ ...s, card: me.equipment[s.slot] }));
  const zhangbaAvailable = mainAction.zhangba.available;

  const showDeathDialog = !me.alive && deathDialogDismissedFor !== gameView.matchId;

  return (
    <div className="war-table-bg table-theme" style={{ position: "relative" }}>
      <div className="war-table-rays" />
      <nav className="table-utility-rail" aria-label="เมนูโต๊ะเล่น">
        <div title="วิธีเล่นและกติกา">
          <RulesButton label="วิธีเล่น & กติกา" iconOnly style={{ width: 44, height: 44, padding: 0, fontSize: 17 }} />
        </div>
        <SfxControl compact iconOnly />
        <button className="table-utility-leave" onClick={() => setConfirmingLeave(true)} aria-label="ออกจากเกม" title="ออกจากเกม">
          退
        </button>
      </nav>
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
        onInspect={setInspecting}
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
        onOpenDiscard={() => setShowDiscard(true)}
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
            onInspectCard={(card, canChoose) => setInspectingCard({ card, canChoose })}
            selfTargetable={selfTargetable}
            selfTargetSelected={selectedTargetIds.includes(me.id)}
            onToggleSelfTarget={mainAction.targets.toggleSelf}
            pendingActivateId={pendingActivateId}
            pendingActivateMode={pendingActivateMode}
            skillMode={skillMode}
            activeSkillOptions={activeSkillOptions}
            busy={busy}
            onUseSkill={(skillId) => {
              resetSelection();
              dispatch({ type: "SET_SKILL_MODE", skillId });
            }}
            onAnswerActivate={answerActivate}
            isMyDecision={isMyDecision}
            isMainAction={isMainAction}
            zhangbaAvailable={!!zhangbaAvailable}
            zhangbaMode={zhangbaMode}
            onToggleZhangba={mainAction.zhangba.toggle}
            onInspect={() => setInspecting(me)}
            equipSlots={equipSlotsWithCards}
            showHero={compact}
          />
        }
      />
      </div>

      {/* Consolidated bottom-right action cluster — one place for every
          confirm-style action instead of separate floating bars + a
          separate always-on end-turn button. Priority: confirm (+ its own
          cancel) > discard > end-turn > nothing. จบเทิร์น is deliberately
          hidden (not merged) while a confirm/discard is pending — you must
          resolve or cancel that first. */}
      {(() => {
        const showEndPhase = isMyDecision && isMainAction;
        const discardPending = isMyDecision && isDiscardTo;
        let caption: string;
        if (showConfirmBar) caption = confirmText || "เลือกการ์ด/เป้าหมาย";
        else if (discardPending) caption = `การ์ดเกินมือ — ทิ้ง ${selectedCardIds.length}/${mustDiscard} ใบ`;
        else if (showEndPhase) caption = `เทิร์นที่ ${gameView.turnNumber}`;
        else return null;

        return (
          <div
            className="table-action-cluster"
            style={{
              position: "fixed",
              right: "calc(24px + env(safe-area-inset-right, 0px))",
              bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
              zIndex: 60,
              textAlign: "center",
            }}
          >
            <div
              className="anim-rise"
              style={{
                marginBottom: 10,
                maxWidth: 260,
                fontSize: 12,
                fontWeight: 600,
                color: showConfirmBar || discardPending ? "var(--ink)" : "var(--ink-muted)",
                background: "rgba(20,14,9,.9)",
                border: "1px solid var(--panel-border-2)",
                borderRadius: 10,
                padding: "6px 12px",
                lineHeight: 1.4,
              }}
            >
              {caption}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              {showConfirmBar && (
                <button onClick={resetSelection} disabled={busy} className="btn-secondary table-action-cancel" style={{ width: 60, height: 60, borderRadius: "50%", fontSize: 11, fontWeight: 700 }}>
                  ยกเลิก
                </button>
              )}
              {showConfirmBar ? (
                <button onClick={submitConfirm} disabled={busy || !confirmOk} className="btn-primary table-action-primary" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 15, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
                  ยืนยัน
                </button>
              ) : discardPending ? (
                <button onClick={submitDiscard} disabled={busy || selectedCardIds.length !== mustDiscard} className="btn-primary table-action-primary" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 14, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
                  ทิ้ง {selectedCardIds.length}/{mustDiscard}
                </button>
              ) : (
                <button onClick={submitEndPhase} disabled={busy} className="btn-primary table-action-primary table-end-turn" style={{ width: 92, height: 92, borderRadius: "50%", fontSize: 15, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.6)" }}>
                  จบเทิร์น
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {toast && <SkillToast toast={toast} />}
      <CombatEffectLayer effects={combatEffects} />
      {generalPickPending && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(#241a11,#160f09)",
            border: "1px solid var(--panel-border-3)",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        >
          <span>รอ {generalPickWaitingName} เลือกนายพล...</span>
          {generalPickRemaining !== null && (
            <span style={{ fontSize: 12, fontWeight: 700, color: generalPickRemaining <= 5 ? "var(--target-red)" : "var(--ink-muted)" }}>
              เหลือ {generalPickRemaining} วิ
            </span>
          )}
        </div>
      )}
      {notice && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "linear-gradient(#241a11,#160f09)",
            border: "1px solid var(--panel-border-3)",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
            pointerEvents: "none",
          }}
        >
          {notice}
        </div>
      )}
      {route.kind === "modal" && pending && <DecisionModal pending={pending} gameView={gameView} myHand={myHand} onAnswer={runAnswer} />}
      {inspecting && (
        <InspectModal
          player={inspecting}
          onClose={() => setInspecting(null)}
          onInspectCard={(card) => setInspectingCard({ card, canChoose: false })}
        />
      )}
      {inspectingCard && (
        <CardInspectModal
          card={inspectingCard.card}
          onClose={() => setInspectingCard(null)}
          {...(inspectingCard.canChoose ? {
            onChoose: () => {
              const card = inspectingCard.card;
              setInspectingCard(null);
              onTapCard(card);
            },
          } : {})}
        />
      )}
      {showDeathDialog && (
        <DeathDialog
          role={me.role}
          onSpectate={() => setDeathDialogDismissedFor(gameView.matchId)}
          onLeave={() => void leaveRoom()}
        />
      )}
      {confirmingLeave && (
        <LeaveGameConfirmDialog
          onConfirm={() => { setConfirmingLeave(false); void leaveRoom(); }}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}
      {playChoices && (
        <ModalOverlay onClose={() => setPlayChoices(null)}>
          <ModalPanel width={360}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              เล่น "{cardDisplay(playChoices.card.typeKey).name}" เป็น?
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16 }}>{me.name} · เลือกวิธีเล่นการ์ดใบนี้</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {playChoices.options.map((opt) => (
                <button
                  key={opt.typeKey}
                  className="btn-primary"
                  style={{ padding: "10px 18px", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => {
                    const card = playChoices.card;
                    setPlayChoices(null);
                    proceedPlay(card, opt);
                  }}
                >
                  <span style={{ fontFamily: "var(--font-glyph)" }}>{cardDisplay(opt.typeKey).glyph}</span>
                  {cardDisplay(opt.typeKey).name}
                  {opt.asType && <span style={{ fontSize: 10, opacity: 0.8 }}>(แปลง)</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setPlayChoices(null)} className="btn-secondary" style={{ marginTop: 16, padding: "8px 16px", fontSize: 13 }}>
              ยกเลิก
            </button>
          </ModalPanel>
        </ModalOverlay>
      )}
      {showDiscard && (
        <ModalOverlay onClose={() => setShowDiscard(false)}>
          <ModalPanel width={560}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>กองทิ้ง · {gameView.discardPile.length} ใบ</span>
              <button onClick={() => setShowDiscard(false)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>ปิด</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10, textAlign: "left" }}>ใหม่สุดอยู่บนซ้าย · เอาเมาส์ชี้เพื่อดูรายละเอียด</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start", maxHeight: "60vh", overflowY: "auto", paddingTop: 40 }}>
              {[...gameView.discardPile].reverse().map((c, i) => (
                <HandCard key={`${c.id}-${i}`} card={c} selected={false} onInspect={() => setInspectingCard({ card: c, canChoose: false })} />
              ))}
            </div>
          </ModalPanel>
        </ModalOverlay>
      )}

      {/* Diagnostic trace — toggle the 🐛 button to see every decision/answer/
          error as it happens (for reporting freezes). */}
      <button
        onClick={() => setShowDebug((v) => !v)}
        title="แสดง/ซ่อน debug log"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 70,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: showDebug ? "var(--red)" : "linear-gradient(#241a11,#160f09)",
          border: "1px solid var(--panel-border-2)",
          cursor: "pointer",
          fontSize: 18,
          boxShadow: "0 4px 12px rgba(0,0,0,.5)",
        }}
      >
        🐛
      </button>
      {showDebug && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            left: 16,
            zIndex: 70,
            width: 420,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "50vh",
            overflow: "auto",
            background: "rgba(28,22,14,.94)",
            color: "#e8dcc0",
            border: "1px solid var(--panel-border-2)",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 11.5,
            lineHeight: 1.5,
            boxShadow: "0 12px 34px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <b style={{ color: "#f0d68a" }}>DEBUG LOG (ล่าสุดอยู่บน)</b>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{error ? `error: ${error}` : ""}</span>
          </div>
          {[...debug].reverse().map((line, i) => (
            <div key={i} style={{ whiteSpace: "pre-wrap", color: line.includes("✗") ? "#ff9a8a" : line.includes("⨯") ? "#ffcf6a" : "#cfe0c0" }}>
              {line}
            </div>
          ))}
          {debug.length === 0 && <div style={{ opacity: 0.6 }}>(ยังไม่มี event)</div>}
        </div>
      )}
    </div>
  );
}
