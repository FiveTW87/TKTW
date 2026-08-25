import "./equipment/index";
import "./generals/index";
import {
  createIdentityGame,
  recoverIdentityGame,
  identityCheckGameEnd,
  identityOnDeath,
  roleTableFor,
} from "./modes/identity";
export { createGame, recoverGame, type CreateGameOptions } from "./core/gameFactory";

export { createIdentityGame, recoverIdentityGame, roleTableFor, identityCheckGameEnd, identityOnDeath };
export { forfeitIdentityPlayer } from "./modes/identity";
export { assignGeneral } from "./core/generalAssign";
export { summarizeMatch, type MatchSummary, type MatchPlayerSummary } from "./core/matchResult";
export { createRng, type Rng } from "./core/rng";

export * from "./types";
export * from "./core/view";
export * from "./core/legalActions";
export * from "./core/decisions";
export * from "./core/ctx";
export { GENERALS, registerGeneral, type GeneralDef, type SkillDef } from "./generals/registry";
export type { TriggerPoint, QueryHookName } from "./core/triggers";
export { simpleBotAnswer } from "./bots/simplePolicy";
export { runUntilEnd, type BotPolicy } from "./bots/runner";
export {
  createTutorialGame,
  tutorialBotAnswer,
  TUTORIAL_SCENARIO_IDS,
  type TutorialBotScript,
  type TutorialGame,
  type TutorialScenarioId,
} from "./tutorial/tutorialGames";
