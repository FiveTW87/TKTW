import { describe, it, expect } from "vitest";
import "../../src/equipment/index";
import "../../src/generals/index";
import type { GameState } from "../../src/types";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { runGame } from "../../src/core/turnLoop";
import { createSession, respond, type GameSession } from "../../src/core/decisions";
import { getPlayer, cardById } from "../../src/core/state";

const SHANDIAN = "spade_9_2"; // the only สายฟ้า in the deck
const SPADE_HIT = "spade_7_1"; // spade 7 → in the 2-9 hit window
const NON_SPADE = "heart_3_1"; // heart → miss
const WUXIE = "club_13_1"; // a ไร้ช่องโหว่ (verified below)

/** Strip a card id from everywhere it might already sit, so we can hand-place
 *  a single copy without breaking the deck's one-of-each invariant. */
function strip(state: GameState, cardId: string): void {
  for (const p of state.players) {
    p.hand = p.hand.filter((c) => c.id !== cardId);
    p.judgmentZone = p.judgmentZone.filter((c) => c.id !== cardId);
    p.equipment = Object.fromEntries(
      Object.entries(p.equipment).filter(([, c]) => c?.id !== cardId),
    );
  }
  state.drawPile = state.drawPile.filter((c) => c.id !== cardId);
  state.discardPile = state.discardPile.filter((c) => c.id !== cardId);
}

function placeInJudgmentZone(state: GameState, playerId: string, cardId: string): void {
  strip(state, cardId);
  getPlayer(state, playerId).judgmentZone.push(cardById(cardId));
}

/** popCard() pops from the END of drawPile, so the judgment flips this card. */
function planNextJudgment(state: GameState, cardId: string): void {
  strip(state, cardId);
  state.drawPile.push(cardById(cardId));
}

function setup(seed: number) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount: 3, seed }, rng);
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  return { state, ctx, rng };
}

/** Drive the session forward, passing on every reactive decision and ending
 *  main/discard phases, until `stop` holds or we run out of steps. Returns
 *  without throwing so a crash surfaces as the test failure it is. */
function driveUntil(session: GameSession, stop: (s: GameState) => boolean, maxSteps = 200): void {
  let steps = 0;
  while (session.state.pendingDecision && !stop(session.state)) {
    if (steps++ > maxSteps) throw new Error("shandian test did not settle in time");
    const pd = session.state.pendingDecision;
    const p = session.state.players.find((x) => x.id === pd.playerId);
    if (pd.kind === "mainAction") {
      respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "endPhase" });
    } else if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") {
      const data = pd.data as { mustDiscard?: number; count?: number };
      const need = Number(data.mustDiscard ?? data.count ?? 0);
      const ids = (p?.hand ?? []).slice(0, need).map((c) => c.id);
      respond(session, { decisionId: pd.id, playerId: pd.playerId, cardIds: ids });
    } else {
      respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
    }
  }
}

describe("สายฟ้า (shandian) resolution", () => {
  it("HIT: spade 2-9 deals 3 damage and the สายฟ้า card is discarded", () => {
    const { state, ctx } = setup(101);
    const p0 = getPlayer(state, "p0");
    p0.hp = p0.maxHp; // full, so it survives 3 dmg and we can read the drop cleanly
    placeInJudgmentZone(state, "p0", SHANDIAN);
    planNextJudgment(state, SPADE_HIT);
    const before = p0.hp;

    const session = createSession(runGame(ctx), state, ctx.rng);
    driveUntil(session, (s) => getPlayer(s, "p0").hp < before || s.finished);

    expect(getPlayer(state, "p0").hp).toBe(before - 3);
    expect(state.discardPile.some((c) => c.id === SHANDIAN)).toBe(true);
    expect(state.players.every((p) => !p.judgmentZone.some((c) => c.id === SHANDIAN))).toBe(true);
  });

  it("MISS: a non-spade judgment forwards สายฟ้า to the next player's zone", () => {
    const { state, ctx } = setup(202);
    placeInJudgmentZone(state, "p0", SHANDIAN);
    planNextJudgment(state, NON_SPADE);

    const session = createSession(runGame(ctx), state, ctx.rng);
    // Stop as soon as it lands in p1's zone — before p1's own turn resolves it.
    driveUntil(session, (s) => getPlayer(s, "p1").judgmentZone.some((c) => c.id === SHANDIAN) || s.finished);

    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(true);
    expect(getPlayer(state, "p0").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(false);
  });

  it("WUXIE-CANCEL: ไร้ช่องโหว่ forwards สายฟ้า instead of destroying it (house rule)", () => {
    const { state, ctx } = setup(303);
    expect(cardById(WUXIE).typeKey).toBe("wuxie"); // guard the fixture id
    placeInJudgmentZone(state, "p0", SHANDIAN);
    strip(state, WUXIE);
    getPlayer(state, "p1").hand.push(cardById(WUXIE));

    const session = createSession(runGame(ctx), state, ctx.rng);
    let steps = 0;
    while (session.state.pendingDecision) {
      if (steps++ > 200) throw new Error("did not settle");
      const pd = session.state.pendingDecision;
      // p1 counters the สายฟ้า with ไร้ช่องโหว่ at the wuxie window.
      if (pd.kind === "askWuxie" && pd.playerId === "p1" && getPlayer(session.state, "p1").hand.some((c) => c.id === WUXIE)) {
        respond(session, { decisionId: pd.id, playerId: "p1", cardIds: [WUXIE] });
      } else if (pd.kind === "mainAction") {
        respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "endPhase" });
      } else if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") {
        const data = pd.data as { mustDiscard?: number; count?: number };
        const need = Number(data.mustDiscard ?? data.count ?? 0);
        const p = session.state.players.find((x) => x.id === pd.playerId);
        respond(session, { decisionId: pd.id, playerId: pd.playerId, cardIds: (p?.hand ?? []).slice(0, need).map((c) => c.id) });
      } else {
        respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
      }
      // cancelled → forwarded to p1, and p0 took no damage from it.
      if (getPlayer(session.state, "p1").judgmentZone.some((c) => c.id === SHANDIAN)) break;
    }

    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(true);
  });

  it("plays with NO target (self-placed) — the client sends no targetIds", () => {
    // Regression: engine cardData used targetRule 'single' while the client
    // (correctly) sends no target for the self-placed สายฟ้า → "needs exactly 1
    // living target". It must self-place with an empty targetIds.
    const { state, ctx } = setup(202);
    strip(state, SHANDIAN);
    getPlayer(state, "p0").hand.push(cardById(SHANDIAN));
    const session = createSession(runGame(ctx), state, ctx.rng);
    // advance to p0's mainAction (past the draw gate)
    let steps = 0;
    while (session.state.pendingDecision && session.state.pendingDecision.kind !== "mainAction") {
      if (steps++ > 40) break;
      const pd = session.state.pendingDecision;
      respond(session, { decisionId: pd.id, playerId: pd.playerId, ...(pd.kind === "drawCard" ? { choice: "draw" } : { pass: true }) });
    }
    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");
    expect(() =>
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [SHANDIAN], targetIds: [] }),
    ).not.toThrow();
    expect(getPlayer(state, "p0").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(true);
  });

  // ENG-005 — edge cases around a dead target.
  it("target death: the holder dying to the 3 damage discards สายฟ้า (no forward)", () => {
    const { state, ctx } = setup(404);
    getPlayer(state, "p0").hp = 3; // exactly lethal
    placeInJudgmentZone(state, "p0", SHANDIAN);
    planNextJudgment(state, SPADE_HIT); // spade → hit → 3 damage
    const session = createSession(runGame(ctx), state, ctx.rng);
    driveUntil(session, (s) => !getPlayer(s, "p0").alive || s.finished);

    expect(getPlayer(state, "p0").alive).toBe(false); // died to สายฟ้า
    expect(state.discardPile.some((c) => c.id === SHANDIAN)).toBe(true); // it hit → discarded
    expect(state.players.every((p) => !p.judgmentZone.some((c) => c.id === SHANDIAN))).toBe(true); // not forwarded
  });

  it("forwards past a DEAD player to the next living one on a miss", () => {
    const { state, ctx } = setup(505);
    getPlayer(state, "p1").alive = false; // p1 is out — must be skipped
    placeInJudgmentZone(state, "p0", SHANDIAN);
    planNextJudgment(state, NON_SPADE); // heart → miss → forward
    const session = createSession(runGame(ctx), state, ctx.rng);
    driveUntil(session, (s) => getPlayer(s, "p2").judgmentZone.some((c) => c.id === SHANDIAN) || s.finished);

    expect(getPlayer(state, "p2").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(true); // skipped dead p1
    expect(getPlayer(state, "p1").judgmentZone.some((c) => c.id === SHANDIAN)).toBe(false);
  });
});
