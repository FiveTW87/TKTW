import type { GameState } from "../src/types";
import { cardById } from "../src/core/state";
import { respond, type GameSession } from "../src/core/decisions";

/** ENG-004: each turn now gates its draw behind a `drawCard` decision. Most
 *  tests set up a game and expect to act at the first mainAction — advance past
 *  that draw gate (any answer draws). No-ops when the pending decision isn't a
 *  draw (e.g. a general with a TurnStart/DrawPhaseStart opt-in fires first). */
export function passDraw(session: GameSession): void {
  const pd = session.state.pendingDecision;
  if (pd?.kind === "drawCard") {
    respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "draw" });
  }
}

// createInitialState deals from a real shuffled deck, so a specific card id
// we want to hand-place for a test may already have been dealt to someone
// during setup. Strip it from wherever it landed first, so each card id
// still exists exactly once before we place it — keeps the deck's own
// invariant intact instead of creating a duplicate copy.
export function forceIntoHand(state: GameState, playerId: string, cardId: string): void {
  for (const p of state.players) {
    const idx = p.hand.findIndex((c) => c.id === cardId);
    if (idx >= 0) p.hand.splice(idx, 1);
  }
  state.drawPile = state.drawPile.filter((c) => c.id !== cardId);
  state.players.find((p) => p.id === playerId)!.hand.push(cardById(cardId));
}
