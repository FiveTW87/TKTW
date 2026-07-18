import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { getPlayer, drawCards, popCard } from "../src/core/state";
import { runJudgment } from "../src/core/judgment";
import { shandianCard } from "../src/cards/shandian";
import type { Card } from "../src/types";
import { forceIntoHand } from "./_testUtils";

// Drive shandian's judge generator, answering the interactive reveal.
function resolveShandianJudge(ctx: ReturnType<typeof makeCtx>, ownerId: string, card: Card) {
  const gen = shandianCard.judge!({ ...ctx, ownerId, card });
  let r = gen.next();
  while (!r.done) {
    const dec = r.value as { playerId: string };
    r = gen.next({ decisionId: "x", playerId: dec.playerId, choice: "reveal" });
  }
}

describe("สายฟ้า (shandian) is always placed on the caster", () => {
  it("self-places even when a target id is (wrongly) supplied", () => {
    const rng = createRng(77);
    const state = createInitialState({ playerCount: 3, seed: 77 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    forceIntoHand(state, "p0", "spade_9_2"); // the single shandian in the deck

    const session = createSession(runGame(ctx), state, rng);
    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");
    // deliberately aim it at p1 — the engine must ignore that and self-place
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_9_2"], targetIds: ["p1"] });

    expect(getPlayer(state, "p0").judgmentZone.some((c) => c.typeKey === "shandian")).toBe(true);
    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.typeKey === "shandian")).toBe(false);
  });

  it("forwards to the next living player on a miss (not spade 2-9)", () => {
    const rng = createRng(78);
    const state = createInitialState({ playerCount: 3, seed: 78 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const card: Card = { id: "sd", typeKey: "shandian", suit: "spade", rank: 9 };
    state.drawPile.push({ id: "m1", typeKey: "tao", suit: "heart", rank: 5 }); // heart → miss

    const before = getPlayer(state, "p0").hp;
    resolveShandianJudge(ctx, "p0", card);

    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.id === "sd")).toBe(true); // forwarded
    expect(getPlayer(state, "p0").hp).toBe(before); // no damage
  });

  it("forwards to the next player when cancelled by ไร้ช่องโหว่ (house rule — not discarded)", () => {
    const rng = createRng(81);
    const state = createInitialState({ playerCount: 3, seed: 81 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    // shandian sits in p0's judgment zone; only p1 holds a ไร้ช่องโหว่
    getPlayer(state, "p0").judgmentZone.push({ id: "sd", typeKey: "shandian", suit: "spade", rank: 9 });
    for (const p of state.players) p.hand = p.hand.filter((c) => c.typeKey !== "wuxie");
    forceIntoHand(state, "p1", "heart_13_1"); // a real ไร้ช่องโหว่

    const session = createSession(runGame(ctx), state, rng);
    // resolve the wuxie window: p1 cancels the shandian, others pass
    for (let i = 0; i < 8; i++) {
      const d = session.state.pendingDecision!;
      if (d.kind !== "askWuxie") break;
      if (d.playerId === "p1") respond(session, { decisionId: d.id, playerId: "p1", cardIds: ["heart_13_1"] });
      else respond(session, { decisionId: d.id, playerId: d.playerId, pass: true });
    }

    // cancelled → moved on to the next player (p1), NOT discarded
    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.id === "sd")).toBe(true);
    expect(getPlayer(state, "p0").judgmentZone.some((c) => c.id === "sd")).toBe(false);
    expect(state.discardPile.some((c) => c.id === "sd")).toBe(false);
  });

  it("hits the current holder (3 damage, no forward) on spade 2-9", () => {
    const rng = createRng(79);
    const state = createInitialState({ playerCount: 3, seed: 79 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const card: Card = { id: "sd", typeKey: "shandian", suit: "spade", rank: 9 };
    state.drawPile.push({ id: "h1", typeKey: "sha", suit: "spade", rank: 5 }); // spade 5 → hit

    const before = getPlayer(state, "p0").hp;
    resolveShandianJudge(ctx, "p0", card);

    expect(getPlayer(state, "p0").hp).toBe(before - 3);
    expect(getPlayer(state, "p1").judgmentZone.length).toBe(0); // not forwarded
  });
});

describe("P6: empty draw pile reshuffles the discard pile", () => {
  it("drawCards reshuffles when the draw pile runs out mid-draw", () => {
    const rng = createRng(1);
    const state = createInitialState({ playerCount: 3, seed: 1 }, rng);
    state.drawPile = [];
    state.discardPile = [
      { id: "a1", typeKey: "sha", suit: "spade", rank: 5 },
      { id: "a2", typeKey: "shan", suit: "heart", rank: 6 },
      { id: "a3", typeKey: "tao", suit: "heart", rank: 7 },
    ];

    const before = getPlayer(state, "p0").hand.length;
    const drawn = drawCards(state, rng, "p0", 2);

    expect(drawn.length).toBe(2);
    expect(getPlayer(state, "p0").hand.length).toBe(before + 2);
    expect(state.discardPile.length).toBe(0); // all 3 shuffled into the draw pile
    expect(state.drawPile.length).toBe(1); // 3 shuffled in, 2 drawn out
    expect(state.log.some((l) => l.text.includes("สับกองทิ้งเป็นกองจั่วใหม่"))).toBe(true);
  });

  it("popCard returns undefined only when BOTH piles are exhausted", () => {
    const rng = createRng(2);
    const state = createInitialState({ playerCount: 3, seed: 2 }, rng);
    state.drawPile = [];
    state.discardPile = [];
    expect(popCard(state, rng)).toBeUndefined();
  });
});

describe("P6: wugu carries full card faces (not just ids)", () => {
  it("the wuguPick decision data.options are full Card objects", () => {
    const rng = createRng(9);
    const state = createInitialState({ playerCount: 3, seed: 9 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    forceIntoHand(state, "p0", "heart_10_1"); // a real wugu

    const session = createSession(runGame(ctx), state, rng);
    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["heart_10_1"], targetIds: [] });

    // wugu is a trick, so each other player gets a wuxie window first — pass
    // them until the reveal/pick begins.
    for (let i = 0; i < 6; i++) {
      const d = session.state.pendingDecision!;
      if (d.kind !== "askWuxie") break;
      respond(session, { decisionId: d.id, playerId: d.playerId, pass: true });
    }

    const pick = session.state.pendingDecision!;
    expect(pick.kind).toBe("wuguPick");
    const options = (pick.data as { options: unknown[] }).options;
    expect(options.length).toBeGreaterThan(0);
    const first = options[0] as Card;
    expect(typeof first).toBe("object");
    expect(typeof first.id).toBe("string");
    expect(typeof first.typeKey).toBe("string");
    expect(typeof first.suit).toBe("string");
    expect(typeof first.rank).toBe("number");
  });
});

describe("P6: interactive judgment reveal", () => {
  it("yields a judgmentReveal decision first when interactive, and never otherwise", () => {
    const rng = createRng(5);
    const state = createInitialState({ playerCount: 3, seed: 5 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    // interactive: the very first yield is the reveal tap (card not drawn yet).
    const drawPileBefore = state.drawPile.length;
    const gen = runJudgment(ctx, "p0", { interactive: true });
    const first = gen.next();
    expect(first.done).toBe(false);
    expect((first.value as { kind: string }).kind).toBe("judgmentReveal");
    expect(state.drawPile.length).toBe(drawPileBefore); // nothing drawn until the tap

    // non-interactive (the luoshen-loop path): the reveal decision is never
    // produced — with no judgment-interacting skill in play it resolves fully.
    const gen2 = runJudgment(ctx, "p1");
    const first2 = gen2.next();
    if (!first2.done) {
      expect((first2.value as { kind: string }).kind).not.toBe("judgmentReveal");
    }
  });
});
