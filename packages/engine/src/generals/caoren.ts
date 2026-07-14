// SPEC 11 — เคาทู (Wei). Optional DrawPhaseStart trade-off: draw 1 fewer
// this turn in exchange for +1 damage on everything played this turn
// (simplification of SPEC's "สังหาร/ดวล only" — see damageBonus in triggers.ts).
// The flag piggybacks on skillUsedThisTurn, which already resets every turn.
import { registerGeneral } from "./registry";
import { getPlayer, log } from "../core/state";

const FLAG = "caoren_tuoyi_active";

registerGeneral({
  id: "caoren",
  faction: "wei",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "caoren_tuoyi",
      triggers: {
        DrawPhaseStart: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          getPlayer(state, ownerId).skillUsedThisTurn[FLAG] = 1;
          log(state, `${ownerId} ถอดเสื้อรบ — จั่วน้อยลง 1 ใบ แลกดาเมจ +1 เทิร์นนี้`);
        },
      },
      queries: {
        drawAmountModifier: (ctx) => {
          const { playerId } = ctx.payload as { playerId: string };
          if (ctx.ownerId !== playerId) return 0;
          return ctx.state.players.find((p) => p.id === playerId)?.skillUsedThisTurn[FLAG] ? -1 : 0;
        },
        damageBonus: (ctx) => {
          const { playerId } = ctx.payload as { playerId: string };
          if (ctx.ownerId !== playerId) return 0;
          return ctx.state.players.find((p) => p.id === playerId)?.skillUsedThisTurn[FLAG] ? 1 : 0;
        },
      },
    },
  ],
});
