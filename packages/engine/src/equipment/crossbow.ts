// SPEC 8.4 — หน้าไม้กลจูกัดเหลียง: ลง "สังหาร" ไม่จำกัดจำนวน.
import { registerEquipment } from "./registry";

registerEquipment("crossbow", {
  locked: true,
  queries: {
    shaUsageLimit: (ctx) => (ctx.ownerId === (ctx.payload as { playerId: string }).playerId ? 999 : 0),
  },
});
