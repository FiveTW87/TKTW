// SPEC 8.3 — สายฟ้า. Only 1 copy exists in the whole deck (SPEC 9.2), so
// forwarding it can never collide with a duplicate already in someone's zone.
import type { Card, GameState } from "../types";
import type { CardDef } from "../core/cardEffects";
import { runJudgment } from "../core/judgment";
import { dealDamage } from "../core/damage";
import { getPlayer, seatOrderAfter, log } from "../core/state";

/** Move a สายฟ้า card into the next living player's judgment zone (or discard
 *  if there's no one). Shared by the miss branch AND the wuxie-cancel branch in
 *  runJudgePhase — house rule: cancelling สายฟ้า doesn't destroy it, it moves on. */
export function forwardShandian(state: GameState, fromId: string, card: Card): void {
  const nextId = seatOrderAfter(state, fromId)[0];
  if (nextId) {
    getPlayer(state, nextId).judgmentZone.push(card);
    log(state, "forwardShandian", { targetIds: [nextId], cardType: "shandian" });
  } else {
    state.discardPile.push(card);
  }
}

export const shandianCard: CardDef = {
  judge: function* (ctx) {
    const judged = yield* runJudgment(ctx, ctx.ownerId, { interactive: true, reason: "shandian" });
    const hits = judged.suit === "spade" && judged.rank >= 2 && judged.rank <= 9;

    if (hits) {
      log(ctx.state, "judgment", { actorId: ctx.ownerId, cardType: "shandian", amount: 3, data: { suit: judged.suit, rank: judged.rank, outcome: "hit" } });
      ctx.state.discardPile.push(ctx.card);
      yield* dealDamage(ctx, undefined, ctx.ownerId, 3);
    } else {
      log(ctx.state, "judgment", { actorId: ctx.ownerId, cardType: "shandian", data: { suit: judged.suit, rank: judged.rank, outcome: "miss" } });
      forwardShandian(ctx.state, ctx.ownerId, ctx.card);
    }
  },
};
