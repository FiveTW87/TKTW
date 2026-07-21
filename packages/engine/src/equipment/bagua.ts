// SPEC 8.5 — ค่ายกลแปดทิศ. LOCKED: a red judgment is always a free auto-dodge
// and a black one costs nothing (you can still play a real หลบ afterward), so
// there's never a reason to decline — asking "use it?" is just noise, and
// (being non-locked) it used to prompt the *attacker* too if they wore one,
// and bots (which pass every activateSkill) never used it. Locked fixes all
// three: no prompt, only the target's armor acts (ownerId===targetId guard),
// and bots dodge with it. The judgment reveal (tap the pile) still happens.
import { registerEquipment } from "./registry";
import { runJudgment } from "../core/judgment";
import { colorOf } from "../types";
import { queryHook } from "../core/triggers";
import { log } from "../core/state";

registerEquipment("bagua", {
  locked: true,
  triggers: {
    OnNeedDodge: function* (ctx) {
      const { state, ownerId, payload } = ctx;
      const { sourceId, targetId, box } = payload as {
        sourceId: string;
        targetId: string;
        box: { autoDodged: boolean };
      };
      if (ownerId !== targetId) return;
      const pierced = queryHook<boolean>(
        state,
        "armorIgnored",
        { playerId: sourceId },
        (rs) => rs.some(Boolean),
        false,
      );
      if (pierced) return;

      const judged = yield* runJudgment(ctx, targetId, { interactive: true, reason: "bagua" });
      if (colorOf(judged.suit) === "red") {
        box.autoDodged = true;
        log(state, "judgment", { actorId: targetId, cardType: "bagua", data: { suit: judged.suit, rank: judged.rank, outcome: "autoDodge" } });
      } else {
        log(state, "judgment", { actorId: targetId, cardType: "bagua", data: { suit: judged.suit, rank: judged.rank, outcome: "fail" } });
      }
    },
  },
});
