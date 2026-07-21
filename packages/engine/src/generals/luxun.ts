// SPEC 11 — ลกซุน (Wu). qianxun is locked (canBeTargetedBy query, wired
// into turnLoop.ts's target validation); lianying uses the OnHandEmpty hook.
import { registerGeneral } from "./registry";
import { drawCards, log } from "../core/state";

registerGeneral({
  id: "luxun",
  faction: "wu",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "luxun_qianxun",
      locked: true,
      queries: {
        canBeTargetedBy: (ctx) => {
          const { cardTypeKey, targetId } = ctx.payload as {
            cardTypeKey: string;
            sourceId: string;
            targetId: string;
          };
          if (ctx.ownerId !== targetId) return true;
          return cardTypeKey !== "shunshou" && cardTypeKey !== "lebusishu";
        },
      },
    },
    {
      id: "luxun_lianying",
      triggers: {
        OnHandEmpty: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          drawCards(state, ctx.rng, ownerId, 1);
          log(state, "skillUse", { actorId: ownerId, skillId: "luxun_lianying", amount: 1 });
        },
      },
    },
  ],
});
