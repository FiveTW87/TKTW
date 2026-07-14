// SPEC 11 — ฮัวโต๋ (Qun). jiuxing's conversion is scoped to reactive use
// only (`context !== "mainAction"`) — otherwise he could top himself up
// with tao on his own turn using any red card, which SPEC's "นอกเทิร์นตัวเอง"
// wording explicitly rules out.
import { registerGeneral } from "./registry";
import { colorOf, type Card } from "../types";
import { heal } from "../core/damage";
import { discardFromHand, getPlayer, log } from "../core/state";

registerGeneral({
  id: "huatuo",
  faction: "qun",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "huatuo_qingnang",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        const cid = cardIds[0];
        if (!targetId || !cid) return;
        const target = getPlayer(state, targetId);
        if (target.hp >= target.maxHp) return;
        discardFromHand(state, ownerId, cid);
        yield* heal(ctx, targetId, 1, ownerId);
        log(state, `${ownerId} ทิ้งการ์ด รักษา ${targetId} 1 HP (ถุงยาเขียว)`);
      },
    },
    {
      id: "huatuo_jiuxing",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType, context } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
            context: string;
          };
          if (ctx.ownerId !== playerId) return false;
          if (asType !== "tao" || colorOf(card.suit) !== "red") return false;
          return context !== "mainAction";
        },
      },
    },
  ],
});
