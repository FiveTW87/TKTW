// A decision that nobody answers in time still needs to resolve, or the
// whole room (everyone else included) stalls forever on one AFK player.
// simpleBotAnswer is a fine stand-in for reactive decisions (dodge, wuxie,
// discard, judge-replace, ...) since declining/passing is always a legal,
// unsurprising answer there. It is NOT reused for "mainAction" (play a
// card / use a skill / end phase): auto-playing an AFK player's attacks or
// resources on their behalf is a much bigger deal than auto-declining a
// dodge, so that one kind defaults to simply ending the phase instead.
import { simpleBotAnswer, type GameSession, type PlayerAnswer } from "@tktw/engine";

export const DECISION_TIMEOUT_MS = 30_000;

// SPEC 6.5: how long a dropped in-match seat is held (status "reconnecting")
// before it forfeits — the player's character dies and their token is revoked.
export const GRACE_PERIOD_MS = 45_000;

export function defaultAnswerFor(session: GameSession): PlayerAnswer {
  const pending = session.state.pendingDecision;
  if (!pending) throw new Error("defaultAnswerFor: no pending decision");
  if (pending.kind === "mainAction") {
    return { decisionId: pending.id, playerId: pending.playerId, choice: "endPhase" };
  }
  return simpleBotAnswer(session);
}
