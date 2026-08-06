// SPEC 8.2 — ดวล. Target answers first; whoever fails to produce a สังหาร
// takes 1 damage and the duel ends — this can alternate many rounds.
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardCardsFromHand, log } from "../core/state";
import { queryHook, fireTrigger } from "../core/triggers";
import { commitShaCards } from "../core/shaCommit";

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
      // Resolve auto-covers (เล่าปี่'s "ปลุกใจนักรบ") for each required สังหาร
      // slot first, same box pattern as a สังหาร's own OnNeedDodge — so we
      // know how many the responder must still produce themselves.
      let playerNeed = 0;
      for (let i = 0; i < needed; i++) {
        const box = { covered: false };
        yield* fireTrigger(ctx, "OnNeedSha", { playerId: responder, box });
        if (!box.covered) playerNeed++;
      }
      if (playerNeed === 0) {
        [responder, opponent] = [opponent, responder];
        continue;
      }
      // Ask for the whole exchange's สังหาร in ONE all-or-nothing decision (Lu
      // Bu's wushuang makes it 2): committing fewer than `needed` can never win
      // the exchange, so — just like the หลบ dodge — the responder either plays
      // the full set or spends nothing and takes the hit. No wasted card.
      const answer = yield {
        kind: "respondSha",
        playerId: responder,
        data: { opponentId: opponent, reason: "juedou", needed: playerNeed },
      };
      const ids = answer.pass ? [] : (answer.cardIds ?? []);
      const spend = commitShaCards(state, responder, ids, playerNeed, "juedou");
      if (!spend) {
        yield* dealDamage(ctx, opponent, responder, 1, ctx.cardIds[0]);
        return;
      }
      discardCardsFromHand(state, responder, spend);
      log(state, "juedouSha", { actorId: responder, cardType: "sha", data: { reason: "juedou" } });
      [responder, opponent] = [opponent, responder];
    }
  },
};
