import { describe, expect, it } from "vitest";
import { createTutorialGame, legalActionsFor, respond, tutorialBotAnswer } from "../src";

describe("basic tutorial scenarios", () => {
  it("starts the first-turn lesson at a real draw decision with a guaranteed legal Sha afterward", () => {
    const tutorial = createTutorialGame("basic-turn");
    const pending = tutorial.session.state.pendingDecision;

    expect(tutorial.humanPlayerId).toBe("p0");
    expect(pending).toMatchObject({ kind: "drawCard", playerId: "p0" });
    expect(legalActionsFor(pending, tutorial.humanPlayerId, tutorial.session.state)).toEqual([{ kind: "draw" }]);

    respond(tutorial.session, {
      decisionId: pending!.id,
      playerId: tutorial.humanPlayerId,
      choice: "draw",
    });

    const mainAction = tutorial.session.state.pendingDecision;
    const sha = legalActionsFor(mainAction, tutorial.humanPlayerId, tutorial.session.state)
      .find((action) => action.kind === "playCard")
      ?.options.find((option) => option.typeKey === "sha" && option.available);
    expect(mainAction).toMatchObject({ kind: "mainAction", playerId: "p0" });
    expect(sha?.targeting).toMatchObject({ kind: "independent", eligibleTargetIds: expect.arrayContaining(["p1"]) });

    const shaCard = tutorial.session.state.players[0]!.hand.find((card) => card.typeKey === "sha")!;
    respond(tutorial.session, {
      decisionId: mainAction!.id,
      playerId: "p0",
      choice: "playCard",
      cardIds: [shaCard.id],
      targetIds: ["p1"],
    });
    const botResponse = tutorial.session.state.pendingDecision!;
    expect(tutorialBotAnswer(tutorial, botResponse)).toEqual({
      decisionId: botResponse.id,
      playerId: "p1",
      pass: true,
    });
  });

  it("drives the scripted attacker to a real dodge decision owned by the learner", () => {
    const tutorial = createTutorialGame("basic-dodge");
    const pending = tutorial.session.state.pendingDecision;
    const legal = legalActionsFor(pending, tutorial.humanPlayerId, tutorial.session.state);
    const response = legal.find((action) => action.kind === "response");

    expect(tutorial.humanPlayerId).toBe("p1");
    expect(pending).toMatchObject({ kind: "respondShan", playerId: "p1", data: { sourceId: "p0" } });
    expect(response).toMatchObject({
      kind: "response",
      decisionKind: "respondShan",
    });
    expect(tutorial.session.state.players[1]!.hand.map((card) => card.typeKey)).toContain("shan");
  });

  it("uses scenario-owned bot input to expose real damage then a legal heal", () => {
    const tutorial = createTutorialGame("basic-recovery");
    const response = tutorial.session.state.pendingDecision!;
    respond(tutorial.session, {
      decisionId: response.id,
      playerId: tutorial.humanPlayerId,
      pass: true,
    });

    expect(tutorial.session.state.players[1]!.hp).toBe(3);
    const botDecision = tutorial.session.state.pendingDecision!;
    const botAnswer = tutorialBotAnswer(tutorial, botDecision);
    expect(botAnswer).toMatchObject({
      decisionId: botDecision.id,
      playerId: "p0",
      choice: "endPhase",
    });
    respond(tutorial.session, botAnswer);

    const draw = tutorial.session.state.pendingDecision!;
    expect(draw).toMatchObject({ kind: "drawCard", playerId: "p1" });
    respond(tutorial.session, { decisionId: draw.id, playerId: "p1", choice: "draw" });
    const tao = legalActionsFor(tutorial.session.state.pendingDecision, "p1", tutorial.session.state)
      .find((action) => action.kind === "playCard")
      ?.options.find((option) => option.typeKey === "tao" && option.available);
    expect(tao).toBeDefined();
  });
});
