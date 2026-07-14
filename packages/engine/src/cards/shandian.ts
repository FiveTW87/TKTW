// SPEC 8.3 — สายฟ้า. Only 1 copy exists in the whole deck (SPEC 9.2), so
// forwarding it can never collide with a duplicate already in someone's zone.
import type { CardDef } from "../core/cardEffects";
import { runJudgment } from "../core/judgment";
import { dealDamage } from "../core/damage";
import { getPlayer, seatOrderAfter, log } from "../core/state";

export const shandianCard: CardDef = {
  judge: function* (ctx) {
    const judged = yield* runJudgment(ctx, ctx.ownerId);
    const hits = judged.suit === "spade" && judged.rank >= 2 && judged.rank <= 9;

    if (hits) {
      log(ctx.state, `${ctx.ownerId} ตัดสิน "สายฟ้า" ${judged.suit}${judged.rank} — โดน 3 ดาเมจ`);
      ctx.state.discardPile.push(ctx.card);
      yield* dealDamage(ctx, undefined, ctx.ownerId, 3);
    } else {
      const nextId = seatOrderAfter(ctx.state, ctx.ownerId)[0];
      if (nextId) {
        log(ctx.state, `${ctx.ownerId} ตัดสิน "สายฟ้า" ${judged.suit}${judged.rank} — ไม่โดน ส่งต่อ ${nextId}`);
        getPlayer(ctx.state, nextId).judgmentZone.push(ctx.card);
      } else {
        ctx.state.discardPile.push(ctx.card);
      }
    }
  },
};
