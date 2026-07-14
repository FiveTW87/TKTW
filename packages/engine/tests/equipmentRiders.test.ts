import { describe, it, expect } from "vitest";
import "../src/equipment/index"; // side-effect: registers bagua/renwang/crossbow/sword_qinggang
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { forceIntoHand } from "./_testUtils";
import { simpleBotAnswer } from "../src/bots/simplePolicy";

// These two paths are the least-covered by the fuzz bot: zhangba requires
// choosing a 2-card substitute play the bot never attempts, and bagua is an
// *optional* skill the dumb bot always declines when asked generically.
// Driven directly here instead, the same way tests/wuxie.test.ts does.

describe("zhangba: 2 arbitrary cards substitute for 1 สังหาร (SPEC 8.4)", () => {
  it("spends 2 non-sha cards and deals damage as if it were สังหาร", () => {
    const rng = createRng(7);
    const state = createInitialState({ playerCount: 3, seed: 7 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    p0.equipment.weapon = { id: "spade_12_1", typeKey: "zhangba", suit: "spade", rank: 12 };
    p1.hand = p1.hand.filter((c) => c.typeKey !== "shan"); // force a guaranteed hit
    p0.hand = p0.hand.filter((c) => c.typeKey !== "sha"); // ensure zhangba path, not a real sha
    forceIntoHand(state, "p0", "heart_3_1"); // tao
    forceIntoHand(state, "p0", "heart_4_1"); // tao

    const session = createSession(runGame(ctx), state, rng);
    const before = p1.hp;

    const pending = session.state.pendingDecision!;
    expect(pending.kind).toBe("mainAction");
    expect(pending.playerId).toBe("p0");
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "playCard",
      cardIds: ["heart_3_1", "heart_4_1"],
      targetIds: ["p1"],
    });

    // Resolve only sub-decisions belonging to THIS attack (e.g. a shan
    // response) — stop the instant control returns to p0 for their next
    // mainAction, so the bot never gets to play a second, unrelated attack.
    for (let i = 0; i < 10; i++) {
      const d = session.state.pendingDecision;
      if (!d || (d.kind === "mainAction" && d.playerId === "p0")) break;
      respond(session, simpleBotAnswer(session));
    }

    expect(p1.hp).toBe(before - 1);
    expect(state.log.some((l) => l.text.includes("ทวนงูจั้งปา"))).toBe(true);
    expect(p0.hand.some((c) => c.id === "heart_3_1" || c.id === "heart_4_1")).toBe(false);
    expect(state.discardPile.some((c) => c.id === "heart_3_1")).toBe(true);
    expect(state.discardPile.some((c) => c.id === "heart_4_1")).toBe(true);
  });
});

describe("bagua: judge-based auto-dodge, optional skill (SPEC 8.5)", () => {
  it("a successful red judgment counts as an automatic dodge", () => {
    const rng = createRng(3);
    const state = createInitialState({ playerCount: 3, seed: 3 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    p1.equipment.armor = { id: "spade_2_1", typeKey: "bagua", suit: "spade", rank: 2 };
    p1.hand = p1.hand.filter((c) => c.typeKey !== "shan"); // force reliance on bagua
    forceIntoHand(state, "p0", "spade_7_1"); // a real สังหาร

    // Session creation itself advances p0 through their turn-1 draw (2 cards
    // popped off the END of drawPile) before the first decision is even
    // reachable — rig the judgment card only *after* that draw has already
    // happened, or it gets consumed by the draw instead of the judgment.
    const session = createSession(runGame(ctx), state, rng);
    const redIdx = state.drawPile.findIndex((c) => c.suit === "heart" || c.suit === "diamond");
    const [redCard] = state.drawPile.splice(redIdx, 1);
    state.drawPile.push(redCard!);

    const pending = session.state.pendingDecision!;
    expect(pending.kind).toBe("mainAction");
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "playCard",
      cardIds: ["spade_7_1"],
      targetIds: ["p1"],
    });

    const activatePrompt = session.state.pendingDecision!;
    expect(activatePrompt.kind).toBe("activateSkill");
    expect(activatePrompt.playerId).toBe("p1");
    respond(session, { decisionId: activatePrompt.id, playerId: "p1", pass: false });

    expect(p1.hp).toBe(p1.maxHp);
    expect(state.log.some((l) => l.text.includes('นับเป็นลง "หลบ" อัตโนมัติ'))).toBe(true);
  });

  it("a black judgment fails, and the sha proceeds to ask for a real shan", () => {
    const rng = createRng(4);
    const state = createInitialState({ playerCount: 3, seed: 4 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    p1.equipment.armor = { id: "spade_2_1", typeKey: "bagua", suit: "spade", rank: 2 };
    p1.hand = p1.hand.filter((c) => c.typeKey !== "shan");
    forceIntoHand(state, "p0", "spade_7_1");

    // See the note in the "red judgment" test above — rig only after the
    // session's own creation has already consumed p0's turn-1 draw.
    const session = createSession(runGame(ctx), state, rng);
    const blackIdx = state.drawPile.findIndex((c) => c.suit === "spade" || c.suit === "club");
    const [blackCard] = state.drawPile.splice(blackIdx, 1);
    state.drawPile.push(blackCard!);

    const before = p1.hp;
    const pending = session.state.pendingDecision!;
    respond(session, {
      decisionId: pending.id,
      playerId: "p0",
      choice: "playCard",
      cardIds: ["spade_7_1"],
      targetIds: ["p1"],
    });

    const activatePrompt = session.state.pendingDecision!;
    expect(activatePrompt.kind).toBe("activateSkill");
    respond(session, { decisionId: activatePrompt.id, playerId: "p1", pass: false });

    // no shan in hand -> should now hit for 1 damage. Stop the instant
    // control returns to p0's next mainAction (same reasoning as the
    // zhangba test above).
    for (let i = 0; i < 10; i++) {
      const d = session.state.pendingDecision;
      if (!d || (d.kind === "mainAction" && d.playerId === "p0")) break;
      respond(session, simpleBotAnswer(session));
    }
    expect(p1.hp).toBe(before - 1);
  });
});
