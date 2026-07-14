import { describe, it, expect } from "vitest";
import { createGame, recoverGame, respond } from "../src/index";
import { simpleBotAnswer } from "../src/bots/simplePolicy";
import { runUntilEnd } from "../src/bots/runner";

describe("TC-6: determinism", () => {
  it("same seed + same bot policy produces byte-identical final state", () => {
    const g1 = createGame({ playerCount: 8, seed: 42 });
    const g2 = createGame({ playerCount: 8, seed: 42 });
    runUntilEnd(g1, simpleBotAnswer);
    runUntilEnd(g2, simpleBotAnswer);
    expect(g1.state).toEqual(g2.state);
  });

  it("different seeds produce different games", () => {
    const g1 = createGame({ playerCount: 8, seed: 1 });
    const g2 = createGame({ playerCount: 8, seed: 2 });
    runUntilEnd(g1, simpleBotAnswer);
    runUntilEnd(g2, simpleBotAnswer);
    expect(g1.state).not.toEqual(g2.state);
  });

  it("event-sourced replay reconstructs an identical session from (seed, decisionLog) alone", () => {
    const original = createGame({ playerCount: 6, seed: 999 });
    runUntilEnd(original, simpleBotAnswer);

    // Simulate a process restart: throw away `original.gen` (the live
    // generator can't survive a crash) and rebuild purely from the log.
    const recovered = recoverGame({ playerCount: 6, seed: 999 }, original.decisionLog);

    expect(recovered.state).toEqual(original.state);
    expect(recovered.decisionLog).toEqual(original.decisionLog);
  });

  it("replay also works from a mid-game decision log (not just a finished one)", () => {
    const original = createGame({ playerCount: 5, seed: 555 });
    for (let i = 0; i < 40 && original.state.pendingDecision; i++) {
      respond(original, simpleBotAnswer(original));
    }
    expect(original.state.finished).toBe(false);

    const recovered = recoverGame({ playerCount: 5, seed: 555 }, original.decisionLog);
    expect(recovered.state).toEqual(original.state);
  });
});
