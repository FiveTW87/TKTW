import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { createGame } from "../src/index";
import { forceIntoHand } from "./_testUtils";

// A real สังหาร (sha) that exists in the deck.
const SHA_ID = "spade_7_1";

// These reproduce the "เกมค้าง — ไม่มีตาให้เล่น" freeze: a validation error
// thrown from inside the engine generator (illegal target / out of range /
// card-not-in-hand) completes the generator permanently. Before the
// GameSession.rebuild fix, the next respond() ran .next() on a dead
// generator → {done:true} → pendingDecision cleared with finished still
// false → the room hung. createGame() wires rebuild, so a rejected answer
// is genuinely safe to retry.
describe("rejected answers are retry-safe (no dead-generator hang)", () => {
  it("a bogus card-id reject leaves the SAME decision live to retry", () => {
    const session = createGame({ playerCount: 3, seed: 4242 });
    const first = session.state.pendingDecision!;
    expect(first.kind).toBe("mainAction");
    const me = first.playerId;

    // Reject: name a card that isn't in hand.
    expect(() =>
      respond(session, { decisionId: first.id, playerId: me, choice: "playCard", cardIds: ["not_a_real_card"], targetIds: [] }),
    ).toThrow();

    // The generator must still be alive at the same decision (not cleared).
    const after = session.state.pendingDecision;
    expect(after).toBeDefined();
    expect(after!.kind).toBe("mainAction");
    expect(after!.playerId).toBe(me);
    expect(session.state.finished).toBe(false);

    // The retry (end the phase) must actually advance the game.
    respond(session, { decisionId: after!.id, playerId: me, choice: "endPhase" });
    expect(session.state.pendingDecision !== undefined || session.state.finished).toBe(true);
  });

  it("an out-of-range สังหาร reject (image #4) still lets the turn continue", () => {
    // 5 players → seat 0 to seat 2 is distance 2, out of base สังหาร range 1.
    const session = createGame({ playerCount: 5, seed: 909 });
    const state = session.state;
    const pd = state.pendingDecision!;
    expect(pd.kind).toBe("mainAction");
    expect(pd.playerId).toBe("p0");
    forceIntoHand(state, "p0", SHA_ID);

    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", choice: "playCard", cardIds: [SHA_ID], targetIds: ["p2"] }),
    ).toThrow(/out of range/);

    // Not a dead end — the game is still awaiting p0, not frozen.
    const after = session.state.pendingDecision;
    expect(after).toBeDefined();
    expect(session.state.finished).toBe(false);

    // A legal follow-up move is accepted and the game moves on.
    respond(session, { decisionId: after!.id, playerId: after!.playerId, choice: "endPhase" });
    expect(session.state.pendingDecision !== undefined || session.state.finished).toBe(true);
  });

  it("CONTROL: a session without rebuild DOES hang on retry (documents the bug)", () => {
    // Same setup, but via raw createSession (no rebuild wired) — proves the
    // rebuild closure is what actually fixes the freeze.
    const rng = createRng(4242);
    const state = createInitialState({ playerCount: 3, seed: 4242 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);
    const first = session.state.pendingDecision!;

    expect(() =>
      respond(session, { decisionId: first.id, playerId: first.playerId, choice: "playCard", cardIds: ["not_a_real_card"], targetIds: [] }),
    ).toThrow();

    // The generator is dead; the "retry" completes it and strands the game.
    respond(session, { decisionId: session.state.pendingDecision!.id, playerId: first.playerId, choice: "endPhase" });
    expect(session.state.pendingDecision).toBeUndefined();
    expect(session.state.finished).toBe(false); // hung: no winner, no decision
  });
});
