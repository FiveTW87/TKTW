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
  /**
   * Rebuild a fresh, LIVE session at the current decision by replaying
   * `decisionLog` from the seed. Set by createGame/createIdentityGame.
   *
   * Why this exists: a validation error thrown from *inside* an effect
   * generator (an illegal target/range on playCard, etc.) completes the
   * generator permanently — JS generators can't resume after their body
   * throws. Without recovery, the very next respond() would call .next() on
   * a dead generator, get {done:true}, and silently clear pendingDecision
   * (with finished still false) → the room hangs forever. respond() uses
   * this to resurrect the generator so a rejected answer is genuinely
   * safe to retry, which the whole server/client retry path assumes.
   */
  rebuild?: () => GameSession;
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
  // Log only after advance() succeeds: an answer that gets rejected must not
  // end up in decisionLog — otherwise a later, successful retry logs a second
  // entry under that same decision id, and replaying the log deterministically
  // re-throws on the first (bad) one before ever reaching the second.
  try {
    advance(session, answer);
  } catch (err) {
    // The generator threw during validation and is now dead (see the note on
    // GameSession.rebuild). pendingDecision was left untouched by the throw,
    // but the generator behind it is gone — so resurrect it by replaying the
    // log (which does NOT contain this rejected answer). Determinism (see
    // determinism.test.ts) guarantees the fresh run stops at the very same
    // decision with the same id, so the caller's retry lines up exactly.
    if (session.rebuild) {
      const fresh = session.rebuild();
      session.state = fresh.state;
      session.rng = fresh.rng;
      session.gen = fresh.gen;
    }
    throw err;
  }
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
  /** Re-applies a forfeit log entry (a disconnect/leave death) — a pure state
   *  mutation that does NOT advance the generator, so it lands at exactly the
   *  timeline position it was recorded. Only identity mode records these; the
   *  base game never does, so it may omit this. */
  onForfeit?: (state: GameState, playerId: string) => void,
): GameSession {
  const session = createSession(genFactory(), state, rng);
  for (const entry of log) {
    if ("forfeit" in entry) {
      if (!onForfeit) throw new Error("decision log has a forfeit entry but no onForfeit handler");
      onForfeit(session.state, entry.forfeit);
      continue;
    }
    if (!session.state.pendingDecision) {
      throw new Error("decision log is longer than the game it recorded");
    }
    respond(session, { ...entry.answer, decisionId: session.state.pendingDecision.id });
  }
  return session;
}
