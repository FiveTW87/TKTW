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
          const answer = yield {
            kind: "guandouOrder",
            playerId: ownerId,
            data: { options: revealed.map((c) => c.id) },
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
          // drawPile.pop() reads the END, so push bottom-bound cards first,
          // then the chosen top order reversed (so chosen[0] pops first).
          state.drawPile.push(...rest, ...chosen.reverse());
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
