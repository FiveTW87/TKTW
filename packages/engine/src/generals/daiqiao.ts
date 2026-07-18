// SPEC 11 — ไต้เกี้ยว (Wu). huibi redirects a สังหาร mid-resolution via the
// mutable target box added to cards/sha.ts:attemptSha for exactly this.
import { registerGeneral } from "./registry";
import type { Card } from "../types";
import { discardFromHand, getPlayer, log } from "../core/state";
import { canAttack } from "../core/distance";

registerGeneral({
  id: "daiqiao",
  faction: "wu",
  gender: "female",
  maxHp: 3,
  skills: [
    {
      id: "daiqiao_guose",
      queries: {
        canConvertCard: (ctx) => {
          const { playerId, card, asType } = ctx.payload as {
            playerId: string;
            card: Card;
            asType: string;
          };
          if (ctx.ownerId !== playerId) return false;
          return asType === "lebusishu" && card.suit === "diamond";
        },
      },
    },
    {
      id: "daiqiao_huibi",
      // Locked: only the DEFENDER redirects, and the redirect prompt itself has
      // a decline. Being optional it used to also prompt Da Qiao when she was
      // the ATTACKER (guard then returns). Locked = no misfired "use it?" prompt.
      locked: true,
      triggers: {
        OnShaTargeted: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { sourceId, box } = payload as {
            sourceId: string;
            box: { targetId: string; blockedFromDodge: boolean };
          };
          if (ownerId !== box.targetId) return;
          if (getPlayer(state, ownerId).hand.length === 0) return;

          const answer = yield { kind: "huibiRedirect", playerId: ownerId, data: { sourceId } };
          if (answer.pass || !answer.cardIds?.length || !answer.targetIds?.length) return;
          const newTargetId = answer.targetIds[0]!;
          if (newTargetId === sourceId || !getPlayer(state, newTargetId).alive) return;
          if (!canAttack(state, ownerId, newTargetId)) return;

          discardFromHand(state, ownerId, answer.cardIds[0]!);
          box.targetId = newTargetId;
          log(state, `${ownerId} ทิ้งการ์ด โอน "สังหาร" ไปที่ ${newTargetId} (หลบลี้ภัย)`);
        },
      },
    },
  ],
});
