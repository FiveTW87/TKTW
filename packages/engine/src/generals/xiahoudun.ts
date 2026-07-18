// SPEC 11 — แฮหัวตุ้น (Wei)
import { registerGeneral } from "./registry";
import { runJudgment } from "../core/judgment";
import { loseHp } from "../core/damage";
import { getPlayer, discardCardsFromHand } from "../core/state";

registerGeneral({
  id: "xiahoudun",
  faction: "wei",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "xiahoudun_ganglie",
      triggers: {
        OnDamaged: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { targetId, sourceId } = payload as { targetId: string; sourceId?: string };
          if (ownerId !== targetId || !sourceId || !getPlayer(state, sourceId).alive) return;
          const judged = yield* runJudgment(ctx, ownerId, { interactive: true, reason: "xiahoudun_ganglie" });
          if (judged.suit === "heart") return;
          // 刚烈: the DAMAGE SOURCE (attacker) pays the price, not Xiahoudun.
          // They choose to discard 2 cards or take 1 damage back.
          const answer = yield {
            kind: "ganglieChoice",
            playerId: sourceId,
            data: { targetId: ownerId },
          };
          const attackerHand = getPlayer(state, sourceId).hand.length;
          if (answer.choice === "discard2" && attackerHand >= 2) {
            const pick = yield { kind: "discardChosenBy", playerId: sourceId, data: { count: 2 } };
            const ids = pick.cardIds ?? [];
            if (ids.length !== 2) {
              throw new Error(`${sourceId}: discard2 requires exactly 2 card ids, got ${ids.length}`);
            }
            discardCardsFromHand(state, sourceId, ids);
          } else {
            // chose to take the hit (or can't spare 2 cards) → lose 1 HP
            yield* loseHp(ctx, sourceId, 1);
          }
        },
      },
    },
  ],
});
