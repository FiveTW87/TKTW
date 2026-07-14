// SPEC 8.5 — ค่ายกลแปดทิศ. Optional (not locked): the wearer may judge
// instead of spending a shan card; red counts as an automatic dodge.
import { registerEquipment } from "./registry";
import { runJudgment } from "../core/judgment";
import { colorOf } from "../types";
import { queryHook } from "../core/triggers";
import { log } from "../core/state";

registerEquipment("bagua", {
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

      const judged = yield* runJudgment(ctx, targetId);
      if (colorOf(judged.suit) === "red") {
        box.autoDodged = true;
        log(state, `${targetId} ตัดสิน "ค่ายกลแปดทิศ" ${judged.suit}${judged.rank} — นับเป็นลง "หลบ" อัตโนมัติ`);
      } else {
        log(state, `${targetId} ตัดสิน "ค่ายกลแปดทิศ" ${judged.suit}${judged.rank} — ไม่ติด`);
      }
    },
  },
});
