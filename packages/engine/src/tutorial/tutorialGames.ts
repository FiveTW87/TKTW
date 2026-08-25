import { createGame } from "../core/gameFactory";
import { ALL_CARDS } from "../core/cardData";
import { respond, type GameSession } from "../core/decisions";
import { assignGeneral } from "../core/generalAssign";
import { cardById, getPlayer } from "../core/state";
import type { Card, EquipSlot, GameState, PendingDecision, PlayerAnswer } from "../types";

export const TUTORIAL_SCENARIO_IDS = ["basic-turn", "basic-dodge", "basic-recovery"] as const;
export type TutorialScenarioId = (typeof TUTORIAL_SCENARIO_IDS)[number];

export interface TutorialBotScript {
  readonly mainAction: "endPhase";
  readonly response: "pass";
  readonly draw: "draw";
  readonly discard: "minimum";
}

export interface TutorialGame {
  readonly scenarioId: TutorialScenarioId;
  readonly session: GameSession;
  readonly humanPlayerId: string;
  readonly botScript: TutorialBotScript;
}

export function createTutorialGame(scenarioId: TutorialScenarioId): TutorialGame {
  switch (scenarioId) {
    case "basic-turn":
      return createBasicTurnGame();
    case "basic-dodge":
      return createBasicDodgeGame();
    case "basic-recovery":
      return createBasicRecoveryGame();
  }
}

export function tutorialBotAnswer(tutorial: TutorialGame, decision: PendingDecision): PlayerAnswer {
  if (decision.playerId === tutorial.humanPlayerId) {
    throw new Error(`Tutorial bot cannot answer the learner's decision '${decision.id}'.`);
  }
  if (decision.kind === "mainAction" && tutorial.botScript.mainAction === "endPhase") {
    return { decisionId: decision.id, playerId: decision.playerId, choice: "endPhase" };
  }
  if (decision.kind === "drawCard" && tutorial.botScript.draw === "draw") {
    return { decisionId: decision.id, playerId: decision.playerId, choice: "draw" };
  }
  if ((decision.kind === "discardTo" || decision.kind === "discardChosenBy") && tutorial.botScript.discard === "minimum") {
    const data = decision.data as { mustDiscard?: number; count?: number };
    const count = Number(data.mustDiscard ?? data.count ?? 0);
    const hand = getPlayer(tutorial.session.state, decision.playerId).hand;
    return { decisionId: decision.id, playerId: decision.playerId, cardIds: hand.slice(0, count).map((card) => card.id) };
  }
  if (tutorial.botScript.response === "pass") {
    return { decisionId: decision.id, playerId: decision.playerId, pass: true };
  }
  throw new Error(`Tutorial script '${tutorial.scenarioId}' has no bot input for '${decision.kind}'.`);
}

function createBasicDodgeGame(): TutorialGame {
  const session = createPreparedGame();
  setTutorialHand(session.state, "p0", [cardIdFor("sha", 0)]);
  setTutorialHand(session.state, "p1", [cardIdFor("shan", 0)]);
  setTutorialHand(session.state, "p2", []);
  driveOpeningAttack(session, "p0", "p1");
  return tutorialGame("basic-dodge", session, "p1");
}

function createBasicRecoveryGame(): TutorialGame {
  const session = createPreparedGame();
  setTutorialHand(session.state, "p0", [cardIdFor("sha", 0)]);
  setTutorialHand(session.state, "p1", [cardIdFor("tao", 0)]);
  setTutorialHand(session.state, "p2", []);
  driveOpeningAttack(session, "p0", "p1");
  return tutorialGame("basic-recovery", session, "p1");
}

function createBasicTurnGame(): TutorialGame {
  const session = createPreparedGame();
  setTutorialHand(session.state, "p0", [cardIdFor("sha", 0)]);
  setTutorialHand(session.state, "p1", [cardIdFor("shan", 0)]);
  setTutorialHand(session.state, "p2", []);
  return tutorialGame("basic-turn", session, "p0");
}

function tutorialGame(scenarioId: TutorialScenarioId, session: GameSession, humanPlayerId: string): TutorialGame {
  return {
    scenarioId,
    session,
    humanPlayerId,
    botScript: { mainAction: "endPhase", response: "pass", draw: "draw", discard: "minimum" },
  };
}

function createPreparedGame(): GameSession {
  const session = createGame({
    playerCount: 3,
    seed: 20_260_801,
    names: ["คู่ซ้อม 1", "ผู้ฝึก", "คู่ซ้อม 2"],
  });
  prepareVisibleGenerals(session.state);
  return session;
}

function driveOpeningAttack(session: GameSession, sourceId: string, targetId: string): void {
  const draw = session.state.pendingDecision;
  if (!draw || draw.kind !== "drawCard" || draw.playerId !== sourceId) {
    throw new Error(`Tutorial prelude expected ${sourceId} drawCard.`);
  }
  respond(session, { decisionId: draw.id, playerId: sourceId, choice: "draw" });
  const mainAction = session.state.pendingDecision;
  const sha = getPlayer(session.state, sourceId).hand.find((card) => card.typeKey === "sha");
  if (!mainAction || mainAction.kind !== "mainAction" || mainAction.playerId !== sourceId || !sha) {
    throw new Error(`Tutorial prelude expected ${sourceId} mainAction with Sha.`);
  }
  respond(session, {
    decisionId: mainAction.id,
    playerId: sourceId,
    choice: "playCard",
    cardIds: [sha.id],
    targetIds: [targetId],
  });
}

function prepareVisibleGenerals(state: GameState): void {
  const generals = ["caocao", "liubei", "sunquan"] as const;
  state.players.forEach((player, index) => {
    assignGeneral(state, player.id, generals[index]!);
    player.generalRevealed = true;
  });
}

function cardIdFor(typeKey: string, occurrence: number): string {
  const card = ALL_CARDS.filter((candidate) => candidate.typeKey === typeKey)[occurrence];
  if (!card) throw new Error(`Tutorial fixture requires ${typeKey} card #${occurrence + 1}.`);
  return card.id;
}

function setTutorialHand(state: GameState, playerId: string, cardIds: readonly string[]): void {
  const player = getPlayer(state, playerId);
  state.drawPile.unshift(...player.hand.splice(0));
  for (const cardId of cardIds) {
    detachCard(state, cardId);
    player.hand.push(cardById(cardId));
  }
}

function detachCard(state: GameState, cardId: string): void {
  for (const player of state.players) {
    removeCard(player.hand, cardId);
    removeCard(player.judgmentZone, cardId);
    for (const slot of Object.keys(player.equipment) as EquipSlot[]) {
      if (player.equipment[slot]?.id === cardId) delete player.equipment[slot];
    }
  }
  removeCard(state.drawPile, cardId);
  removeCard(state.discardPile, cardId);
}

function removeCard(cards: Card[], cardId: string): void {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index >= 0) cards.splice(index, 1);
}
