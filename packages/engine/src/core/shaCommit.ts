// Parses a player's submitted cards against a reactive "produce N สังหาร"
// demand (a ดวล exchange, ศึกชนเผ่าใต้, a forced ยืมดาบฆ่าคน, a คุ้มกันราชา
// cover). ทวนงูจั้งปา (SPEC 8.4) lets its wearer spend 2 arbitrary non-สังหาร
// hand cards per required สังหาร at a response window exactly as at a main
// action — this is the one place that rule is parsed, so every reactive
// accept point inherits it identically instead of drifting.
import type { GameState } from "../types";
import { getPlayer } from "./state";
import { countsAsType } from "./cardChecks";

/**
 * Returns the flat list of card ids to spend, or `undefined` when the player
 * didn't commit enough — the existing all-or-nothing semantics (take the
 * consequence, spend nothing). Throws when a NAMED card fits no legal
 * interpretation (not a สังหาร, and not half of a valid zhangba pair).
 */
export function commitShaCards(
  state: GameState,
  playerId: string,
  ids: string[],
  needed: number,
  label: string,
): string[] | undefined {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label}: duplicate card id`);
  }
  const zhangba = getPlayer(state, playerId).equipment.weapon?.typeKey === "zhangba";
  const spend: string[] = [];
  let i = 0;
  for (let n = 0; n < needed; n++) {
    const a = ids[i];
    if (a === undefined) return undefined; // ran out — spend nothing
    if (countsAsType(state, playerId, a, "sha")) {
      spend.push(a);
      i += 1;
      continue;
    }
    const b = ids[i + 1];
    if (zhangba && b !== undefined && !countsAsType(state, playerId, b, "sha")) {
      spend.push(a, b); // ทวนงูจั้งปา: 2 non-สังหาร cards for this 1 slot
      i += 2;
      continue;
    }
    throw new Error(`${label}: ${a} does not count as sha`);
  }
  return spend;
}
