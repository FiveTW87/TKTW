import { describe, expect, it } from "vitest";
import { createTutorialController } from "../src/tutorial/tutorialController";
import { ALL_TUTORIAL_LESSONS, tutorialLesson } from "../src/tutorial/tutorialLessons";

describe("advanced tutorial lesson catalog", () => {
  it("keeps all six lessons in one exhaustive teaching order", () => {
    expect(ALL_TUTORIAL_LESSONS.map((lesson) => lesson.id)).toEqual([
      "basic-turn", "basic-dodge", "basic-recovery",
      "advanced-distance", "advanced-tricks", "advanced-roles",
    ]);
    expect(tutorialLesson("advanced-distance").scenario.steps.map((step) => step.expect.kind)).toEqual([
      "draw", "playCard", "playCard", "endPhase",
    ]);
  });

  it("authors Wuxie and identity skill steps against public action vocabulary", () => {
    expect(createTutorialController(tutorialLesson("advanced-tricks").scenario).snapshot).toMatchObject({
      status: "active",
      step: { highlight: { kind: "anchor", anchor: "hand" } },
    });
    expect(tutorialLesson("advanced-roles").scenario.steps.map((step) => step.expect)).toEqual([
      { kind: "draw" },
      { kind: "useSkill", skillId: "sunquan_zhiheng" },
      { kind: "endPhase" },
    ]);
  });
});
