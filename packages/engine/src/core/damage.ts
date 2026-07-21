// SPEC section 6.
import type { Decision, EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { fireTrigger, queryHook } from "./triggers";
import { getPlayer, log, healPlayer, seatOrderFrom, discardCardsFromHand } from "./state";
import { countsAsType } from "./cardChecks";

export function* dealDamage(
  ctx: Ctx,
  sourceId: string | undefined,
  targetId: string,
  amount: number,
  /** The specific card that caused this instance of damage, when there is
   *  one (e.g. a สังหาร) — lets skills like Cao Cao's "วีรบุรุษเจ้าเล่ห์" know
   *  what to keep. Sourceless damage (duel loss, nanman/wanjian failure,
   *  shandian) has no single card and omits this. */
  sourceCardId?: string,
): EngineGenerator {
  const { state } = ctx;
  if (sourceId) {
    const bonus = queryHook<number>(
      state,
      "damageBonus",
      { playerId: sourceId },
      (rs) => rs.reduce((a, b) => a + b, 0),
      0,
    );
    amount += bonus;
  }
  yield* fireTrigger(ctx, "BeforeDamage", { sourceId, targetId, amount, sourceCardId });
  const p = getPlayer(state, targetId);
  if (!p.alive) return;
  p.hp -= amount;
  log(state, "damage", { actorId: targetId, amount, ...(sourceCardId ? { cardId: sourceCardId } : {}), data: { sourceId: sourceId ?? "", hp: p.hp } });
  yield* fireTrigger(ctx, "OnDamaged", { sourceId, targetId, amount, sourceCardId });
  // OnHPLost is a superset of OnDamaged: it fires for ANY hp loss (damage
  // or not), once per point (Guo Jia's "แผนสุดท้าย" explicitly triggers
  // once per point: "เสีย 2 HP = ทำงาน 2 ครั้ง").
  for (let i = 0; i < amount && p.alive; i++) {
    yield* fireTrigger(ctx, "OnHPLost", { targetId, amount: 1 });
  }
  if (p.hp <= 0) yield* resolveDying(ctx, targetId, sourceId);
}

/** HP loss that is not damage (e.g. a general paying HP as a cost). Still
 *  triggers dying/death, but skips damage-specific hooks like BeforeDamage. */
export function* loseHp(ctx: Ctx, targetId: string, amount: number): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, targetId);
  if (!p.alive) return; // a corpse can't lose more HP (death happens once)
  p.hp -= amount;
  log(state, "hpLoss", { actorId: targetId, amount, data: { hp: p.hp } });
  for (let i = 0; i < amount && p.alive; i++) {
    yield* fireTrigger(ctx, "OnHPLost", { targetId, amount: 1 });
  }
  if (p.hp <= 0) yield* resolveDying(ctx, targetId, undefined);
}

export function* heal(
  ctx: Ctx,
  targetId: string,
  amount: number,
  /** Who's playing the healing card, when it's not the target healing
   *  themselves — lets Sun Quan's "กอบกู้" (another Wu player's ท้อ heals
   *  him 1 extra) tell "self-heal" apart from "someone else healed me". */
  sourceId?: string,
): EngineGenerator {
  const { state } = ctx;
  healPlayer(state, targetId, amount);
  log(state, "heal", { actorId: targetId, amount, ...(sourceId ? { data: { sourceId } } : {}) });
  yield* fireTrigger(ctx, "OnHealed", { targetId, amount, sourceId });
  if (sourceId && sourceId !== targetId) {
    const source = getPlayer(state, sourceId);
    const target = getPlayer(state, targetId);
    if (source.faction === "wu" && target.faction === "wu") {
      yield* fireTrigger(ctx, "OnHealedByWu", { targetId, amount, sourceId });
    }
  }
}

/** SPEC section 6: ask the dying player first, then seat order, repeatedly
 *  until hp > 0 or a full round passes with nobody helping. */
export function* resolveDying(
  ctx: Ctx,
  dyingId: string,
  causedBy: string | undefined,
): EngineGenerator {
  const { state } = ctx;
  yield* fireTrigger(ctx, "OnDying", { dyingId, causedBy });

  const order = seatOrderFrom(state, dyingId);
  while (getPlayer(state, dyingId).hp <= 0) {
    let anyHelped = false;
    for (const pid of order) {
      if (getPlayer(state, dyingId).hp > 0) break;
      const answer = yield {
        kind: "respondTao",
        playerId: pid,
        data: { dyingId, hp: getPlayer(state, dyingId).hp },
      } satisfies Decision;
      if (!answer.pass && answer.cardIds && answer.cardIds.length > 0) {
        const ids = answer.cardIds;
        for (const cid of ids) {
          if (!countsAsType(state, pid, cid, "tao")) {
            throw new Error(`respondTao: ${cid} does not count as tao`);
          }
        }
        discardCardsFromHand(state, pid, ids);
        log(state, "tao", { actorId: pid, targetIds: [dyingId], amount: ids.length });
        yield* heal(ctx, dyingId, ids.length, pid);
        anyHelped = true;
      }
    }
    if (!anyHelped) break;
  }

  if (getPlayer(state, dyingId).hp <= 0) {
    yield* killPlayer(ctx, dyingId, causedBy);
  }
}

export function* killPlayer(
  ctx: Ctx,
  deadId: string,
  killerId: string | undefined,
): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, deadId);
  if (!p.alive) return; // death fires exactly once, even on a re-entrant kill
  p.alive = false;
  p.roleRevealed = true;

  state.discardPile.push(...p.hand.splice(0));
  for (const slot of Object.keys(p.equipment) as Array<keyof typeof p.equipment>) {
    const c = p.equipment[slot];
    if (c) state.discardPile.push(c);
  }
  p.equipment = {};
  state.discardPile.push(...p.judgmentZone.splice(0));

  log(state, "death", { actorId: deadId, data: { role: p.role ?? "", ...(killerId ? { killerId } : {}) } });
  yield* fireTrigger(ctx, "OnDeath", { deadId, killerId });
  if (ctx.onDeath) yield* ctx.onDeath(ctx, deadId, killerId);
  ctx.checkGameEnd(state);
}
