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
      // Locked: the judgment only benefits the attacker, and (being optional)
      // it used to prompt Ma Chao even when he was the DEFENDER (guard then
      // returns). Locked = only the attacker's tieqi runs, no misfired prompt.
      locked: true,
      triggers: {
        OnShaTargeted: function* (ctx) {
          const { state, ownerId, payload } = ctx;
          // The real target lives in `box.targetId` — the OnShaTargeted payload
          // itself carries no top-level targetId (see cards/sha.ts).
          const { sourceId, box } = payload as {
            sourceId: string;
            box: { targetId: string; blockedFromDodge: boolean };
          };
          if (ownerId !== sourceId) return;
          const judged = yield* runJudgment(ctx, ownerId, { interactive: true, reason: "machao_tieqi" });
          if (colorOf(judged.suit) === "red") {
            box.blockedFromDodge = true;
            log(state, "machaoTieqiJudge", {
              actorId: ownerId,
              targetIds: [box.targetId],
              skillId: "machao_tieqi",
              data: { suit: judged.suit, rank: judged.rank },
            });
          }
        },
      },
    },
  ],
});
