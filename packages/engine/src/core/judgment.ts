// SPEC section 7. Judgment is NOT `drawPile.pop()` — it's an event that can
// be intercepted before the result counts (BeforeJudgeEffect, e.g. the
// later "อัจฉริยะปีศาจ" skill replaces someone else's judgment card).
import type { Card, PlayerAnswer } from "../types";
import type { Decision } from "./decisions";
import type { Ctx } from "./ctx";
import { fireTrigger } from "./triggers";
import { log } from "./state";

export type JudgmentGenerator = Generator<Decision, Card, PlayerAnswer>;

function drawOneForJudgment(ctx: Ctx): Card {
  const { state, rng } = ctx;
  if (state.drawPile.length === 0) {
    if (state.discardPile.length === 0) throw new Error("no cards left to judge with");
    state.drawPile = rng.shuffle(state.discardPile);
    state.discardPile = [];
    log(state, `กองจั่วหมด — สับกองทิ้งเป็นกองจั่วใหม่ ${state.drawPile.length} ใบ`);
  }
  return state.drawPile.pop()!;
}

/** Mutable box passed through the trigger payload — BeforeJudgeEffect
 *  handlers replace `.card` in place rather than returning a value, since
 *  fireTrigger's handlers are void generators. */
export interface JudgmentBox {
  card: Card;
}

export function* runJudgment(ctx: Ctx, playerId: string): JudgmentGenerator {
  const judgment: JudgmentBox = { card: drawOneForJudgment(ctx) };
  yield* fireTrigger(ctx, "OnJudgeCardRevealed", { playerId, judgment });
  yield* fireTrigger(ctx, "BeforeJudgeEffect", { playerId, judgment });
  yield* fireTrigger(ctx, "OnJudgeResult", { playerId, judgment });
  ctx.state.discardPile.push(judgment.card);
  yield* fireTrigger(ctx, "AfterJudge", { playerId, judgment });
  return judgment.card;
}
