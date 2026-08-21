import { describe, expect, it } from "vitest";
import { DECISION_KINDS } from "@tktw/engine";
import { answerSchema, decisionKindSchema, legalActionViewSchema } from "@tktw/shared";

describe("typed protocol seams", () => {
  it("keeps the engine decision vocabulary and Zod runtime schema in lockstep", () => {
    expect(decisionKindSchema.options).toEqual(DECISION_KINDS);
    for (const kind of DECISION_KINDS) {
      expect(decisionKindSchema.parse(kind)).toBe(kind);
    }
    expect(decisionKindSchema.safeParse("futureUnhandledDecision").success).toBe(false);
  });

  it("brands validated answer IDs without changing their wire values", () => {
    const wire = {
      roomCode: "ABC234",
      matchId: "match-1",
      decisionId: "dec_1",
      clientActionId: "action-1",
      cardIds: ["spade_1_1"],
      targetIds: ["p2"],
      pass: true,
    };

    expect(answerSchema.parse(wire)).toEqual(wire);
  });

  it("rejects empty IDs at the network boundary", () => {
    const result = answerSchema.safeParse({
      roomCode: "ABC234",
      matchId: "",
      decisionId: "",
      clientActionId: "",
      cardIds: [""],
      targetIds: [""],
    });

    expect(result.success).toBe(false);
  });

  it.each([
    { kind: "playCard" },
    { kind: "useSkill" },
    { kind: "endPhase" },
    { kind: "draw" },
    {
      kind: "discard",
      decisionKind: "discardTo",
      selectableCardIds: ["c1"],
      minCards: 1,
      maxCards: 1,
      exactCards: 1,
    },
    {
      kind: "response",
      decisionKind: "respondShan",
      selectableCardIds: ["c1"],
      exactCards: 1,
    },
  ])("parses the $kind legal-action variant", (action) => {
    expect(legalActionViewSchema.parse(action)).toEqual(action);
  });

  it("rejects fields that do not belong to a legal-action variant", () => {
    expect(legalActionViewSchema.safeParse({ kind: "draw", selectableCardIds: ["secret"] }).success).toBe(false);
    expect(legalActionViewSchema.safeParse({ kind: "discard", decisionKind: "discardTo" }).success).toBe(false);
  });
});
