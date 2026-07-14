// SPEC 8.2 — สาบานสวนท้อ
import type { CardDef } from "../core/cardEffects";
import { heal } from "../core/damage";
import { aliveIds } from "../core/state";

export const taoyuanCard: CardDef = {
  play: function* (ctx) {
    for (const pid of aliveIds(ctx.state)) {
      yield* heal(ctx, pid, 1);
    }
  },
};
