import type { GameState } from "../types";
import { cardById } from "./state";
import { queryHook } from "./triggers";

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
