import { useEffect, useRef, useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
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
import { cardMeta, needsManualTarget, targetCount, type EquipSlot } from "../data/cardMeta";
import { skillInteraction, sameFactionTeammateAlive, activeSkillSpec } from "../data/skillInteraction";
import { mainActionPlays, clientCountsAs, type MainActionPlay } from "../data/conversions";
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

// Cards the engine rejects targeting yourself with (turnLoop.ts's
// NO_SELF_TARGET), and the subset of those whose whole effect is taking a
// card off the target — a target with nothing at all (hand count + public
// equipment) is not a legal target for them either (NEEDS_A_TAKEABLE_CARD).
const NO_SELF_TARGET_TYPES = new Set(["sha", "guohe", "shunshou"]);
const NEEDS_A_TAKEABLE_CARD_TYPES = new Set(["guohe", "shunshou"]);
function holdsSomething(p: PlayerView): boolean {
  const handCount = Array.isArray(p.hand) ? p.hand.length : p.hand.count;
  return handCount > 0 || Object.values(p.equipment).some(Boolean);
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
  const { selectedCardIds, selectedTargetIds, skillMode, zhangbaMode, selectedAsType } = interaction;

  // Dialog / animation state stays local (SPEC §11.1's 4-way split) — never
  // reset by the decision-change effect above.
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState<PlayerView | null>(null);
  const [inspectingCard, setInspectingCard] = useState<{ card: Card; canChoose: boolean } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [playChoices, setPlayChoices] = useState<{ card: Card; options: MainActionPlay[] } | null>(null);
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
  const selectedPlayCard = !skillMode ? myHand.find((c) => c.id === selectedCardIds[0]) : undefined;
  // The type the selected card is being played AS (conversion or its own type).
  const selectedEffType = selectedPlayCard ? selectedAsType ?? selectedPlayCard.typeKey : undefined;
  const selectedNeedsTarget = selectedEffType ? needsManualTarget(selectedEffType) : false;
  const skillSpec = skillMode ? activeSkillSpec(skillMode) : null;

  // ท้อ can now be played on anyone who's injured (self or another — "help a
  // hurt ally"). It needs a target picker, but unlike สังหาร the eligible set
  // depends on live HP, so it's decided here rather than in cardMeta.
  const injuredPlayers = gameView.players.filter((p) => p.alive && p.hp < p.maxHp);
  const someoneInjured = injuredPlayers.length > 0;
  const selectedIsTao = selectedEffType === "tao";
  const isJiedao = selectedEffType === "jiedao";
  // Active skills that need per-target eligibility (mirror the engine's rules
  // so the UI can't submit an invalid pick that the engine silently no-ops).
  const isLijian = skillMode === "diaochan_lijian"; // 2 male targets, they duel
  const isJieyuan = skillMode === "sunshangxiang_jieyuan"; // 1 injured other player
  const isQingnang = skillMode === "huatuo_qingnang"; // 1 injured target (incl self)
  const isTaoTarget = (p: PlayerView) => p.alive && p.hp < p.maxHp;

  // Target range for the current action: from the active skill's spec while in
  // skill mode, otherwise from the selected card's EFFECTIVE type (so a red
  // card played as สังหาร gets สังหาร targeting).
  const targetRange = skillSpec
    ? { min: skillSpec.minTargets, max: skillSpec.maxTargets }
    : zhangbaMode
    ? { min: 1, max: 1 }
    : selectedEffType
    ? targetCount(selectedEffType, { weaponIsFangtian: me.equipment.weapon?.typeKey === "fangtian", isLastCard: myHand.length === 1 })
    : { min: 0, max: 0 };

  // Card-first: in skill mode, targets only light up once the required discard
  // cards are chosen (so you pick the card to spend, THEN the targets).
  const skillCardsReady = zhangbaMode ? selectedCardIds.length >= 2 : !skillSpec || selectedCardIds.length >= skillSpec.minCards;
  const targetsActive = isMyDecision && isMainAction && targetRange.max > 0 && skillCardsReady && (skillMode !== null || selectedNeedsTarget || selectedIsTao || zhangbaMode);
  // Your own character card (not an opponent panel) can be a target too — for
  // ท้อ (help self) and for หัวโต๋'s ถุงยาเขียว (heal self).
  const selfTaoTargetable = !!targetsActive && selectedIsTao && isTaoTarget(me);
  const selfTargetable = selfTaoTargetable || (!!targetsActive && isQingnang && isTaoTarget(me));
  const showConfirmBar = isMyDecision && isMainAction && (skillMode !== null || zhangbaMode || selectedCardIds.length > 0);
  const mustDiscard = isDiscardTo ? Number((pending!.data as { mustDiscard?: number }).mustDiscard ?? 0) : 0;

  const targetCountOk = selectedTargetIds.length >= targetRange.min && selectedTargetIds.length <= targetRange.max;
  const cardCountOk = skillSpec
    ? selectedCardIds.length >= skillSpec.minCards && selectedCardIds.length <= skillSpec.maxCards
    : zhangbaMode
    ? selectedCardIds.length === 2
    : true;
  const confirmOk = targetCountOk && cardCountOk;

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

  // ยืมดาบฆ่าคน (jiedao) is picked one target at a time: [0] = an armed player,
  // [1] = someone that armed player can actually reach. Whether each opponent
  // lights up depends on which step we're on.
  const armedPick = isJiedao ? gameView.players.find((p) => p.id === selectedTargetIds[0]) : undefined;
  const targetableFor = (p: PlayerView): boolean => {
    if (!targetsActive || !p.alive) return false;
    // Self is legal only for the explicitly modelled healing actions above.
    // This also prevents cards such as ยืมดาบฆ่าคน from exposing self as the
    // armed first target on the desktop ring.
    if (p.id === me.id) return selfTargetable;
    if (zhangbaMode) return attackDistance(me, p, gameView.players) <= weaponRange(me); // สังหาร range
    if (selectedIsTao) return isTaoTarget(p);
    if (isJiedao) {
      if (selectedTargetIds.includes(p.id)) return true; // keep current picks visible/deselectable
      if (selectedTargetIds.length === 0) return !!p.equipment.weapon; // step 1: armed only
      if (!armedPick) return false;
      // step 2: only someone the chosen armed player can actually reach
      return p.id !== armedPick.id && attackDistance(armedPick, p, gameView.players) <= weaponRange(armedPick);
    }
    // ยุแยง (lijian): two MALE players (they duel — no range needed). Picks stay
    // visible; tapping a 2nd male appends, tapping a pick again deselects.
    if (isLijian) {
      if (selectedTargetIds.includes(p.id)) return true;
      return p.gender === "male";
    }
    // ผูกสัมพันธ์ (jieyuan): one injured OTHER player. ถุงยาเขียว (qingnang): one
    // injured player (self handled via the character card).
    if (isJieyuan) return p.hp < p.maxHp && p.id !== me.id;
    if (isQingnang) return p.hp < p.maxHp;
    if (selectedEffType && NO_SELF_TARGET_TYPES.has(selectedEffType) && p.id === me.id) return false;
    if (selectedEffType && NEEDS_A_TAKEABLE_CARD_TYPES.has(selectedEffType) && !holdsSomething(p)) return false;
    return true;
  };
  const onTapTarget = (pid: string) => {
    if (isJiedao) {
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

  // A สังหาร past its once-a-turn limit would just bounce off the server and
  // leave the player stuck re-erroring — block it up front with a hint. (The
  // client can't see every skill's bonus, so this is conservative: crossbow
  // and เตียวหุย's คำรามสิงห์ both lift the cap.)
  const shaOverLimit = (typeKey: string) =>
    typeKey === "sha" &&
    me.shaUsedThisTurn >= 1 &&
    me.equipment.weapon?.typeKey !== "crossbow" &&
    me.generalId !== "zhangfei";

  // Resolve a tap into an actual play, given the chosen effective type. `asType`
  // is set only for conversion plays (Guan Yu red→สังหาร etc.).
  const proceedPlay = (card: Card, opt: MainActionPlay) => {
    if (!pending) return;
    const effType = opt.typeKey;
    const asType = opt.asType ?? null;
    if (shaOverLimit(effType)) {
      showNotice(`ลง "${cardDisplay("sha").name}" ได้ครั้งเดียวต่อเทิร์น (ยกเว้นมี${cardDisplay("crossbow").name})`);
      return;
    }
    if (effType === "tao") {
      if (injuredPlayers.length === 0) {
        showNotice("ตอนนี้ไม่มีใครบาดเจ็บให้ช่วย");
        return;
      }
      // Only you are hurt → keep the classic one-tap self-heal. Otherwise open
      // the target picker (pre-selecting when there's a single candidate).
      if (injuredPlayers.length === 1 && injuredPlayers[0]!.id === me.id) {
        void runAnswer({ decisionId: pending.id, choice: "playCard", cardIds: [card.id], targetIds: [] });
        return;
      }
      dispatch({ type: "SELECT_CARDS", ids: [card.id] });
      dispatch({ type: "SET_AS_TYPE", asType: null });
      dispatch({ type: "SELECT_TARGETS", ids: injuredPlayers.length === 1 ? [injuredPlayers[0]!.id] : [] });
      return;
    }
    if (needsManualTarget(effType)) {
      dispatch({ type: "SELECT_CARDS", ids: [card.id] });
      dispatch({ type: "SET_AS_TYPE", asType });
      dispatch({ type: "SELECT_TARGETS", ids: [] });
      return;
    }
    // no manual target: equipment replacing an occupied slot asks to confirm
    // (equipment is always a literal play); everything else plays now.
    const meta = cardMeta(card.typeKey);
    const replacing = !asType && meta.targetRule === "equipment" && meta.slot && !!me.equipment[meta.slot as EquipSlot];
    if (replacing) {
      dispatch({ type: "SELECT_CARDS", ids: [card.id] });
      dispatch({ type: "SET_AS_TYPE", asType: null });
      dispatch({ type: "SELECT_TARGETS", ids: [] });
      return;
    }
    void runAnswer({ decisionId: pending.id, choice: "playCard", cardIds: [card.id], targetIds: [], ...(asType ? { asType } : {}) });
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
    const opts = mainActionPlays(card, me.generalId);
    if (opts.length === 0) {
      showNotice("การ์ดนี้ใช้ตอนถูกกระทำเท่านั้น");
      return;
    }
    if (opts.length === 1) {
      proceedPlay(card, opts[0]!);
      return;
    }
    setPlayChoices({ card, options: opts }); // "play as?" chooser
  };

  const getCardState = (c: Card): CardTapState => {
    const inSelectMode = skillMode !== null || zhangbaMode;
    const canPlay = isMainAction && mainActionPlays(c, me.generalId).length > 0;
    const taoBlocked = c.typeKey === "tao" && isMainAction && !someoneInjured && !inSelectMode;
    const tappable = selecting && (inSelectMode || !isMainAction || canPlay) && !taoBlocked;
    const dimmed = isMainAction && !inSelectMode && (!canPlay || taoBlocked);
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
    if (skillSpec && !cardCountOk) {
      hints.push(skillSpec.minCards === skillSpec.maxCards ? `เลือกการ์ด ${skillSpec.minCards} ใบ` : `เลือกการ์ด ${skillSpec.minCards}+ ใบ`);
    }
    if (skillSpec && skillSpec.maxTargets > 0 && !targetCountOk) {
      if (!skillCardsReady) hints.push("เลือกการ์ดทิ้งก่อน");
      else if (isLijian) hints.push("เลือกผู้ชาย 2 คน (ให้ดวลกัน)");
      else if (isJieyuan || isQingnang) hints.push("เลือกคนที่บาดเจ็บ");
      else hints.push(`เลือกเป้าหมาย ${skillSpec.minTargets}${skillSpec.minTargets !== skillSpec.maxTargets ? `-${skillSpec.maxTargets}` : ""} คน`);
    }
    confirmText =
      `ใช้สกิล "${sk?.name ?? skillMode}"` +
      (chosenCardNames.length ? ` · การ์ด: ${chosenCardNames.join(", ")}` : "") +
      (chosenTargetNames.length ? ` → ${chosenTargetNames.join(", ")}` : "") +
      (hints.length ? ` — ${hints.join(", ")}` : "");
  } else if (isJiedao) {
    // step-aware hint: pick an armed player, then who they must attack
    const step = selectedTargetIds.length === 0 ? "เลือกคนที่มีอาวุธ" : selectedTargetIds.length === 1 ? "เลือกเป้าที่คนนั้นตีถึง" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("jiedao").name} — ${step}` + (chosenTargetNames.length ? ` (${chosenTargetNames.join(" → ")})` : "");
  } else if (zhangbaMode) {
    const step = selectedCardIds.length < 2 ? `เลือกการ์ด 2 ใบ (เลือกแล้ว ${selectedCardIds.length})` : !targetCountOk ? "เลือกเป้าในระยะ" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("zhangba").name} (2 ใบ = ${cardDisplay("sha").name}) — ${step}` + (chosenTargetNames.length ? ` → ${chosenTargetNames.join(", ")}` : "");
  } else {
    const needMore = selectedNeedsTarget && !targetCountOk;
    const needLabel = targetRange.min === targetRange.max ? `เลือกเป้าหมาย ${targetRange.min} คน` : `เลือกเป้าหมาย ${targetRange.min}-${targetRange.max} คน`;
    confirmText = `ลง "${chosenCardNames.join(", ")}"` + (needMore ? ` — ${needLabel} (เลือกแล้ว ${selectedTargetIds.length})` : chosenTargetNames.length ? ` ใส่ ${chosenTargetNames.join(", ")}` : "");
  }

  const selectingLabel = skillMode ? "เลือกการ์ดสำหรับสกิล" : zhangbaMode ? "เลือกการ์ด 2 ใบสำหรับทวน" : isDiscardTo ? "เลือกการ์ดที่จะทิ้ง" : "แตะการ์ดเพื่อเล่น";
  const phaseLabel = (gameView.currentPhase && PHASE_LABEL[gameView.currentPhase]) ?? gameView.currentPhase ?? "";
  const isMyTurn = gameView.currentTurnPlayerId === me.id;
  const equipSlotsWithCards = EQUIP_SLOTS.map((s) => ({ ...s, card: me.equipment[s.slot] }));
  const zhangbaAvailable = me.equipment.weapon?.typeKey === "zhangba" && isMyDecision && isMainAction;

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
              if (shaOverLimit("sha")) { showNotice(`ลง "${cardDisplay("sha").name}" ได้ครั้งเดียวต่อเทิร์น`); return; }
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
