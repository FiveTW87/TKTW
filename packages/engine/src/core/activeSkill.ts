// Active, player-initiated skills usable during the play phase (e.g. Zhou
// Yu's "กลไส้ศึก", Sun Quan's "ถ่วงดุลอำนาจ", Liu Bei's "เมตตาธรรม") — as
// distinct from the async TriggerPoint hooks (react to an event) and sync
// QueryHookName hooks (consulted while resolving something else). This is
// the third and last hook shape: an extra option in the mainAction menu.
import type { EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { GENERALS, type SkillDef } from "../generals/registry";
import { EQUIPMENT } from "../equipment/registry";
import { getPlayer } from "./state";

export interface ActiveSkillCtx extends Ctx {
  ownerId: string;
  cardIds: string[];
  targetIds: string[];
}
export type ActiveSkillHandler = (ctx: ActiveSkillCtx) => EngineGenerator;

export function activeSkillDefsFor(state: Ctx["state"], playerId: string): SkillDef[] {
  const p = getPlayer(state, playerId);
  const pool = [...(GENERALS[p.generalId]?.skills ?? [])];
  for (const card of Object.values(p.equipment)) {
    if (card && EQUIPMENT[card.typeKey]) pool.push(EQUIPMENT[card.typeKey]!);
  }
  return pool.filter((skill) => skill.active);
}

function findActiveSkill(state: Ctx["state"], playerId: string, skillId: string): SkillDef | undefined {
  return activeSkillDefsFor(state, playerId).find((skill) => skill.id === skillId);
}

export function activeSkillTargetIds(
  state: Ctx["state"],
  playerId: string,
  skill: SkillDef,
): string[] {
  switch (skill.activeSpec?.targetRule) {
    case "none":
    case undefined:
      return [];
    case "oneOther":
      return state.players.filter((player) => player.alive && player.id !== playerId).map((player) => player.id);
    case "oneInjured":
      return state.players.filter((player) => player.alive && player.hp < player.maxHp).map((player) => player.id);
    case "oneInjuredOther":
      return state.players
        .filter((player) => player.alive && player.id !== playerId && player.hp < player.maxHp)
        .map((player) => player.id);
    case "twoMaleOthers":
      return state.players
        .filter((player) => player.alive && player.id !== playerId && player.gender === "male")
        .map((player) => player.id);
  }
}

function assertActiveSkillSelection(
  state: Ctx["state"],
  playerId: string,
  skill: SkillDef,
  cardIds: string[],
  targetIds: string[],
): void {
  const spec = skill.activeSpec;
  if (!spec) throw new Error(`${playerId}: active skill "${skill.id}" has no selection spec`);
  if (new Set(cardIds).size !== cardIds.length) throw new Error(`${playerId}: duplicate active-skill card id`);
  const handIds = new Set(getPlayer(state, playerId).hand.map((card) => card.id));
  if (cardIds.some((id) => !handIds.has(id))) throw new Error(`${playerId}: active-skill card is not in hand`);
  const maxCards = spec.maxCards === "hand" ? getPlayer(state, playerId).hand.length : spec.maxCards;
  if (cardIds.length < spec.minCards || cardIds.length > maxCards) {
    throw new Error(`${playerId}: "${skill.id}" needs ${spec.minCards}-${maxCards} card(s)`);
  }
  const targetCount = spec.targetRule === "none" ? 0 : spec.targetRule === "twoMaleOthers" ? 2 : 1;
  if (targetIds.length !== targetCount || new Set(targetIds).size !== targetIds.length) {
    throw new Error(`${playerId}: "${skill.id}" needs exactly ${targetCount} distinct target(s)`);
  }
  const eligible = new Set(activeSkillTargetIds(state, playerId, skill));
  if (targetIds.some((id) => !eligible.has(id))) {
    throw new Error(`${playerId}: "${skill.id}" received an ineligible target`);
  }
}

export function* useActiveSkill(
  ctx: Ctx,
  playerId: string,
  skillId: string,
  cardIds: string[],
  targetIds: string[],
): EngineGenerator {
  const skill = findActiveSkill(ctx.state, playerId, skillId);
  if (!skill?.active) throw new Error(`${playerId}: no active skill "${skillId}"`);

  const p = getPlayer(ctx.state, playerId);
  const used = p.skillUsedThisTurn[skillId] ?? 0;
  const max = skill.maxPerTurn ?? Infinity;
  if (used >= max) {
    throw new Error(`${playerId}: "${skillId}" already used ${max} time(s) this turn`);
  }

  assertActiveSkillSelection(ctx.state, playerId, skill, cardIds, targetIds);

  yield* skill.active({ ...ctx, ownerId: playerId, cardIds, targetIds });

  // Commit the quota only once the skill has actually run to completion: a
  // rejected attempt (invalid target/card, thrown from inside active()) must
  // leave state byte-identical, and the counter was the one thing that used
  // to survive the throw. Re-read the player rather than reuse `p` — the
  // skill may have run a whole duel/dying flow in between.
  getPlayer(ctx.state, playerId).skillUsedThisTurn[skillId] = used + 1;
}
