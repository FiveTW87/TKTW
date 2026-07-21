import type { GameEvent, GameState, PlayerAnswer } from "../types";
import type { Decision } from "./decisions";
import type { Ctx } from "./ctx";
import { pushEvent, popEvent, makeEvent } from "./eventStack";
import { seatOrderAfter, discardFromHand, log } from "./state";
import { countsAsType } from "./cardChecks";

type PollGenerator = Generator<Decision, string | undefined, PlayerAnswer>;
export type BoolGenerator = Generator<Decision, boolean, PlayerAnswer>;

// Asks players in seat order after the event's source whether they want to
// play wuxie on it. Returns the first player who does, or undefined after a
// full pass with no takers (SPEC: "ถามทีละคนตามลำดับที่นั่ง").
function* pollForWuxie(state: GameState, event: GameEvent): PollGenerator {
  const from = event.source ?? state.players[state.currentSeat]?.id ?? "";
  for (const pid of seatOrderAfter(state, from)) {
    const answer = yield {
      kind: "askWuxie",
      playerId: pid,
      data: { targetEventId: event.id, cancelledType: event.type },
    };
    if (!answer.pass && answer.cardIds && answer.cardIds.length > 0) {
      const cardId = answer.cardIds[0]!;
      if (!countsAsType(state, pid, cardId, "wuxie")) {
        throw new Error(`askWuxie: ${cardId} does not count as wuxie`);
      }
      discardFromHand(state, pid, cardId);
      log(state, "wuxie", { actorId: pid, cardType: "wuxie", data: { targetType: event.type } });
      return pid;
    }
  }
  return undefined;
}

/**
 * Opens a wuxie window against `event`. Returns true if the event
 * ultimately resolves (was not cancelled), false if it was cancelled.
 * Recursive: a wuxie can itself be countered by another wuxie, unlimited
 * depth — this is what makes TC-1 (odd count cancels, even count passes)
 * come out right for free, no special-casing needed.
 */
export function* resolveWithWuxieWindow(ctx: Ctx, event: GameEvent): BoolGenerator {
  const { state } = ctx;
  pushEvent(state, event);
  const responder = yield* pollForWuxie(state, event);
  let effective = true;
  if (responder) {
    const wuxieEvent = makeEvent(
      state,
      "wuxie",
      responder,
      event.source ? [event.source] : [],
      { targetEventId: event.id },
    );
    const counterResolved = yield* resolveWithWuxieWindow(ctx, wuxieEvent);
    effective = !counterResolved;
  }
  popEvent(state);
  event.cancelled = !effective;
  return effective;
}
