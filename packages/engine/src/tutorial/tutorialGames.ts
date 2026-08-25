import { createGame } from "../core/gameFactory";
import { createIdentityGame } from "../modes/identity";
import { ALL_CARDS } from "../core/cardData";
import { respond, type GameSession } from "../core/decisions";
import { assignGeneral } from "../core/generalAssign";
import { cardById, getPlayer } from "../core/state";
import type { Card, EquipSlot, GameState, PendingDecision, PlayerAnswer } from "../types";

export const TUTORIAL_SCENARIO_IDS = [
  "basic-turn",
  "basic-dodge",
  "basic-recovery",
  "advanced-distance",
  "advanced-tricks",
  "advanced-roles",
] as const;
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
    case "advanced-distance":
      return createAdvancedDistanceGame();
    case "advanced-tricks":
      return createAdvancedTricksGame();
    case "advanced-roles":
      return createAdvancedRolesGame();
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

function createAdvancedDistanceGame(): TutorialGame {
  const session = createPreparedGame(4);
  setTutorialHand(session.state, "p0", [cardIdFor("sword_qinggang", 0), cardIdFor("sha", 0)]);
  setTutorialHand(session.state, "p1", []);
  setTutorialHand(session.state, "p2", []);
  setTutorialHand(session.state, "p3", []);
  return tutorialGame("advanced-distance", session, "p0");
}

function createAdvancedTricksGame(): TutorialGame {
  const session = createPreparedGame();
  setTutorialHand(session.state, "p0", [cardIdFor("guohe", 0)]);
  setTutorialHand(session.state, "p1", [cardIdFor("wuxie", 0)]);
  setTutorialHand(session.state, "p2", []);
  driveOpeningTrick(session, "p0", "p1");
  while (session.state.pendingDecision?.kind === "askWuxie" && session.state.pendingDecision.playerId !== "p1") {
    const pending = session.state.pendingDecision;
    respond(session, { decisionId: pending.id, playerId: pending.playerId, pass: true });
  }
  return tutorialGame("advanced-tricks", session, "p1");
}

function createAdvancedRolesGame(): TutorialGame {
  const session = createIdentityGame({
    playerCount: 3,
    seed: 20_260_803,
    names: ["ผู้ฝึก", "คู่ซ้อม 1", "คู่ซ้อม 2"],
  });
  while (session.state.pendingDecision?.kind === "pickGeneral") {
    const pending = session.state.pendingDecision;
    const options = (pending.data as { options: string[] }).options;
    respond(session, { decisionId: pending.id, playerId: pending.playerId, choice: options[0]! });
  }
  const humanPlayerId = session.state.pendingDecision?.playerId ?? "p0";
  assignGeneral(session.state, humanPlayerId, "sunquan", getPlayer(session.state, humanPlayerId).role === "lord");
  setTutorialHand(session.state, humanPlayerId, [cardIdFor("sha", 1), cardIdFor("shan", 1)]);
  return tutorialGame("advanced-roles", session, humanPlayerId);
}

function tutorialGame(scenarioId: TutorialScenarioId, session: GameSession, humanPlayerId: string): TutorialGame {
  return {
    scenarioId,
    session,
    humanPlayerId,
    botScript: { mainAction: "endPhase", response: "pass", draw: "draw", discard: "minimum" },
  };
}

function createPreparedGame(playerCount = 3): GameSession {
  const session = createGame({
    playerCount,
    seed: 20_260_801,
    names: Array.from({ length: playerCount }, (_, index) => index === 0 ? "ผู้ฝึก" : `คู่ซ้อม ${index}`),
  });
  prepareVisibleGenerals(session.state);
  return session;
}

function driveOpeningTrick(session: GameSession, sourceId: string, targetId: string): void {
  const draw = session.state.pendingDecision;
  if (!draw || draw.kind !== "drawCard" || draw.playerId !== sourceId) throw new Error("Tutorial trick prelude expected draw.");
  respond(session, { decisionId: draw.id, playerId: sourceId, choice: "draw" });
  const mainAction = session.state.pendingDecision;
  const trick = getPlayer(session.state, sourceId).hand.find((card) => card.typeKey === "guohe");
  if (!mainAction || mainAction.kind !== "mainAction" || !trick) throw new Error("Tutorial trick prelude expected Guohe.");
  respond(session, {
    decisionId: mainAction.id,
    playerId: sourceId,
    choice: "playCard",
    cardIds: [trick.id],
    targetIds: [targetId],
  });
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
    assignGeneral(state, player.id, generals[index % generals.length]!);
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
