// SPEC 8.3 — เพลินจนลืมแคว้นสู่. Judged card always ends in the discard
// pile regardless of outcome (unlike shandian, which can forward instead).
import type { CardDef } from "../core/cardEffects";
import { runJudgment } from "../core/judgment";
import { log } from "../core/state";

export const lebusishuCard: CardDef = {
  judge: function* (ctx) {
    const judged = yield* runJudgment(ctx, ctx.ownerId, { interactive: true, reason: "lebusishu" });
    const survived = judged.suit === "heart";
    if (!survived) ctx.state.skipPlayPhase = true;
    log(ctx.state, "judgment", {
      actorId: ctx.ownerId,
      cardType: "lebusishu",
      data: { suit: judged.suit, rank: judged.rank, outcome: survived ? "survive" : "skipPlay" },
    });
    ctx.state.discardPile.push(ctx.card);
  },
};
