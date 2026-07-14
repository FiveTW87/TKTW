// SPEC 11 — ซุนกวน (Wu). zhiheng is active/1-per-turn; jiujia relies on
// OnHealedByWu, which now fires from core/damage.ts:heal() whenever the
// healer and target are both Wu and aren't the same player (e.g. a
// teammate's ท้อ during resolveDying).
import { registerGeneral } from "./registry";
import { heal } from "../core/damage";
import { discardCardsFromHand, drawCards, log } from "../core/state";

registerGeneral({
  id: "sunquan",
  faction: "wu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "sunquan_zhiheng",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, rng, ownerId, cardIds } = ctx;
        discardCardsFromHand(state, ownerId, cardIds);
        if (cardIds.length > 0) {
          drawCards(state, rng, ownerId, cardIds.length);
          log(state, `${ownerId} ทิ้ง ${cardIds.length} จั่ว ${cardIds.length} (ถ่วงดุลอำนาจ)`);
        }
      },
    },
    {
      id: "sunquan_jiujia",
      lordOnly: true,
      locked: true,
      triggers: {
        OnHealedByWu: function* (ctx) {
          const { ownerId, payload } = ctx;
          const { targetId } = payload as { targetId: string };
          if (ownerId !== targetId) return;
          if (ctx.state.players.find((p) => p.id === ownerId)?.role !== "lord") return;
          yield* heal(ctx, ownerId, 1);
        },
      },
    },
  ],
});
