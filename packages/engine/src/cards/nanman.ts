// SPEC 8.2 — ศึกชนเผ่าใต้
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardFromHand, getPlayer, seatOrderAfter } from "../core/state";
import { countsAsType } from "../core/cardChecks";
import { fireTrigger } from "../core/triggers";

export const nanmanCard: CardDef = {
  play: function* (ctx) {
    const { state, playerId } = ctx;
    for (const pid of seatOrderAfter(state, playerId)) {
      if (!getPlayer(state, pid).alive) continue;

      // Liu Bei's "ปลุกใจนักรบ" (lord skill): another Shu player may cover
      // this for him — same box pattern as OnNeedDodge/bagua.
      const box = { covered: false };
      yield* fireTrigger(ctx, "OnNeedSha", { playerId: pid, box });
      if (box.covered) continue;

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
