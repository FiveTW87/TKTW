// SPEC 11 — โจโฉ (Wei). Tier A: OnDamaged + a lord skill built on the
// existing OnNeedDodge/box pattern from bagua/renwang.
import { registerGeneral } from "./registry";
import { getPlayer, discardFromHand, seatOrderAfter, log } from "../core/state";
import { countsAsType } from "../core/cardChecks";

registerGeneral({
  id: "caocao",
  faction: "wei",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "caocao_jianxiong",
      triggers: {
        OnDamaged: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { targetId, sourceCardId } = payload as { targetId: string; sourceCardId?: string };
          if (ownerId !== targetId || !sourceCardId) return;
          const idx = state.discardPile.findIndex((c) => c.id === sourceCardId);
          if (idx < 0) return;
          const [card] = state.discardPile.splice(idx, 1);
          getPlayer(state, ownerId).hand.push(card!);
          log(state, `${ownerId} เก็บการ์ดที่ทำร้ายตน (วีรบุรุษเจ้าเล่ห์)`);
        },
      },
    },
    {
      id: "caocao_hujia",
      lordOnly: true,
      triggers: {
        OnNeedDodge: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { targetId, box } = payload as {
            targetId: string;
            box: { autoDodged: boolean };
          };
          if (ownerId !== targetId) return;
          if (getPlayer(state, ownerId).role !== "lord") return;
          for (const pid of seatOrderAfter(state, ownerId)) {
            const p = getPlayer(state, pid);
            if (!p.alive || p.faction !== "wei" || pid === ownerId) continue;
            const answer = yield { kind: "hujiaVolunteer", playerId: pid, data: { lordId: ownerId } };
            if (!answer.pass && (answer.cardIds?.length ?? 0) > 0) {
              const cid = answer.cardIds![0]!;
              if (!countsAsType(state, pid, cid, "shan")) {
                throw new Error(`hujia: ${cid} does not count as shan`);
              }
              discardFromHand(state, pid, cid);
              box.autoDodged = true;
              log(state, `${pid} ลง "หลบ" แทนเจ้าเมือง (คุ้มกันราชา)`);
              return;
            }
          }
        },
      },
    },
  ],
});
