// SPEC 11 — ขงเบ้ง (Shu)
import { registerGeneral } from "./registry";
import type { Card } from "../types";
import { aliveIds, log } from "../core/state";

registerGeneral({
  id: "zhugeliang",
  faction: "shu",
  gender: "male",
  maxHp: 3,
  skills: [
    {
      id: "zhugeliang_guandou",
      triggers: {
        TurnStart: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId } = payload as { playerId: string };
          if (ownerId !== playerId) return;
          const n = Math.min(5, aliveIds(state).length);
          const revealed: Card[] = [];
          for (let i = 0; i < n; i++) {
            const c = state.drawPile.pop();
            if (c) revealed.push(c);
          }
          if (revealed.length === 0) return;
          // Send the full revealed card faces (not just ids): guandou lets its
          // owner see what they peeked, and the client needs the faces to show
          // names/suits when ordering (mirrors wugu.ts's identical pattern).
          // guandouOrder is redacted to {} for every other viewer (view.ts's
          // PRIVATE_DECISION_KINDS), so this never leaks to non-owners.
          const answer = yield {
            kind: "guandouOrder",
            playerId: ownerId,
            data: { options: revealed.slice() },
          };
          // cardIds = final top-of-deck order (first = drawn first later);
          // anything not listed goes to the bottom in original order. ENG-007:
          // validate the ordering — no duplicates and no card outside the
          // revealed set (a timeout default simply sends none = keep order).
          const topOrder = answer.cardIds ?? [];
          if (new Set(topOrder).size !== topOrder.length) {
            throw new Error(`${ownerId}: duplicate card id in guandou ordering`);
          }
          for (const id of topOrder) {
            if (!revealed.some((c) => c.id === id)) {
              throw new Error(`${ownerId}: ${id} is not one of the revealed cards`);
            }
          }
          const chosen = topOrder.map((id) => revealed.find((c) => c.id === id)!);
          const rest = revealed.filter((c) => !topOrder.includes(c.id));
          // drawPile.pop() reads the END (= top of deck). Unlisted cards sink to
          // the BOTTOM (front of the array); the chosen order goes on top with
          // chosen[0] popped first (hence reversed at the end).
          state.drawPile.unshift(...rest);
          state.drawPile.push(...chosen.reverse());
          log(state, "skillUse", { actorId: ownerId, skillId: "zhugeliang_guandou", amount: revealed.length });
        },
      },
    },
    {
      id: "zhugeliang_kongcheng",
      locked: true,
      queries: {
        canBeTargetedBy: (ctx) => {
          const { cardTypeKey, targetId } = ctx.payload as {
            cardTypeKey: string;
            sourceId: string;
            targetId: string;
          };
          if (ctx.ownerId !== targetId) return true;
          if (ctx.state.players.find((p) => p.id === targetId)?.hand.length !== 0) return true;
          return cardTypeKey !== "sha" && cardTypeKey !== "juedou";
        },
      },
    },
  ],
});
