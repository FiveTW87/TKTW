// SPEC 8.2 — ศึกชนเผ่าใต้
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardFromHand, getPlayer, seatOrderAfter } from "../core/state";
import { countsAsType } from "../core/cardChecks";

export const nanmanCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    for (const pid of seatOrderAfter(state, playerId)) {
      if (!getPlayer(state, pid).alive) continue;
      const answer = yield { kind: "respondSha", playerId: pid, data: { reason: "nanman" } };
      const offered = !answer.pass && (answer.cardIds?.length ?? 0) > 0;
      if (offered) {
        const cid = answer.cardIds![0]!;
        if (!countsAsType(state, pid, cid, "sha")) throw new Error(`nanman: ${cid} does not count as sha`);
        discardFromHand(state, pid, cid);
      } else {
        yield* dealDamage(ctx, playerId, pid, 1);
      }
    }
  },
};
