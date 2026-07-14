// Side-effect imports: each module calls registerEquipment() on load.
// Weapons whose entire behaviour lives inline in cards/sha.ts (qinglong,
// guanshi, qilin, sword_ice, sword_yy, zhangba, fangtian) need no entry
// here — only equipment with real trigger/query hooks does.
import "./bagua";
import "./renwang";
import "./crossbow";
import "./swordQinggang";

export { EQUIPMENT, registerEquipment } from "./registry";
