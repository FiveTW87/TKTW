import type { Faction, Gender } from "../types";
import type { TriggerHandler, TriggerPoint, QueryHandler, QueryHookName } from "../core/triggers";
import type { ActiveSkillHandler } from "../core/activeSkill";

export interface SkillDef {
  id: string;
  locked?: boolean; // 锁定技 — mandatory, no opt-out prompt
  lordOnly?: boolean; // 主公技
  triggers?: Partial<Record<TriggerPoint, TriggerHandler>>;
  queries?: Partial<Record<QueryHookName, QueryHandler>>;
  /** Player-initiated skill offered as a "useSkill" mainAction choice
   *  (e.g. "PlayPhase 1/เทิร์น" skills) rather than a reactive trigger. */
  active?: ActiveSkillHandler;
  maxPerTurn?: number; // default: unlimited
}

export interface GeneralDef {
  id: string;
  faction: Faction;
  gender: Gender;
  maxHp: number;
  skills: SkillDef[];
}

/**
 * Populated incrementally in P2 (SPEC section 11, 25 generals across tiers
 * A/B/C). `none` is a zero-skill placeholder so P0/P1 can run full games
 * without any general content yet — adding a real general here must never
 * require touching engine/core/ (SPEC TODO rule #3).
 */
export const GENERALS: Record<string, GeneralDef> = {
  none: { id: "none", faction: "qun", gender: "male", maxHp: 4, skills: [] },
};

export function registerGeneral(def: GeneralDef): void {
  GENERALS[def.id] = def;
}
