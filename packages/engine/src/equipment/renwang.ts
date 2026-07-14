// SPEC 8.5 — โล่ราชันย์. Locked: black-suited sha has no effect on the
// wearer at all, no card spent, no judgment — implemented via the same
// "autoDodged" box as bagua for simplicity (functionally identical outcome:
// the sha does nothing further).
import { registerEquipment } from "./registry";
import { colorOf, type Card } from "../types";
import { queryHook } from "../core/triggers";
import { log } from "../core/state";

registerEquipment("renwang", {
  locked: true,
  triggers: {
    OnNeedDodge: function* (ctx) {
      const { state, ownerId, payload } = ctx;
      const { sourceId, targetId, box, card } = payload as {
        sourceId: string;
        targetId: string;
        box: { autoDodged: boolean };
        card: Card;
      };
      if (ownerId !== targetId) return;
      if (colorOf(card.suit) !== "black") return;
      const pierced = queryHook<boolean>(
        state,
        "armorIgnored",
        { playerId: sourceId },
        (rs) => rs.some(Boolean),
        false,
      );
      if (pierced) return;
      box.autoDodged = true;
      log(state, `"สังหาร" ดอกดำจาก ${sourceId} ไม่มีผลกับ ${targetId} (โล่ราชันย์)`);
    },
  },
});
