import { describe, expect, it } from "vitest";
import {
  createTutorialController,
  resetTutorial,
  transitionTutorial,
  TutorialScenarioError,
  TutorialScriptError,
  type TutorialObservation,
} from "../src/tutorial/tutorialController";

describe("tutorial scenario controller", () => {
  it("starts a valid scenario at its first typed prompt and semantic highlight", () => {
    const controller = createTutorialController({
      id: "basic-actions",
      version: 1,
      title: "พื้นฐานการเล่น",
      steps: [
        {
          id: "draw-first-card",
          prompt: "แตะกองจั่วเพื่อจั่วการ์ด",
          highlight: { kind: "anchor", anchor: "drawPile" },
          expect: { kind: "draw" },
        },
      ],
    });

    expect(controller.snapshot).toEqual({
      status: "active",
      scenarioId: "basic-actions",
      scenarioVersion: 1,
      title: "พื้นฐานการเล่น",
      stepIndex: 0,
      stepCount: 1,
      step: {
        id: "draw-first-card",
        prompt: "แตะกองจั่วเพื่อจั่วการ์ด",
        highlight: { kind: "anchor", anchor: "drawPile" },
      },
    });
  });

  it("advances only after the submitted answer matches a real projected legal action", () => {
    const controller = createTutorialController({
      id: "basic-actions",
      version: 1,
      title: "พื้นฐานการเล่น",
      steps: [
        {
          id: "draw",
          prompt: "จั่วการ์ด",
          highlight: { kind: "anchor", anchor: "drawPile" },
          expect: { kind: "draw" },
        },
        {
          id: "finish",
          prompt: "จบเฟส",
          highlight: { kind: "anchor", anchor: "endPhase" },
          expect: { kind: "endPhase" },
        },
      ],
    });

    const transition = transitionTutorial(controller, {
      acceptedAnswer: { decisionId: "decision-draw", choice: "draw" },
      legalActions: [{ kind: "draw" }],
    });

    expect(transition.outcome).toEqual({ kind: "advanced", fromStepId: "draw", toStepId: "finish" });
    expect(transition.controller.snapshot).toMatchObject({ status: "active", stepIndex: 1, step: { id: "finish" } });
    expect(controller.snapshot).toMatchObject({ status: "active", stepIndex: 0, step: { id: "draw" } });
  });

  it("keeps the current step when the player submits a different legal action", () => {
    const controller = createTutorialController({
      id: "attack",
      version: 1,
      title: "โจมตี",
      steps: [{
        id: "play-sha",
        prompt: "ใช้สังหาร",
        highlight: { kind: "anchor", anchor: "hand" },
        expect: { kind: "playCard", typeKey: "sha" },
      }],
    });
    const transition = transitionTutorial(controller, {
      acceptedAnswer: { decisionId: "decision-play", choice: "playCard", cardIds: ["tao-card"], targetIds: [] },
      legalActions: [{
        kind: "playCard",
        options: [
          {
            source: "literal",
            typeKey: "sha",
            selectableCardIds: ["sha-card"],
            minCards: 1,
            maxCards: 1,
            exactCards: 1,
            targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: ["opponent"] },
            available: true,
          },
          {
            source: "literal",
            typeKey: "tao",
            selectableCardIds: ["tao-card"],
            minCards: 1,
            maxCards: 1,
            exactCards: 1,
            targeting: { kind: "none", minTargets: 0, maxTargets: 0 },
            available: true,
          },
        ],
      }],
    });

    expect(transition.outcome).toEqual({ kind: "retry", stepId: "play-sha" });
    expect(transition.controller).toBe(controller);
  });

  it("completes, resumes only a valid boundary, and resets to the first step", () => {
    const scenario = {
      id: "one-step",
      version: 2,
      title: "หนึ่งขั้น",
      steps: [{
        id: "finish",
        prompt: "จบเฟส",
        highlight: { kind: "anchor", anchor: "endPhase" },
        expect: { kind: "endPhase" },
      }],
    };
    const completed = transitionTutorial(createTutorialController(scenario), {
      acceptedAnswer: { decisionId: "decision-end", choice: "endPhase" },
      legalActions: [{ kind: "endPhase" }],
    }).controller;

    expect(completed.snapshot).toEqual({
      status: "completed",
      scenarioId: "one-step",
      scenarioVersion: 2,
      title: "หนึ่งขั้น",
      stepCount: 1,
    });
    expect(transitionTutorial(completed, {
      acceptedAnswer: { decisionId: "late", choice: "endPhase" },
      legalActions: [{ kind: "endPhase" }],
    })).toEqual({ controller: completed, outcome: { kind: "unchanged", reason: "completed" } });

    const resumed = createTutorialController(scenario, JSON.parse(JSON.stringify(completed.progress)));
    expect(resumed.snapshot.status).toBe("completed");
    expect(resetTutorial(resumed).snapshot).toMatchObject({ status: "active", stepIndex: 0, step: { id: "finish" } });

    const invalidResume = createTutorialController(scenario, { ...completed.progress, scenarioVersion: 1, stepIndex: 99 });
    expect(invalidResume.snapshot).toMatchObject({ status: "active", stepIndex: 0 });
  });

  it("fails loudly when a scripted expectation is absent from authoritative legal actions", () => {
    const controller = createTutorialController({
      id: "missing-action",
      version: 1,
      title: "ผิดสคริปต์",
      steps: [{
        id: "use-skill",
        prompt: "ใช้สกิล",
        highlight: { kind: "anchor", anchor: "skills" },
        expect: { kind: "useSkill", skillId: "caocao_jianxiong" },
      }],
    });

    expect(() => transitionTutorial(controller, {
      acceptedAnswer: { decisionId: "decision", choice: "endPhase" },
      legalActions: [{ kind: "endPhase" }],
    })).toThrowError(new TutorialScriptError(
      "Tutorial step 'use-skill' expects 'useSkill', but that action is not available in the projected legal actions.",
    ));
  });

  it("rejects malformed scenario content before a tutorial can start", () => {
    expect(() => createTutorialController({ id: "empty", version: 1, title: "Empty", steps: [] }))
      .toThrowError(TutorialScenarioError);
    expect(() => createTutorialController({
      id: "duplicate",
      version: 1,
      title: "Duplicate",
      steps: [
        { id: "same", prompt: "One", highlight: { kind: "anchor", anchor: "hand" }, expect: { kind: "draw" } },
        { id: "same", prompt: "Two", highlight: { kind: "anchor", anchor: "hand" }, expect: { kind: "endPhase" } },
      ],
    })).toThrowError("Duplicate tutorial step id 'same'.");
    expect(() => createTutorialController({
      id: "bad-anchor",
      version: 1,
      title: "Bad anchor",
      steps: [{ id: "bad", prompt: "Bad", highlight: { kind: "anchor", anchor: "secretHand" }, expect: { kind: "draw" } }],
    })).toThrowError("Step 'bad' has an invalid highlight.");
    expect(() => createTutorialController({
      id: "bad-response",
      version: 1,
      title: "Bad response",
      steps: [{
        id: "bad",
        prompt: "Bad",
        highlight: { kind: "anchor", anchor: "hand" },
        expect: { kind: "response", decisionKind: "mainAction" },
      }],
    })).toThrowError("Step 'bad' has an invalid response decision kind 'mainAction'.");
    expect(() => createTutorialController({
      id: "extra-field",
      version: 1,
      title: "Extra",
      privateHand: ["secret"],
      steps: [{ id: "draw", prompt: "Draw", highlight: { kind: "anchor", anchor: "drawPile" }, expect: { kind: "draw" } }],
    })).toThrowError("Scenario has invalid fields; unexpected: privateHand.");
  });

  it("keeps observations and public snapshots narrower than private game state", () => {
    const observation: TutorialObservation = {
      acceptedAnswer: { decisionId: "draw", choice: "draw" },
      legalActions: [{ kind: "draw" }],
      // @ts-expect-error Tutorial observations must not accept players, roles, or hands.
      players: [{ role: "rebel", hand: ["secret-card"] }],
    };
    expect(observation.legalActions).toEqual([{ kind: "draw" }]);

    const snapshot = createTutorialController({
      id: "private-safe",
      version: 1,
      title: "Safe",
      steps: [{ id: "draw", prompt: "Draw", highlight: { kind: "anchor", anchor: "drawPile" }, expect: { kind: "draw" } }],
    }).snapshot;
    // @ts-expect-error Public tutorial snapshots deliberately expose no players or private roles.
    expect(snapshot.players).toBeUndefined();
  });

  it("matches every supported teaching action through the public legal-action contract", () => {
    const cases: Array<{ expect: unknown; observation: TutorialObservation }> = [
      {
        expect: { kind: "playCard", typeKey: "sha", source: "conversion" },
        observation: {
          acceptedAnswer: { decisionId: "play", choice: "playCard", cardIds: ["red-card"], targetIds: ["enemy"], asType: "sha" },
          legalActions: [{ kind: "playCard", options: [{
            source: "conversion",
            typeKey: "sha",
            selectableCardIds: ["red-card"],
            minCards: 1,
            maxCards: 1,
            exactCards: 1,
            asType: "sha",
            targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: ["enemy"] },
            available: true,
          }] }],
        },
      },
      {
        expect: { kind: "useSkill", skillId: "zhouyu_fanjian" },
        observation: {
          acceptedAnswer: { decisionId: "skill", choice: "useSkill", skillId: "zhouyu_fanjian", cardIds: ["card"], targetIds: ["enemy"] },
          legalActions: [{ kind: "useSkill", options: [{
            skillId: "zhouyu_fanjian",
            selectableCardIds: ["card"],
            minCards: 1,
            maxCards: 1,
            exactCards: 1,
            usesThisTurn: 0,
            maxUsesPerTurn: 1,
            targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: ["enemy"] },
            available: true,
          }] }],
        },
      },
      {
        expect: { kind: "response", decisionKind: "askWuxie" },
        observation: {
          acceptedAnswer: { decisionId: "response", pass: true },
          legalActions: [{ kind: "response", decisionKind: "askWuxie", choices: ["wuxie", "pass"] }],
        },
      },
      {
        expect: { kind: "discard", minimumCards: 2 },
        observation: {
          acceptedAnswer: { decisionId: "discard", cardIds: ["one", "two"] },
          legalActions: [{
            kind: "discard",
            decisionKind: "discardTo",
            selectableCardIds: ["one", "two", "three"],
            minCards: 2,
            maxCards: 2,
            exactCards: 2,
          }],
        },
      },
    ];

    for (const [index, entry] of cases.entries()) {
      const controller = createTutorialController({
        id: `action-${index}`,
        version: 1,
        title: "Action",
        steps: [{
          id: "act",
          prompt: "Act",
          highlight: { kind: "anchor", anchor: "hand" },
          expect: entry.expect,
        }],
      });
      expect(transitionTutorial(controller, entry.observation).outcome).toEqual({ kind: "completed", stepId: "act" });
    }
  });
});
