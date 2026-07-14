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
        { playerId: responder },
        (rs) => Math.max(...rs),
        1,
      );
      let satisfied = true;
      for (let i = 0; i < needed; i++) {
        const answer = yield {
          kind: "respondSha",
          playerId: responder,
          data: { opponentId: opponent, reason: "juedou", index: i, needed },
        };
        const offered = !answer.pass && (answer.cardIds?.length ?? 0) > 0;
        if (offered) {
          const cid = answer.cardIds![0]!;
          if (!countsAsType(state, responder, cid, "sha")) throw new Error(`juedou: ${cid} does not count as sha`);
          discardFromHand(state, responder, cid);
        } else {
          satisfied = false;
          break;
        }
      }
      if (!satisfied) {
        yield* dealDamage(ctx, opponent, responder, 1);
        return;
      }
      log(state, `${responder} ลง "สังหาร" ตอบโต้ในดวล`);
      [responder, opponent] = [opponent, responder];
    }
  },
};
