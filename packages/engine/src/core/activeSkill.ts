// Active, player-initiated skills usable during the play phase (e.g. Zhou
// Yu's "กลไส้ศึก", Sun Quan's "ถ่วงดุลอำนาจ", Liu Bei's "เมตตาธรรม") — as
// distinct from the async TriggerPoint hooks (react to an event) and sync
// QueryHookName hooks (consulted while resolving something else). This is
// the third and last hook shape: an extra option in the mainAction menu.
import type { EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { GENERALS } from "../generals/registry";
import { EQUIPMENT } from "../equipment/registry";
import { getPlayer } from "./state";

export interface ActiveSkillCtx extends Ctx {
  ownerId: string;
  cardIds: string[];
  targetIds: string[];
}
export type ActiveSkillHandler = (ctx: ActiveSkillCtx) => EngineGenerator;

function findActiveSkill(state: Ctx["state"], playerId: string, skillId: string) {
  const p = getPlayer(state, playerId);
  const pool = [...(GENERALS[p.generalId]?.skills ?? [])];
  for (const card of Object.values(p.equipment)) {
    if (card && EQUIPMENT[card.typeKey]) pool.push(EQUIPMENT[card.typeKey]!);
  }
  return pool.find((s) => s.id === skillId && s.active);
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
  p.skillUsedThisTurn[skillId] = used + 1;

  yield* skill.active({ ...ctx, ownerId: playerId, cardIds, targetIds });
}
