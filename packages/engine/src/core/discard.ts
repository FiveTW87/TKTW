// ENG-002 — a discard decision must state exactly what's selectable and how
// many, and the answer must be validated BEFORE any card leaves the hand
// (SPEC 3.3 validate-before-mutate). Shared by the end-of-turn over-limit
// discard (turnLoop) and the forced discards (sword_ice / xiahoudun ganglie).
import type { GameState } from "../types";
import { getPlayer } from "./state";

export interface DiscardLimit {
  min: number;
  max: number;
  /** When set, min===max===exact; carried separately so the UI can pin it. */
  exact?: number;
}

/** Build the `data` payload for a discardTo / discardChosenBy decision. */
export function discardRequest(
  state: GameState,
  playerId: string,
  limit: DiscardLimit,
): Record<string, unknown> {
  const selectableCardIds = getPlayer(state, playerId).hand.map((c) => c.id);
  return {
    minCards: limit.min,
    maxCards: limit.max,
    ...(limit.exact !== undefined ? { exactCards: limit.exact } : {}),
    selectableCardIds,
    // Legacy fields still read by the bot and the current client discard bar.
    mustDiscard: limit.exact ?? limit.min,
    count: limit.exact ?? limit.min,
  };
}

/** Throw if `ids` violate the discard request. Pure read — call before mutating. */
export function assertDiscardAnswer(
  playerId: string,
  ids: string[],
  data: Record<string, unknown>,
): void {
  const min = Number(data.minCards ?? 0);
  const max = Number(data.maxCards ?? min);
  const selectable = new Set((data.selectableCardIds as string[] | undefined) ?? []);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${playerId}: duplicate card id in discard selection`);
  }
  if (ids.length < min || ids.length > max) {
    const want = min === max ? `${min}` : `${min}-${max}`;
    throw new Error(`${playerId}: must discard ${want} card(s), got ${ids.length}`);
  }
  for (const id of ids) {
    if (!selectable.has(id)) {
      throw new Error(`${playerId}: ${id} is not selectable for discard`);
    }
  }
}
