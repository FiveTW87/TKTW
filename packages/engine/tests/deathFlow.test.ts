import { describe, it, expect } from "vitest";
import "../src/generals/index";
import "../src/equipment/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { getPlayer, cardById } from "../src/core/state";
import { dealDamage, loseHp, killPlayer } from "../src/core/damage";

function game(seed: number, playerCount = 3) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount, seed }, rng);
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  return { state, ctx };
}

/** Run a generator to completion, always declining (so a dying player dies). */
function runDeclining(gen: Generator<{ playerId: string }, void, unknown>) {
  let r = gen.next();
  while (!r.done) r = gen.next({ decisionId: "x", playerId: r.value.playerId, pass: true });
}

describe("ENG-008 death flow", () => {
  it("death discards hand, equipment AND delayed tricks, and reveals the role", () => {
    const { state, ctx } = game(801);
    const p1 = getPlayer(state, "p1");
    p1.hp = 1;
    p1.hand = [cardById("spade_7_1")];
    p1.equipment.weapon = cardById("spade_1_1"); // crossbow
    p1.judgmentZone = [cardById("spade_9_2")]; // a สายฟ้า in the zone

    runDeclining(dealDamage(ctx, "p0", "p1", 1) as Generator<{ playerId: string }, void, unknown>);

    expect(p1.alive).toBe(false);
    expect(p1.roleRevealed).toBe(true);
    expect(p1.hand.length).toBe(0);
    expect(Object.keys(p1.equipment).length).toBe(0);
    expect(p1.judgmentZone.length).toBe(0);
    // every one of those cards ended up in the discard pile
    for (const id of ["spade_7_1", "spade_1_1", "spade_9_2"]) {
      expect(state.discardPile.some((c) => c.id === id)).toBe(true);
    }
  });

  it("the seat is not moved when a player dies", () => {
    const { state, ctx } = game(802);
    const seatBefore = getPlayer(state, "p1").seat;
    getPlayer(state, "p1").hp = 1;
    runDeclining(dealDamage(ctx, "p0", "p1", 1) as Generator<{ playerId: string }, void, unknown>);
    expect(getPlayer(state, "p1").seat).toBe(seatBefore);
  });

  it("death happens exactly once — a re-entrant kill / HP loss on a corpse is a no-op", () => {
    const { state, ctx } = game(803);
    const p1 = getPlayer(state, "p1");
    p1.hp = 1;
    runDeclining(dealDamage(ctx, "p0", "p1", 1) as Generator<{ playerId: string }, void, unknown>);
    expect(p1.alive).toBe(false);
    const discardCountAfterDeath = state.discardPile.length;

    // further damage / hp loss / a direct kill must not re-run death effects
    runDeclining(dealDamage(ctx, "p0", "p1", 5) as Generator<{ playerId: string }, void, unknown>);
    runDeclining(loseHp(ctx, "p1", 5) as Generator<{ playerId: string }, void, unknown>);
    runDeclining(killPlayer(ctx, "p1", "p0") as Generator<{ playerId: string }, void, unknown>);
    expect(state.discardPile.length).toBe(discardCountAfterDeath); // nothing changed
  });

  it("dying is saved when someone plays ท้อ", () => {
    const { state, ctx } = game(804);
    getPlayer(state, "p1").hp = 1;
    const p2 = getPlayer(state, "p2");
    p2.hand = [cardById("heart_3_1")]; // a ท้อ

    const gen = dealDamage(ctx, "p0", "p1", 1) as Generator<{ kind: string; playerId: string }, void, unknown>;
    let r = gen.next();
    while (!r.done) {
      const d = r.value;
      if (d.kind === "respondTao" && d.playerId === "p2") {
        r = gen.next({ decisionId: "x", playerId: "p2", cardIds: ["heart_3_1"] });
      } else {
        r = gen.next({ decisionId: "x", playerId: d.playerId, pass: true });
      }
    }
    expect(getPlayer(state, "p1").alive).toBe(true);
    expect(getPlayer(state, "p1").hp).toBe(1);
  });
});
