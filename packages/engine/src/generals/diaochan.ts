// SPEC 11 — เตียวเสี้ยน (Qun). lijian injects a real ดวล between two other
// (male) players by directly invoking juedouCard.play with Diaochan as
// neither participant — SPEC 12.1's own example of this exact interaction.
import { registerGeneral } from "./registry";
import { discardFromHand, getPlayer, drawCards, log } from "../core/state";
import { juedouCard } from "../cards/juedou";

registerGeneral({
  id: "diaochan",
  faction: "qun",
  gender: "female",
  maxHp: 3,
  skills: [
    {
      id: "diaochan_lijian",
      maxPerTurn: 1,
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const [a, b] = targetIds;
        const cid = cardIds[0];
        if (!a || !b) throw new Error(`${ownerId}: กลหญิงงามแตกสัมพันธ์ needs 2 targets`);
        if (a === b) throw new Error(`${ownerId}: duplicate target id`);
        if (a === ownerId || b === ownerId) throw new Error(`${ownerId}: cannot name herself`);
        for (const id of [a, b]) {
          const p = getPlayer(state, id);
          if (!p.alive) throw new Error(`${ownerId}: target ${id} is not alive`);
          if (p.gender !== "male") throw new Error(`${ownerId}: target ${id} is not male`);
        }
        if (!cid) throw new Error(`${ownerId}: needs a card`);
        if (!getPlayer(state, ownerId).hand.some((c) => c.id === cid)) {
          throw new Error(`${ownerId}: ${cid} is not in hand`);
        }
        discardFromHand(state, ownerId, cid);
        log(state, "skillUse", { actorId: ownerId, skillId: "diaochan_lijian", targetIds: [a, b] });
        if (!juedouCard.play) return;
        yield* juedouCard.play({ ...ctx, playerId: b, cardIds: [], targetIds: [a] });
      },
    },
    {
      id: "diaochan_libu",
      triggers: {
        TurnEnd: function* (ctx) {
          const { state, rng, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          drawCards(state, rng, ownerId, 1);
          log(state, "skillUse", { actorId: ownerId, skillId: "diaochan_libu", amount: 1 });
        },
      },
    },
  ],
});
