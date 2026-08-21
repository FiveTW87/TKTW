import { useEffect, useRef, useState } from "react";
import type { Card, LegalActionView, PlayerView } from "@tktw/shared";
import { useGameStore } from "../store/gameStore";
import { GameBoard } from "../components/board/GameBoard";
import { SelfDock, SfxControl, type CardTapState } from "../components/board/SelfDock";
import { RulesButton } from "../components/RulesModal";
import { GameHistoryPanel } from "../components/board/GameHistoryPanel";
import { DecisionModal } from "../components/DecisionModal";
import { InspectModal } from "../components/InspectModal";
import { DeathDialog } from "../components/DeathDialog";
import { ModalOverlay, ModalPanel, ModalGlyph } from "../components/Modal";
import { SkillToast, type ToastData } from "../components/SkillToast";
import { describeDecision } from "../data/decisionCopy";
import { cardDisplay } from "../data/cardNames";
import { generalDisplay } from "../data/generalNames";
import { generalSkills, skillById } from "../data/generalSkills";
import { cardMeta, type EquipSlot } from "../data/cardMeta";
import { skillInteraction, sameFactionTeammateAlive } from "../data/skillInteraction";
import { clientCountsAs } from "../data/conversions";
import { attackDistance, weaponRange } from "../data/distance";
import { useCountdown } from "../lib/useCountdown";
import { useIsNarrow } from "../lib/useIsNarrow";
import { useDeviceMode } from "../lib/useDeviceMode";
import { useInteraction } from "../hooks/useInteraction";
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

type PlayCardOption = Extract<LegalActionView, { kind: "playCard" }>["options"][number];
type ActiveSkillOption = Extract<LegalActionView, { kind: "useSkill" }>["options"][number];

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
  const { selectedCardIds, selectedTargetIds, skillMode, zhangbaMode, selectedAsType } = interaction;

  // Dialog / animation state stays local (SPEC §11.1's 4-way split) — never
  // reset by the decision-change effect above.
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState<PlayerView | null>(null);
  const [inspectingCard, setInspectingCard] = useState<{ card: Card; canChoose: boolean } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [playChoices, setPlayChoices] = useState<{ card: Card; options: PlayCardOption[] } | null>(null);
  const [deathDialogDismissedFor, setDeathDialogDismissedFor] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [drawnIds, setDrawnIds] = useState<Set<string>>(() => new Set());
  const prevHandIdsRef = useRef<Set<string>>(new Set());
  const prevDiscardTopIdRef = useRef<string | null | undefined>(undefined);
  const prevLogCountRef = useRef<number | null>(null);
  const prevTurnPlayerIdRef = useRef<string | null | undefined>(undefined);
  const autoHandledRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 1900);
  };

  const me = gameView?.players.find((p) => p.id === gameView.viewerPlayerId);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
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

  // ── Auto-route skill decisions the engine asks about ──────────────────
  // The engine yields activateSkill for every non-locked trigger skill; here
  // we answer the ones that shouldn't bother the player (beneficial autos,
  // and a lord's hujia with no eligible teammate), and auto-accept fankui's
  // steal. Everything else falls through to the inline row / dialog.
  useEffect(() => {
    if (!gameView || !me || !pending) return;
    if (pending.playerId !== gameView.viewerPlayerId) return;
    if (autoHandledRef.current === pending.id) return;

    const accept = () => {
      autoHandledRef.current = pending.id;
      void answer({ decisionId: pending.id });
    };
    const pass = () => {
      autoHandledRef.current = pending.id;
      void answer({ decisionId: pending.id, pass: true });
    };

    if (pending.kind === "fankuiPick") {
      accept();
      return;
    }
    // ไร้ช่องโหว่: no general can convert anything into a wuxie, so if it's
    // not literally in hand the player can never respond — skip the prompt.
    if (pending.kind === "askWuxie") {
      const hand = Array.isArray(me.hand) ? me.hand : [];
      if (!hand.some((c) => c.typeKey === "wuxie")) pass();
      return;
    }
    // ท้อ (dying rescue): if the player holds nothing that counts as ท้อ, they
    // can't help — skip the prompt instead of asking. (หัวโต๋ can turn a red
    // card into ท้อ off-turn, so use the conversion-aware check.)
    if (pending.kind === "respondTao") {
      const hand = Array.isArray(me.hand) ? me.hand : [];
      const isOwnTurn = gameView.currentTurnPlayerId === me.id;
      if (!hand.some((c) => clientCountsAs(c, "tao", me.generalId, isOwnTurn))) pass();
      return;
    }
    if (pending.kind === "activateSkill") {
      const sid = String((pending.data as { skillId?: string }).skillId ?? "");
      const mode = skillInteraction(sid);
      if (mode === "autoToast") {
        const sk = skillById(sid);
        setToast({ glyph: generalDisplay(me.generalId).glyph, name: sk?.name ?? sid, owner: generalDisplay(me.generalId).name });
        if (toastTimer.current !== null) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 1600);
        accept();
      } else if (mode === "autoSilent") {
        accept();
      } else if (mode === "hujia" && !sameFactionTeammateAlive(gameView, me)) {
        pass();
      }
    }
  }, [pending?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isMyDecision = pending?.playerId === gameView.viewerPlayerId;
  const isMainAction = pending?.kind === "mainAction";
  const isDiscardTo = pending?.kind === "discardTo";

  // Which activateSkill (if any) is pending for me, and how to route it.
  const pendingActivateId =
    pending?.kind === "activateSkill" && isMyDecision ? String((pending.data as { skillId?: string }).skillId ?? "") : null;
  const pendingActivateMode = pendingActivateId ? skillInteraction(pendingActivateId) : undefined;

  // Modal only for reactive decisions that aren't auto-handled / inline.
  const noWuxieInHand = !myHand.some((c) => c.typeKey === "wuxie");
  const canRespondTao = myHand.some((c) => clientCountsAs(c, "tao", me.generalId, gameView.currentTurnPlayerId === me.id));
  let showDecisionModal = false;
  if (pending && isMyDecision && !isMainAction && !isDiscardTo) {
    // judgmentReveal is handled on the board (tap the draw pile), not a modal.
    if (pending.kind === "fankuiPick" || pending.kind === "judgmentReveal") showDecisionModal = false;
    else if (pending.kind === "drawCard") showDecisionModal = false; // a board button, not a modal
    else if (pending.kind === "askWuxie") showDecisionModal = !noWuxieInHand; // auto-passed otherwise
    else if (pending.kind === "respondTao") showDecisionModal = canRespondTao; // auto-passed otherwise
    else if (pending.kind === "activateSkill") {
      // hujia shows a dialog only when a teammate can actually help; unknown
      // skills fall back to a dialog; auto*/inline never show a modal.
      showDecisionModal =
        pendingActivateMode === undefined ||
        (pendingActivateMode === "hujia" && sameFactionTeammateAlive(gameView, me));
    } else showDecisionModal = true;
  }

  // A judgment reveal AND a mandatory draw are both answered by tapping the
  // draw pile itself (see the mat) instead of a separate floating dialog.
  const pendingJudgmentReveal = isMyDecision && pending?.kind === "judgmentReveal";
  const pendingDraw = isMyDecision && pending?.kind === "drawCard";
  const pendingPileAction = pendingJudgmentReveal || pendingDraw;
  const revealCopy = pendingJudgmentReveal && pending ? describeDecision(pending, gameView) : null;
  const drawCount = pendingDraw && pending ? Number((pending.data as { count?: number }).count ?? 2) : 0;
  const drawSkillNames = pendingDraw && pending ? ((pending.data as { skills?: string[] }).skills ?? []).map((s) => skillById(s)?.name ?? s) : [];
  const pileActionTitle = pendingJudgmentReveal ? revealCopy?.title : pendingDraw ? `จั่ว ${drawCount} ใบ` : undefined;
  const drawActionPrompt = pendingDraw ? `เฟสจั่ว — จั่ว ${drawCount} ใบ` + (drawSkillNames.length ? ` ⚡ ${drawSkillNames.join(", ")}` : "") : null;

  const selecting = isMyDecision && (isMainAction || isDiscardTo);
  const legalActions = gameView.legalActions ?? [];
  const playCardAction = legalActions.find((action) => action.kind === "playCard");
  const useSkillAction = legalActions.find((action) => action.kind === "useSkill");
  const playCardOptions = playCardAction?.options ?? [];
  const activeSkillOptions = useSkillAction?.options ?? [];
  const selectedPlayCard = !skillMode ? myHand.find((c) => c.id === selectedCardIds[0]) : undefined;
  const selectedPlayOption = zhangbaMode
    ? playCardOptions.find((option) => option.source === "zhangba")
    : selectedPlayCard
      ? playCardOptions.find(
          (option) =>
            option.source !== "zhangba" &&
            option.selectableCardIds.includes(selectedPlayCard.id) &&
            (option.asType ?? null) === selectedAsType,
        )
      : undefined;
  const selectedSkillOption = skillMode
    ? activeSkillOptions.find((option) => option.skillId === skillMode)
    : undefined;
  const selectedOption = selectedSkillOption ?? selectedPlayOption;
  const targeting = selectedOption?.targeting;
  const targetRange = targeting
    ? { min: targeting.minTargets, max: targeting.maxTargets }
    : { min: 0, max: 0 };

  // Card-first: in skill mode, targets only light up once the required discard
  // cards are chosen (so you pick the card to spend, THEN the targets).
  const skillCardsReady = !selectedOption || selectedCardIds.length >= selectedOption.minCards;
  const targetsActive =
    isMyDecision &&
    isMainAction &&
    targetRange.max > 0 &&
    skillCardsReady &&
    (targeting?.kind === "independent" || targeting?.kind === "dependent");
  const selfTargetable =
    !!targetsActive &&
    targeting?.kind === "independent" &&
    targeting.eligibleTargetIds.includes(me.id);
  const showConfirmBar = isMyDecision && isMainAction && (skillMode !== null || zhangbaMode || selectedCardIds.length > 0);
  const mustDiscard = isDiscardTo ? Number((pending!.data as { mustDiscard?: number }).mustDiscard ?? 0) : 0;

  const targetCountOk = selectedTargetIds.length >= targetRange.min && selectedTargetIds.length <= targetRange.max;
  const cardCountOk = selectedOption
    ? selectedCardIds.length >= selectedOption.minCards && selectedCardIds.length <= selectedOption.maxCards
    : false;
  const confirmOk = targetCountOk && cardCountOk && selectedOption?.available === true;

  // Tapping a target respects the max: at the cap, a new tap replaces the
  // oldest pick (so a single-target action always ends with exactly one).
  const toggleTarget = (playerId: string) => {
    const prev = selectedTargetIds;
    const next = prev.includes(playerId)
      ? prev.filter((id) => id !== playerId)
      : prev.length < targetRange.max
      ? [...prev, playerId]
      : [...prev.slice(1), playerId]; // at cap → drop oldest, add new
    dispatch({ type: "SELECT_TARGETS", ids: next });
  };

  const targetableFor = (p: PlayerView): boolean => {
    if (!targetsActive || !targeting) return false;
    if (selectedTargetIds.includes(p.id)) return true;
    if (targeting.kind === "independent") return targeting.eligibleTargetIds.includes(p.id);
    if (targeting.kind === "dependent") {
      const first = selectedTargetIds[0];
      return first
        ? (targeting.secondTargetIdsByFirst[first] ?? []).includes(p.id)
        : targeting.firstTargetIds.includes(p.id);
    }
    return false;
  };
  const onTapTarget = (pid: string) => {
    if (targeting?.kind === "dependent") {
      const prev = selectedTargetIds;
      const next =
        prev[0] === pid ? [] // re-tap the armed player → reset both steps
        : prev[1] === pid ? [prev[0]!] // re-tap the victim → drop it
        : prev.length === 0 ? [pid] // step 1: the armed player
        : [prev[0]!, pid]; // step 2: the victim (replaces any prior victim)
      dispatch({ type: "SELECT_TARGETS", ids: next });
      return;
    }
    toggleTarget(pid);
  };

  const runAnswer = async (fields: Parameters<typeof answer>[0]) => {
    setBusy(true);
    try {
      await answer(fields);
    } finally {
      // Always release — even if the ack somehow never comes, the UI must
      // never lock up (this is the "second สังหาร froze the game" guard).
      setBusy(false);
    }
  };
  const resetSelection = () => dispatch({ type: "RESET" });

  // Resolve a tap into an actual play, given the chosen effective type. `asType`
  // is set only for conversion plays (Guan Yu red→สังหาร etc.).
  const proceedPlay = (card: Card, opt: PlayCardOption) => {
    if (!pending) return;
    const asType = opt.asType ?? null;
    if (!opt.available) {
      const message = opt.unavailableReason === "no_legal_target"
        ? "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา"
        : opt.unavailableReason === "sha_usage_limit"
          ? `ลง "${cardDisplay(opt.typeKey).name}" ได้ครั้งเดียวต่อเทิร์น`
          : "ตอนนี้ยังใช้การ์ดนี้ไม่ได้";
      showNotice(message);
      return;
    }
    if (
      opt.targeting.kind === "independent" &&
      opt.targeting.implicitTargetId === me.id &&
      opt.targeting.eligibleTargetIds.length === 1
    ) {
      void runAnswer({
        decisionId: pending.id,
        choice: "playCard",
        cardIds: [card.id],
        targetIds: [],
        ...(asType ? { asType } : {}),
      });
      return;
    }
    if (opt.targeting.kind === "none" || opt.targeting.kind === "fixed") {
      const meta = cardMeta(card.typeKey);
      const replacing = !asType && meta.targetRule === "equipment" && meta.slot && !!me.equipment[meta.slot as EquipSlot];
      if (!replacing) {
        void runAnswer({
          decisionId: pending.id,
          choice: "playCard",
          cardIds: [card.id],
          targetIds: [],
          ...(asType ? { asType } : {}),
        });
        return;
      }
    }
    dispatch({ type: "SELECT_CARDS", ids: [card.id] });
    dispatch({ type: "SET_AS_TYPE", asType });
    const soleTarget = opt.targeting.kind === "independent" && opt.targeting.eligibleTargetIds.length === 1
      ? opt.targeting.eligibleTargetIds
      : [];
    dispatch({ type: "SELECT_TARGETS", ids: soleTarget });
  };

  // Tap a hand card. Skill-mode / discard toggle multi-select; otherwise figure
  // out the ways it can be played (its own type + any conversion) and either
  // proceed directly or ask "play as?" when there's more than one.
  const onTapCard = (card: Card) => {
    if (!pending) return;
    if (skillMode || isDiscardTo || zhangbaMode) {
      // ENG-002: a discard can't select more than the required count.
      const selectable = (pending.data as { selectableCardIds?: string[] }).selectableCardIds;
      const prev = selectedCardIds;
      if (prev.includes(card.id)) {
        dispatch({ type: "SELECT_CARDS", ids: prev.filter((id) => id !== card.id) });
        return;
      }
      if (skillMode && !selectedSkillOption?.selectableCardIds.includes(card.id)) return;
      if (zhangbaMode && !selectedPlayOption?.selectableCardIds.includes(card.id)) return;
      if (isDiscardTo && selectable && !selectable.includes(card.id)) return; // not discardable
      if (isDiscardTo && mustDiscard > 0 && prev.length >= mustDiscard) return; // at the cap
      dispatch({ type: "SELECT_CARDS", ids: [...prev, card.id] });
      return;
    }
    if (!isMainAction) return;
    if (selectedCardIds.includes(card.id)) {
      resetSelection();
      return;
    }
    const opts = playCardOptions.filter(
      (option) => option.source !== "zhangba" && option.selectableCardIds.includes(card.id),
    );
    if (opts.length === 0) {
      showNotice("การ์ดนี้ใช้ตอนถูกกระทำเท่านั้น");
      return;
    }
    const availableOpts = opts.filter((option) => option.available);
    if (availableOpts.length === 0) {
      proceedPlay(card, opts[0]!);
      return;
    }
    if (availableOpts.length === 1) {
      proceedPlay(card, availableOpts[0]!);
      return;
    }
    setPlayChoices({ card, options: availableOpts }); // "play as?" chooser
  };

  const getCardState = (c: Card): CardTapState => {
    const inSelectMode = skillMode !== null || zhangbaMode;
    const skillSelectable = selectedSkillOption?.selectableCardIds.includes(c.id) ?? false;
    const zhangbaSelectable = selectedPlayOption?.selectableCardIds.includes(c.id) ?? false;
    const hasPlayOption = playCardOptions.some(
      (option) => option.source !== "zhangba" && option.selectableCardIds.includes(c.id),
    );
    const canSelect = skillMode ? skillSelectable : zhangbaMode ? zhangbaSelectable : hasPlayOption;
    const tappable = selecting && (!isMainAction || canSelect);
    const dimmed = isMainAction && (inSelectMode || playCardOptions.length > 0) && !canSelect;
    return { tappable, dimmed };
  };

  const submitConfirm = () => {
    if (!pending) return;
    if (skillMode) {
      void runAnswer({ decisionId: pending.id, choice: "useSkill", skillId: skillMode, cardIds: selectedCardIds, targetIds: selectedTargetIds });
    } else {
      // zhangbaMode also plays a card, just with 2 cardIds (engine's playZhangbaSha).
      void runAnswer({ decisionId: pending.id, choice: "playCard", cardIds: selectedCardIds, targetIds: selectedTargetIds, ...(selectedAsType ? { asType: selectedAsType } : {}) });
    }
  };
  const submitEndPhase = () => pending && void runAnswer({ decisionId: pending.id, choice: "endPhase" });
  const submitDiscard = () => pending && void runAnswer({ decisionId: pending.id, cardIds: selectedCardIds });
  const answerActivate = (accept: boolean) => {
    if (!pending) return;
    autoHandledRef.current = pending.id;
    void runAnswer(accept ? { decisionId: pending.id } : { decisionId: pending.id, pass: true });
  };

  const skills = generalSkills(me.generalId);
  const waitingCopy = pending && !isMyDecision ? describeDecision(pending, gameView) : null;
  const responderLabel =
    pending && !isMyDecision && waitingCopy
      ? `${gameView.players.find((p) => p.id === pending!.playerId)?.name ?? pending!.playerId}: ${waitingCopy.title}`
      : null;

  const chosenCardNames = selectedCardIds.map((id) => cardDisplay(myHand.find((c) => c.id === id)?.typeKey ?? "").name).filter(Boolean);
  const chosenTargetNames = selectedTargetIds.map((id) => gameView.players.find((p) => p.id === id)?.name).filter(Boolean);
  let confirmText: string;
  if (skillMode) {
    const sk = skills.find((s) => s.id === skillMode);
    const hints: string[] = [];
    if (selectedSkillOption && !cardCountOk) {
      hints.push(selectedSkillOption.minCards === selectedSkillOption.maxCards ? `เลือกการ์ด ${selectedSkillOption.minCards} ใบ` : `เลือกการ์ด ${selectedSkillOption.minCards}+ ใบ`);
    }
    if (selectedSkillOption && selectedSkillOption.targeting.maxTargets > 0 && !targetCountOk) {
      if (!skillCardsReady) hints.push("เลือกการ์ดทิ้งก่อน");
      else hints.push(`เลือกเป้าหมาย ${targetRange.min}${targetRange.min !== targetRange.max ? `-${targetRange.max}` : ""} คน`);
    }
    confirmText =
      `ใช้สกิล "${sk?.name ?? skillMode}"` +
      (chosenCardNames.length ? ` · การ์ด: ${chosenCardNames.join(", ")}` : "") +
      (chosenTargetNames.length ? ` → ${chosenTargetNames.join(", ")}` : "") +
      (hints.length ? ` — ${hints.join(", ")}` : "");
  } else if (selectedPlayOption?.targeting.kind === "dependent") {
    // step-aware hint: pick an armed player, then who they must attack
    const step = selectedTargetIds.length === 0 ? "เลือกคนที่มีอาวุธ" : selectedTargetIds.length === 1 ? "เลือกเป้าที่คนนั้นตีถึง" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("jiedao").name} — ${step}` + (chosenTargetNames.length ? ` (${chosenTargetNames.join(" → ")})` : "");
  } else if (zhangbaMode) {
    const step = selectedCardIds.length < 2 ? `เลือกการ์ด 2 ใบ (เลือกแล้ว ${selectedCardIds.length})` : !targetCountOk ? "เลือกเป้าในระยะ" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("zhangba").name} (2 ใบ = ${cardDisplay("sha").name}) — ${step}` + (chosenTargetNames.length ? ` → ${chosenTargetNames.join(", ")}` : "");
  } else {
    const needMore = targetRange.max > 0 && !targetCountOk;
    const needLabel = targetRange.min === targetRange.max ? `เลือกเป้าหมาย ${targetRange.min} คน` : `เลือกเป้าหมาย ${targetRange.min}-${targetRange.max} คน`;
    confirmText = `ลง "${chosenCardNames.join(", ")}"` + (needMore ? ` — ${needLabel} (เลือกแล้ว ${selectedTargetIds.length})` : chosenTargetNames.length ? ` ใส่ ${chosenTargetNames.join(", ")}` : "");
  }

  const selectingLabel = skillMode ? "เลือกการ์ดสำหรับสกิล" : zhangbaMode ? "เลือกการ์ด 2 ใบสำหรับทวน" : isDiscardTo ? "เลือกการ์ดที่จะทิ้ง" : "แตะการ์ดเพื่อเล่น";
  const phaseLabel = (gameView.currentPhase && PHASE_LABEL[gameView.currentPhase]) ?? gameView.currentPhase ?? "";
  const isMyTurn = gameView.currentTurnPlayerId === me.id;
  const equipSlotsWithCards = EQUIP_SLOTS.map((s) => ({ ...s, card: me.equipment[s.slot] }));
  const zhangbaOption = playCardOptions.find((option) => option.source === "zhangba");
  const zhangbaAvailable = zhangbaOption?.available === true;

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
            onToggleSelfTarget={() => toggleTarget(me.id)}
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
            onToggleZhangba={() => {
              if (zhangbaMode) { resetSelection(); return; }
              if (!zhangbaOption?.available) {
                showNotice(zhangbaOption?.unavailableReason === "insufficient_cards" ? "ต้องมีการ์ดอย่างน้อย 2 ใบ" : "ตอนนี้ยังใช้ทวนงูเลื้อยไม่ได้");
                return;
              }
              resetSelection();
              dispatch({ type: "SET_ZHANGBA_MODE", on: true });
            }}
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
      {showDecisionModal && pending && <DecisionModal pending={pending} gameView={gameView} myHand={myHand} onAnswer={runAnswer} />}
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
