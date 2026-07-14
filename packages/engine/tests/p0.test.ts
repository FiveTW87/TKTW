import { describe, it, expect } from "vitest";
import { createGame } from "../src/index";
import { simpleBotAnswer } from "../src/bots/simplePolicy";
import { runUntilEnd } from "../src/bots/runner";

describe("P0 acceptance (SPEC 0 — pass criteria)", () => {
  it("createGame + runUntilEnd finishes an 8-player game headlessly", () => {
    const session = createGame({ playerCount: 8, seed: 12345 });
    runUntilEnd(session, simpleBotAnswer);
    expect(session.state.finished).toBe(true);
  });

  it("finishes for every player count 3..10 across several seeds", () => {
    for (let n = 3; n <= 10; n++) {
      for (const seed of [1, 2, 3]) {
        const session = createGame({ playerCount: n, seed: seed * 1000 + n });
        runUntilEnd(session, simpleBotAnswer);
        expect(session.state.finished).toBe(true);
        const alive = session.state.players.filter((p) => p.alive);
        expect(alive.length).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("fuzz: 1000 headless 8-player games never hang or crash", () => {
  it("all 1000 finish within the step budget", () => {
    for (let seed = 0; seed < 1000; seed++) {
      const session = createGame({ playerCount: 8, seed });
      expect(() => runUntilEnd(session, simpleBotAnswer)).not.toThrow();
      expect(session.state.finished).toBe(true);
    }
  });
});
