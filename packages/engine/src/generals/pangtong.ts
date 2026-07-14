// SPEC 11 — หองหยิม (Shu)
import { registerGeneral } from "./registry";
import { drawCards, log } from "../core/state";

registerGeneral({
  id: "pangtong",
  faction: "shu",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "pangtong_juhui",
      triggers: {
        OnUseTrick: function* (ctx) {
          const { state, rng, ownerId, payload } = ctx;
          const { playerId, wasConverted } = payload as {
            playerId: string;
            cardTypeKey: string;
            wasConverted: boolean;
          };
          if (ownerId !== playerId || wasConverted) return;
          drawCards(state, rng, ownerId, 1);
          log(state, `${ownerId} จั่ว 1 ใบ (รวบรวมปัญญา)`);
        },
      },
    },
    {
      id: "pangtong_qicai",
      locked: true,
      queries: {
        ignoresCardRange: (ctx) => ctx.ownerId === (ctx.payload as { playerId: string }).playerId,
      },
    },
  ],
});
