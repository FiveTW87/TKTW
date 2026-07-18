// SPEC 11 — ซุนซางเซียง (Wu). jieyuan is active/1-per-turn; sturdy relies
// on the OnEquipmentLost hook wired via cards/_shared.ts's pickCardFrom.
import { registerGeneral } from "./registry";
import { heal } from "../core/damage";
import { discardCardsFromHand, drawCards, getPlayer, log } from "../core/state";

registerGeneral({
  id: "sunshangxiang",
  faction: "wu",
  gender: "female",
  maxHp: 3,
  skills: [
    {
      id: "sunshangxiang_jieyuan",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        if (!targetId || targetId === ownerId || cardIds.length < 2) return; // another player
        const p = getPlayer(state, targetId);
        if (p.hp >= p.maxHp) return; // must be injured
        discardCardsFromHand(state, ownerId, cardIds.slice(0, 2));
        yield* heal(ctx, ownerId, 1);
        yield* heal(ctx, targetId, 1);
        log(state, `${ownerId} และ ${targetId} ฟื้น HP 1 (ผูกสัมพันธ์)`);
      },
    },
    {
      id: "sunshangxiang_jiehun",
      triggers: {
        OnEquipmentLost: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          drawCards(state, ctx.rng, ownerId, 2);
          log(state, `${ownerId} จั่ว 2 ใบ (สตรีอาจหาญ)`);
        },
      },
    },
  ],
});
