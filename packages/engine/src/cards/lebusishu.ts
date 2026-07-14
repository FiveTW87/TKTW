// SPEC 8.3 — เพลินจนลืมแคว้นสู่. Judged card always ends in the discard
// pile regardless of outcome (unlike shandian, which can forward instead).
import type { CardDef } from "../core/cardEffects";
import { runJudgment } from "../core/judgment";
import { log } from "../core/state";

export const lebusishuCard: CardDef = {
  judge: function* (ctx) {
    const judged = yield* runJudgment(ctx, ctx.ownerId);
    if (judged.suit === "heart") {
      log(ctx.state, `${ctx.ownerId} ตัดสิน "เพลินจนลืมแคว้นสู่" ${judged.suit}${judged.rank} — รอด`);
    } else {
      ctx.state.skipPlayPhase = true;
      log(
        ctx.state,
        `${ctx.ownerId} ตัดสิน "เพลินจนลืมแคว้นสู่" ${judged.suit}${judged.rank} — ข้ามเฟสลงการ์ด`,
      );
    }
    ctx.state.discardPile.push(ctx.card);
  },
};
