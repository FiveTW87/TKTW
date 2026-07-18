// Shared harness for the per-general ability tests. Not a test file itself.
import "../../src/generals/index";
import "../../src/equipment/index";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { runGame } from "../../src/core/turnLoop";
import { createSession, respond, type GameSession } from "../../src/core/decisions";
import { assignGeneral } from "../../src/core/generalAssign";
import { getPlayer } from "../../src/core/state";
import type { GameState, PlayerAnswer } from "../../src/types";

export { respond, getPlayer };
export { cardById } from "../../src/core/state";
export { countsAsType } from "../../src/core/cardChecks";
export { forceIntoHand } from "../_testUtils";

// Real deck card ids used across the general tests.
export const CID = {
  blackSha: "spade_1_2",
  blackSha2: "spade_7_1",
  redShan: "heart_1_2",
  redShan2: "heart_2_2",
  blackDuel: "club_6_1",
  diamond: "diamond_1_1", // a diamond card (wanjian)
  guohe: "spade_11_2",
  shunshou: "spade_11_1",
  tao: "heart_3_1",
  wuzhong: "heart_2_1",
  crossbow: "spade_1_1",
};

/** A fresh lastAliveWins game with the given generals assigned BEFORE the turn
 *  loop starts (so TurnStart / DrawPhaseStart skills fire correctly), advanced
 *  to its first decision. `assigns` = [playerId, generalId, isLord?]. */
export function gameWith(
  seed: number,
  playerCount: number,
  assigns: Array<[string, string, boolean?]>,
  currentSeat = 0,
): { state: GameState; session: GameSession } {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount, seed }, rng);
  for (const [pid, gen, lord] of assigns) assignGeneral(state, pid, gen, lord ?? false);
  state.currentSeat = currentSeat; // whose turn the game opens on
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  const session = createSession(runGame(ctx), state, rng);
  return { state, session };
}

/** Pass through any open ไร้ช่องโหว่ window. */
export function passWuxie(session: GameSession): void {
  let n = 0;
  while (session.state.pendingDecision?.kind === "askWuxie") {
    if (n++ > 50) throw new Error("wuxie window did not close");
    const pd = session.state.pendingDecision;
    respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
  }
}

/** Force a specific judgment result: place a matching card on top of the draw
 *  pile (popCard reads the end). `pred` selects the card to plant. */
export function planJudgment(state: GameState, pred: (suit: string, rank: number) => boolean): void {
  const idx = state.drawPile.findIndex((c) => pred(c.suit, c.rank));
  if (idx < 0) throw new Error("no card matches the requested judgment");
  const [c] = state.drawPile.splice(idx, 1);
  state.drawPile.push(c!);
}

export const answerPass = (pd: { id: string; playerId: string }): PlayerAnswer => ({
  decisionId: pd.id,
  playerId: pd.playerId,
  pass: true,
});
