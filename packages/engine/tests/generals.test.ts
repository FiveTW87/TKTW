import { describe, it, expect } from "vitest";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { assignGeneral } from "../src/core/generalAssign";
import "../src/generals/index";
import { GENERALS } from "../src/generals/registry";
import { simpleBotAnswer } from "../src/bots/simplePolicy";
import { runUntilEnd } from "../src/bots/runner";

const REAL_GENERALS = Object.keys(GENERALS).filter((id) => id !== "none");

function createGeneralsGame(playerCount: number, seed: number) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount, seed }, rng);
  for (let i = 0; i < playerCount; i++) {
    const gid = REAL_GENERALS[i % REAL_GENERALS.length]!;
    assignGeneral(state, `p${i}`, gid, i === 0);
  }
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  return createSession(runGame(ctx), state, rng);
}

// Zhou Yu's other skill (สง่างามผงาด, an optional DrawPhaseStart trigger)
// produces its own "activateSkill" prompt before the turn ever reaches
// mainAction. Decline any such prompts to reach the decision under test.
function skipOptionalPrompts(session: ReturnType<typeof createSession>) {
  for (let i = 0; i < 20; i++) {
    const d = session.state.pendingDecision;
    if (!d || d.kind !== "activateSkill") return;
    respond(session, { decisionId: d.id, playerId: d.playerId, pass: true });
  }
}

describe("P2 fuzz: every registered general in real play, no crashes/hangs", () => {
  it("has at least the 5 tier-A generals registered", () => {
    expect(REAL_GENERALS.length).toBeGreaterThanOrEqual(5);
  });

  it("300 games with generals round-robin-assigned across all seats finish cleanly", () => {
    for (let seed = 0; seed < 300; seed++) {
      const session = createGeneralsGame(8, seed + 900000);
      expect(() => runUntilEnd(session, simpleBotAnswer)).not.toThrow();
      expect(session.state.finished).toBe(true);
    }
  });

  it("3..10 players with generals assigned also finish cleanly", () => {
    for (let n = 3; n <= 10; n++) {
      const session = createGeneralsGame(n, n * 7777);
      expect(() => runUntilEnd(session, simpleBotAnswer)).not.toThrow();
      expect(session.state.finished).toBe(true);
    }
  });
});

describe("active skill dispatch (SPEC 12.1 third hook shape)", () => {
  it("Zhou Yu's กลไส้ศึก: correct guess keeps target undamaged, wrong guess costs 1 HP", () => {
    const rng = createRng(11);
    const state = createInitialState({ playerCount: 3, seed: 11 }, rng);
    assignGeneral(state, "p0", "zhouyu");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = state.players[0]!;
    const knownCardId = p0.hand[0]!.id;
    const knownSuit = p0.hand[0]!.suit;
    const p1 = state.players[1]!;
    const before = p1.hp;

    const session = createSession(runGame(ctx), state, rng);
    skipOptionalPrompts(session);
    const pending = session.state.pendingDecision!;
    expect(pending.kind).toBe("mainAction");
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "useSkill",
      skillId: "zhouyu_fanjian",
      cardIds: [knownCardId],
      targetIds: ["p1"],
    });

    const guessPrompt = session.state.pendingDecision!;
    expect(guessPrompt.kind).toBe("fanjianGuess");
    expect(guessPrompt.playerId).toBe("p1");

    // Guess correctly -> no HP loss.
    respond(session, { decisionId: guessPrompt.id, playerId: "p1", choice: knownSuit });
    expect(p1.hp).toBe(before);
    expect(p1.hand.some((c) => c.id === knownCardId)).toBe(true);
  });

  it("a wrong guess costs the target 1 HP", () => {
    const rng = createRng(12);
    const state = createInitialState({ playerCount: 3, seed: 12 }, rng);
    assignGeneral(state, "p0", "zhouyu");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = state.players[0]!;
    const knownCardId = p0.hand[0]!.id;
    const knownSuit = p0.hand[0]!.suit;
    const wrongSuit = (["spade", "heart", "club", "diamond"] as const).find((s) => s !== knownSuit)!;
    const p1 = state.players[1]!;
    const before = p1.hp;

    const session = createSession(runGame(ctx), state, rng);
    skipOptionalPrompts(session);
    const pending = session.state.pendingDecision!;
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "useSkill",
      skillId: "zhouyu_fanjian",
      cardIds: [knownCardId],
      targetIds: ["p1"],
    });

    const guessPrompt = session.state.pendingDecision!;
    respond(session, { decisionId: guessPrompt.id, playerId: "p1", choice: wrongSuit });
    expect(p1.hp).toBe(before - 1);
  });

  it("a skill declared maxPerTurn: 1 cannot be used twice in the same turn", () => {
    const rng = createRng(13);
    const state = createInitialState({ playerCount: 3, seed: 13 }, rng);
    assignGeneral(state, "p0", "zhouyu");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const p0 = state.players[0]!;
    p0.skillUsedThisTurn["zhouyu_fanjian"] = 1; // simulate already-used this turn

    const session = createSession(runGame(ctx), state, rng);
    skipOptionalPrompts(session);
    const pending = session.state.pendingDecision!;
    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: "p0",
        choice: "useSkill",
        skillId: "zhouyu_fanjian",
        cardIds: [p0.hand[0]!.id],
        targetIds: ["p1"],
      }),
    ).toThrow();
  });
});
