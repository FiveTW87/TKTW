import type { GameState } from "../types";
import type { Decision, EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { GENERALS, type SkillDef } from "../generals/registry";
import { EQUIPMENT } from "../equipment/registry";

/** Every SkillDef currently in effect for `p`: their general's skills plus
 *  one virtual "skill" per equipped item that has hooks registered. */
function activeSkillDefs(p: GameState["players"][number]): SkillDef[] {
  const out: SkillDef[] = [...(GENERALS[p.generalId]?.skills ?? [])];
  for (const card of Object.values(p.equipment)) {
    if (!card) continue;
    const eq = EQUIPMENT[card.typeKey];
    if (eq) out.push(eq);
  }
  return out;
}

// ── Async, event-based hooks (react to something that already happened) ──
// Driven through the generator/decision system: a triggered skill may itself
// ask its owner a yes/no question before running.
export type TriggerPoint =
  | "TurnStart"
  | "JudgePhaseStart"
  | "DrawPhaseStart"
  | "DrawPhaseEnd"
  | "PlayPhaseStart"
  | "PlayPhaseEnd"
  | "DiscardPhaseStart"
  | "TurnEnd"
  | "OnCardUsed"
  | "OnUseTrick"
  | "OnCardTargeted"
  | "OnShaTargeted"
  | "OnNeedDodge"
  | "OnNeedSha"
  | "OnCardLost"
  | "OnHandEmpty"
  | "OnEquipmentLost"
  | "BeforeDamage"
  | "OnDamaged"
  | "OnHPLost"
  | "OnHealed"
  | "OnHealedByWu"
  | "OnDying"
  | "OnDeath"
  | "OnJudgeCardRevealed"
  | "BeforeJudgeEffect"
  | "OnJudgeResult"
  | "AfterJudge";

// ── Synchronous query hooks (consulted while resolving something else) ──
// Added during design review: skills like "ใจมังกร" (card conversion) or
// "วิชาขี่ม้า" (distance -1) are not reactive events, they're continuous
// rules queried on demand. Forcing them through TriggerPoint would mean
// re-asking a yes/no decision every time a card's legality is checked.
export type QueryHookName =
  | "canConvertCard" // (card, asType) -> boolean
  | "shaUsageLimit" // () -> number, additive on top of the base 1/turn
  | "distanceModifier" // (fromId, toId) -> number, additive
  | "canBeTargetedBy" // (cardTypeKey, sourceId, targetId) -> boolean, false vetoes
  | "dodgeRequirement" // (targetId) -> number, how many shan needed (default 1)
  | "duelShaRequirement" // (playerId) -> number, how many sha needed in a duel (default 1)
  | "armorIgnored" // (playerId) -> boolean, true if playerId's armor (e.g. bagua) is pierced this sha
  | "drawAmountModifier" // (playerId) -> number, additive to the base 2-card turn draw
  | "damageBonus" // (playerId) -> number, additive to damage playerId deals (simplification: applies to all of their damage this turn, not just สังหาร/ดวล as SPEC's Cao Ren wording says)
  | "ignoresCardRange" // (playerId) -> boolean, true bypasses a trick's own fixed `range` (e.g. Pang Tong's "อัจฉริยะพิสดาร" on shunshou)
  | "drawNotifications"; // (playerId) -> string[] of skillIds that MANDATORILY changed the draw count (no prompt), so the draw decision can show a banner (e.g. Zhou Yu's สง่างามผงาด)

export interface TriggerCtx extends Ctx {
  point: TriggerPoint;
  ownerId: string;
  payload: Record<string, unknown>;
}
export type TriggerHandler = (ctx: TriggerCtx) => EngineGenerator;

export interface QueryCtx {
  state: GameState;
  ownerId: string;
  payload: Record<string, unknown>;
}
export type QueryHandler = (ctx: QueryCtx) => unknown;

interface BoundTrigger {
  ownerId: string;
  skillId: string;
  locked: boolean;
  handler: TriggerHandler;
}

function collectTriggerHandlers(state: GameState, point: TriggerPoint): BoundTrigger[] {
  const out: BoundTrigger[] = [];
  for (const p of state.players) {
    for (const s of activeSkillDefs(p)) {
      const fn = s.triggers?.[point];
      if (fn) out.push({ ownerId: p.id, skillId: s.id, locked: !!s.locked, handler: fn });
    }
  }
  return out;
}

// SPEC 12.4 priority: locked skills first, then the turn owner, then seat
// order clockwise. (Multiple skills on the same owner keep declaration
// order — SPEC allows the player to choose, deferred as a P2 refinement.)
function orderTriggerHandlers(state: GameState, handlers: BoundTrigger[]): BoundTrigger[] {
  const seatOf = (id: string) => state.players.find((p) => p.id === id)?.seat ?? 0;
  const n = state.players.length || 1;
  const rel = (id: string) => (seatOf(id) - state.currentSeat + n) % n;
  return [...handlers].sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1;
    return rel(a.ownerId) - rel(b.ownerId);
  });
}

// Some points concern exactly ONE player, named by a payload field. Only that
// player's handlers should be considered — otherwise an owner gets asked "use
// it?" for an event that can't involve them:
//  - phase points (TurnStart…TurnEnd): the active player (`playerId`). Every
//    handler guards ownerId===playerId (e.g. Cao Ren's ถอดเสื้อรบ must not pop
//    on an opponent's draw phase).
//  - OnNeedDodge: the หลบ is the TARGET's (`targetId`) — Cao Cao's คุ้มกันราชา
//    must ask allies only when HE is being attacked, never when HE attacks.
//  - OnNeedSha: the สังหาร is the responder's (`playerId`) — same for Liu Bei's
//    ปลุกใจนักรบ vs ศึกชนเผ่าใต้.
// Other reactive points (OnDamaged/OnShaTargeted/…) legitimately fire across
// players and are left unfiltered.
const OWNER_FILTER_FIELD: Partial<Record<TriggerPoint, string>> = {
  TurnStart: "playerId",
  JudgePhaseStart: "playerId",
  DrawPhaseStart: "playerId",
  DrawPhaseEnd: "playerId",
  PlayPhaseStart: "playerId",
  PlayPhaseEnd: "playerId",
  DiscardPhaseStart: "playerId",
  TurnEnd: "playerId",
  OnNeedDodge: "targetId",
  OnNeedSha: "playerId",
};

/**
 * Fire every registered handler for `point`, in priority order. Optional
 * (non-locked) skills ask their owner first via an "activateSkill" decision.
 */
export function* fireTrigger(
  ctx: Ctx,
  point: TriggerPoint,
  payload: Record<string, unknown> = {},
): EngineGenerator {
  let ordered = orderTriggerHandlers(ctx.state, collectTriggerHandlers(ctx.state, point));
  const filterField = OWNER_FILTER_FIELD[point];
  if (filterField) {
    const relevantId = payload[filterField] as string | undefined;
    ordered = ordered.filter((h) => h.ownerId === relevantId);
  }
  for (const h of ordered) {
    if (!h.locked) {
      const answer = yield {
        kind: "activateSkill",
        playerId: h.ownerId,
        data: { skillId: h.skillId, point },
      } satisfies Decision;
      if (answer.pass) continue;
    }
    yield* h.handler({ ...ctx, point, ownerId: h.ownerId, payload });
  }
}

/** Consult every registered query handler for `name` and fold the results. */
export function queryHook<T>(
  state: GameState,
  name: QueryHookName,
  payload: Record<string, unknown>,
  combine: (results: T[]) => T,
  fallback: T,
): T {
  const results: T[] = [];
  for (const p of state.players) {
    for (const s of activeSkillDefs(p)) {
      const fn = s.queries?.[name];
      if (fn) results.push(fn({ state, ownerId: p.id, payload }) as T);
    }
  }
  return results.length > 0 ? combine(results) : fallback;
}
