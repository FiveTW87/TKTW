// SPEC section 5.
import type { GameState } from "../types";
import { getPlayer } from "./state";
import { cardDef } from "./cardData";
import { queryHook } from "./triggers";

function horseMinus(state: GameState, playerId: string): number {
  return getPlayer(state, playerId).equipment.horseMinus ? 1 : 0;
}

function horsePlus(state: GameState, playerId: string): number {
  return getPlayer(state, playerId).equipment.horsePlus ? 1 : 0;
}

/** Seat-based distance, skipping dead players, minimum of the two directions. */
export function distanceBase(state: GameState, aId: string, bId: string): number {
  const alive = state.players.filter((p) => p.alive).sort((x, y) => x.seat - y.seat);
  const ids = alive.map((p) => p.id);
  const i = ids.indexOf(aId);
  const j = ids.indexOf(bId);
  if (i < 0 || j < 0 || i === j) return 0;
  const n = ids.length;
  const cw = (j - i + n) % n;
  const ccw = (i - j + n) % n;
  return Math.min(cw, ccw);
}

/** Effective distance a's cards must reach to hit b, after horses and skills. */
export function distanceNet(state: GameState, aId: string, bId: string): number {
  const base = distanceBase(state, aId, bId);
  const skillMod = queryHook<number>(
    state,
    "distanceModifier",
    { fromId: aId, toId: bId },
    (rs) => rs.reduce((x, y) => x + y, 0),
    0,
  );
  const net = base - horseMinus(state, aId) + horsePlus(state, bId) + skillMod;
  return Math.max(1, net);
}

export function attackRange(state: GameState, playerId: string): number {
  const weapon = getPlayer(state, playerId).equipment.weapon;
  if (!weapon) return 1;
  return cardDef(weapon.typeKey).attackRange ?? 1;
}

export function canAttack(state: GameState, aId: string, bId: string): boolean {
  return attackRange(state, aId) >= distanceNet(state, aId, bId);
}
