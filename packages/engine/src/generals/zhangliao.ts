// SPEC 11 — เตียวเลี้ยว (Wei). Trades the normal draw for stealing 1 card each
// from up to 2 OTHER players he chooses (突袭). The skill is optional (an
// activateSkill opt-in fires first); on accept he picks the targets via a
// `tuxiTargets` decision, and the drawAmountModifier query zeroes his draw.
import { registerGeneral } from "./registry";
import { getPlayer, seatOrderAfter, log } from "../core/state";
import { pickCardFrom } from "../cards/_shared";

const FLAG = "zhangliao_tuxi_active";

registerGeneral({
  id: "zhangliao",
  faction: "wei",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "zhangliao_tuxi",
      triggers: {
        DrawPhaseStart: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          // Only players who actually hold a card can be robbed.
          const eligible = seatOrderAfter(state, ownerId).filter(
            (id) => getPlayer(state, id).alive && getPlayer(state, id).hand.length > 0,
          );
          if (eligible.length === 0) return; // nothing to steal → keep the normal draw

          getPlayer(state, ownerId).skillUsedThisTurn[FLAG] = 1; // commit: skip the draw
          const answer = yield {
            kind: "tuxiTargets",
            playerId: ownerId,
            data: { eligible: eligible.map((id) => ({ id, count: getPlayer(state, id).hand.length })) },
          };
          const chosen = [...new Set(answer.targetIds ?? [])]
            .filter((id) => eligible.includes(id))
            .slice(0, 2);
          for (const targetId of chosen) {
            const card = yield* pickCardFrom(ctx, ownerId, targetId, "tuxi");
            if (card) {
              getPlayer(state, ownerId).hand.push(card);
              log(state, "skillUse", { actorId: ownerId, skillId: "zhangliao_tuxi", targetIds: [targetId], cardType: card.typeKey });
            }
          }
        },
      },
      queries: {
        drawAmountModifier: (ctx) => {
          const { playerId } = ctx.payload as { playerId: string };
          if (ctx.ownerId !== playerId) return 0;
          return ctx.state.players.find((p) => p.id === playerId)?.skillUsedThisTurn[FLAG] ? -2 : 0;
        },
      },
    },
  ],
});
