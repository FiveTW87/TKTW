// SPEC 8.4 — กระบี่ชิงกัง: "สังหาร" ของเรา เมินเกราะเป้าหมาย (bagua/renwang).
import { registerEquipment } from "./registry";

registerEquipment("sword_qinggang", {
  locked: true,
  queries: {
    armorIgnored: (ctx) => ctx.ownerId === (ctx.payload as { playerId: string }).playerId,
  },
});
