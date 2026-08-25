import { createRng } from "./rng";
import { createInitialState, type SetupOptions } from "./setup";
import { makeCtx, lastAliveWins, type GameConfig } from "./ctx";
import { runGame } from "./turnLoop";
import { createSession, replaySession, type GameSession } from "./decisions";
import type { DecisionLogEntry, GameState } from "../types";

export interface CreateGameOptions extends SetupOptions {
  checkGameEnd?: (state: GameState) => void;
}

export function createGame(opts: CreateGameOptions): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng);
  const config: GameConfig = { checkGameEnd: opts.checkGameEnd ?? lastAliveWins };
  const session = createSession(runGame(makeCtx(state, rng, config)), state, rng);
  session.rebuild = () => recoverGame(opts, session.decisionLog);
  return session;
}

export function recoverGame(
  opts: CreateGameOptions,
  log: readonly DecisionLogEntry[],
): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng);
  const config: GameConfig = { checkGameEnd: opts.checkGameEnd ?? lastAliveWins };
  return replaySession(() => runGame(makeCtx(state, rng, config)), state, rng, log);
}
