// SPEC 8.2 — ศึกชนเผ่าใต้
import type { CardDef } from "../core/cardEffects";
import { dealDamage } from "../core/damage";
import { discardCardsFromHand, getPlayer, seatOrderAfter } from "../core/state";
import { commitShaCards } from "../core/shaCommit";
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
      const ids = answer.pass ? [] : (answer.cardIds ?? []);
      const spend = commitShaCards(state, pid, ids, 1, "nanman");
      if (spend) {
        discardCardsFromHand(state, pid, spend);
      } else {
        yield* dealDamage(ctx, playerId, pid, 1, ctx.cardIds[0]);
      }
    }
  },
};
