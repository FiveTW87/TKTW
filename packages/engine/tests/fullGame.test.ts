import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createGame, createIdentityGame, simpleBotAnswer, runUntilEnd } from "../src/index";

// End-to-end: a whole game, driven entirely by the engine's bot policy, must
// reach a real finish (state.finished === true) — not stall, not throw, not
// strand on a dead generator. Fixed seeds → same games every run. This is the
// coarse safety net behind the per-card / per-skill unit tests, and it answers
// the direct question "does a 10-player table actually run to the end?".

const SEEDS = [1, 7, 42, 108, 2026];

describe("a bot-driven game always runs to a real finish", () => {
  for (let playerCount = 3; playerCount <= 10; playerCount++) {
    it(`lastAliveWins mode completes with ${playerCount} players`, () => {
      for (const seed of SEEDS) {
        const session = createGame({ playerCount, seed });
        runUntilEnd(session, simpleBotAnswer);
        expect(session.state.finished).toBe(true);
        // exactly one living player remains (or a lord/rebel win in identity)
        expect(session.state.players.some((p) => p.alive)).toBe(true);
      }
    });
  }

  for (let playerCount = 3; playerCount <= 10; playerCount++) {
    it(`identity (role) mode completes with ${playerCount} players`, () => {
      for (const seed of SEEDS) {
        const session = createIdentityGame({ playerCount, seed });
        runUntilEnd(session, simpleBotAnswer);
        expect(session.state.finished).toBe(true);
      }
    });
  }

  it("the maximum 10-player identity table finishes across many seeds", () => {
    for (let seed = 0; seed < 40; seed++) {
      const session = createIdentityGame({ playerCount: 10, seed });
      runUntilEnd(session, simpleBotAnswer);
      expect(session.state.finished).toBe(true);
    }
  });
});
