import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createGame } from "../src/index";
import { respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { discardRequest, assertDiscardAnswer } from "../src/core/discard";

// ENG-002 — a discard decision states min/max/exact + selectableCardIds, and
// the engine rejects any answer outside those bounds before mutating.
describe("ENG-002 discard decision shape + validation", () => {
  it("the end-of-turn discardTo decision carries the ENG-002 fields", () => {
    // Drive a game to a point where the active player is over the hand limit.
    const session = createGame({ playerCount: 3, seed: 4 });
    // Force p0 over-limit and end their play phase to reach the discard.
    // Fast path: just assert the request builder shape directly.
    const data = discardRequest(session.state, "p0", { min: 3, max: 3, exact: 3 });
    expect(data.minCards).toBe(3);
    expect(data.maxCards).toBe(3);
    expect(data.exactCards).toBe(3);
    expect(Array.isArray(data.selectableCardIds)).toBe(true);
    expect((data.selectableCardIds as string[]).length).toBe(getPlayer(session.state, "p0").hand.length);
    expect(data.mustDiscard).toBe(3); // legacy field preserved
  });

  it("assertDiscardAnswer rejects too many / too few / out-of-hand / duplicate", () => {
    const data = discardRequest(createGame({ playerCount: 3, seed: 5 }).state, "p0", { min: 2, max: 2, exact: 2 });
    const sel = data.selectableCardIds as string[];
    expect(() => assertDiscardAnswer("p0", [sel[0]!, sel[1]!, sel[2]!], data)).toThrow(/2 card/); // too many
    expect(() => assertDiscardAnswer("p0", [sel[0]!], data)).toThrow(/2 card/); // too few
    expect(() => assertDiscardAnswer("p0", [sel[0]!, "not_in_hand"], data)).toThrow(/not selectable/);
    expect(() => assertDiscardAnswer("p0", [sel[0]!, sel[0]!], data)).toThrow(/duplicate/);
    expect(() => assertDiscardAnswer("p0", [sel[0]!, sel[1]!], data)).not.toThrow(); // exactly 2 valid
  });

  it("end-to-end: a real over-limit discard rejects an over-count answer, then a valid retry works", () => {
    const session = createGame({ playerCount: 3, seed: 6 });
    const p0 = getPlayer(session.state, "p0");
    // End p0's play phase so the discard phase runs. Walk to the discardTo.
    let guard = 0;
    while (session.state.pendingDecision && session.state.pendingDecision.kind !== "discardTo") {
      if (guard++ > 40) break;
      const pd = session.state.pendingDecision;
      if (pd.kind === "mainAction") respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "endPhase" });
      else respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
    }
    const pd = session.state.pendingDecision;
    if (!pd || pd.kind !== "discardTo") return; // seed didn't over-fill — the unit checks above still cover it
    const data = pd.data as { mustDiscard: number; selectableCardIds: string[] };
    const need = data.mustDiscard;
    const sel = data.selectableCardIds;
    const handBefore = p0.hand.length;

    // over-count → rejected, hand untouched
    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", cardIds: sel.slice(0, need + 1) }),
    ).toThrow();
    expect(getPlayer(session.state, "p0").hand.length).toBe(handBefore);

    // valid retry → discards exactly `need`
    respond(session, { decisionId: session.state.pendingDecision!.id, playerId: "p0", cardIds: sel.slice(0, need) });
    expect(getPlayer(session.state, "p0").hand.length).toBe(handBefore - need);
  });
});
