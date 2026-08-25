import { describe, expect, it } from "vitest";
import { createTutorialController, transitionTutorial } from "../src/tutorial/tutorialController";
import { BASIC_TUTORIAL_LESSONS } from "../src/tutorial/basicLessons";

describe("basic tutorial lesson catalog", () => {
  it("offers the three lessons in teaching order with a playable typed scenario", () => {
    expect(BASIC_TUTORIAL_LESSONS.map((lesson) => lesson.id)).toEqual([
      "basic-turn",
      "basic-dodge",
      "basic-recovery",
    ]);
    expect(BASIC_TUTORIAL_LESSONS.reduce((minutes, lesson) => minutes + lesson.minutes, 0)).toBeLessThanOrEqual(15);

    const first = BASIC_TUTORIAL_LESSONS[0]!;
    expect(createTutorialController(first.scenario).snapshot).toMatchObject({
      status: "active",
      scenarioId: "basic-turn",
      stepCount: 3,
      step: {
        id: "draw",
        prompt: "แตะกองจั่วเพื่อจั่วการ์ด 2 ใบ",
        highlight: { kind: "anchor", anchor: "drawPile" },
      },
    });
  });

  it("requires the authored pass in the damage lesson instead of accepting a dodge", () => {
    const lesson = BASIC_TUTORIAL_LESSONS.find((candidate) => candidate.id === "basic-recovery")!;
    const controller = createTutorialController(lesson.scenario);
    const legalActions = [{ kind: "response", decisionKind: "respondShan" }] as const;

    expect(transitionTutorial(controller, {
      acceptedAnswer: { decisionId: "dodge", cardIds: ["shan-card"] },
      legalActions,
    }).outcome).toEqual({ kind: "retry", stepId: "take-damage" });

    expect(transitionTutorial(controller, {
      acceptedAnswer: { decisionId: "pass", pass: true },
      legalActions,
    }).outcome).toEqual({
      kind: "advanced",
      fromStepId: "take-damage",
      toStepId: "draw-after-damage",
    });
  });
});
