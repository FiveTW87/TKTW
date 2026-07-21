// SPEC 8.2 — ข้ามสะพานแล้วรื้อทิ้ง
import type { CardDef } from "../core/cardEffects";
import { pickCardFrom } from "./_shared";
import { log } from "../core/state";

export const guoheCard: CardDef = {
  play: function* (ctx) {
    const targetId = ctx.targetIds[0];
    if (!targetId) return;
    const card = yield* pickCardFrom(ctx, ctx.playerId, targetId, "guohe");
    if (card) {
      ctx.state.discardPile.push(card);
      log(ctx.state, "guoheDiscard", { actorId: ctx.playerId, targetIds: [targetId], cardType: card.typeKey });
    }
  },
};
