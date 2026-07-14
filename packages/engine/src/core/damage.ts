// SPEC section 6.
import type { Decision, EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { fireTrigger, queryHook } from "./triggers";
import { getPlayer, log, healPlayer, seatOrderFrom, discardFromHand } from "./state";
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
  log(state, `${targetId} ได้รับดาเมจ ${amount} จาก ${sourceId ?? "?"} (เหลือ ${p.hp} HP)`);
  yield* fireTrigger(ctx, "OnDamaged", { sourceId, targetId, amount, sourceCardId });
  if (p.hp <= 0) yield* resolveDying(ctx, targetId, sourceId);
}

/** HP loss that is not damage (e.g. a general paying HP as a cost). Still
 *  triggers dying/death, but skips damage-specific hooks like BeforeDamage. */
export function* loseHp(ctx: Ctx, targetId: string, amount: number): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, targetId);
  p.hp -= amount;
  log(state, `${targetId} เสีย HP ${amount} (ไม่ใช่ดาเมจ, เหลือ ${p.hp})`);
  yield* fireTrigger(ctx, "OnHPLost", { targetId, amount });
  if (p.hp <= 0) yield* resolveDying(ctx, targetId, undefined);
}

export function* heal(ctx: Ctx, targetId: string, amount: number): EngineGenerator {
  healPlayer(ctx.state, targetId, amount);
  log(ctx.state, `${targetId} ฟื้น HP ${amount}`);
  yield* fireTrigger(ctx, "OnHealed", { targetId, amount });
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
        for (const cid of answer.cardIds) {
          if (!countsAsType(state, pid, cid, "tao")) {
            throw new Error(`respondTao: ${cid} does not count as tao`);
          }
          discardFromHand(state, pid, cid);
        }
        healPlayer(state, dyingId, answer.cardIds.length);
        log(state, `${pid} ลง "ท้อ" ช่วย ${dyingId}`);
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
  p.alive = false;
  p.roleRevealed = true;

  state.discardPile.push(...p.hand.splice(0));
  for (const slot of Object.keys(p.equipment) as Array<keyof typeof p.equipment>) {
    const c = p.equipment[slot];
    if (c) state.discardPile.push(c);
  }
  p.equipment = {};
  state.discardPile.push(...p.judgmentZone.splice(0));

  log(
    state,
    `${deadId} เสียชีวิต (บทบาท: ${p.role})${killerId ? ` — สังหารโดย ${killerId}` : ""}`,
  );
  yield* fireTrigger(ctx, "OnDeath", { deadId, killerId });
  ctx.checkGameEnd(state);
}
