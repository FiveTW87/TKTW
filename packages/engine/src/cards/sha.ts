// SPEC 8.1 (สังหาร) + weapon riders from SPEC 8.4 that fire specifically off
// a sha's own resolution (qinglong/guanshi/qilin/sword_ice). Armor
// (bagua/renwang, SPEC 8.5) hooks in via OnNeedDodge / armorIgnored instead
// of living here — see equipment/bagua.ts, equipment/renwang.ts.
import { colorOf, type Card } from "../types";
import type { CardDef } from "../core/cardEffects";
import type { Ctx } from "../core/ctx";
import type { EngineGenerator } from "../core/decisions";
import { dealDamage } from "../core/damage";
import { discardFromHand, discardCardsFromHand, getPlayer, log, cardById } from "../core/state";
import { fireTrigger, queryHook } from "../core/triggers";
import { countsAsType } from "../core/cardChecks";

function weaponOf(ctx: Ctx, playerId: string): string | undefined {
  return getPlayer(ctx.state, playerId).equipment.weapon?.typeKey;
}

function* resolveShaHit(
  ctx: Ctx,
  sourceId: string,
  targetId: string,
  shaCard: Card,
): EngineGenerator {
  const { state } = ctx;

  // กระบี่น้ำแข็ง: the target may discard 2 to avoid the damage — but only
  // offer/honor that when they actually hold ≥2 cards, otherwise it falls
  // through to normal damage (rather than getting stuck / throwing).
  if (weaponOf(ctx, sourceId) === "sword_ice" && getPlayer(state, targetId).hand.length >= 2) {
    const answer = yield { kind: "swordIceChoice", playerId: sourceId, data: { targetId } };
    if (answer.choice === "discard2") {
      const pick = yield { kind: "discardChosenBy", playerId: targetId, data: { count: 2 } };
      const ids = pick.cardIds ?? [];
      if (ids.length !== 2) {
        throw new Error(`${targetId}: discard2 requires exactly 2 card ids, got ${ids.length}`);
      }
      discardCardsFromHand(state, targetId, ids);
      log(state, `${targetId} ทิ้งการ์ด 2 ใบแทนโดนดาเมจ (กระบี่น้ำแข็ง)`);
      return;
    }
  }

  yield* dealDamage(ctx, sourceId, targetId, 1, shaCard.id);

  if (weaponOf(ctx, sourceId) === "qilin" && getPlayer(state, targetId).alive) {
    const p = getPlayer(state, targetId);
    const hasMinus = !!p.equipment.horseMinus;
    const hasPlus = !!p.equipment.horsePlus;
    // With both horses, the attacker chooses which to destroy; with one, auto.
    let slot: "horseMinus" | "horsePlus" | undefined;
    if (hasMinus && hasPlus) {
      const answer = yield { kind: "qilinDestroyHorse", playerId: sourceId, data: { targetId } };
      slot = answer.choice === "horsePlus" ? "horsePlus" : "horseMinus";
    } else if (hasMinus) {
      slot = "horseMinus";
    } else if (hasPlus) {
      slot = "horsePlus";
    }
    if (slot) {
      const c = p.equipment[slot]!;
      delete p.equipment[slot];
      state.discardPile.push(c);
      log(state, `${targetId} ถูกทำลาย${slot === "horseMinus" ? "ม้า−1" : "ม้า+1"}ด้วยธนูกิเลน`);
    }
  }
}

function* resolveShaDodged(
  ctx: Ctx,
  sourceId: string,
  targetId: string,
  shaCard: Card,
  allowQinglongReplay: boolean,
): EngineGenerator {
  const { state } = ctx;
  log(state, `${targetId} ลง "หลบ" สังหารจาก ${sourceId}`);

  if (weaponOf(ctx, sourceId) === "guanshi") {
    const answer = yield { kind: "guanshiForce", playerId: sourceId, data: { targetId } };
    if (answer.choice === "force" && (answer.cardIds?.length ?? 0) === 2) {
      discardCardsFromHand(state, sourceId, answer.cardIds!);
      log(state, `${sourceId} ทิ้งการ์ด 2 ใบ บังคับให้ "สังหาร" โดน (ขวานทะลุศิลา)`);
      yield* resolveShaHit(ctx, sourceId, targetId, shaCard);
      return;
    }
  }

  if (allowQinglongReplay && weaponOf(ctx, sourceId) === "qinglong") {
    const answer = yield { kind: "qinglongReplay", playerId: sourceId, data: { targetId } };
    if (!answer.pass && answer.choice === "replay") {
      log(state, `${sourceId} ใช้ง้าวมังกรเขียว ลง "สังหาร" ซ้ำใส่ ${targetId}`);
      yield* attemptSha(ctx, sourceId, targetId, shaCard, false);
    }
  }
}

function* attemptSha(
  ctx: Ctx,
  sourceId: string,
  targetId: string,
  shaCard: Card,
  allowQinglongReplay: boolean,
): EngineGenerator {
  const { state } = ctx;

  // Mutable box: Dai Qiao's "หลบลี้ภัย" redirects targetId mid-resolution,
  // so everything downstream must read box.targetId, not the parameter.
  const targetedBox = { targetId, blockedFromDodge: false };
  yield* fireTrigger(ctx, "OnShaTargeted", { sourceId, box: targetedBox, card: shaCard });
  targetId = targetedBox.targetId;

  // Armor: โล่ราชันย์ (renwang) negates a BLACK สังหาร entirely. This is
  // immunity, NOT a dodge, so unlike a หลบ it must still apply even when
  // machao's tieqi has blocked dodging (targetedBox.blockedFromDodge). กระบี่
  // ชิงกัง (armorIgnored) still pierces it.
  if (
    getPlayer(state, targetId).equipment.armor?.typeKey === "renwang" &&
    colorOf(shaCard.suit) === "black" &&
    !queryHook<boolean>(state, "armorIgnored", { playerId: sourceId }, (rs) => rs.some(Boolean), false)
  ) {
    log(state, `"สังหาร" ดอกดำจาก ${sourceId} ไม่มีผลกับ ${targetId} (โล่ราชันย์)`);
    return;
  }

  if (
    weaponOf(ctx, sourceId) === "sword_yy" &&
    getPlayer(state, sourceId).gender !== getPlayer(state, targetId).gender
  ) {
    const answer = yield { kind: "swordYyChoice", playerId: targetId, data: { sourceId } };
    if (answer.choice === "discard" && (answer.cardIds?.length ?? 0) > 0) {
      discardFromHand(state, targetId, answer.cardIds![0]!);
      log(state, `${targetId} ทิ้งการ์ด 1 ใบ (กระบี่คู่หยินหยาง)`);
    } else {
      const p = getPlayer(state, sourceId);
      const c = state.drawPile.pop();
      if (c) {
        p.hand.push(c);
        log(state, `${sourceId} จั่ว 1 ใบ (กระบี่คู่หยินหยาง)`);
      }
    }
  }

  const needed = queryHook<number>(
    state,
    "dodgeRequirement",
    { sourceId, targetId },
    (rs) => Math.max(...rs),
    1,
  );

  let dodged: boolean;
  if (targetedBox.blockedFromDodge) {
    dodged = false;
  } else {
    // Resolve auto-dodges (ค่ายกลแปดทิศ) and lord cover (คุ้มกันราชา) for each
    // required slot first, so we know how many หลบ the TARGET must still play.
    let playerNeed = 0;
    for (let i = 0; i < needed; i++) {
      const box = { autoDodged: false };
      yield* fireTrigger(ctx, "OnNeedDodge", { sourceId, targetId, box, card: shaCard });
      if (!box.autoDodged) playerNeed++;
    }

    dodged = true;
    if (playerNeed > 0) {
      // Ask for the whole set of หลบ in ONE all-or-nothing decision. Lu Bu's
      // wushuang needs 2 — playing just 1 can never dodge, so we must never let
      // the target waste it: they either commit every required หลบ (dodge) or
      // spend nothing (take the hit). No card is lost on a doomed partial dodge.
      const answer = yield {
        kind: "respondShan",
        playerId: targetId,
        data: { sourceId, needed: playerNeed },
      };
      const ids = answer.pass ? [] : (answer.cardIds ?? []);
      if (ids.length < playerNeed) {
        dodged = false; // not enough หลบ committed → hit, and nothing is spent
      } else {
        const chosen = ids.slice(0, playerNeed);
        if (new Set(chosen).size !== chosen.length) {
          throw new Error(`respondShan: duplicate card id in a multi-หลบ dodge`);
        }
        for (const cid of chosen) {
          if (!countsAsType(state, targetId, cid, "shan")) {
            throw new Error(`respondShan: ${cid} does not count as shan`);
          }
        }
        for (const cid of chosen) discardFromHand(state, targetId, cid);
      }
    }
  }

  if (dodged) {
    yield* resolveShaDodged(ctx, sourceId, targetId, shaCard, allowQinglongReplay);
  } else {
    yield* resolveShaHit(ctx, sourceId, targetId, shaCard);
  }
}

export const shaCard: CardDef = {
  // Normally a single target. fangtian (last card in hand) allows up to 3 —
  // turnLoop.ts validates that legality before this ever runs; here we just
  // resolve whichever targets were actually submitted, one at a time.
  play: function* (ctx) {
    const shaId = ctx.cardIds[0];
    if (!shaId || ctx.targetIds.length === 0) return;
    const card = cardById(shaId);
    for (const targetId of ctx.targetIds) {
      if (!getPlayer(ctx.state, targetId).alive) continue;
      yield* attemptSha(ctx, ctx.playerId, targetId, card, true);
    }
  },
};
