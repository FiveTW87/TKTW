import { describe, it, expect } from "vitest";
import "../src/equipment/index"; // side-effect: registers bagua/renwang/crossbow/sword_qinggang
import "../src/generals/index"; // side-effect: registers all 25 generals
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { assignGeneral } from "../src/core/generalAssign";
import { forceIntoHand, passDraw } from "./_testUtils";
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
    passDraw(session); // advance past the ENG-004 draw gate
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
    expect(state.log.some((l) => l.eventType === "zhangbaSha")).toBe(true);
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
    passDraw(session); // advance past the ENG-004 draw gate
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

    // bagua is locked now — no "use it?" prompt. It goes straight to the
    // interactive judgment: p1 "flips" the card themselves (the rigged red
    // card stays on top until this tap).
    const reveal = session.state.pendingDecision!;
    expect(reveal.kind).toBe("judgmentReveal");
    expect(reveal.playerId).toBe("p1");
    respond(session, { decisionId: reveal.id, playerId: "p1", choice: "reveal" });

    expect(p1.hp).toBe(p1.maxHp);
    expect(state.log.some((l) => l.eventType === "judgment" && l.cardType === "bagua" && l.data?.outcome === "autoDodge")).toBe(true);
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
    passDraw(session); // advance past the ENG-004 draw gate
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

    // bagua locked → straight to the judgment (no activateSkill). Let the loop
    // below resolve the reveal + the failed dodge.
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

// The flow probe flagged this OnEquipmentLost path as one random play almost
// never reaches (the attacker must specifically strip her *equipment*, not a
// hand card), so it's pinned here directly.
describe("sunshangxiang jiehun: draw 2 when equipment is lost (OnEquipmentLost)", () => {
  it("draws 2 after an opponent removes her equipped horse via ข้ามสะพานแล้วรื้อทิ้ง", () => {
    const rng = createRng(11);
    const state = createInitialState({ playerCount: 3, seed: 11 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    assignGeneral(state, "p1", "sunshangxiang", false);

    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    p1.equipment.horseMinus = { id: "heart_5_2", typeKey: "horse_chitu", suit: "heart", rank: 5 };
    p0.hand = p0.hand.filter((c) => c.typeKey !== "sha"); // avoid the bot detouring into an attack
    forceIntoHand(state, "p0", "club_3_1"); // a real ข้ามสะพานแล้วรื้อทิ้ง (guohe)

    const session = createSession(runGame(ctx), state, rng);
    passDraw(session); // advance past the ENG-004 draw gate
    const before = p1.hand.length;

    const pending = session.state.pendingDecision!;
    expect(pending.kind).toBe("mainAction");
    respond(session, { decisionId: pending.id, playerId: "p0", choice: "playCard", cardIds: ["club_3_1"], targetIds: ["p1"] });

    // Resolve the guohe: p0 chooses her visible horse; p1 then accepts jiehun.
    let jiehunFired = false;
    for (let i = 0; i < 16; i++) {
      const d = session.state.pendingDecision;
      if (!d || (d.kind === "mainAction" && d.playerId === "p0")) break;
      if (d.kind === "pickCardFromPlayer" && d.playerId === "p0") {
        respond(session, { decisionId: d.id, playerId: "p0", cardIds: ["heart_5_2"] });
      } else if (d.kind === "activateSkill" && d.playerId === "p1") {
        jiehunFired = true;
        respond(session, { decisionId: d.id, playerId: "p1", pass: false });
      } else {
        respond(session, simpleBotAnswer(session));
      }
    }

    expect(jiehunFired).toBe(true);
    expect(p1.hand.length).toBe(before + 2);
    expect(state.log.some((l) => l.eventType === "skillUse" && l.skillId === "sunshangxiang_jiehun")).toBe(true);
  });
});
