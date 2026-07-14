import type { GameSession } from "../core/decisions";
import { respond } from "../core/decisions";

export type BotPolicy = (session: GameSession) => import("../types").PlayerAnswer;

export function runUntilEnd(session: GameSession, policy: BotPolicy, maxSteps = 200_000): void {
  let steps = 0;
  while (session.state.pendingDecision) {
    if (steps++ > maxSteps) {
      throw new Error(
        `runUntilEnd: exceeded ${maxSteps} decisions without finishing — likely an infinite loop`,
      );
    }
    respond(session, policy(session));
  }
}
