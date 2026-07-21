import { describe, it, expect } from "vitest";
import "../../src/generals/index";
import "../../src/equipment/index";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { assignGeneral } from "../../src/core/generalAssign";
import { getPlayer } from "../../src/core/state";
import { dealDamage } from "../../src/core/damage";
import { fireTrigger } from "../../src/core/triggers";

// ENG-006 / OD-006 — โจโฉ's พลิกภัยเป็นกล (jianxiong) must trigger ONLY when
// โจโฉ himself is damaged, never when a same-faction ally (or anyone) is.
// Its OnDamaged handler already guards ownerId===targetId; the fix is that
// fireTrigger no longer even PROMPTS โจโฉ for an event that isn't his.

type Ask = { kind: string; playerId: string; skillId?: string | undefined };

/** Deal 1 damage (the source card sits in the discard pile as a real สังหาร
 *  would) and record every decision the resolution asks for. `accept` opts
 *  into the jianxiong prompt; otherwise everything is passed. */
function damageAndCollect(
  seed: number,
  generals: Record<string, string>,
  sourceId: string,
  targetId: string,
  accept = false,
) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount: 3, seed }, rng);
  for (const [pid, gen] of Object.entries(generals)) assignGeneral(state, pid, gen, pid === "p0");
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

  // The damaging card must be in the discard pile for jianxiong to recover it.
  const card = getPlayer(state, sourceId).hand.shift()!;
  state.discardPile.push(card);

  const asks: Ask[] = [];
  const gen = dealDamage(ctx, sourceId, targetId, 1, card.id);
  let r = gen.next();
  while (!r.done) {
    const d = r.value as { kind: string; playerId: string; data?: { skillId?: string } };
    asks.push({ kind: d.kind, playerId: d.playerId, skillId: d.data?.skillId });
    const takeIt = accept && d.data?.skillId === "caocao_jianxiong";
    r = gen.next({ decisionId: "x", playerId: d.playerId, ...(takeIt ? {} : { pass: true }) });
  }
  return { state, asks, cardId: card.id };
}

const jianxiongAsked = (asks: Ask[]) => asks.some((a) => a.skillId === "caocao_jianxiong");

describe("ENG-006 โจโฉ jianxiong owner-scope", () => {
  it("does NOT trigger/prompt when a same-faction ally is damaged", () => {
    const { asks } = damageAndCollect(601, { p0: "sunquan", p1: "caocao", p2: "zhangliao" }, "p0", "p2");
    expect(jianxiongAsked(asks)).toBe(false);
  });

  it("does NOT trigger when an enemy (other faction) is damaged", () => {
    const { asks } = damageAndCollect(602, { p0: "sunquan", p1: "caocao", p2: "liubei" }, "p0", "p2");
    expect(jianxiongAsked(asks)).toBe(false);
  });

  it("DOES prompt when โจโฉ himself is damaged, and he keeps the source card", () => {
    const { state, asks, cardId } = damageAndCollect(603, { p0: "sunquan", p1: "caocao", p2: "sunquan" }, "p0", "p1", true);
    expect(jianxiongAsked(asks)).toBe(true);
    expect(getPlayer(state, "p1").hand.some((c) => c.id === cardId)).toBe(true);
  });

  it("does NOT trigger when โจโฉ is already dead", () => {
    const rng = createRng(604);
    const state = createInitialState({ playerCount: 3, seed: 604 }, rng);
    assignGeneral(state, "p1", "caocao", false);
    getPlayer(state, "p1").alive = false; // โจโฉ is out
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const asks: Ask[] = [];
    const gen = fireTrigger(ctx, "OnDamaged", { sourceId: "p0", targetId: "p2", amount: 1 });
    let r = gen.next();
    while (!r.done) {
      const d = r.value as { kind: string; playerId: string; data?: { skillId?: string } };
      asks.push({ kind: d.kind, playerId: d.playerId, skillId: d.data?.skillId });
      r = gen.next({ decisionId: "x", playerId: d.playerId, pass: true });
    }
    expect(jianxiongAsked(asks)).toBe(false);
  });
});
