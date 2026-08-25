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

describe("advanced tutorial scenarios", () => {
  it("starts a four-seat distance lesson with an initially unavailable far target and a legal range weapon", () => {
    const tutorial = createTutorialGame("advanced-distance");
    expect(tutorial.session.state.players).toHaveLength(4);
    const draw = tutorial.session.state.pendingDecision!;
    expect(draw).toMatchObject({ kind: "drawCard", playerId: tutorial.humanPlayerId });
    respond(tutorial.session, { decisionId: draw.id, playerId: "p0", choice: "draw" });
    const main = tutorial.session.state.pendingDecision!;
    const before = legalActionsFor(main, "p0", tutorial.session.state).find((action) => action.kind === "playCard")!;
    const weapon = before.options.find((option) => option.typeKey === "sword_qinggang")!;
    const shaBefore = before.options.find((option) => option.typeKey === "sha")!;
    expect(weapon.available).toBe(true);
    expect(shaBefore.targeting).toMatchObject({ eligibleTargetIds: expect.not.arrayContaining(["p2"]) });
    respond(tutorial.session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [weapon.selectableCardIds[0]!] });
    const after = legalActionsFor(tutorial.session.state.pendingDecision, "p0", tutorial.session.state)
      .find((action) => action.kind === "playCard")!.options.find((option) => option.typeKey === "sha")!;
    expect(after.targeting).toMatchObject({ eligibleTargetIds: expect.arrayContaining(["p2"]) });
  });

  it("starts the trick lesson at a real Wuxie response owned by the learner", () => {
    const tutorial = createTutorialGame("advanced-tricks");
    expect(tutorial.session.state.pendingDecision).toMatchObject({ kind: "askWuxie", playerId: tutorial.humanPlayerId });
    expect(legalActionsFor(tutorial.session.state.pendingDecision, tutorial.humanPlayerId, tutorial.session.state))
      .toContainEqual(expect.objectContaining({ kind: "response", decisionKind: "askWuxie" }));
  });

  it("starts the role lesson in a real identity game with a role and active skill", () => {
    const tutorial = createTutorialGame("advanced-roles");
    const learner = tutorial.session.state.players.find((player) => player.id === tutorial.humanPlayerId)!;
    expect(learner.role).toBeDefined();
    expect(learner.generalId).toBe("sunquan");
    const draw = tutorial.session.state.pendingDecision!;
    respond(tutorial.session, { decisionId: draw.id, playerId: tutorial.humanPlayerId, choice: "draw" });
    expect(legalActionsFor(tutorial.session.state.pendingDecision, tutorial.humanPlayerId, tutorial.session.state)
      .find((action) => action.kind === "useSkill")?.options)
      .toContainEqual(expect.objectContaining({ skillId: "sunquan_zhiheng", available: true }));
  });
});
