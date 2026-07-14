import type { GameState } from "../types";
import type { Rng } from "./rng";

/** Threaded through every effect/trigger/card function so we don't repeat
 *  (state, rng, checkGameEnd) in every signature. checkGameEnd is pluggable
 *  per SPEC P3 requirement: identity-mode win conditions must attach without
 *  editing engine/core/ — see modes/identity.ts. */
export interface GameConfig {
  checkGameEnd: (state: GameState) => void;
}

export interface Ctx {
  state: GameState;
  rng: Rng;
  checkGameEnd: (state: GameState) => void;
}

export function makeCtx(state: GameState, rng: Rng, config: GameConfig): Ctx {
  return { state, rng, checkGameEnd: config.checkGameEnd };
}

/** Default P0/P1 win condition: no roles yet, game just ends when at most
 *  one player is left standing. P3's identity.ts overrides this. */
export function lastAliveWins(state: GameState): void {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    state.finished = true;
    state.winners = alive[0] ? [alive[0].role] : [];
  }
}
