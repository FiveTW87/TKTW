import type { DecisionLogEntry, GameState, PlayerAnswer } from "../types";
import type { Rng } from "./rng";

/** What an effect generator yields when it needs a player's answer. */
export interface Decision {
  kind: string;
  playerId: string;
  data: Record<string, unknown>;
}

export type EngineGenerator = Generator<Decision, void, PlayerAnswer>;

/**
 * Runtime companion to GameState. Everything non-serializable (the live
 * generator, the RNG closure) lives here, never inside GameState — that's
 * what keeps `state` a plain, toEqual-comparable snapshot (see TC-6) and
 * what makes event-sourced crash recovery possible (see replaySession
 * below): a dead process loses `gen`, never loses the decisionLog.
 */
export interface GameSession {
  state: GameState;
  rng: Rng;
  decisionLog: DecisionLogEntry[];
  gen: EngineGenerator;
}

function advance(session: GameSession, answer?: PlayerAnswer): void {
  const result = answer === undefined ? session.gen.next() : session.gen.next(answer);
  if (result.done) {
    delete session.state.pendingDecision;
    return;
  }
  const decision = result.value;
  session.state.seq += 1;
  session.state.pendingDecision = {
    id: `dec_${session.state.seq}`,
    kind: decision.kind,
    playerId: decision.playerId,
    data: decision.data,
  };
}

export function createSession(gen: EngineGenerator, state: GameState, rng: Rng): GameSession {
  const session: GameSession = { state, rng, decisionLog: [], gen };
  advance(session);
  return session;
}

export function respond(session: GameSession, answer: PlayerAnswer): void {
  const pending = session.state.pendingDecision;
  if (!pending) throw new Error("respond() called with no pending decision");
  if (answer.decisionId !== pending.id) {
    throw new Error(`stale decision id: expected ${pending.id}, got ${answer.decisionId}`);
  }
  // Log only after advance() succeeds: pendingDecision is left untouched by
  // a throw inside advance() (same id, safe to retry), so an answer that
  // gets rejected must not end up in decisionLog — otherwise a later,
  // successful retry logs a second entry under that same decision id, and
  // replaying the log deterministically re-throws on the first (bad) one
  // before ever reaching the second.
  advance(session, answer);
  session.decisionLog.push({ decisionId: pending.id, answer });
}

/**
 * Reconstruct a session after a process restart by re-running the root
 * generator from the seed and re-feeding every previously recorded answer.
 * This is the "event-sourced replay" resolution agreed during design review:
 * generators stay ergonomic to write, but nothing is lost if the server
 * process dies mid-decision — only the room process needs to be able to
 * call this on boot, using its own persisted decisionLog.
 *
 * Replay must be side-effect-free and 100% deterministic: no Date.now(),
 * no Math.random(), no I/O inside any effect generator.
 */
export function replaySession(
  genFactory: () => EngineGenerator,
  state: GameState,
  rng: Rng,
  log: readonly DecisionLogEntry[],
): GameSession {
  const session = createSession(genFactory(), state, rng);
  for (const entry of log) {
    if (!session.state.pendingDecision) {
      throw new Error("decision log is longer than the game it recorded");
    }
    respond(session, { ...entry.answer, decisionId: session.state.pendingDecision.id });
  }
  return session;
}
