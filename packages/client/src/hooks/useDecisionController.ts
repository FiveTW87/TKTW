import { useEffect, useRef, useState } from "react";
import type { GameView, PlayerAnswer, PlayerView } from "@tktw/shared";
import { skillById } from "../data/generalSkills";
import { generalDisplay } from "../data/generalNames";
import { skillInteraction, sameFactionTeammateAlive } from "../data/skillInteraction";
import { clientCountsAs } from "../data/conversions";
import { describeDecision } from "../data/decisionCopy";

type AnswerFields = Omit<PlayerAnswer, "playerId">;

export type DecisionRoute =
  | { kind: "none" }
  | { kind: "waiting"; label: string }
  | { kind: "mainAction" }
  | { kind: "discard"; mustDiscard: number }
  | { kind: "pile"; action: "draw" | "reveal"; title?: string; prompt?: string }
  | { kind: "inlineSkill"; skillId: string }
  | { kind: "modal" }
  | { kind: "autoPending" };

/** Owns decision-level routing: automatic answers, reactive-dialog visibility,
 * busy state, and inline active-skill answers. Table only renders the returned
 * presentation state and invokes the small command interface. */
export function useDecisionController({
  gameView,
  me,
  answer,
  onAutoToast,
}: {
  gameView: GameView | null;
  me: PlayerView | undefined;
  answer: (fields: AnswerFields) => Promise<void>;
  onAutoToast: (data: { glyph: string; name: string; owner: string }) => void;
}) {
  const pending = gameView?.pendingDecision;
  const isMyDecision = !!pending && pending.playerId === gameView?.viewerPlayerId;
  const isMainAction = pending?.kind === "mainAction";
  const isDiscardTo = pending?.kind === "discardTo";
  const [busy, setBusy] = useState(false);
  const autoHandledRef = useRef<string | null>(null);

  const pendingActivateId =
    pending?.kind === "activateSkill" && isMyDecision
      ? String((pending.data as { skillId?: string }).skillId ?? "")
      : null;
  const pendingActivateMode = pendingActivateId ? skillInteraction(pendingActivateId) : undefined;

  const myHand = me && Array.isArray(me.hand) ? me.hand : [];
  const noWuxieInHand = !myHand.some((card) => card.typeKey === "wuxie");
  const canRespondTao = !!gameView && !!me && myHand.some((card) =>
    clientCountsAs(card, "tao", me.generalId, gameView.currentTurnPlayerId === me.id),
  );

  let showDecisionModal = false;
  if (pending && isMyDecision && !isMainAction && !isDiscardTo) {
    if (["fankuiPick", "judgmentReveal", "drawCard"].includes(pending.kind)) showDecisionModal = false;
    else if (pending.kind === "askWuxie") showDecisionModal = !noWuxieInHand;
    else if (pending.kind === "respondTao") showDecisionModal = canRespondTao;
    else if (pending.kind === "activateSkill") {
      showDecisionModal =
        pendingActivateMode === undefined ||
        (pendingActivateMode === "hujia" && !!gameView && !!me && sameFactionTeammateAlive(gameView, me));
    } else showDecisionModal = true;
  }

  let route: DecisionRoute;
  if (!pending || !gameView) route = { kind: "none" };
  else if (!isMyDecision) {
    const copy = describeDecision(pending, gameView);
    const owner = gameView.players.find((player) => player.id === pending.playerId)?.name ?? pending.playerId;
    route = { kind: "waiting", label: `${owner}: ${copy.title}` };
  } else if (pending.kind === "mainAction") route = { kind: "mainAction" };
  else if (pending.kind === "discardTo") {
    route = { kind: "discard", mustDiscard: Number((pending.data as { mustDiscard?: number }).mustDiscard ?? 0) };
  } else if (pending.kind === "judgmentReveal") {
    route = { kind: "pile", action: "reveal", title: describeDecision(pending, gameView).title };
  } else if (pending.kind === "drawCard") {
    const count = Number((pending.data as { count?: number }).count ?? 2);
    const skillNames = ((pending.data as { skills?: string[] }).skills ?? []).map((id) => skillById(id)?.name ?? id);
    route = {
      kind: "pile",
      action: "draw",
      title: `จั่ว ${count} ใบ`,
      prompt: `เฟสจั่ว — จั่ว ${count} ใบ${skillNames.length ? ` ⚡ ${skillNames.join(", ")}` : ""}`,
    };
  } else if (pending.kind === "activateSkill" && pendingActivateMode === "inline" && pendingActivateId) {
    route = { kind: "inlineSkill", skillId: pendingActivateId };
  } else if (showDecisionModal) route = { kind: "modal" };
  else route = { kind: "autoPending" };

  useEffect(() => {
    if (!gameView || !me || !pending || !isMyDecision) return;
    if (autoHandledRef.current === pending.id) return;
    const accept = () => {
      autoHandledRef.current = pending.id;
      void answer({ decisionId: pending.id });
    };
    const pass = () => {
      autoHandledRef.current = pending.id;
      void answer({ decisionId: pending.id, pass: true });
    };

    if (pending.kind === "fankuiPick") return accept();
    if (pending.kind === "askWuxie" && noWuxieInHand) return pass();
    if (pending.kind === "respondTao" && !canRespondTao) return pass();
    if (pending.kind !== "activateSkill") return;

    const skillId = String((pending.data as { skillId?: string }).skillId ?? "");
    const mode = skillInteraction(skillId);
    if (mode === "autoToast") {
      const skill = skillById(skillId);
      onAutoToast({
        glyph: generalDisplay(me.generalId).glyph,
        name: skill?.name ?? skillId,
        owner: generalDisplay(me.generalId).name,
      });
      accept();
    } else if (mode === "autoSilent") accept();
    else if (mode === "hujia" && !sameFactionTeammateAlive(gameView, me)) pass();
  }, [pending?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnswer = async (fields: AnswerFields) => {
    setBusy(true);
    try {
      await answer(fields);
    } finally {
      setBusy(false);
    }
  };

  const answerActivate = (accept: boolean) => {
    if (!pending) return;
    autoHandledRef.current = pending.id;
    void runAnswer(accept ? { decisionId: pending.id } : { decisionId: pending.id, pass: true });
  };

  return {
    pending,
    route,
    isMyDecision,
    isMainAction,
    isDiscardTo,
    pendingActivateId,
    pendingActivateMode,
    busy,
    runAnswer,
    answerActivate,
  };
}
