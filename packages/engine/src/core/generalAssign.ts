import type { GameState } from "../types";
import { GENERALS } from "../generals/registry";
import { getPlayer } from "./state";

/** SPEC section 3.5: lord's max HP = general value + 1. Used by tests/sim
 *  now; P3's identity-mode setup flow will call the same function. */
export function assignGeneral(
  state: GameState,
  playerId: string,
  generalId: string,
  isLord = false,
): void {
  const g = GENERALS[generalId];
  if (!g) throw new Error(`unknown general: ${generalId}`);
  const p = getPlayer(state, playerId);
  p.generalId = generalId;
  p.faction = g.faction;
  p.gender = g.gender;
  p.maxHp = g.maxHp + (isLord ? 1 : 0);
  p.hp = p.maxHp;
}
