import "./equipment/index";
import "./generals/index";
import { createRng } from "./core/rng";
import { createInitialState, type SetupOptions } from "./core/setup";
import { makeCtx, lastAliveWins, type GameConfig } from "./core/ctx";
import { runGame } from "./core/turnLoop";
import { createSession, replaySession, type GameSession } from "./core/decisions";
import type { GameState, DecisionLogEntry } from "./types";

export interface CreateGameOptions extends SetupOptions {
  checkGameEnd?: (state: GameState) => void;
}

export function createGame(opts: CreateGameOptions): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng);
  const config: GameConfig = { checkGameEnd: opts.checkGameEnd ?? lastAliveWins };
  return createSession(runGame(makeCtx(state, rng, config)), state, rng);
}

/** Recover a session after a process restart from (opts, decisionLog) —
 *  the event-sourced replay resolution from design review. See
 *  core/decisions.ts:replaySession for the determinism requirements. */
export function recoverGame(
  opts: CreateGameOptions,
  log: readonly DecisionLogEntry[],
): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng);
  const config: GameConfig = { checkGameEnd: opts.checkGameEnd ?? lastAliveWins };
  return replaySession(() => runGame(makeCtx(state, rng, config)), state, rng, log);
}

export * from "./types";
export * from "./core/view";
export * from "./core/decisions";
export * from "./core/ctx";
export { GENERALS, registerGeneral, type GeneralDef, type SkillDef } from "./generals/registry";
export type { TriggerPoint, QueryHookName } from "./core/triggers";
export { simpleBotAnswer } from "./bots/simplePolicy";
export { runUntilEnd, type BotPolicy } from "./bots/runner";
