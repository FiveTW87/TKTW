import type { GameState } from "../src/types";
import { cardById } from "../src/core/state";

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
