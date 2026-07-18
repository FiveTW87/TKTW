// SPEC 8.5 — โล่ราชันย์. Black-suited สังหาร has no effect on the wearer.
// This is IMMUNITY (not a หลบ substitute), so it must apply even when dodging
// is blocked (machao's tieqi) — for that reason it's resolved directly in
// cards/sha.ts (before the dodge loop / blockedFromDodge check), not via an
// OnNeedDodge trigger here. Kept registered (no hooks) so it's still equippable.
import { registerEquipment } from "./registry";

registerEquipment("renwang", { locked: true });
