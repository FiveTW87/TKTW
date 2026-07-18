import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { dealDamage } from "../src/core/damage";
import { forceIntoHand } from "./_testUtils";

// heart_3_1 is a real ท้อ (tao) in the deck.
const TAO_ID = "heart_3_1";

describe("ท้อ (tao) proactive main-action heal", () => {
  it("heals an injured OTHER player by 1 and discards the card", () => {
    const rng = createRng(21);
    const state = createInitialState({ playerCount: 3, seed: 21 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const p1 = getPlayer(state, "p1");
    p1.hp = p1.maxHp - 1; // injure the teammate
    forceIntoHand(state, "p0", TAO_ID);

    const session = createSession(runGame(ctx), state, rng);
    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");
    const before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [TAO_ID], targetIds: ["p1"] });

    expect(p1.hp).toBe(before + 1);
    expect(state.discardPile.some((c) => c.id === TAO_ID)).toBe(true);
    expect(getPlayer(state, "p0").hand.some((c) => c.id === TAO_ID)).toBe(false);
  });

  it("rejects targeting a full-HP player, leaving state untouched (atomicity)", () => {
    const rng = createRng(22);
    const state = createInitialState({ playerCount: 3, seed: 22 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const p1 = getPlayer(state, "p1");
    p1.hp = p1.maxHp; // full
    forceIntoHand(state, "p0", TAO_ID);

    const session = createSession(runGame(ctx), state, rng);
    const main = session.state.pendingDecision!;
    expect(() =>
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [TAO_ID], targetIds: ["p1"] }),
    ).toThrow();

    // rejected → card still in hand, hp unchanged, still p0's mainAction
    expect(getPlayer(state, "p0").hand.some((c) => c.id === TAO_ID)).toBe(true);
    expect(p1.hp).toBe(p1.maxHp);
    expect(session.state.pendingDecision!.kind).toBe("mainAction");
  });

  it("with no target, still heals the caster themselves (classic behaviour)", () => {
    const rng = createRng(23);
    const state = createInitialState({ playerCount: 3, seed: 23 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const p0 = getPlayer(state, "p0");
    p0.hp = p0.maxHp - 1;
    forceIntoHand(state, "p0", TAO_ID);

    const session = createSession(runGame(ctx), state, rng);
    const main = session.state.pendingDecision!;
    const before = p0.hp;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [TAO_ID], targetIds: [] });

    expect(p0.hp).toBe(before + 1);
  });
});

describe("dying rescue (resolveDying / respondTao) — first coverage", () => {
  it("another player can save a dying player with ท้อ", () => {
    const rng = createRng(31);
    const state = createInitialState({ playerCount: 3, seed: 31 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    getPlayer(state, "p1").hp = 1;
    forceIntoHand(state, "p2", TAO_ID); // the rescuer holds a tao

    const gen = dealDamage(ctx, "p0", "p1", 1); // brings p1 to 0 → dying
    let r = gen.next();
    while (!r.done) {
      const dec = r.value as { kind: string; playerId: string };
      if (dec.kind === "respondTao" && dec.playerId === "p2") {
        r = gen.next({ decisionId: "x", playerId: "p2", cardIds: [TAO_ID] });
      } else {
        r = gen.next({ decisionId: "x", playerId: dec.playerId, pass: true });
      }
    }

    expect(getPlayer(state, "p1").alive).toBe(true);
    expect(getPlayer(state, "p1").hp).toBe(1);
  });

  it("dies when nobody plays ท้อ", () => {
    const rng = createRng(32);
    const state = createInitialState({ playerCount: 3, seed: 32 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    getPlayer(state, "p1").hp = 1;

    const gen = dealDamage(ctx, "p0", "p1", 1);
    let r = gen.next();
    while (!r.done) {
      const dec = r.value as { kind: string; playerId: string };
      r = gen.next({ decisionId: "x", playerId: dec.playerId, pass: true }); // everyone declines
    }

    expect(getPlayer(state, "p1").alive).toBe(false);
  });
});
