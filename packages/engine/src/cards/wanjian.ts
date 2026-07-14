// SPEC 8.2 — ห่าธนู
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardFromHand, getPlayer, seatOrderAfter } from "../core/state";
import { countsAsType } from "../core/cardChecks";

export const wanjianCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    for (const pid of seatOrderAfter(state, playerId)) {
      if (!getPlayer(state, pid).alive) continue;
      const answer = yield { kind: "respondShan", playerId: pid, data: { reason: "wanjian" } };
      const offered = !answer.pass && (answer.cardIds?.length ?? 0) > 0;
      if (offered) {
        const cid = answer.cardIds![0]!;
        if (!countsAsType(state, pid, cid, "shan")) throw new Error(`wanjian: ${cid} does not count as shan`);
        discardFromHand(state, pid, cid);
      } else {
        yield* dealDamage(ctx, playerId, pid, 1);
      }
    }
  },
};
