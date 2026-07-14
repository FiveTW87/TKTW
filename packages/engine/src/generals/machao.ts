// SPEC 11 — ม้าเฉียว (Shu). วิชาขี่ม้า is locked (distanceModifier query);
// ทหารม้าเหล็ก is optional (uses the OnShaTargeted hook added for this).
import { registerGeneral } from "./registry";
import { colorOf } from "../types";
import { runJudgment } from "../core/judgment";
import { log } from "../core/state";

registerGeneral({
  id: "machao",
  faction: "shu",
  gender: "male",
  maxHp: 4,
  skills: [
    {
      id: "machao_qima",
      locked: true,
      queries: {
        distanceModifier: (ctx) => {
          const { fromId } = ctx.payload as { fromId: string; toId: string };
          return ctx.ownerId === fromId ? -1 : 0;
        },
      },
    },
    {
      id: "machao_tieqi",
      triggers: {
        OnShaTargeted: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          const { sourceId, targetId, box } = payload as {
            sourceId: string;
            targetId: string;
            box: { blockedFromDodge: boolean };
          };
          if (ownerId !== sourceId) return;
          const judged = yield* runJudgment(ctx, ownerId);
          if (colorOf(judged.suit) === "red") {
            box.blockedFromDodge = true;
            log(
              state,
              `${ownerId} ตัดสิน "ทหารม้าเหล็ก" ${judged.suit}${judged.rank} — ${targetId} ลง "หลบ" ไม่ได้`,
            );
          }
        },
      },
    },
  ],
});
