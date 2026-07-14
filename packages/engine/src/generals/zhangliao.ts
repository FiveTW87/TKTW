// SPEC 11 — เตียวเลี้ยว (Wei). Trades the normal draw for stealing 1 card
// each from up to 2 other players. Simplification: targets are the next 2
// alive players in seat order automatically (rather than player-chosen —
// choosing targets isn't representable through the trigger payload without
// extending it further, and this keeps the skill fully deterministic).
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
          getPlayer(state, ownerId).skillUsedThisTurn[FLAG] = 1;
          const targets = seatOrderAfter(state, ownerId)
            .filter((id) => getPlayer(state, id).alive)
            .slice(0, 2);
          for (const targetId of targets) {
            const card = yield* pickCardFrom(ctx, ownerId, targetId, "tuxi");
            if (card) {
              getPlayer(state, ownerId).hand.push(card);
              log(state, `${ownerId} ชิง ${card.typeKey} จาก ${targetId} (จู่โจมสายฟ้าแลบ)`);
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
