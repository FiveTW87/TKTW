// SPEC 11 — ลิโป้ (Qun). Locked: his สังหาร needs 2 หลบ; his ดวล opponents
// need 2 สังหาร each exchange.
import { registerGeneral } from "./registry";

registerGeneral({
  id: "lubu",
  faction: "qun",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "lubu_wushuang",
      locked: true,
      queries: {
        dodgeRequirement: (ctx) => {
          const { sourceId } = ctx.payload as { sourceId: string; targetId: string };
          return ctx.ownerId === sourceId ? 2 : 1;
        },
        duelShaRequirement: (ctx) => {
          const { opponentId } = ctx.payload as { playerId: string; opponentId: string };
          return ctx.ownerId === opponentId ? 2 : 1;
        },
      },
    },
  ],
});
