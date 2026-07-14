// SPEC 11 — เตียวหุย (Shu). Locked passive, same shape as crossbow.
import { registerGeneral } from "./registry";

registerGeneral({
  id: "zhangfei",
  faction: "shu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "zhangfei_paoxiao",
      locked: true,
      queries: {
        shaUsageLimit: (ctx) =>
          ctx.ownerId === (ctx.payload as { playerId: string }).playerId ? 999 : 0,
      },
    },
  ],
});
