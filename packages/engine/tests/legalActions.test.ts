// Phase 5 (SPEC §9.2) — decision-scoped legalActions and eventStack-derived
// latest/resolving card views.
import { describe, it, expect } from "vitest";
import { legalActionsFor, deriveLatestAndResolvingCard } from "../src/core/legalActions";
import type { GameEvent, PendingDecision } from "../src/types";

describe("legalActionsFor", () => {
  it("returns no actions when nothing is pending", () => {
    expect(legalActionsFor(undefined, "p0")).toEqual([]);
  });

  it("mainAction: high-level choices only, no card/target enumeration", () => {
    const pd: PendingDecision = { id: "d1", kind: "mainAction", playerId: "p0", data: {} };
    expect(legalActionsFor(pd, "p0")).toEqual([
      { kind: "mainAction", choices: ["playCard", "useSkill", "endPhase"] },
    ]);
  });

  it("discardTo: surfaces min/max/exact + selectableCardIds from the decision data", () => {
    const pd: PendingDecision = {
      id: "d2",
      kind: "discardTo",
      playerId: "p0",
      data: { minCards: 2, maxCards: 2, exactCards: 2, selectableCardIds: ["c1", "c2", "c3"] },
    };
    expect(legalActionsFor(pd, "p0")).toEqual([
      {
        kind: "discardTo",
        selectableCardIds: ["c1", "c2", "c3"],
        minCards: 2,
        maxCards: 2,
        exactCards: 2,
      },
    ]);
  });

  it("pickGeneral: candidate options surface as choices for the actual responder", () => {
    const pd: PendingDecision = {
      id: "d3",
      kind: "pickGeneral",
      playerId: "p0",
      data: { options: ["caocao", "liubei"] },
    };
    expect(legalActionsFor(pd, "p0")).toEqual([{ kind: "pickGeneral", choices: ["caocao", "liubei"] }]);
  });

  // Hidden-info safety: legalActions must never leak the ACTOR's private
  // decision data (e.g. discardTo's selectableCardIds IS their own hand) to
  // any other viewer — regardless of whether view.ts's own projectDecision
  // happens to redact that decision kind's `data` or not. Gating on
  // pd.playerId === viewerId inside legalActionsFor makes this true by
  // construction, not by remembering to redact each new decision kind.
  it("a decision that isn't the viewer's own yields no legalActions at all, even with real data", () => {
    const pd: PendingDecision = {
      id: "d4",
      kind: "discardTo",
      playerId: "p1",
      data: { minCards: 2, maxCards: 2, selectableCardIds: ["secret_hand_card"] },
    };
    expect(legalActionsFor(pd, "p0")).toEqual([]);
  });
});

describe("deriveLatestAndResolvingCard", () => {
  function event(id: string, over: Partial<GameEvent> = {}): GameEvent {
    return { id, type: "sha", cancelled: false, data: {}, ...over };
  }

  it("returns nothing when no wuxie window is open", () => {
    expect(deriveLatestAndResolvingCard([])).toEqual({});
  });

  it("a single-event window: latestPlayedCard and resolvingCard are the same event", () => {
    const e = event("evt_1", { source: "p0", targets: ["p1"], cards: ["spade_1_1"] });
    const { latestPlayedCard, resolvingCard } = deriveLatestAndResolvingCard([e]);
    expect(latestPlayedCard).toEqual({
      eventId: "evt_1",
      type: "sha",
      sourceId: "p0",
      cardId: "spade_1_1",
      targetIds: ["p1"],
      cancelled: false,
    });
    expect(resolvingCard).toEqual(latestPlayedCard);
  });

  it("a nested wuxie chain: latestPlayedCard is the outermost, resolvingCard the innermost", () => {
    const outer = event("evt_1", { source: "p0", cards: ["spade_1_1"] });
    const inner = event("evt_2", { type: "wuxie", source: "p1" });
    const { latestPlayedCard, resolvingCard } = deriveLatestAndResolvingCard([outer, inner]);
    expect(latestPlayedCard?.eventId).toBe("evt_1");
    expect(resolvingCard?.eventId).toBe("evt_2");
  });
});
