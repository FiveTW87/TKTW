// SPEC section 7. Judgment is NOT `drawPile.pop()` — it's an event that can
// be intercepted before the result counts (BeforeJudgeEffect, e.g. the
// later "อัจฉริยะปีศาจ" skill replaces someone else's judgment card).
import type { Card, PlayerAnswer } from "../types";
import type { Decision } from "./decisions";
import type { Ctx } from "./ctx";
import { fireTrigger } from "./triggers";
import { log, popCard } from "./state";

export type JudgmentGenerator = Generator<Decision, Card, PlayerAnswer>;

function drawOneForJudgment(ctx: Ctx): Card {
  const c = popCard(ctx.state, ctx.rng);
  if (!c) throw new Error("no cards left to judge with");
  return c;
}

/** Options for a judgment. `interactive` makes the judged player "flip" the
 *  card themselves — a `judgmentReveal` decision is yielded before the card
 *  is drawn, so it feels like they draw their own fate (SPEC/UX request).
 *  Bots/AFK answer it automatically; the answer content is ignored — a
 *  judgment can never be declined. `reason` labels the source for the UI. */
export interface JudgmentOptions {
  interactive?: boolean;
  reason?: string;
}

/** Mutable box passed through the trigger payload — BeforeJudgeEffect
 *  handlers replace `.card` in place rather than returning a value, since
 *  fireTrigger's handlers are void generators. */
export interface JudgmentBox {
  card: Card;
}

export function* runJudgment(ctx: Ctx, playerId: string, opts?: JudgmentOptions): JudgmentGenerator {
  // Draw the card only AFTER the reveal tap, so the value isn't decided until
  // the player commits to flipping — that's what makes it feel like drawing.
  if (opts?.interactive) {
    yield { kind: "judgmentReveal", playerId, data: { reason: opts.reason ?? "" } };
  }
  const judgment: JudgmentBox = { card: drawOneForJudgment(ctx) };
  log(ctx.state, "judgmentReveal", {
    actorId: playerId,
    cardId: judgment.card.id,
    cardType: judgment.card.typeKey,
    data: {
      suit: judgment.card.suit,
      rank: judgment.card.rank,
      ...(opts?.reason ? { reason: opts.reason } : {}),
    },
  });
  yield* fireTrigger(ctx, "OnJudgeCardRevealed", { playerId, judgment });
  yield* fireTrigger(ctx, "BeforeJudgeEffect", { playerId, judgment });
  yield* fireTrigger(ctx, "OnJudgeResult", { playerId, judgment });
  ctx.state.discardPile.push(judgment.card);
  yield* fireTrigger(ctx, "AfterJudge", { playerId, judgment });
  return judgment.card;
}
