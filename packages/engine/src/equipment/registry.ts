import type { SkillDef } from "../generals/registry";

/**
 * Weapons like ง้าวมังกรเขียว/ทวนงูจั้งปา have real trigger/query behaviour,
 * not just a static attackRange number — reuses SkillDef's exact shape so
 * core/triggers.ts can scan equipment and general skills identically.
 * Keyed by the equipment card's typeKey (e.g. "qinglong", "crossbow").
 */
export const EQUIPMENT: Record<string, SkillDef> = {};

export function registerEquipment(typeKey: string, def: Omit<SkillDef, "id">): void {
  EQUIPMENT[typeKey] = { id: `equip:${typeKey}`, ...def };
}
