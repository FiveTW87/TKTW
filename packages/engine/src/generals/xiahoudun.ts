// SPEC 11 — แฮหัวตุ้น (Wei)
import { registerGeneral } from "./registry";
import { runJudgment } from "../core/judgment";
import { loseHp } from "../core/damage";
import { getPlayer, discardFromHand } from "../core/state";

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
          const judged = yield* runJudgment(ctx, ownerId);
          if (judged.suit === "heart") return;
          const answer = yield {
            kind: "ganglieChoice",
            playerId: sourceId,
            data: { targetId: ownerId },
          };
          if (answer.choice === "discard2") {
            const pick = yield { kind: "discardChosenBy", playerId: ownerId, data: { count: 2 } };
            for (const cid of (pick.cardIds ?? []).slice(0, 2)) discardFromHand(state, ownerId, cid);
          } else {
            yield* loseHp(ctx, ownerId, 1);
          }
        },
      },
    },
  ],
});
