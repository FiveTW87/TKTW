// SPEC 8.2 — เนรมิตจากความว่างเปล่า
import type { CardDef } from "../core/cardEffects";
import { drawCards, log } from "../core/state";

export const wuzhongCard: CardDef = {
  play: function* (ctx) {
    const drawn = drawCards(ctx.state, ctx.rng, ctx.playerId, 2);
    log(ctx.state, "draw", { actorId: ctx.playerId, amount: drawn.length, cardType: "wuzhong" });
  },
};
