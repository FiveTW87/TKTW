// A rejected/thrown answer must leave `state` byte-identical to how it was
// before the call — P4's server feeds this untrusted client input directly
// and needs to be able to safely re-prompt the same decision after an error
// instead of the room ending up in a corrupted turn state. This file checks
// that contract directly (discardCardsFromHand) and end-to-end through
// respond() for the mutate-before-validate bugs found during the audit.
import { describe, it, expect } from "vitest";
import { createGame } from "../src/index";
import { respond } from "../src/core/decisions";
import { getPlayer, discardCardsFromHand, cardById } from "../src/core/state";
import { forceIntoHand } from "./_testUtils";

describe("discardCardsFromHand is atomic", () => {
  it("discards nothing if any id is a duplicate", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const p = getPlayer(session.state, "p0");
    forceIntoHand(session.state, "p0", "spade_1_1");
    const before = p.hand.map((c) => c.id);
    expect(() => discardCardsFromHand(session.state, "p0", ["spade_1_1", "spade_1_1"])).toThrow();
    expect(p.hand.map((c) => c.id)).toEqual(before);
  });

  it("discards nothing if any id is missing from hand, even when earlier ids are valid", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const p = getPlayer(session.state, "p0");
    forceIntoHand(session.state, "p0", "spade_1_1");
    const before = p.hand.map((c) => c.id);
    expect(() =>
      discardCardsFromHand(session.state, "p0", ["spade_1_1", "not_a_real_card_id"]),
    ).toThrow();
    expect(p.hand.map((c) => c.id)).toEqual(before);
    // the valid id up front didn't get silently discarded before the throw
    expect(p.hand.some((c) => c.id === "spade_1_1")).toBe(true);
  });

  it("discards all ids when the whole batch is valid", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    forceIntoHand(session.state, "p0", "spade_1_1");
    forceIntoHand(session.state, "p0", "heart_1_1");
    discardCardsFromHand(session.state, "p0", ["spade_1_1", "heart_1_1"]);
    const p = getPlayer(session.state, "p0");
    expect(p.hand.some((c) => c.id === "spade_1_1")).toBe(false);
    expect(p.hand.some((c) => c.id === "heart_1_1")).toBe(false);
    expect(session.state.discardPile.some((c) => c.id === "spade_1_1")).toBe(true);
    expect(session.state.discardPile.some((c) => c.id === "heart_1_1")).toBe(true);
  });
});

describe("respond() leaves state and decisionLog untouched on a rejected answer", () => {
  it("playing a card that isn't in hand throws and changes nothing", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const pending = session.state.pendingDecision!;
    const before = structuredClone(session.state);

    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: pending.playerId,
        choice: "playCard",
        cardIds: ["not_a_real_card_id"],
        targetIds: [],
      }),
    ).toThrow();

    expect(session.state).toEqual(before);
    expect(session.state.pendingDecision).toEqual(pending);
    expect(session.decisionLog).toEqual([]);
  });

  it("submitting 2 non-zhangba cards to playCard throws and changes nothing", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const pending = session.state.pendingDecision!;
    const activeId = pending.playerId;
    forceIntoHand(session.state, activeId, "spade_1_1");
    forceIntoHand(session.state, activeId, "heart_1_1");
    const before = structuredClone(session.state);

    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: activeId,
        choice: "playCard",
        cardIds: ["spade_1_1", "heart_1_1"],
        targetIds: [],
      }),
    ).toThrow();

    expect(session.state).toEqual(before);
    expect(session.decisionLog).toEqual([]);
  });

  it("ทวนงูจั้งปา substitute with a duplicated card id throws before shaUsedThisTurn is bumped", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const pending = session.state.pendingDecision!;
    const activeId = pending.playerId;
    const p = getPlayer(session.state, activeId);
    p.equipment.weapon = cardById("spade_12_1"); // zhangba
    forceIntoHand(session.state, activeId, "heart_1_1");
    const targetId = session.state.players.find((x) => x.id !== activeId)!.id;
    const before = structuredClone(session.state);

    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: activeId,
        choice: "playCard",
        cardIds: ["heart_1_1", "heart_1_1"],
        targetIds: [targetId],
      }),
    ).toThrow();

    expect(session.state).toEqual(before);
    expect(getPlayer(session.state, activeId).shaUsedThisTurn).toBe(0);
    expect(session.decisionLog).toEqual([]);
  });

  it("a rejected answer doesn't consume the pending decision — a valid retry on the same id still works", () => {
    const session = createGame({ playerCount: 4, seed: 1 });
    const pending = session.state.pendingDecision!;

    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: pending.playerId,
        choice: "playCard",
        cardIds: ["not_a_real_card_id"],
        targetIds: [],
      }),
    ).toThrow();

    // retry with a legal answer on the exact same decision id
    expect(() =>
      respond(session, { decisionId: pending.id, playerId: pending.playerId, choice: "endPhase" }),
    ).not.toThrow();

    expect(session.decisionLog).toHaveLength(1);
    expect(session.decisionLog[0]!.decisionId).toBe(pending.id);
  });
});
