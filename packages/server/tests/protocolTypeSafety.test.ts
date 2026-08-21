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
    { kind: "playCard", options: [] },
    { kind: "useSkill", options: [] },
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

  it("parses available and unavailable card-play options as a strict union", () => {
    const action = {
      kind: "playCard",
      options: [
        {
          source: "literal",
          typeKey: "sha",
          selectableCardIds: ["spade_7_1"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          targeting: {
            kind: "independent",
            minTargets: 1,
            maxTargets: 1,
            eligibleTargetIds: ["p2"],
          },
          available: true,
        },
        {
          source: "conversion",
          typeKey: "tao",
          asType: "tao",
          selectableCardIds: ["heart_2_1"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          targeting: {
            kind: "independent",
            minTargets: 1,
            maxTargets: 1,
            eligibleTargetIds: [],
          },
          available: false,
          unavailableReason: "conversion_wrong_context",
        },
      ],
    } as const;

    expect(legalActionViewSchema.parse(action)).toEqual(action);
    expect(
      legalActionViewSchema.safeParse({
        kind: "playCard",
        options: [{ ...action.options[0], unavailableReason: "sha_usage_limit" }],
      }).success,
    ).toBe(false);
    expect(
      legalActionViewSchema.safeParse({
        kind: "playCard",
        options: [{ ...action.options[1], unavailableReason: undefined }],
      }).success,
    ).toBe(false);
  });

  it.each([
    { kind: "none", minTargets: 0, maxTargets: 0 },
    { kind: "fixed", minTargets: 0, maxTargets: 0, targetIds: ["p0", "p1"] },
    {
      kind: "independent",
      minTargets: 1,
      maxTargets: 3,
      eligibleTargetIds: ["p1", "p2", "p3"],
    },
    {
      kind: "dependent",
      minTargets: 2,
      maxTargets: 2,
      firstTargetIds: ["p1"],
      secondTargetIdsByFirst: { p1: ["p2"] },
    },
  ])("parses the $kind card-targeting variant", (targeting) => {
    const action = {
      kind: "playCard",
      options: [
        {
          source: "literal",
          typeKey: "sha",
          selectableCardIds: ["spade_7_1"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          available: true,
          targeting,
        },
      ],
    };
    expect(legalActionViewSchema.parse(action)).toEqual(action);
  });

  it("rejects target fields that belong to another targeting variant", () => {
    const malformed = {
      kind: "playCard",
      options: [
        {
          source: "literal",
          typeKey: "sha",
          selectableCardIds: ["spade_7_1"],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          available: true,
          targeting: {
            kind: "none",
            minTargets: 0,
            maxTargets: 0,
            eligibleTargetIds: ["p1"],
          },
        },
      ],
    };
    expect(legalActionViewSchema.safeParse(malformed).success).toBe(false);
  });

  it("parses strict available and unavailable active-skill options", () => {
    const available = {
      skillId: "diaochan_lijian",
      selectableCardIds: ["heart_1_2"],
      minCards: 1,
      maxCards: 1,
      exactCards: 1,
      usesThisTurn: 0,
      maxUsesPerTurn: 1,
      targeting: {
        kind: "independent",
        minTargets: 2,
        maxTargets: 2,
        eligibleTargetIds: ["p1", "p2"],
      },
      available: true,
    } as const;
    const unavailable = {
      ...available,
      available: false,
      unavailableReason: "usage_limit",
      usesThisTurn: 1,
    } as const;

    expect(legalActionViewSchema.parse({ kind: "useSkill", options: [available, unavailable] })).toEqual({
      kind: "useSkill",
      options: [available, unavailable],
    });
    expect(
      legalActionViewSchema.safeParse({
        kind: "useSkill",
        options: [{ ...available, unavailableReason: "usage_limit" }],
      }).success,
    ).toBe(false);
  });
});
