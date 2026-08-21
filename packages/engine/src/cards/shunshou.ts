// SPEC 8.2 — ฉวยโอกาสลักแกะ (range 1, enforced generically in turnLoop.ts)
import type { CardDef } from "../core/cardEffects";
import { pickCardFrom } from "./_shared";
import { getPlayer, log } from "../core/state";

export const shunshouCard: CardDef = {
  play: function* (ctx) {
    const targetId = ctx.targetIds[0];
    if (!targetId) return;
    const picked = yield* pickCardFrom(ctx, ctx.playerId, targetId, "shunshou");
    if (picked) {
      getPlayer(ctx.state, ctx.playerId).hand.push(picked.card);
      // The moved card joins a hidden hand. Keep the public movement anonymous
      // even though the acting player can see their own updated hand snapshot.
      log(ctx.state, "shunshouSteal", { actorId: ctx.playerId, targetIds: [targetId], data: { sourceZone: picked.sourceZone } });
    }
  },
};
