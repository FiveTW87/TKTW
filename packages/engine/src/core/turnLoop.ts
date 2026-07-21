// SPEC section 4 — the 6-phase turn loop.
import type { Decision, EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";
import { fireTrigger, queryHook } from "./triggers";
import {
  getPlayer,
  log,
  drawCards,
  discardFromHand,
  discardCardsFromHand,
  removeFromHand,
  equipCard,
  cardById,
} from "./state";
import { cardDef, isCancelable } from "./cardData";
import { discardRequest, assertDiscardAnswer } from "./discard";
import { CARD_EFFECTS } from "../cards/index";
import { forwardShandian } from "../cards/shandian";
import { makeEvent } from "./eventStack";
import { resolveWithWuxieWindow } from "./wuxieWindow";
import { canAttack, distanceNet } from "./distance";
import { useActiveSkill } from "./activeSkill";
import { countsAsType } from "./cardChecks";

function activePlayerId(ctx: Ctx): string {
  const p = ctx.state.players.find((pp) => pp.seat === ctx.state.currentSeat);
  if (!p) throw new Error("no player at currentSeat");
  return p.id;
}

function nextAliveSeat(ctx: Ctx, fromSeat: number): number {
  const n = ctx.state.players.length;
  let seat = fromSeat;
  for (let i = 0; i < n; i++) {
    seat = (seat + 1) % n;
    if (ctx.state.players.find((p) => p.seat === seat)?.alive) return seat;
  }
  return fromSeat;
}

function advanceSeat(ctx: Ctx): void {
  ctx.state.currentSeat = nextAliveSeat(ctx, ctx.state.currentSeat);
}

export function* runGame(ctx: Ctx): EngineGenerator {
  while (!ctx.state.finished) {
    yield* runTurn(ctx);
  }
}

export function* runTurn(ctx: Ctx): EngineGenerator {
  const { state } = ctx;
  state.turnNumber += 1;
  const activeId = activePlayerId(ctx);

  state.phase = "prepare";
  yield* fireTrigger(ctx, "TurnStart", { playerId: activeId });
  if (state.finished) return;

  state.phase = "judge";
  yield* fireTrigger(ctx, "JudgePhaseStart", { playerId: activeId });
  yield* runJudgePhase(ctx, activeId);
  if (state.finished) return;
  if (!getPlayer(state, activeId).alive) return advanceSeat(ctx);

  state.phase = "draw";
  yield* fireTrigger(ctx, "DrawPhaseStart", { playerId: activeId });
  const drawBonus = queryHook<number>(
    state,
    "drawAmountModifier",
    { playerId: activeId },
    (rs) => rs.reduce((a, b) => a + b, 0),
    0,
  );
  const drawn = drawCards(state, ctx.rng, activeId, Math.max(0, 2 + drawBonus));
  log(state, `${activeId} จั่ว ${drawn.length} ใบ`);
  yield* fireTrigger(ctx, "DrawPhaseEnd", { playerId: activeId });
  if (state.finished) return;

  state.phase = "play";
  if (state.skipPlayPhase) {
    delete state.skipPlayPhase;
    log(state, `${activeId} ข้ามเฟสลงการ์ด (เพลินจนลืมแคว้นสู่)`);
  } else {
    yield* fireTrigger(ctx, "PlayPhaseStart", { playerId: activeId });
    yield* runPlayPhase(ctx, activeId);
  }
  if (state.finished) return;
  if (!getPlayer(state, activeId).alive) return advanceSeat(ctx);
  yield* fireTrigger(ctx, "PlayPhaseEnd", { playerId: activeId });
  if (state.finished) return;

  state.phase = "discard";
  yield* fireTrigger(ctx, "DiscardPhaseStart", { playerId: activeId });
  if (state.skipDiscardPhase) {
    delete state.skipDiscardPhase;
    log(state, `${activeId} ข้ามเฟสทิ้งการ์ด (ข่มใจตนเอง)`);
  } else {
    yield* runDiscardPhase(ctx, activeId);
  }
  if (state.finished) return;

  state.phase = "end";
  yield* fireTrigger(ctx, "TurnEnd", { playerId: activeId });
  if (state.finished) return;

  const p = getPlayer(state, activeId);
  p.shaUsedThisTurn = 0;
  p.skillUsedThisTurn = {};
  advanceSeat(ctx);
}

// LIFO per SPEC section 4/8.3. Each delayed trick's own `judge` handler is
// responsible for disposing of the card (discard, or — shandian — forward
// it to the next player's zone instead), so this loop never assumes discard.
function* runJudgePhase(ctx: Ctx, activeId: string): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, activeId);
  while (p.alive && p.judgmentZone.length > 0) {
    const card = p.judgmentZone.pop()!;
    const event = makeEvent(state, card.typeKey, activeId, [activeId], { delayedCardId: card.id });
    const resolved = yield* resolveWithWuxieWindow(ctx, event);
    if (!resolved) {
      // House rule: ไร้ช่องโหว่ cancelling สายฟ้า doesn't destroy it — it moves
      // on to the next player. Other delayed tricks (lebusishu) are discarded.
      if (card.typeKey === "shandian") {
        log(state, `"สายฟ้า" ถูก "ไร้ช่องโหว่" กัน — ส่งต่อคนถัดไป`);
        forwardShandian(state, activeId, card);
      } else {
        state.discardPile.push(card);
      }
      continue;
    }
    const def = CARD_EFFECTS[card.typeKey];
    if (def?.judge) {
      yield* def.judge({ ...ctx, ownerId: activeId, card });
    } else {
      state.discardPile.push(card);
    }
  }
}

function* runPlayPhase(ctx: Ctx, activeId: string): EngineGenerator {
  const { state } = ctx;
  while (true) {
    if (!getPlayer(state, activeId).alive) return;
    const answer = yield {
      kind: "mainAction",
      playerId: activeId,
      data: {},
    } satisfies Decision;
    if (answer.pass || answer.choice === "endPhase") return;
    if (answer.choice === "playCard") {
      yield* playCard(ctx, activeId, answer.cardIds ?? [], answer.targetIds ?? [], answer.asType);
      if (state.finished) return;
    } else if (answer.choice === "useSkill" && answer.skillId) {
      yield* useActiveSkill(ctx, activeId, answer.skillId, answer.cardIds ?? [], answer.targetIds ?? []);
      if (state.finished) return;
    }
  }
}

// SPEC 8.4 ทวนงูจั้งปา: 2 arbitrary hand cards substitute for 1 สังหาร
// (any suit — legality/range checked exactly like a normal sha play).
//
// All validation (throws) happens before any mutation (counter increment,
// discard) — a rejected play must leave state byte-identical to before the
// call, since the server (P4) will be feeding this untrusted client input
// directly and must be able to retry safely after a thrown error.
function* playZhangbaSha(
  ctx: Ctx,
  playerId: string,
  cardIds: string[],
  targetIds: string[],
): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, playerId);
  const bonus = queryHook<number>(
    state,
    "shaUsageLimit",
    { playerId },
    (rs) => rs.reduce((a, b) => a + b, 0),
    0,
  );
  if (p.shaUsedThisTurn >= 1 + bonus) {
    throw new Error(`${playerId}: สังหาร usage limit reached`);
  }

  const isLastCards = p.hand.length === cardIds.length;
  const maxTargets = isLastCards ? 3 : 1;
  if (targetIds.length < 1 || targetIds.length > maxTargets) {
    throw new Error(`${playerId}: สังหาร needs 1-${maxTargets} target(s), got ${targetIds.length}`);
  }
  for (const targetId of targetIds) {
    if (!canAttack(state, playerId, targetId)) {
      throw new Error(`${playerId}: target ${targetId} is out of range for สังหาร`);
    }
  }
  const shaEffect = CARD_EFFECTS.sha;
  if (!shaEffect?.play) throw new Error("no play effect registered for sha");
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error(`${playerId}: duplicate card id in ทวนงูจั้งปา substitute`);
  }

  // Everything above only reads state. Nothing past this point may throw.
  p.shaUsedThisTurn += 1;
  discardCardsFromHand(state, playerId, cardIds);
  log(state, `${playerId} ใช้ทวนงูจั้งปา ทิ้งการ์ด 2 ใบแทน "สังหาร"`);

  // First spent card stands in as the "reference" sha for color-dependent
  // interactions (renwang) — a documented simplification, real rules treat
  // zhangba's substitute as suit-less.
  yield* shaEffect.play({ ...ctx, playerId, cardIds: [cardIds[0]!], targetIds });
}

// Every throw in this function happens during the VALIDATION section,
// before any mutation — a rejected play must leave `state` byte-identical
// to how it was called, since P4's server feeds this untrusted client
// input directly and must be able to safely re-prompt the same decision
// after an error instead of the room ending up in a corrupted turn state.
function* playCard(
  ctx: Ctx,
  playerId: string,
  cardIds: string[],
  targetIds: string[],
  asType?: string,
): EngineGenerator {
  const { state } = ctx;

  if (cardIds.length === 2 && getPlayer(state, playerId).equipment.weapon?.typeKey === "zhangba") {
    const bothInHand = cardIds.every((cid) => getPlayer(state, playerId).hand.some((c) => c.id === cid));
    const neitherIsSha = cardIds.every((cid) => cardById(cid).typeKey !== "sha");
    if (bothInHand && neitherIsSha) {
      yield* playZhangbaSha(ctx, playerId, cardIds, targetIds);
      return;
    }
  }

  const firstId = cardIds[0];
  if (!firstId) return;
  if (cardIds.length !== 1) {
    // Only zhangba's substitute (handled above) ever legitimately spends 2.
    throw new Error(`${playerId}: expected exactly 1 card, got ${cardIds.length}`);
  }
  if (!getPlayer(state, playerId).hand.some((c) => c.id === firstId)) {
    throw new Error(`${playerId}: ${firstId} is not in hand`);
  }
  const literalCard = cardById(firstId);

  // Card-conversion skills (Guan Yu's red-card-as-สังหาร, Zhao Yun's
  // interchangeable สังหาร/หลบ, Gan Ning's black-as-guohe, ...) are only
  // meaningful here for cards actually playable as a main action — shan and
  // wuxie conversions are already covered at their own reactive accept
  // points (respondShan/askWuxie) and never reach this function.
  let typeKey = literalCard.typeKey;
  if (asType && asType !== typeKey) {
    if (!countsAsType(state, playerId, firstId, asType, "mainAction")) {
      throw new Error(`${playerId}: cannot play ${firstId} as ${asType}`);
    }
    typeKey = asType;
  }
  // "card" from here on means "the card as it's being played" — same id,
  // possibly reinterpreted typeKey. suit/rank stay the physical card's own
  // (correct: a converted card's colour still matters to e.g. renwang).
  const card = typeKey === literalCard.typeKey ? literalCard : { ...literalCard, typeKey };
  const def = cardDef(typeKey);

  // ── validation only, below — nothing here may mutate state ──
  // Reactive-only cards (หลบ/ไร้ช่องโหว่) have no proactive play effect — they
  // can only be used at their own response windows, never as a main action.
  // Reject up front, before any mutation or the wuxie window opens: playing
  // one otherwise fell through to line ~412 and threw only AFTER discarding the
  // card and yielding an askWuxie window (a mutate-then-throw mid-resolution
  // bug), which stranded the room via the dead-generator freeze.
  if (def.category !== "equipment" && def.category !== "delayedTrick" && !CARD_EFFECTS[typeKey]?.play) {
    throw new Error(`${playerId}: ${typeKey} ใช้เป็นแอ็กชันไม่ได้ (การ์ดตอบโต้เท่านั้น)`);
  }
  if (typeKey === "sha") {
    // Base limit 1/turn; crossbow/locked skills raise this — see P1.7/P2.
    const bonus = queryHook<number>(
      state,
      "shaUsageLimit",
      { playerId },
      (rs) => rs.reduce((a, b) => a + b, 0),
      0,
    );
    if (getPlayer(state, playerId).shaUsedThisTurn >= 1 + bonus) {
      throw new Error(`${playerId}: สังหาร usage limit reached`);
    }
  }
  if (def.targetRule === "selfOrDying") {
    // tao (main action): heal self by default, or one injured *other* player
    // ("help a hurt ally" house rule). The dying-rescue path is separate.
    if (targetIds.length > 1) {
      throw new Error(`${playerId}: ${card.typeKey} takes at most 1 target`);
    }
    const targetId = targetIds[0] ?? playerId;
    const t = getPlayer(state, targetId);
    if (!t.alive) throw new Error(`${playerId}: ${card.typeKey} target must be alive`);
    if (t.hp >= t.maxHp) throw new Error(`${playerId}: cannot ${card.typeKey} a full-hp target`);
  }
  if (def.targetRule === "singleArmed") {
    const targetId = targetIds[0];
    if (!targetId || !getPlayer(state, targetId).equipment.weapon) {
      throw new Error(`${playerId}: ${card.typeKey} target must have a weapon equipped`);
    }
  }
  if (def.targetRule === "single") {
    const targetId = targetIds[0];
    if (!targetId || !getPlayer(state, targetId).alive) {
      throw new Error(`${playerId}: ${card.typeKey} needs exactly 1 living target`);
    }
  }
  if (
    (def.targetRule === "single" ||
      def.targetRule === "singleArmed" ||
      def.category === "delayedTrick") &&
    targetIds[0]
  ) {
    // ลกซุน's "ถ่อมตน" (immune to shunshou/lebusishu) hooks in here.
    const allowed = queryHook<boolean>(
      state,
      "canBeTargetedBy",
      { cardTypeKey: card.typeKey, sourceId: playerId, targetId: targetIds[0] },
      (rs) => rs.every(Boolean),
      true,
    );
    if (!allowed) {
      throw new Error(`${playerId}: ${targetIds[0]} cannot be targeted by ${card.typeKey}`);
    }
  }
  if (def.targetRule === "singleInRange") {
    const p = getPlayer(state, playerId);
    const weapon = p.equipment.weapon?.typeKey;
    const isLastCards = p.hand.length === cardIds.length;
    // fangtian: sha played as the last card in hand may hit up to 3 targets.
    const maxTargets = card.typeKey === "sha" && weapon === "fangtian" && isLastCards ? 3 : 1;
    if (targetIds.length < 1 || targetIds.length > maxTargets) {
      throw new Error(
        `${playerId}: ${card.typeKey} needs 1-${maxTargets} target(s), got ${targetIds.length}`,
      );
    }
    for (const targetId of targetIds) {
      if (!canAttack(state, playerId, targetId)) {
        throw new Error(`${playerId}: target ${targetId} is out of range for ${card.typeKey}`);
      }
      const allowed = queryHook<boolean>(
        state,
        "canBeTargetedBy",
        { cardTypeKey: card.typeKey, sourceId: playerId, targetId },
        (rs) => rs.every(Boolean),
        true,
      );
      if (!allowed) {
        throw new Error(`${playerId}: ${targetId} cannot be targeted by ${card.typeKey}`);
      }
    }
  } else if (typeof def.range === "number") {
    // Fixed-distance restriction unrelated to the player's weapon (e.g.
    // shunshou range:1) — uses seat distance directly, not canAttack().
    // Pang Tong's "อัจฉริยะพิสดาร" bypasses this entirely.
    const ignoresRange = queryHook<boolean>(
      state,
      "ignoresCardRange",
      { playerId },
      (rs) => rs.some(Boolean),
      false,
    );
    const targetId = targetIds[0];
    if (!targetId) {
      throw new Error(`${playerId}: ${card.typeKey} needs a target`);
    }
    if (!ignoresRange && distanceNet(state, playerId, targetId) > def.range) {
      throw new Error(`${playerId}: target ${targetId} is out of range for ${card.typeKey}`);
    }
  }
  if (def.category === "delayedTrick") {
    // สายฟ้า (shandian) is always placed on the caster themselves (SPEC 8.3);
    // lebusishu targets a chosen player. Forcing self here keeps the rule even
    // if a client/bot mistakenly sends a target.
    const targetId = card.typeKey === "shandian" ? playerId : (targetIds[0] ?? playerId);
    if (getPlayer(state, targetId).judgmentZone.some((c) => c.typeKey === card.typeKey)) {
      throw new Error(`${targetId} already has a ${card.typeKey} in their judgment zone`);
    }
  }

  // ── everything above only read state; mutation starts here ──
  if (typeKey === "sha") {
    getPlayer(state, playerId).shaUsedThisTurn += 1;
  }

  if (def.category === "equipment") {
    equipCard(state, playerId, removeFromHand(state, playerId, firstId));
    log(state, `${playerId} สวมอุปกรณ์ ${card.typeKey}`);
    return;
  }

  if (def.category === "delayedTrick") {
    const targetId = card.typeKey === "shandian" ? playerId : (targetIds[0] ?? playerId);
    removeFromHand(state, playerId, firstId);
    getPlayer(state, targetId).judgmentZone.push(card);
    log(state, `${playerId} วาง ${card.typeKey} ในเขตตัดสินของ ${targetId}`);
    return; // no wuxie window at play time (SPEC 8.3) — opens at resolution
  }

  // basic + instant trick: spend the card(s), then resolve.
  for (const cid of cardIds) discardFromHand(state, playerId, cid);
  if (getPlayer(state, playerId).hand.length === 0) {
    yield* fireTrigger(ctx, "OnHandEmpty", { playerId });
  }

  if (isCancelable(card.typeKey)) {
    const event = makeEvent(state, card.typeKey, playerId, targetIds, { cardIds });
    const resolved = yield* resolveWithWuxieWindow(ctx, event);
    if (!resolved) {
      log(state, `${card.typeKey} ของ ${playerId} ถูกยกเลิก`);
      return;
    }
  }

  const effect = CARD_EFFECTS[card.typeKey];
  if (!effect?.play) throw new Error(`no play effect registered for ${card.typeKey}`);
  yield* effect.play({ ...ctx, playerId, cardIds, targetIds });

  // Pang Tong's "รวบรวมปัญญา": ordinary (non-converted) trick cards only.
  if (def.category === "trick") {
    const wasConverted = !!asType && asType !== literalCard.typeKey;
    yield* fireTrigger(ctx, "OnUseTrick", { playerId, cardTypeKey: card.typeKey, wasConverted });
  }
}

function* runDiscardPhase(ctx: Ctx, activeId: string): EngineGenerator {
  const { state } = ctx;
  const p = getPlayer(state, activeId);
  const over = p.hand.length - p.hp;
  if (over <= 0) return;
  const data = discardRequest(state, activeId, { min: over, max: over, exact: over });
  const answer = yield { kind: "discardTo", playerId: activeId, data } satisfies Decision;
  const ids = answer.cardIds ?? [];
  assertDiscardAnswer(activeId, ids, data);
  discardCardsFromHand(state, activeId, ids);
  log(state, `${activeId} ทิ้งการ์ด ${ids.length} ใบ (เกินเพดาน HP)`);
  if (getPlayer(state, activeId).hand.length === 0) {
    yield* fireTrigger(ctx, "OnHandEmpty", { playerId: activeId });
  }
}
