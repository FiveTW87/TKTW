// SPEC 11 — เล่าปี่ (Shu). rende is active (give cards away; 2 given in a
// turn = heal 1 once); hujia-style lord skill reuses OnNeedSha (wired into
// cards/nanman.ts) with the same box pattern as Cao Cao's hujia/OnNeedDodge.
import { registerGeneral } from "./registry";
import { heal } from "../core/damage";
import { getPlayer, removeFromHand, discardFromHand, seatOrderAfter, log } from "../core/state";
import { countsAsType } from "../core/cardChecks";

const GIVEN = "liubei_rende_given";
const HEALED = "liubei_rende_healed";

registerGeneral({
  id: "liubei",
  faction: "shu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "liubei_rende",
      active: function* (ctx) {
        const { state, ownerId, cardIds, targetIds } = ctx;
        const targetId = targetIds[0];
        const cid = cardIds[0];
        if (!targetId || !cid) return;
        const card = removeFromHand(state, ownerId, cid);
        getPlayer(state, targetId).hand.push(card);
        log(state, `${ownerId} ให้การ์ด ${card.typeKey} แก่ ${targetId} (เมตตาธรรม)`);

        const p = getPlayer(state, ownerId);
        const given = (p.skillUsedThisTurn[GIVEN] ?? 0) + 1;
        p.skillUsedThisTurn[GIVEN] = given;
        if (given >= 2 && !p.skillUsedThisTurn[HEALED]) {
          p.skillUsedThisTurn[HEALED] = 1;
          yield* heal(ctx, ownerId, 1);
        }
      },
    },
    {
      id: "liubei_hujia",
      lordOnly: true,
      triggers: {
        OnNeedSha: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { playerId, box } = payload as { playerId: string; box: { covered: boolean } };
          if (ownerId !== playerId) return;
          if (getPlayer(state, ownerId).role !== "lord") return;
          for (const pid of seatOrderAfter(state, ownerId)) {
            const p = getPlayer(state, pid);
            if (!p.alive || p.faction !== "shu" || pid === ownerId) continue;
            const answer = yield { kind: "hujiaVolunteer", playerId: pid, data: { lordId: ownerId } };
            if (!answer.pass && (answer.cardIds?.length ?? 0) > 0) {
              const cid = answer.cardIds![0]!;
              if (!countsAsType(state, pid, cid, "sha")) {
                throw new Error(`hujia: ${cid} does not count as sha`);
              }
              discardFromHand(state, pid, cid);
              box.covered = true;
              log(state, `${pid} ลง "สังหาร" แทนเจ้าเมือง (ปลุกใจนักรบ)`);
              return;
            }
          }
        },
      },
    },
  ],
});
