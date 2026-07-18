import type { Card, GameState, Player } from "../types";
import type { Rng } from "./rng";
import { CARD_BY_ID, cardDef } from "./cardData";

export function getPlayer(state: GameState, id: string): Player {
  const p = state.players.find((pp) => pp.id === id);
  if (!p) throw new Error(`no such player: ${id}`);
  return p;
}

export function isAlive(state: GameState, id: string): boolean {
  return state.players.find((p) => p.id === id)?.alive ?? false;
}

export function aliveIds(state: GameState): string[] {
  return state.players.filter((p) => p.alive).map((p) => p.id);
}

export function cardById(id: string): Card {
  const c = CARD_BY_ID[id];
  if (!c) throw new Error(`unknown card id: ${id}`);
  return c;
}

/** Clockwise seat order starting at `fromId` inclusive, alive players only. */
export function seatOrderFrom(state: GameState, fromId: string): string[] {
  const alive = state.players.filter((p) => p.alive).sort((a, b) => a.seat - b.seat);
  const idx = alive.findIndex((p) => p.id === fromId);
  if (idx < 0) return alive.map((p) => p.id);
  return [...alive.slice(idx), ...alive.slice(0, idx)].map((p) => p.id);
}

/** Clockwise seat order starting right *after* `fromId` (used for polling
 *  responses to something `fromId` did — dodge/wuxie/AoE windows). */
export function seatOrderAfter(state: GameState, fromId: string): string[] {
  return seatOrderFrom(state, fromId).slice(1);
}

export function log(state: GameState, text: string, data?: Record<string, unknown>): void {
  state.log.push({ turn: state.turnNumber, text, ...(data ? { data } : {}) });
}

export function removeFromHand(state: GameState, playerId: string, cardId: string): Card {
  const p = getPlayer(state, playerId);
  const idx = p.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error(`card ${cardId} not in ${playerId}'s hand`);
  return p.hand.splice(idx, 1)[0]!;
}

export function moveToDiscard(state: GameState, card: Card): void {
  state.discardPile.push(card);
}

export function discardFromHand(state: GameState, playerId: string, cardId: string): void {
  moveToDiscard(state, removeFromHand(state, playerId, cardId));
}

/** Discard several cards from one hand as a single atomic operation: every
 *  id must be a distinct card actually in hand, checked before any of them
 *  is removed, so a partially-invalid submission (e.g. one real id + one
 *  stale/duplicate id) can't discard some cards then throw on the rest. */
export function discardCardsFromHand(state: GameState, playerId: string, cardIds: string[]): void {
  const hand = getPlayer(state, playerId).hand;
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error(`${playerId}: duplicate card id in the same discard request`);
  }
  for (const cid of cardIds) {
    if (!hand.some((c) => c.id === cid)) {
      throw new Error(`${playerId}: ${cid} is not in hand`);
    }
  }
  for (const cid of cardIds) discardFromHand(state, playerId, cid);
}

/** Pop one card off the top of the draw pile, reshuffling the discard pile
 *  into it first when it's empty. This is the single chokepoint for the
 *  "draw pile ran out -> shuffle discards into a fresh draw pile" rule — any
 *  path that takes a card off the top (draw, judgment, wugu reveal, yiji)
 *  should go through here so none of them can silently under-deliver. Returns
 *  undefined only when BOTH piles are exhausted (extremely rare). */
export function popCard(state: GameState, rng: Rng): Card | undefined {
  if (state.drawPile.length === 0) {
    if (state.discardPile.length === 0) return undefined; // truly out of cards
    state.drawPile = rng.shuffle(state.discardPile);
    state.discardPile = [];
    log(state, `กองจั่วหมด — สับกองทิ้งเป็นกองจั่วใหม่ ${state.drawPile.length} ใบ`);
  }
  return state.drawPile.pop()!;
}

export function drawCards(state: GameState, rng: Rng, playerId: string, n: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    const c = popCard(state, rng);
    if (!c) break;
    drawn.push(c);
  }
  getPlayer(state, playerId).hand.push(...drawn);
  return drawn;
}

export function equipCard(state: GameState, playerId: string, card: Card): void {
  const def = cardDef(card.typeKey);
  if (!def.slot) throw new Error(`card ${card.typeKey} is not equipment`);
  const p = getPlayer(state, playerId);
  const old = p.equipment[def.slot];
  if (old) state.discardPile.push(old);
  p.equipment[def.slot] = card;
}

export function healPlayer(state: GameState, playerId: string, amount: number): void {
  const p = getPlayer(state, playerId);
  p.hp = Math.min(p.maxHp, p.hp + amount);
}
