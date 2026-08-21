import type { GameState } from "../types";
import { cardById } from "./state";
import { queryHook } from "./triggers";
import { cardDef } from "./cardData";

export type CardPlayUnavailableReason =
  | "response_only"
  | "sha_usage_limit"
  | "conversion_wrong_context"
  | "insufficient_cards"
  | "no_legal_target";

export function shaUsageLimitFor(state: GameState, playerId: string): number {
  const bonus = queryHook<number>(
    state,
    "shaUsageLimit",
    { playerId },
    (rs) => rs.reduce((a, b) => a + b, 0),
    0,
  );
  return 1 + bonus;
}

export function mainActionUnavailableReason(
  state: GameState,
  playerId: string,
  typeKey: string,
): CardPlayUnavailableReason | undefined {
  const def = cardDef(typeKey);
  if (def.targetRule === "respondOnly" || def.playableAnytime) return "response_only";
  if (typeKey === "sha") {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player || player.shaUsedThisTurn >= shaUsageLimitFor(state, playerId)) {
      return "sha_usage_limit";
    }
  }
  return undefined;
}

/** True if `cardId` is legal for `playerId` to submit as `wanted` — either
 *  literally that typeKey, or convertible via a registered canConvertCard
 *  skill (e.g. "ใจมังกร"/"เทพเจ้าสงคราม"). `playerId` matters: Guan Yu's red
 *  cards count as สังหาร for *Guan Yu*, not for every player at the table —
 *  each canConvertCard handler must check `ctx.ownerId === payload.playerId`
 *  before applying. Every accept-point for a player-submitted card (dodge,
 *  tao, wuxie, main play) must go through this instead of comparing
 *  typeKey directly, or card-conversion skills would need edits scattered
 *  across engine/core/ to plug in. */
export function countsAsType(
  state: GameState,
  playerId: string,
  cardId: string,
  wanted: string,
  /** "mainAction" for a player's own proactive play (turnLoop.ts's
   *  playCard); omitted/"reactive" everywhere else (dodge, tao-rescue,
   *  wuxie, forced-sha asks). Lets a skill like Hua Tuo's "ปฐมพยาบาล"
   *  (red-as-tao, but *only* when reactively saving a dying player, never
   *  as his own turn's main action) tell the two apart. */
  context: "mainAction" | "reactive" = "reactive",
): boolean {
  const card = cardById(cardId);
  if (card.typeKey === wanted) return true;
  return queryHook<boolean>(
    state,
    "canConvertCard",
    { playerId, cardId, card, asType: wanted, context },
    (rs) => rs.some(Boolean),
    false,
  );
}

/** Whether a conversion belongs to this player/card at all, independent of
 * a temporal restriction such as Hua Tuo's "outside your own turn" rule.
 * This is presentation metadata only: command validation must continue to
 * use countsAsType with the real context. */
export function hasCardConversion(
  state: GameState,
  playerId: string,
  cardId: string,
  wanted: string,
): boolean {
  const card = cardById(cardId);
  if (card.typeKey === wanted) return false;
  return queryHook<boolean>(
    state,
    "canConvertCard",
    { playerId, cardId, card, asType: wanted, context: "reactive", ignoreTiming: true },
    (rs) => rs.some(Boolean),
    false,
  );
}
