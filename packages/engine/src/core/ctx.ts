import type { GameState } from "../types";
import type { Rng } from "./rng";
import type { EngineGenerator } from "./decisions";

/** Threaded through every effect/trigger/card function so we don't repeat
 *  (state, rng, checkGameEnd) in every signature. checkGameEnd/onDeath are
 *  pluggable per SPEC P3 requirement: identity-mode rules attach without
 *  editing engine/core/ — see modes/identity.ts. */
export interface GameConfig {
  checkGameEnd: (state: GameState) => void;
  /** Mode-level (not general-level) consequence of a death — e.g. identity
   *  mode's kill rewards/penalties (SPEC 2: killing a rebel draws 3, the
   *  lord killing a loyalist discards everything). Runs after the dead
   *  player's own OnDeath triggers, before checkGameEnd. Optional because
   *  P0/P1/P2's bare mode has no such rule. */
  onDeath?: (ctx: Ctx, deadId: string, killerId: string | undefined) => EngineGenerator;
}

export interface Ctx {
  state: GameState;
  rng: Rng;
  checkGameEnd: (state: GameState) => void;
  onDeath?: (ctx: Ctx, deadId: string, killerId: string | undefined) => EngineGenerator;
}

export function makeCtx(state: GameState, rng: Rng, config: GameConfig): Ctx {
  return {
    state,
    rng,
    checkGameEnd: config.checkGameEnd,
    ...(config.onDeath ? { onDeath: config.onDeath } : {}),
  };
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
