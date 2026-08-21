import type { Dispatch } from "react";
import type { Card, GameView, LegalActionView, PlayerAnswer, PlayerView } from "@tktw/shared";
import type { InteractionAction, InteractionState } from "./useInteraction";
import { cardDisplay } from "../data/cardNames";
import { cardMeta, type EquipSlot } from "../data/cardMeta";
import { generalSkills } from "../data/generalSkills";

export type PlayCardOption = Extract<LegalActionView, { kind: "playCard" }>["options"][number];
export type ActiveSkillOption = Extract<LegalActionView, { kind: "useSkill" }>["options"][number];
export type PlayChoice = { card: Card; options: PlayCardOption[] };

type AnswerFields = Omit<PlayerAnswer, "playerId">;

/** Deep main-action module. It is the only client implementation that
 * interprets authoritative play/skill target contracts and turns local taps
 * into validated answer payloads. */
export function createMainActionController({
  gameView,
  me,
  pending,
  isMyDecision,
  isMainAction,
  isDiscardTo,
  interaction,
  dispatch,
  submit,
  notify,
  requestPlayChoice,
}: {
  gameView: GameView;
  me: PlayerView;
  pending: GameView["pendingDecision"];
  isMyDecision: boolean;
  isMainAction: boolean;
  isDiscardTo: boolean;
  interaction: InteractionState;
  dispatch: Dispatch<InteractionAction>;
  submit: (fields: AnswerFields) => Promise<void>;
  notify: (message: string) => void;
  requestPlayChoice: (choice: PlayChoice | null) => void;
}) {
  const { selectedCardIds, selectedTargetIds, skillMode, zhangbaMode, selectedAsType } = interaction;
  const myHand = Array.isArray(me.hand) ? me.hand : [];
  const legalActions = gameView.legalActions ?? [];
  const playCardOptions = legalActions.find((action) => action.kind === "playCard")?.options ?? [];
  const activeSkillOptions = legalActions.find((action) => action.kind === "useSkill")?.options ?? [];
  const selectedPlayCard = !skillMode ? myHand.find((card) => card.id === selectedCardIds[0]) : undefined;
  const selectedPlayOption = zhangbaMode
    ? playCardOptions.find((option) => option.source === "zhangba")
    : selectedPlayCard
      ? playCardOptions.find((option) =>
          option.source !== "zhangba" &&
          option.selectableCardIds.includes(selectedPlayCard.id) &&
          (option.asType ?? null) === selectedAsType)
      : undefined;
  const selectedSkillOption = skillMode
    ? activeSkillOptions.find((option) => option.skillId === skillMode)
    : undefined;
  const selectedOption = selectedSkillOption ?? selectedPlayOption;
  const targeting = selectedOption?.targeting;
  const targetRange = targeting
    ? { min: targeting.minTargets, max: targeting.maxTargets }
    : { min: 0, max: 0 };
  const skillCardsReady = !selectedOption || selectedCardIds.length >= selectedOption.minCards;
  const targetsActive =
    isMyDecision && isMainAction && targetRange.max > 0 && skillCardsReady &&
    (targeting?.kind === "independent" || targeting?.kind === "dependent");
  const selfTargetable =
    !!targetsActive && targeting?.kind === "independent" && targeting.eligibleTargetIds.includes(me.id);
  const selecting = isMyDecision && (isMainAction || isDiscardTo);
  const showConfirmBar = isMyDecision && isMainAction && (skillMode !== null || zhangbaMode || selectedCardIds.length > 0);
  const mustDiscard = isDiscardTo
    ? Number((pending?.data as { mustDiscard?: number } | undefined)?.mustDiscard ?? 0)
    : 0;
  const targetCountOk = selectedTargetIds.length >= targetRange.min && selectedTargetIds.length <= targetRange.max;
  const cardCountOk = selectedOption
    ? selectedCardIds.length >= selectedOption.minCards && selectedCardIds.length <= selectedOption.maxCards
    : false;
  const confirmOk = targetCountOk && cardCountOk && selectedOption?.available === true;

  const reset = () => dispatch({ type: "RESET" });
  const selectTargets = (ids: string[]) => dispatch({ type: "SELECT_TARGETS", ids });
  const toggleTarget = (playerId: string) => {
    const previous = selectedTargetIds;
    selectTargets(previous.includes(playerId)
      ? previous.filter((id) => id !== playerId)
      : previous.length < targetRange.max
        ? [...previous, playerId]
        : [...previous.slice(1), playerId]);
  };
  const isTargetable = (player: PlayerView) => {
    if (!targetsActive || !targeting) return false;
    if (selectedTargetIds.includes(player.id)) return true;
    if (targeting.kind === "independent") return targeting.eligibleTargetIds.includes(player.id);
    if (targeting.kind === "dependent") {
      const first = selectedTargetIds[0];
      return first
        ? (targeting.secondTargetIdsByFirst[first] ?? []).includes(player.id)
        : targeting.firstTargetIds.includes(player.id);
    }
    return false;
  };
  const tapTarget = (playerId: string) => {
    if (targeting?.kind !== "dependent") return toggleTarget(playerId);
    const previous = selectedTargetIds;
    selectTargets(
      previous[0] === playerId ? []
      : previous[1] === playerId ? [previous[0]!]
      : previous.length === 0 ? [playerId]
      : [previous[0]!, playerId],
    );
  };

  const proceedPlay = (card: Card, option: PlayCardOption) => {
    if (!pending) return;
    const asType = option.asType ?? null;
    if (!option.available) {
      notify(option.unavailableReason === "no_legal_target"
        ? "ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา"
        : option.unavailableReason === "sha_usage_limit"
          ? `ลง "${cardDisplay(option.typeKey).name}" ได้ครั้งเดียวต่อเทิร์น`
          : "ตอนนี้ยังใช้การ์ดนี้ไม่ได้");
      return;
    }
    if (
      option.targeting.kind === "independent" &&
      option.targeting.implicitTargetId === me.id &&
      option.targeting.eligibleTargetIds.length === 1
    ) {
      void submit({ decisionId: pending.id, choice: "playCard", cardIds: [card.id], targetIds: [], ...(asType ? { asType } : {}) });
      return;
    }
    if (option.targeting.kind === "none" || option.targeting.kind === "fixed") {
      const meta = cardMeta(card.typeKey);
      const replacing = !asType && meta.targetRule === "equipment" && meta.slot && !!me.equipment[meta.slot as EquipSlot];
      if (!replacing) {
        void submit({ decisionId: pending.id, choice: "playCard", cardIds: [card.id], targetIds: [], ...(asType ? { asType } : {}) });
        return;
      }
    }
    dispatch({ type: "SELECT_CARDS", ids: [card.id] });
    dispatch({ type: "SET_AS_TYPE", asType });
    selectTargets(option.targeting.kind === "independent" && option.targeting.eligibleTargetIds.length === 1
      ? option.targeting.eligibleTargetIds
      : []);
  };

  const tapCard = (card: Card) => {
    if (!pending) return;
    if (skillMode || isDiscardTo || zhangbaMode) {
      const selectable = (pending.data as { selectableCardIds?: string[] }).selectableCardIds;
      if (selectedCardIds.includes(card.id)) {
        dispatch({ type: "SELECT_CARDS", ids: selectedCardIds.filter((id) => id !== card.id) });
        return;
      }
      if (skillMode && !selectedSkillOption?.selectableCardIds.includes(card.id)) return;
      if (zhangbaMode && !selectedPlayOption?.selectableCardIds.includes(card.id)) return;
      if (isDiscardTo && selectable && !selectable.includes(card.id)) return;
      if (isDiscardTo && mustDiscard > 0 && selectedCardIds.length >= mustDiscard) return;
      dispatch({ type: "SELECT_CARDS", ids: [...selectedCardIds, card.id] });
      return;
    }
    if (!isMainAction) return;
    if (selectedCardIds.includes(card.id)) return reset();
    const options = playCardOptions.filter((option) => option.source !== "zhangba" && option.selectableCardIds.includes(card.id));
    if (options.length === 0) return notify("การ์ดนี้ใช้ตอนถูกกระทำเท่านั้น");
    const available = options.filter((option) => option.available);
    if (available.length === 0) return proceedPlay(card, options[0]!);
    if (available.length === 1) return proceedPlay(card, available[0]!);
    requestPlayChoice({ card, options: available });
  };

  const cardStateFor = (card: Card) => {
    const inSelectionMode = skillMode !== null || zhangbaMode;
    const skillSelectable = selectedSkillOption?.selectableCardIds.includes(card.id) ?? false;
    const zhangbaSelectable = selectedPlayOption?.selectableCardIds.includes(card.id) ?? false;
    const hasPlayOption = playCardOptions.some((option) => option.source !== "zhangba" && option.selectableCardIds.includes(card.id));
    const canSelect = skillMode ? skillSelectable : zhangbaMode ? zhangbaSelectable : hasPlayOption;
    return {
      tappable: selecting && (!isMainAction || canSelect),
      dimmed: isMainAction && (inSelectionMode || playCardOptions.length > 0) && !canSelect,
    };
  };

  const submitConfirm = () => {
    if (!pending) return;
    if (skillMode) {
      void submit({ decisionId: pending.id, choice: "useSkill", skillId: skillMode, cardIds: selectedCardIds, targetIds: selectedTargetIds });
    } else {
      void submit({ decisionId: pending.id, choice: "playCard", cardIds: selectedCardIds, targetIds: selectedTargetIds, ...(selectedAsType ? { asType: selectedAsType } : {}) });
    }
  };
  const submitEndPhase = () => pending && void submit({ decisionId: pending.id, choice: "endPhase" });
  const submitDiscard = () => pending && void submit({ decisionId: pending.id, cardIds: selectedCardIds });

  const skills = generalSkills(me.generalId);
  const chosenCards = selectedCardIds.map((id) => cardDisplay(myHand.find((card) => card.id === id)?.typeKey ?? "").name).filter(Boolean);
  const chosenTargets = selectedTargetIds.map((id) => gameView.players.find((player) => player.id === id)?.name).filter(Boolean);
  let confirmText: string;
  if (skillMode) {
    const skill = skills.find((candidate) => candidate.id === skillMode);
    const hints: string[] = [];
    if (selectedSkillOption && !cardCountOk) hints.push(selectedSkillOption.minCards === selectedSkillOption.maxCards
      ? `เลือกการ์ด ${selectedSkillOption.minCards} ใบ`
      : `เลือกการ์ด ${selectedSkillOption.minCards}+ ใบ`);
    if (selectedSkillOption && selectedSkillOption.targeting.maxTargets > 0 && !targetCountOk) {
      hints.push(!skillCardsReady ? "เลือกการ์ดทิ้งก่อน" : `เลือกเป้าหมาย ${targetRange.min}${targetRange.min !== targetRange.max ? `-${targetRange.max}` : ""} คน`);
    }
    confirmText = `ใช้สกิล "${skill?.name ?? skillMode}"${chosenCards.length ? ` · การ์ด: ${chosenCards.join(", ")}` : ""}${chosenTargets.length ? ` → ${chosenTargets.join(", ")}` : ""}${hints.length ? ` — ${hints.join(", ")}` : ""}`;
  } else if (selectedPlayOption?.targeting.kind === "dependent") {
    const step = selectedTargetIds.length === 0 ? "เลือกคนที่มีอาวุธ" : selectedTargetIds.length === 1 ? "เลือกเป้าที่คนนั้นตีถึง" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("jiedao").name} — ${step}${chosenTargets.length ? ` (${chosenTargets.join(" → ")})` : ""}`;
  } else if (zhangbaMode) {
    const step = selectedCardIds.length < 2 ? `เลือกการ์ด 2 ใบ (เลือกแล้ว ${selectedCardIds.length})` : !targetCountOk ? "เลือกเป้าในระยะ" : "พร้อมยืนยัน";
    confirmText = `${cardDisplay("zhangba").name} (2 ใบ = ${cardDisplay("sha").name}) — ${step}${chosenTargets.length ? ` → ${chosenTargets.join(", ")}` : ""}`;
  } else {
    const needMore = targetRange.max > 0 && !targetCountOk;
    const needLabel = targetRange.min === targetRange.max ? `เลือกเป้าหมาย ${targetRange.min} คน` : `เลือกเป้าหมาย ${targetRange.min}-${targetRange.max} คน`;
    confirmText = `ลง "${chosenCards.join(", ")}"${needMore ? ` — ${needLabel} (เลือกแล้ว ${selectedTargetIds.length})` : chosenTargets.length ? ` ใส่ ${chosenTargets.join(", ")}` : ""}`;
  }

  const zhangbaOption = playCardOptions.find((option) => option.source === "zhangba");
  const toggleZhangba = () => {
    if (zhangbaMode) return reset();
    if (!zhangbaOption?.available) {
      notify(zhangbaOption?.unavailableReason === "insufficient_cards" ? "ต้องมีการ์ดอย่างน้อย 2 ใบ" : "ตอนนี้ยังใช้ทวนงูเลื้อยไม่ได้");
      return;
    }
    reset();
    dispatch({ type: "SET_ZHANGBA_MODE", on: true });
  };

  return {
    options: { playCard: playCardOptions, activeSkill: activeSkillOptions },
    selection: { selecting, showConfirmBar, confirmOk, confirmText, mustDiscard, selfTargetable },
    cards: { tap: tapCard, stateFor: cardStateFor, proceedPlay },
    targets: { tap: tapTarget, isTargetable, toggleSelf: () => toggleTarget(me.id) },
    commands: { reset, submitConfirm, submitEndPhase, submitDiscard },
    zhangba: { available: zhangbaOption?.available === true, toggle: toggleZhangba },
  };
}
