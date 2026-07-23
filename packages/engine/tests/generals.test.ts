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
import { forceIntoHand, passDraw } from "./_testUtils";

const REAL_GENERALS = Object.keys(GENERALS).filter((id) => id !== "none");

function createGeneralsGame(playerCount: number, seed: number) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount, seed }, rng);
  for (let i = 0; i < playerCount; i++) {
    // Offset by `seed` (not just `i`) so which generals appear varies across
    // fuzz iterations — playerCount is always < 25, so a fixed i%25 mapping
    // would otherwise pin every game to the same first `playerCount` generals
    // and never reach the rest at all.
    const gid = REAL_GENERALS[(i + seed) % REAL_GENERALS.length]!;
    assignGeneral(state, `p${i}`, gid, i === 0);
    // Real identity-mode play always reveals every general before the turn
    // loop starts (modes/identity.ts) — this harness skips that setup, so it
    // must restore the same invariant or a bot reading its own projectFor
    // view (e.g. detecting Lu Xun's shunshou immunity) sees every opponent's
    // generalId hidden as "" and picks illegal targets.
    state.players[i]!.generalRevealed = true;
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
  it("has all 25 generals registered", () => {
    expect(REAL_GENERALS.length).toBe(25);
  });

  it("1000 games with generals round-robin-assigned across all seats finish cleanly", () => {
    for (let seed = 0; seed < 1000; seed++) {
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
    passDraw(session); // advance past the ENG-004 draw gate
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
    passDraw(session); // advance past the ENG-004 draw gate
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
    passDraw(session); // advance past the ENG-004 draw gate
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

describe("card conversion applies to main-action plays, not just reactive responses", () => {
  it("Guan Yu can actively play a red card as สังหาร on his own turn", () => {
    const rng = createRng(21);
    const state = createInitialState({ playerCount: 3, seed: 21 }, rng);
    assignGeneral(state, "p0", "guanyu");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = state.players[0]!;
    p0.hand = p0.hand.filter((c) => c.typeKey !== "sha"); // force reliance on conversion
    forceIntoHand(state, "p0", "heart_9_1"); // real card, typeKey "wuzhong", red

    const p1 = state.players[1]!;
    p1.hand = p1.hand.filter((c) => c.typeKey !== "shan"); // force a guaranteed hit
    const before = p1.hp;

    const session = createSession(runGame(ctx), state, rng);
    passDraw(session); // advance past the ENG-004 draw gate
    const pending = session.state.pendingDecision!;
    expect(pending.kind).toBe("mainAction");
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "playCard",
      cardIds: ["heart_9_1"],
      targetIds: ["p1"],
      asType: "sha",
    });

    // Resolve the dodge ask this triggers, same as any real สังหาร.
    for (let i = 0; i < 10; i++) {
      const d = session.state.pendingDecision;
      if (!d || (d.kind === "mainAction" && d.playerId === "p0")) break;
      respond(session, simpleBotAnswer(session));
    }

    expect(p1.hp).toBe(before - 1);
    expect(state.discardPile.some((c) => c.id === "heart_9_1")).toBe(true);
  });

  it("rejects converting a card the player has no skill to convert", () => {
    const rng = createRng(22);
    const state = createInitialState({ playerCount: 3, seed: 22 }, rng);
    // p0 has no general with canConvertCard registered ("none")
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    forceIntoHand(state, "p0", "heart_9_1"); // real card, typeKey "wuzhong", not สังหาร

    const session = createSession(runGame(ctx), state, rng);
    passDraw(session); // advance past the ENG-004 draw gate
    const pending = session.state.pendingDecision!;
    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: "p0",
        choice: "playCard",
        cardIds: ["heart_9_1"],
        targetIds: ["p1"],
        asType: "sha",
      }),
    ).toThrow();
  });
});
