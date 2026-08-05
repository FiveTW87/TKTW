// State rigging for the catalog contract suite.
//
// The catalog's universal rule is "ใช้ seed คงที่และจัดมือ/กองจั่วโดยตรงเพื่อให้
// deterministic" — every case pins the exact cards involved instead of hoping
// the shuffle cooperates. These helpers are the only sanctioned way to do that,
// because each of them preserves the deck's own invariant: one physical card id
// exists in exactly one zone, never duplicated, never silently conjured.
import type { Card, EquipSlot, GameState, Zone } from "../../src/types";
import { ALL_CARDS, cardDef } from "../../src/core/cardData";
import { cardById, getPlayer } from "../../src/core/state";

/** Cards a test deliberately destroyed (emptyDrawPile / setDrawPile). Kept in a
 *  WeakMap rather than on GameState so `state` stays a plain toEqual-comparable
 *  snapshot — determinism.test.ts compares whole states and an extra field
 *  would break it. */
const VOIDED = new WeakMap<GameState, Set<string>>();

function voided(state: GameState): Set<string> {
  let s = VOIDED.get(state);
  if (!s) {
    s = new Set();
    VOIDED.set(state, s);
  }
  return s;
}

/** Remove `cardId` from every zone it could be sitting in. The precondition
 *  for placing a card anywhere: the real shuffle already dealt it somewhere. */
export function detach(state: GameState, cardId: string): void {
  for (const p of state.players) {
    const h = p.hand.findIndex((c) => c.id === cardId);
    if (h >= 0) p.hand.splice(h, 1);
    const j = p.judgmentZone.findIndex((c) => c.id === cardId);
    if (j >= 0) p.judgmentZone.splice(j, 1);
    for (const slot of Object.keys(p.equipment) as EquipSlot[]) {
      if (p.equipment[slot]?.id === cardId) delete p.equipment[slot];
    }
  }
  state.drawPile = state.drawPile.filter((c) => c.id !== cardId);
  state.discardPile = state.discardPile.filter((c) => c.id !== cardId);
  voided(state).delete(cardId);
}

/** Replace `pid`'s hand with exactly `cardIds`. Whatever they were holding goes
 *  to the BOTTOM of the draw pile (index 0) so it can't be drawn back and
 *  perturb a rigged deck — popCard reads from the end. */
export function setHand(state: GameState, pid: string, cardIds: string[]): void {
  const p = getPlayer(state, pid);
  const displaced = p.hand.splice(0);
  state.drawPile.unshift(...displaced);
  for (const id of cardIds) {
    detach(state, id);
    p.hand.push(cardById(id));
  }
}

/** Empty the given hands (default: everyone). Cards go to the bottom of the
 *  draw pile, same reasoning as setHand. */
export function clearHands(state: GameState, pids?: string[]): void {
  for (const p of state.players) {
    if (pids && !pids.includes(p.id)) continue;
    state.drawPile.unshift(...p.hand.splice(0));
  }
}

/** Plant cards so they come off the deck in the order listed: cardIds[0] is
 *  drawn/judged first. (popCard pops the END of the array, so this pushes in
 *  reverse — writing it once here removes the reversal footgun from 200 tests.) */
export function topOfDeck(state: GameState, cardIds: string[]): void {
  for (const id of cardIds) detach(state, id);
  for (let i = cardIds.length - 1; i >= 0; i--) {
    state.drawPile.push(cardById(cardIds[i]!));
  }
}

/** Make the draw pile contain exactly `cardIds`, top-first. Everything else
 *  currently in it is destroyed (recorded as voided). */
export function setDrawPile(state: GameState, cardIds: string[]): void {
  for (const c of state.drawPile) voided(state).add(c.id);
  state.drawPile = [];
  topOfDeck(state, cardIds);
}

/** Destroy the draw pile. `into: "discard"` moves it to the discard pile
 *  instead (so popCard's reshuffle path is exercised rather than the
 *  both-piles-empty path). */
export function emptyDrawPile(state: GameState, into: "discard" | "void" = "void"): void {
  if (into === "discard") {
    state.discardPile.push(...state.drawPile.splice(0));
    return;
  }
  for (const c of state.drawPile) voided(state).add(c.id);
  state.drawPile = [];
}

/** Make the discard pile contain exactly `cardIds` (index 0 = bottom). */
export function setDiscardPile(state: GameState, cardIds: string[]): void {
  for (const c of state.discardPile) voided(state).add(c.id);
  state.discardPile = [];
  for (const id of cardIds) {
    detach(state, id);
    state.discardPile.push(cardById(id));
  }
}

/** Equip `cardId` on `pid`, sending anything already in that slot to discard. */
export function equip(state: GameState, pid: string, cardId: string): void {
  const card = cardById(cardId);
  const slot = cardDef(card.typeKey).slot;
  if (!slot) throw new Error(`rig.equip: ${cardId} (${card.typeKey}) is not equipment`);
  detach(state, cardId);
  const p = getPlayer(state, pid);
  const old = p.equipment[slot];
  if (old) state.discardPile.push(old);
  p.equipment[slot] = card;
}

/** Seat a delayed trick in `pid`'s judgment zone without playing it. */
export function putInJudgmentZone(state: GameState, pid: string, cardId: string): void {
  detach(state, cardId);
  getPlayer(state, pid).judgmentZone.push(cardById(cardId));
}

export function setHp(state: GameState, pid: string, hp: number, maxHp?: number): void {
  const p = getPlayer(state, pid);
  if (maxHp !== undefined) p.maxHp = maxHp;
  p.hp = hp;
}

/** Kill `pid` out-of-band (no death triggers, no kill rewards) — for cases that
 *  need a corpse at the table as a rejected target. Their cards go to discard,
 *  exactly as killPlayer would leave them. */
export function killOff(state: GameState, pid: string): void {
  const p = getPlayer(state, pid);
  p.alive = false;
  p.roleRevealed = true;
  state.discardPile.push(...p.hand.splice(0));
  for (const slot of Object.keys(p.equipment) as EquipSlot[]) {
    const c = p.equipment[slot];
    if (c) state.discardPile.push(c);
  }
  p.equipment = {};
  state.discardPile.push(...p.judgmentZone.splice(0));
}

export interface CardLocation {
  zone: Zone;
  ownerId?: string;
  slot?: EquipSlot;
}

/** Every zone a card id currently occupies. More than one entry means the
 *  engine duplicated a physical card — always a bug. */
export function locationsOf(state: GameState, cardId: string): CardLocation[] {
  const out: CardLocation[] = [];
  for (const p of state.players) {
    if (p.hand.some((c) => c.id === cardId)) out.push({ zone: "hand", ownerId: p.id });
    if (p.judgmentZone.some((c) => c.id === cardId)) out.push({ zone: "judgment", ownerId: p.id });
    for (const slot of Object.keys(p.equipment) as EquipSlot[]) {
      if (p.equipment[slot]?.id === cardId) out.push({ zone: "equipment", ownerId: p.id, slot });
    }
  }
  if (state.drawPile.some((c) => c.id === cardId)) out.push({ zone: "drawPile" });
  if (state.discardPile.some((c) => c.id === cardId)) out.push({ zone: "discardPile" });
  return out;
}

function everyPlacedCard(state: GameState): Card[] {
  const out: Card[] = [];
  for (const p of state.players) {
    out.push(...p.hand, ...p.judgmentZone);
    for (const c of Object.values(p.equipment)) if (c) out.push(c);
  }
  out.push(...state.drawPile, ...state.discardPile);
  return out;
}

/** No physical card id is in two places at once, and no id exists that isn't a
 *  real deck card. Holds at ALL times, including mid-decision — a card that is
 *  briefly "in flight" (a revealed judgment card held in its box, a wugu pool)
 *  is absent from every zone, which is legal; being in two zones never is.
 *  This is what the global afterEach enforces on every contract game. */
export function assertNoCardDuplication(state: GameState): void {
  const seen = new Map<string, number>();
  for (const c of everyPlacedCard(state)) {
    seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
  }
  const dupes: string[] = [];
  const unknown: string[] = [];
  for (const [id, n] of seen) {
    if (n > 1) dupes.push(`${id}×${n} @ ${JSON.stringify(locationsOf(state, id))}`);
    if (!ALL_CARDS.some((c) => c.id === id)) unknown.push(id);
  }
  if (dupes.length > 0) {
    throw new Error(`physical card duplicated across zones: ${dupes.join(", ")}`);
  }
  if (unknown.length > 0) {
    throw new Error(`card id not in the 104-card deck: ${unknown.join(", ")}`);
  }
}

/** The stronger invariant: all 104 physical cards accounted for, exactly once,
 *  with nothing lost. Only true at a quiescent point (no card mid-resolution),
 *  so tests call it explicitly rather than it running automatically. */
export function assertCardConservation(state: GameState): void {
  assertNoCardDuplication(state);
  const present = new Set(everyPlacedCard(state).map((c) => c.id));
  const missing = ALL_CARDS.map((c) => c.id).filter(
    (id) => !present.has(id) && !voided(state).has(id),
  );
  if (missing.length > 0) {
    throw new Error(`physical card(s) lost — in no zone at all: ${missing.join(", ")}`);
  }
}
