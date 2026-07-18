// SPEC 8.2 — ดวล. Target answers first; whoever fails to produce a สังหาร
// takes 1 damage and the duel ends — this can alternate many rounds.
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardFromHand, log } from "../core/state";
import { queryHook } from "../core/triggers";
import { countsAsType } from "../core/cardChecks";

export const juedouCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    const targetId = ctx.targetIds[0];
    if (!targetId) return;

    let responder = targetId;
    let opponent = playerId;
    for (;;) {
      const needed = queryHook<number>(
        state,
        "duelShaRequirement",
        { playerId: responder, opponentId: opponent },
        (rs) => Math.max(...rs),
        1,
      );
      // Ask for the whole exchange's สังหาร in ONE all-or-nothing decision (Lu
      // Bu's wushuang makes it 2): committing fewer than `needed` can never win
      // the exchange, so — just like the หลบ dodge — the responder either plays
      // the full set or spends nothing and takes the hit. No wasted card.
      const answer = yield {
        kind: "respondSha",
        playerId: responder,
        data: { opponentId: opponent, reason: "juedou", needed },
      };
      const ids = answer.pass ? [] : (answer.cardIds ?? []);
      if (ids.length < needed) {
        yield* dealDamage(ctx, opponent, responder, 1);
        return;
      }
      const chosen = ids.slice(0, needed);
      if (new Set(chosen).size !== chosen.length) throw new Error(`juedou: duplicate card id`);
      for (const cid of chosen) {
        if (!countsAsType(state, responder, cid, "sha")) throw new Error(`juedou: ${cid} does not count as sha`);
      }
      for (const cid of chosen) discardFromHand(state, responder, cid);
      log(state, `${responder} ลง "สังหาร" ตอบโต้ในดวล`);
      [responder, opponent] = [opponent, responder];
    }
  },
};
