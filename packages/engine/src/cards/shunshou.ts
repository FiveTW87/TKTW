// SPEC 8.2 — ฉวยโอกาสลักแกะ (range 1, enforced generically in turnLoop.ts)
import type { CardDef } from "../core/cardEffects";
import { pickCardFrom } from "./_shared";
import { getPlayer, log } from "../core/state";

export const shunshouCard: CardDef = {
  play: function* (ctx) {
    const targetId = ctx.targetIds[0];
    if (!targetId) return;
    const card = yield* pickCardFrom(ctx, ctx.playerId, targetId, "shunshou");
    if (card) {
      getPlayer(ctx.state, ctx.playerId).hand.push(card);
      log(ctx.state, `${ctx.playerId} ขโมยการ์ด ${card.typeKey} จาก ${targetId} (ฉวยโอกาสลักแกะ)`);
    }
  },
};
