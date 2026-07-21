import { useEffect, useRef, useState } from "react";
import type { Card, PlayerView } from "@tktw/shared";
import { useGameStore } from "../store/gameStore";
import { PlayerTile } from "../components/PlayerTile";
import { HandCard, CardTooltip } from "../components/HandCard";
import { DecisionModal } from "../components/DecisionModal";
import { RoleRevealModal } from "../components/RoleRevealModal";
import { InspectModal } from "../components/InspectModal";
import { ModalOverlay, ModalPanel } from "../components/Modal";
import { SkillToast, type ToastData } from "../components/SkillToast";
import { describeDecision } from "../data/decisionCopy";
import { cardDisplay, cardInfo, suitGlyph, rankLabel } from "../data/cardNames";
import { generalDisplay, factionColor, factionLabel } from "../data/generalNames";
import { generalSkills, skillById } from "../data/generalSkills";
import { cardMeta, needsManualTarget, targetCount, playableAsMainAction, type EquipSlot } from "../data/cardMeta";
import { skillInteraction, sameFactionTeammateAlive, activeSkillSpec } from "../data/skillInteraction";
import { mainActionPlays, clientCountsAs, type MainActionPlay } from "../data/conversions";
import { attackDistance, weaponRange } from "../data/distance";
import { roleDisplay } from "../data/roles";
import { useIsNarrow } from "../lib/useIsNarrow";
import { RulesButton } from "../components/RulesModal";

const PHASE_LABEL: Record<string, string> = {
  prepare: "เฟสเตรียมตัว",
  judge: "เฟสตัดสิน",
  draw: "เฟสจั่วไพ่",
  play: "เฟสลงการ์ด",
  discard: "เฟสทิ้งไพ่",
  end: "เฟสจบเทิร์น",
};

const SUIT_COLOR: Record<string, string> = { heart: "#a8322a", diamond: "#a8322a", spade: "#2e2519", club: "#2e2519" };

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
  const [showDebug, setShowDebug] = useState(false);
  const narrow = useIsNarrow(); // mobile / small-tablet: stack the layout

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [skillMode, setSkillMode] = useState<string | null>(null);
  // ทวนงูจั้งปา (zhangba): a weapon "mode" where 2 hand cards substitute for a
  // สังหาร. Separate from skillMode because it submits playCard, not useSkill.
  const [zhangbaMode, setZhangbaMode] = useState(false);
  // When a card is being played AS another type (conversion skill, e.g. Guan
  // Yu's red→สังหาร), the type to send as answer.asType. null = play literally.
  const [selectedAsType, setSelectedAsType] = useState<string | null>(null);
  // When a tapped card can be played multiple ways, the pending "play as?" choice.
  const [playChoices, setPlayChoices] = useState<{ card: Card; options: MainActionPlay[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState<PlayerView | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const roleRevealShown = useRef(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [drawnIds, setDrawnIds] = useState<Set<string>>(() => new Set());
  const prevHandIdsRef = useRef<Set<string>>(new Set());
  const autoHandledRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 1900);
  };

  const pending = gameView?.pendingDecision;
  const decisionKey = pending?.id ?? null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelectedCardIds([]);
    setSelectedTargetIds([]);
    setSkillMode(null);
    setZhangbaMode(false);
  }, [decisionKey]);

  const me = gameView?.players.find((p) => p.id === gameView.viewerId);

  useEffect(() => {
    if (me && me.generalId !== "none" && !roleRevealShown.current) {
      roleRevealShown.current = true;
      setShowRoleReveal(true);
    }
  }, [me?.generalId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
      if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
    };
  }, []);

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

  // ── Auto-route skill decisions the engine asks about ──────────────────
  // The engine yields activateSkill for every non-locked trigger skill; here
  // we answer the ones that shouldn't bother the player (beneficial autos,
  // and a lord's hujia with no eligible teammate), and auto-accept fankui's
  // steal. Everything else falls through to the inline row / dialog.
  useEffect(() => {
    if (!gameView || !me || !pending) return;
    if (pending.playerId !== gameView.viewerId) return;
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
      const isOwnTurn = gameView.currentSeat === me.seat;
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

  if (gameView.finished) {
    const myRole = gameView.players.find((p) => p.id === gameView.viewerId)?.role;
    const won = myRole ? gameView.winners?.includes(myRole) : false;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="panel-plain anim-pop" style={{ width: 440, textAlign: "center", padding: 44 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              margin: "0 auto 18px",
              background: "radial-gradient(circle at 38% 34%, #c0463a, #8f2a22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #f2e7cf",
            }}
          >
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 44, color: "#f6ecd2" }}>{won ? "勝" : "終"}</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--red)" }}>{won ? "ชัยชนะ!" : "จบเกม"}</div>
          <div style={{ marginTop: 8, color: "var(--ink-muted)", fontSize: 15 }}>ฝ่ายชนะ: {gameView.winners?.join(", ")}</div>
          <button onClick={leaveRoom} className="btn-primary" style={{ marginTop: 26, padding: "13px 44px", fontSize: 16 }}>
            เล่นอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

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
  const others = gameView.players.filter((p) => p.id !== gameView.viewerId);
  const currentTurnPlayer = gameView.players.find((p) => p.seat === gameView.currentSeat);
  const lastPlay = gameView.discardPile.length > 0 ? gameView.discardPile[gameView.discardPile.length - 1] : undefined;

  const isMyDecision = pending?.playerId === gameView.viewerId;
  const isMainAction = pending?.kind === "mainAction";
  const isDiscardTo = pending?.kind === "discardTo";

  // Which activateSkill (if any) is pending for me, and how to route it.
  const pendingActivateId =
    pending?.kind === "activateSkill" && isMyDecision ? String((pending.data as { skillId?: string }).skillId ?? "") : null;
  const pendingActivateMode = pendingActivateId ? skillInteraction(pendingActivateId) : undefined;

  // Modal only for reactive decisions that aren't auto-handled / inline.
  const noWuxieInHand = !myHand.some((c) => c.typeKey === "wuxie");
  const canRespondTao = myHand.some((c) => clientCountsAs(c, "tao", me.generalId, gameView.currentSeat === me.seat));
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

  // A judgment reveal is answered by tapping the draw pile itself (see the mat).
  const pendingReveal = isMyDecision && pending?.kind === "judgmentReveal";
  const revealCopy = pendingReveal && pending ? describeDecision(pending, gameView) : null;

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
  // Your own character card (not a PlayerTile) can be a target too — for ท้อ
  // (help self) and for หัวโต๋'s ถุงยาเขียว (heal self).
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
  const toggleTarget = (playerId: string) =>
    setSelectedTargetIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length < targetRange.max) return [...prev, playerId];
      return [...prev.slice(1), playerId]; // at cap → drop oldest, add new
    });

  // ยืมดาบฆ่าคน (jiedao) is picked one target at a time: [0] = an armed player,
  // [1] = someone that armed player can actually reach. Whether each opponent
  // lights up depends on which step we're on.
  const armedPick = isJiedao ? gameView.players.find((p) => p.id === selectedTargetIds[0]) : undefined;
  const targetableFor = (p: PlayerView): boolean => {
    if (!targetsActive || !p.alive) return false;
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
    return true;
  };
  const onTapTarget = (pid: string) => {
    if (isJiedao) {
      setSelectedTargetIds((prev) => {
        if (prev[0] === pid) return []; // re-tap the armed player → reset both steps
        if (prev[1] === pid) return [prev[0]!]; // re-tap the victim → drop it
        if (prev.length === 0) return [pid]; // step 1: the armed player
        return [prev[0]!, pid]; // step 2: the victim (replaces any prior victim)
      });
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
  const resetSelection = () => {
    setSelectedCardIds([]);
    setSelectedTargetIds([]);
    setSkillMode(null);
    setSelectedAsType(null);
    setZhangbaMode(false);
  };

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
      showNotice('ลง "สังหาร" ได้ครั้งเดียวต่อเทิร์น (ยกเว้นมีหน้าไม้กล)');
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
      setSelectedCardIds([card.id]);
      setSelectedAsType(null);
      setSelectedTargetIds(injuredPlayers.length === 1 ? [injuredPlayers[0]!.id] : []);
      return;
    }
    if (needsManualTarget(effType)) {
      setSelectedCardIds([card.id]);
      setSelectedAsType(asType);
      setSelectedTargetIds([]);
      return;
    }
    // no manual target: equipment replacing an occupied slot asks to confirm
    // (equipment is always a literal play); everything else plays now.
    const meta = cardMeta(card.typeKey);
    const replacing = !asType && meta.targetRule === "equipment" && meta.slot && !!me.equipment[meta.slot as EquipSlot];
    if (replacing) {
      setSelectedCardIds([card.id]);
      setSelectedAsType(null);
      setSelectedTargetIds([]);
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
      setSelectedCardIds((prev) => {
        if (prev.includes(card.id)) return prev.filter((id) => id !== card.id);
        if (isDiscardTo && selectable && !selectable.includes(card.id)) return prev; // not discardable
        if (isDiscardTo && mustDiscard > 0 && prev.length >= mustDiscard) return prev; // at the cap
        return [...prev, card.id];
      });
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
  const submitDraw = () => pending && void runAnswer({ decisionId: pending.id, choice: "draw" });
  const answerActivate = (accept: boolean) => {
    if (!pending) return;
    autoHandledRef.current = pending.id;
    void runAnswer(accept ? { decisionId: pending.id } : { decisionId: pending.id, pass: true });
  };

  const skills = generalSkills(me.generalId);
  const waitingCopy = pending && !isMyDecision ? describeDecision(pending, gameView) : null;

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
    confirmText = `ยืมดาบฆ่าคน — ${step}` + (chosenTargetNames.length ? ` (${chosenTargetNames.join(" → ")})` : "");
  } else if (zhangbaMode) {
    const step = selectedCardIds.length < 2 ? `เลือกการ์ด 2 ใบ (เลือกแล้ว ${selectedCardIds.length})` : !targetCountOk ? "เลือกเป้าในระยะ" : "พร้อมยืนยัน";
    confirmText = `ทวนงูจั้งปา (2 ใบ = สังหาร) — ${step}` + (chosenTargetNames.length ? ` → ${chosenTargetNames.join(", ")}` : "");
  } else {
    const needMore = selectedNeedsTarget && !targetCountOk;
    const needLabel = targetRange.min === targetRange.max ? `เลือกเป้าหมาย ${targetRange.min} คน` : `เลือกเป้าหมาย ${targetRange.min}-${targetRange.max} คน`;
    confirmText = `ลง "${chosenCardNames.join(", ")}"` + (needMore ? ` — ${needLabel} (เลือกแล้ว ${selectedTargetIds.length})` : chosenTargetNames.length ? ` ใส่ ${chosenTargetNames.join(", ")}` : "");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: narrow ? "flex-start" : "center", padding: narrow ? 8 : 20, paddingBottom: 110, position: "relative" }}>
      <div style={{ display: "flex", gap: narrow ? 10 : 16, width: "100%", maxWidth: 1360, alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", margin: "0 auto" }}>
      <div className="panel-plain" style={{ flex: "1 1 720px", maxWidth: 1040, minWidth: 0, padding: narrow ? 12 : 22, position: "relative" }}>
        {/* opponents row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {others.map((p) => {
            const dist = attackDistance(me, p, gameView.players);
            return (
              <PlayerTile
                key={p.id}
                player={p}
                isCurrentTurn={currentTurnPlayer?.id === p.id}
                targetable={targetableFor(p)}
                selected={selectedTargetIds.includes(p.id)}
                distance={dist}
                inRange={dist <= weaponRange(me)}
                compact={narrow}
                onClick={() => onTapTarget(p.id)}
                onInspect={() => setInspecting(p)}
              />
            );
          })}
        </div>

        {/* central mat */}
        <div className="mat" style={{ margin: "14px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 34, padding: 20, minHeight: 132, position: "relative" }}>
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-glyph)", fontSize: 40, color: "rgba(120,90,40,.1)", letterSpacing: 8 }}>
            三國鼎立
          </div>
          {/* draw pile — also the "flip your judgment card" affordance */}
          <div style={{ textAlign: "center", zIndex: 1, position: "relative" }}>
            {pendingReveal && (
              <div className="anim-rise" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "var(--target-red)", color: "#f6ecd2", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, boxShadow: "0 6px 16px rgba(0,0,0,.3)", zIndex: 5 }}>
                {revealCopy?.title ?? "แตะเปิดการ์ดตัดสิน"} ▼
              </div>
            )}
            <div
              className="pile-pulse"
              onClick={pendingReveal && !busy && pending ? () => void runAnswer({ decisionId: pending.id, choice: "reveal" }) : undefined}
              role={pendingReveal ? "button" : undefined}
              aria-label={pendingReveal ? "เปิดการ์ดตัดสิน" : undefined}
              style={{
                position: "relative",
                width: 62,
                height: 88,
                borderRadius: 6,
                background: "radial-gradient(circle at 50% 45%, #b23a2e, #8f2a22)",
                border: "1px solid var(--gold-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                cursor: pendingReveal ? "pointer" : "default",
              }}
            >
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 30, color: "#f0d68a" }}>國</span>
              {pendingReveal && <div className="glow-target" />}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-muted)" }}>กองจั่ว · <b>{gameView.drawPile.count}</b></div>
          </div>

          {/* last played card */}
          <div style={{ textAlign: "center", zIndex: 1, minWidth: 96 }}>
            {lastPlay ? (
              <div
                className="anim-pop"
                key={lastPlay.id}
                style={{
                  width: 72,
                  height: 100,
                  margin: "0 auto",
                  borderRadius: 6,
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border-2)",
                  boxShadow: "0 6px 16px rgba(60,40,15,.22)",
                  padding: 6,
                  position: "relative",
                  transform: "rotate(-4deg)",
                }}
              >
                <div style={{ position: "absolute", top: 4, left: 6, lineHeight: 1, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: SUIT_COLOR[lastPlay.suit] }}>{rankLabel(lastPlay.rank)}</div>
                  <div style={{ fontSize: 11, color: SUIT_COLOR[lastPlay.suit] }}>{suitGlyph(lastPlay.suit)}</div>
                </div>
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: 30, color: "#4a3c28" }}>{cardDisplay(lastPlay.typeKey).glyph}</span>
                </div>
                <div style={{ position: "absolute", bottom: 5, left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: 9, color: "var(--ink)" }}>
                  {cardDisplay(lastPlay.typeKey).name}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>—</div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-faint)" }}>ใบล่าสุด</div>
          </div>

          {/* phase */}
          <div style={{ textAlign: "center", zIndex: 1 }}>
            <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{PHASE_LABEL[gameView.phase] ?? gameView.phase}</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>เทิร์น {gameView.turnNumber} · {currentTurnPlayer?.name ?? "-"}</div>
          </div>

          {/* discard pile — click to browse the full pile */}
          <div style={{ textAlign: "center", zIndex: 1 }}>
            <button
              onClick={() => gameView.discardPile.length > 0 && setShowDiscard(true)}
              title="ดูกองทิ้งทั้งหมด"
              style={{ all: "unset", cursor: gameView.discardPile.length > 0 ? "pointer" : "default" }}
            >
              <div style={{ width: 62, height: 88, borderRadius: 6, background: "#e9dcbc", border: "1px dashed var(--card-border-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "rgba(120,90,40,.4)" }}>棄</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-muted)" }}>กองทิ้ง · <b>{gameView.discardPile.length}</b> {gameView.discardPile.length > 0 && <span style={{ color: "var(--red)" }}>· ดู</span>}</div>
            </button>
          </div>
        </div>

        {/* your area */}
        <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", gap: narrow ? 10 : 14, alignItems: "stretch" }}>
          {/* LEFT: character details (+ pending judgment cards) — also a
              ท้อ self-target when helping. glow-target is a CHILD overlay (not
              the class on this box) so the box stays in flow / clickable. */}
          <div
            onClick={selfTargetable ? () => toggleTarget(me.id) : undefined}
            style={{
              position: "relative",
              width: narrow ? "100%" : 230,
              flexShrink: 0,
              background: "var(--card-bg-2)",
              border: `2px solid ${selectedTargetIds.includes(me.id) ? "var(--gold)" : factionColor(me.faction)}`,
              borderRadius: 6,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              cursor: selfTargetable ? "pointer" : "default",
              boxShadow: selectedTargetIds.includes(me.id) ? "0 0 14px rgba(217,165,49,.65)" : undefined,
            }}
          >
            <div style={{ height: 28, background: factionColor(me.faction), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
              <span style={{ fontFamily: "var(--font-glyph)", fontSize: 16, color: "rgba(255,255,255,.95)" }}>{generalDisplay(me.generalId).glyph}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,.95)" }}>
                {roleDisplay(me.role) && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,.28)", borderRadius: 8, padding: "1px 7px", fontWeight: 700 }}>
                    <span className={`seal ${roleDisplay(me.role)!.cls}`} style={{ width: 14, height: 14, fontSize: 9 }}>{roleDisplay(me.role)!.cn}</span>
                    {roleDisplay(me.role)!.name}
                  </span>
                )}
                คุณ
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, padding: 10 }}>
              <div className="card-back" style={{ width: 56, height: 74, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--font-glyph)", fontSize: 24, color: "#5c4a2d" }}>{generalDisplay(me.generalId).glyph}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{me.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{generalDisplay(me.generalId).name} · {factionLabel(me.faction)}</div>
                <div style={{ display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" }}>
                  {Array.from({ length: me.maxHp }).map((_, i) => (
                    <span key={i} className="hp-dot" style={{ width: 12, height: 12, background: i < me.hp ? "var(--red)" : "transparent" }} />
                  ))}
                </div>
              </div>
            </div>
            {/* pending judgment cards (delayed tricks awaiting judgment) */}
            {me.judgmentZone.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, margin: "0 10px 8px" }}>
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>ไพ่ตัดสิน:</span>
                {me.judgmentZone.map((j) => (
                  <span key={j.id} style={{ fontSize: 11, background: "#b0442f", color: "#f6ecd2", borderRadius: 5, padding: "3px 8px" }}>{cardDisplay(j.typeKey).name}</span>
                ))}
              </div>
            )}
            {/* skills */}
            <div style={{ flex: 1, margin: "0 10px 10px", background: "#f9f2dd", border: "1px solid #dccba0", borderRadius: 5, padding: "9px 10px" }}>
              {skills.length === 0 && <div style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>ไม่มีสกิล</div>}
              {skills.map((s) => {
                const used = me.skillUsedThisTurn[s.id] ?? 0;
                const inlinePending = s.id === pendingActivateId && pendingActivateMode === "inline";
                const spentForTurn = s.active && used >= activeSkillSpec(s.id).maxPerTurn;
                return (
                  <div
                    key={s.id}
                    style={{
                      marginBottom: 8,
                      ...(inlinePending
                        ? { background: "rgba(217,165,49,.18)", border: "1px solid var(--gold)", borderRadius: 6, padding: "6px 7px" }
                        : {}),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: factionColor(me.faction) }}>{s.name}</span>
                      {s.lordOnly && <span style={{ fontSize: 8, background: "var(--gold)", color: "#5a3d0a", borderRadius: 6, padding: "0 5px" }}>主公</span>}
                      {used > 0 && <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>ใช้แล้ว {used}</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>{s.description}</div>
                    {inlinePending && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button onClick={() => answerActivate(true)} disabled={busy} className="btn-primary" style={{ flex: 1, padding: 5, fontSize: 11.5, borderRadius: 5 }}>
                          ใช้เลย
                        </button>
                        <button onClick={() => answerActivate(false)} disabled={busy} className="btn-secondary" style={{ flex: 1, padding: 5, fontSize: 11.5, borderRadius: 5 }}>
                          ไม่ใช้
                        </button>
                      </div>
                    )}
                    {!inlinePending && s.active && isMyDecision && isMainAction && (
                      <button
                        onClick={() => {
                          if (spentForTurn) return;
                          resetSelection();
                          setSkillMode(s.id);
                        }}
                        disabled={busy || spentForTurn}
                        className="btn-primary"
                        style={{ marginTop: 5, width: "100%", padding: 6, fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 5, opacity: skillMode === s.id ? 1 : 0.92, boxShadow: skillMode === s.id ? "0 0 10px rgba(217,165,49,.6)" : undefined }}
                      >
                        <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>技</span>
                        {spentForTurn ? "ใช้ครบแล้วเทิร์นนี้" : skillMode === s.id ? "กำลังใช้..." : "ใช้สกิล"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {selfTargetable && <div className="glow-target" />}
          </div>

          {/* MIDDLE: hand */}
          <div style={{ flex: 1, minWidth: 0, background: "var(--panel-bg-2)", border: "1px solid var(--card-border-2)", borderRadius: 6, padding: "9px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>การ์ดในมือ · {myHand.length} ใบ</span>
                {selecting && <span style={{ fontSize: 11, color: "var(--red)" }}>{skillMode ? "เลือกการ์ดสำหรับสกิล" : zhangbaMode ? "เลือกการ์ด 2 ใบสำหรับทวน" : isDiscardTo ? "เลือกการ์ดที่จะทิ้ง" : "แตะการ์ดเพื่อเล่น"}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {myHand.map((c) => {
                  // In a "select cards to spend" mode (skill discard / ทวนงูจั้งปา /
                  // discard phase) ANY card is selectable. Otherwise, response-only
                  // cards (หลบ/ไร้ช่องโหว่) can't be played proactively — grey them out —
                  // unless a conversion skill (Guan Yu red→สังหาร) makes them playable.
                  const inSelectMode = skillMode !== null || zhangbaMode;
                  const canPlay = isMainAction && mainActionPlays(c, me.generalId).length > 0;
                  const taoBlocked = c.typeKey === "tao" && isMainAction && !someoneInjured && !inSelectMode;
                  const tappable = selecting && (inSelectMode || !isMainAction || canPlay) && !taoBlocked;
                  return (
                    <HandCard
                      key={c.id}
                      card={c}
                      selected={selectedCardIds.includes(c.id)}
                      dimmed={isMainAction && !inSelectMode && (!canPlay || taoBlocked)}
                      animateIn={drawnIds.has(c.id)}
                      onClick={tappable ? () => onTapCard(c) : undefined}
                    />
                  );
                })}
                {myHand.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>ไม่มีการ์ดในมือ</div>}
              </div>
            </div>

          {/* RIGHT: equipment zone + phase + end-turn */}
          <div style={{ width: narrow ? "100%" : 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", letterSpacing: 1, marginBottom: 5 }}>เขตอุปกรณ์</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EQUIP_SLOTS.map(({ slot, label, glyph }) => (
                  <EquipSlotTile key={slot} label={label} glyph={glyph} card={me.equipment[slot as EquipSlot]} />
                ))}
              </div>
              {/* active weapon abilities (small buttons at the end of the gear zone) */}
              {me.equipment.weapon?.typeKey === "zhangba" && isMyDecision && isMainAction && (
                <button
                  onClick={() => {
                    if (zhangbaMode) { resetSelection(); return; }
                    if (shaOverLimit("sha")) { showNotice('ลง "สังหาร" ได้ครั้งเดียวต่อเทิร์น'); return; }
                    resetSelection();
                    setZhangbaMode(true);
                  }}
                  disabled={busy}
                  className={zhangbaMode ? "btn-primary" : "btn-secondary"}
                  style={{ marginTop: 8, width: "100%", padding: "7px 8px", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  <span style={{ fontFamily: "var(--font-glyph)", fontSize: 13 }}>蛇</span>
                  {zhangbaMode ? "ยกเลิกทวน" : "ใช้ทวน (2 ใบ = สังหาร)"}
                </button>
              )}
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--ink-muted)", background: "var(--card-bg-2)", border: "1px solid var(--card-border-2)", borderRadius: 5, padding: "6px 10px", textAlign: "center" }}>
                {PHASE_LABEL[gameView.phase] ?? gameView.phase}
              </span>
              {isMyDecision && isMainAction && (
                <button onClick={submitEndPhase} disabled={busy} className="btn-primary" style={{ padding: "9px 18px", fontSize: 13, width: "100%" }}>
                  จบเทิร์น
                </button>
              )}
              {/* Rules — sits right by the phase indicator, always reachable */}
              <RulesButton label="วิธีเล่น & กติกา" style={{ width: "100%", padding: "7px 10px", fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* draw bar (ENG-004): press to draw; mandatory skills are shown as a banner */}
        {isMyDecision && pending?.kind === "drawCard" && (
          <div className="anim-rise" style={floatBar}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "var(--red)" }}>抽</span>
            <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>
              เฟสจั่ว — จั่ว {Number((pending.data as { count?: number }).count ?? 2)} ใบ
              {((pending.data as { skills?: string[] }).skills ?? []).length > 0 && (
                <span style={{ color: "var(--red)", marginLeft: 8 }}>
                  ⚡ {((pending.data as { skills?: string[] }).skills ?? []).map((s) => skillById(s)?.name ?? s).join(", ")}
                </span>
              )}
            </span>
            <button onClick={submitDraw} disabled={busy} className="btn-primary" style={{ padding: "9px 22px", fontSize: 14 }}>จั่วการ์ด</button>
          </div>
        )}

        {/* confirm bar (tap-select flow) */}
        {showConfirmBar && (
          <div className="anim-rise" style={floatBar}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "var(--red)" }}>選</span>
            <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600, maxWidth: 460 }}>{confirmText || "เลือกการ์ด/เป้าหมาย"}</span>
            <button onClick={submitConfirm} disabled={busy || !confirmOk} className="btn-primary" style={{ padding: "9px 20px", fontSize: 14 }}>ยืนยัน</button>
            <button onClick={resetSelection} disabled={busy} className="btn-secondary" style={{ padding: "9px 16px", fontSize: 14 }}>ยกเลิก</button>
          </div>
        )}

        {/* discard bar */}
        {isMyDecision && isDiscardTo && (
          <div className="anim-rise" style={floatBar}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 22, color: "var(--red)" }}>棄</span>
            <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>การ์ดเกินมือ — ทิ้ง {selectedCardIds.length}/{mustDiscard} ใบ</span>
            <button onClick={submitDiscard} disabled={busy || selectedCardIds.length !== mustDiscard} className="btn-primary" style={{ padding: "9px 20px", fontSize: 14 }}>ทิ้งการ์ดที่เลือก</button>
          </div>
        )}

        {/* waiting indicator */}
        {pending && !isMyDecision && waitingCopy && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, background: "radial-gradient(120% 120% at 50% 0%, #fbf5e3, #f1e7ca)", border: "1px solid var(--panel-border-2)", borderRadius: 10, padding: "10px 16px", opacity: 0.9 }}>
            <span style={{ fontFamily: "var(--font-glyph)", fontSize: 18, color: "var(--ink-faint)" }}>{waitingCopy.icon}</span>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
              {gameView.players.find((p) => p.id === pending!.playerId)?.name ?? pending!.playerId}: {waitingCopy.title}
            </span>
          </div>
        )}

        {error && <div style={{ color: "var(--target-red)", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</div>}
      </div>

      {/* RIGHT: game history / log */}
      <aside
        className="panel-plain"
        style={{ width: narrow ? "100%" : 300, flexShrink: 0, maxHeight: narrow ? "40vh" : "82vh", display: "flex", flexDirection: "column", padding: "14px 16px" }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>ประวัติการเล่น</div>
        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10 }}>ล่าสุดอยู่บนสุด · {gameView.log.length} เหตุการณ์</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {gameView.log.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>ยังไม่มีเหตุการณ์</div>}
          {[...gameView.log].reverse().map((entry, i) => (
            <div key={gameView.log.length - i} style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45, borderLeft: "2px solid var(--card-border-2)", paddingLeft: 8 }}>
              <span style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 5 }}>รอบ {entry.turn}</span>
              {entry.text}
            </div>
          ))}
        </div>
      </aside>
      </div>

      {toast && <SkillToast toast={toast} />}
      {notice && (
        <div
          className="anim-rise"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "radial-gradient(120% 120% at 50% 0%, #fbf5e3, #f1e7ca)",
            border: "1px solid var(--panel-border-2)",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            boxShadow: "0 12px 34px rgba(40,25,10,.35), inset 0 0 0 4px rgba(255,255,255,.3), inset 0 0 0 5px rgba(166,129,47,.35)",
            pointerEvents: "none",
          }}
        >
          {notice}
        </div>
      )}
      {showDecisionModal && pending && <DecisionModal pending={pending} gameView={gameView} myHand={myHand} onAnswer={runAnswer} />}
      {showRoleReveal && <RoleRevealModal me={me} onClose={() => setShowRoleReveal(false)} />}
      {inspecting && <InspectModal player={inspecting} onClose={() => setInspecting(null)} />}
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
                <HandCard key={`${c.id}-${i}`} card={c} selected={false} />
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
          background: showDebug ? "var(--red)" : "var(--card-bg-2)",
          border: "1px solid var(--panel-border-2)",
          cursor: "pointer",
          fontSize: 18,
          boxShadow: "0 4px 12px rgba(40,25,10,.3)",
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

// One equipment slot in the player's gear zone, with a hover tooltip
// explaining what the equipped weapon/armor/horse actually does.
function EquipSlotTile({ label, glyph, card }: { label: string; glyph: string; card: Card | undefined }) {
  const [hovered, setHovered] = useState(false);
  const filled = !!card;
  const range = card ? cardMeta(card.typeKey).attackRange : undefined;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: filled ? "var(--panel-bg)" : "transparent",
        border: filled ? "1px solid var(--panel-border)" : "1px dashed var(--card-border-2)",
        borderRadius: 5,
        padding: "6px 8px",
        opacity: filled ? 1 : 0.6,
        cursor: filled ? "help" : "default",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          flexShrink: 0,
          background: filled ? "var(--red)" : "#e3d7b8",
          color: filled ? "#f6ecd2" : "#a99a70",
          fontFamily: "var(--font-glyph-2)",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {glyph}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {filled ? cardDisplay(card.typeKey).name : label}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{filled ? (range ? `ระยะ ${range}` : label) : "ว่าง"}</div>
      </div>
      {hovered && filled && card && cardInfo(card.typeKey) && (
        <CardTooltip name={cardDisplay(card.typeKey).name} info={cardInfo(card.typeKey)} />
      )}
    </div>
  );
}

// Pinned to the viewport bottom (not floating over the board mid-panel), with
// a clear gap from the edge so it reads as its own action strip.
const floatBar: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 28,
  transform: "translateX(-50%)",
  zIndex: 25,
  display: "flex",
  alignItems: "center",
  gap: 12,
  maxWidth: "94vw",
  flexWrap: "wrap",
  justifyContent: "center",
  background: "radial-gradient(120% 120% at 50% 0%, #fbf5e3, #f1e7ca)",
  border: "1px solid var(--panel-border-2)",
  borderRadius: 12,
  padding: "13px 20px",
  boxShadow: "0 16px 44px rgba(40,25,10,.4), inset 0 0 0 4px rgba(255,255,255,.32), inset 0 0 0 5px rgba(166,129,47,.38)",
};
