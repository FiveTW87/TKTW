import type { LegalActionView, PlayerAnswer } from "@tktw/shared";

export const TUTORIAL_ANCHORS = [
  "drawPile",
  "discardPile",
  "hand",
  "players",
  "equipment",
  "skills",
  "endPhase",
] as const;

export type TutorialAnchor = (typeof TUTORIAL_ANCHORS)[number];

export type TutorialHighlight =
  | { readonly kind: "anchor"; readonly anchor: TutorialAnchor }
  | { readonly kind: "player"; readonly playerId: string };

export type TutorialExpectedAction =
  | { readonly kind: "draw" }
  | { readonly kind: "playCard"; readonly typeKey: string; readonly source?: "literal" | "conversion" | "zhangba" }
  | { readonly kind: "useSkill"; readonly skillId: string }
  | { readonly kind: "response"; readonly decisionKind: Extract<LegalActionView, { kind: "response" }>["decisionKind"]; readonly choice?: string }
  | { readonly kind: "discard"; readonly minimumCards?: number }
  | { readonly kind: "endPhase" };

type TutorialResponseDecisionKind = Extract<LegalActionView, { kind: "response" }>["decisionKind"];
const TUTORIAL_RESPONSE_DECISION_KINDS = [
  "respondShan",
  "respondSha",
  "respondTao",
  "askWuxie",
  "activateSkill",
  "pickCardFromPlayer",
  "wuguPick",
  "judgmentReveal",
  "pickGeneral",
  "tuxiTargets",
  "swordIceChoice",
  "qilinDestroyHorse",
  "guanshiForce",
  "qinglongReplay",
  "swordYyChoice",
  "jiedaoForceSha",
  "jiedaoWeaponSwap",
  "hujiaVolunteer",
  "huibiRedirect",
  "yijiGive",
  "fankuiPick",
  "guicaiReplace",
  "ganglieChoice",
  "fanjianGuess",
  "guandouOrder",
] as const satisfies readonly TutorialResponseDecisionKind[];
type MissingTutorialResponseDecisionKind = Exclude<TutorialResponseDecisionKind, (typeof TUTORIAL_RESPONSE_DECISION_KINDS)[number]>;
const tutorialResponseDecisionKindsAreComplete: MissingTutorialResponseDecisionKind extends never ? true : never = true;
void tutorialResponseDecisionKindsAreComplete;

export interface TutorialStep {
  readonly id: string;
  readonly prompt: string;
  readonly highlight: TutorialHighlight;
  readonly expect: TutorialExpectedAction;
}

export interface TutorialScenario {
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly steps: readonly TutorialStep[];
}

export interface TutorialProgress {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly status: "active" | "completed";
  readonly stepIndex: number;
}

export type TutorialSnapshot =
  | {
      readonly status: "active";
      readonly scenarioId: string;
      readonly scenarioVersion: number;
      readonly title: string;
      readonly stepIndex: number;
      readonly stepCount: number;
      readonly step: Omit<TutorialStep, "expect">;
    }
  | {
      readonly status: "completed";
      readonly scenarioId: string;
      readonly scenarioVersion: number;
      readonly title: string;
      readonly stepCount: number;
    };

export interface TutorialController {
  readonly scenario: TutorialScenario;
  readonly progress: TutorialProgress;
  readonly snapshot: TutorialSnapshot;
}

export interface TutorialObservation {
  /** An answer observed only after the real game flow has accepted it. */
  readonly acceptedAnswer: Omit<PlayerAnswer, "playerId">;
  readonly legalActions: readonly LegalActionView[];
}

export type TutorialTransitionOutcome =
  | { readonly kind: "advanced"; readonly fromStepId: string; readonly toStepId: string }
  | { readonly kind: "retry"; readonly stepId: string }
  | { readonly kind: "completed"; readonly stepId: string }
  | { readonly kind: "unchanged"; readonly reason: "completed" };

export interface TutorialTransition {
  readonly controller: TutorialController;
  readonly outcome: TutorialTransitionOutcome;
}

export function createTutorialController(input: unknown, persistedProgress?: unknown): TutorialController {
  const scenario = parseScenario(input);
  const progress = parseProgress(scenario, persistedProgress) ?? initialProgress(scenario);
  return makeController(scenario, progress);
}

export function resetTutorial(controller: TutorialController): TutorialController {
  return makeController(controller.scenario, initialProgress(controller.scenario));
}

export function transitionTutorial(
  controller: TutorialController,
  observation: TutorialObservation,
): TutorialTransition {
  if (controller.progress.status === "completed") {
    return { controller, outcome: { kind: "unchanged", reason: "completed" } };
  }
  const current = controller.scenario.steps[controller.progress.stepIndex];
  if (!current) throw new TutorialScenarioError(`Step index ${controller.progress.stepIndex} is outside scenario '${controller.scenario.id}'.`);
  const projectedAction = findExpectedProjectedAction(current.expect, observation.legalActions);
  if (!projectedAction) {
    throw new TutorialScriptError(
      `Tutorial step '${current.id}' expects '${current.expect.kind}', but that action is not available in the projected legal actions.`,
    );
  }
  if (!matchesAnswer(current.expect, projectedAction, observation.acceptedAnswer)) {
    return { controller, outcome: { kind: "retry", stepId: current.id } };
  }
  const nextIndex = controller.progress.stepIndex + 1;
  const next = controller.scenario.steps[nextIndex];
  if (!next) {
    const completed = makeController(controller.scenario, { ...controller.progress, status: "completed" });
    return { controller: completed, outcome: { kind: "completed", stepId: current.id } };
  }
  const advanced = makeController(controller.scenario, { ...controller.progress, stepIndex: nextIndex });
  return {
    controller: advanced,
    outcome: { kind: "advanced", fromStepId: current.id, toStepId: next.id },
  };
}

function makeController(scenario: TutorialScenario, progress: TutorialProgress): TutorialController {
  if (progress.status === "completed") {
    return {
      scenario,
      progress,
      snapshot: {
        status: "completed",
        scenarioId: scenario.id,
        scenarioVersion: scenario.version,
        title: scenario.title,
        stepCount: scenario.steps.length,
      },
    };
  }
  const current = scenario.steps[progress.stepIndex];
  if (!current) throw new TutorialScenarioError(`Step index ${progress.stepIndex} is outside scenario '${scenario.id}'.`);
  return {
    scenario,
    progress,
    snapshot: {
      status: "active",
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      title: scenario.title,
      stepIndex: progress.stepIndex,
      stepCount: scenario.steps.length,
      step: { id: current.id, prompt: current.prompt, highlight: current.highlight },
    },
  };
}

export class TutorialScenarioError extends Error {
  readonly name = "TutorialScenarioError";
}

export class TutorialScriptError extends Error {
  readonly name = "TutorialScriptError";
}

function findExpectedProjectedAction(
  expected: TutorialExpectedAction,
  legalActions: readonly LegalActionView[],
): LegalActionView | undefined {
  if (expected.kind === "playCard") {
    const action = legalActions.find((candidate) => candidate.kind === "playCard");
    return action?.options.some((option) =>
      option.available
      && option.typeKey === expected.typeKey
      && (expected.source === undefined || option.source === expected.source))
      ? action
      : undefined;
  }
  if (expected.kind === "useSkill") {
    const action = legalActions.find((candidate) => candidate.kind === "useSkill");
    return action?.options.some((option) => option.available && option.skillId === expected.skillId) ? action : undefined;
  }
  if (expected.kind === "response") {
    return legalActions.find((candidate) => candidate.kind === "response" && candidate.decisionKind === expected.decisionKind);
  }
  return legalActions.find((candidate) => candidate.kind === expected.kind);
}

function matchesAnswer(
  expected: TutorialExpectedAction,
  projectedAction: LegalActionView,
  answer: Omit<PlayerAnswer, "playerId">,
): boolean {
  switch (expected.kind) {
    case "draw":
      return answer.choice === "draw";
    case "endPhase":
      return answer.choice === "endPhase";
    case "discard":
      return projectedAction.kind === "discard"
        && (answer.cardIds?.length ?? 0) >= (expected.minimumCards ?? projectedAction.minCards);
    case "response":
      return projectedAction.kind === "response"
        && (expected.choice === undefined || answer.choice === expected.choice);
    case "useSkill":
      return projectedAction.kind === "useSkill"
        && answer.choice === "useSkill"
        && answer.skillId === expected.skillId;
    case "playCard": {
      if (projectedAction.kind !== "playCard" || answer.choice !== "playCard") return false;
      const submittedIds = answer.cardIds ?? [];
      return projectedAction.options.some((option) =>
        option.available
        && option.typeKey === expected.typeKey
        && (expected.source === undefined || option.source === expected.source)
        && (option.asType ?? undefined) === (answer.asType ?? undefined)
        && submittedIds.some((id) => option.selectableCardIds.includes(id)));
    }
  }
}

function parseScenario(input: unknown): TutorialScenario {
  if (!isRecord(input)) throw new TutorialScenarioError("Scenario must be an object.");
  assertExactKeys(input, ["id", "version", "title", "steps"], "Scenario");
  const id = nonEmptyString(input.id, "Scenario id");
  const title = nonEmptyString(input.title, "Scenario title");
  const version = positiveInteger(input.version, "Scenario version");
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    throw new TutorialScenarioError(`Scenario '${id}' must contain at least one step.`);
  }
  const stepIds = new Set<string>();
  const steps = input.steps.map((value, index) => parseStep(value, index, stepIds));
  return { id, version, title, steps };
}

function initialProgress(scenario: TutorialScenario): TutorialProgress {
  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    status: "active",
    stepIndex: 0,
  };
}

function parseProgress(scenario: TutorialScenario, input: unknown): TutorialProgress | undefined {
  if (input === undefined || !isRecord(input)) return undefined;
  const keys = Object.keys(input).sort();
  if (keys.join(",") !== "scenarioId,scenarioVersion,schemaVersion,status,stepIndex") return undefined;
  if (
    input.schemaVersion !== 1
    || input.scenarioId !== scenario.id
    || input.scenarioVersion !== scenario.version
    || (input.status !== "active" && input.status !== "completed")
    || typeof input.stepIndex !== "number"
    || !Number.isInteger(input.stepIndex)
    || input.stepIndex < 0
    || input.stepIndex >= scenario.steps.length
    || (input.status === "completed" && input.stepIndex !== scenario.steps.length - 1)
  ) return undefined;
  return {
    schemaVersion: 1,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    status: input.status,
    stepIndex: input.stepIndex,
  };
}

function parseStep(input: unknown, index: number, seenIds: Set<string>): TutorialStep {
  if (!isRecord(input)) throw new TutorialScenarioError(`Step ${index} must be an object.`);
  assertExactKeys(input, ["id", "prompt", "highlight", "expect"], `Step ${index}`);
  const id = nonEmptyString(input.id, `Step ${index} id`);
  if (seenIds.has(id)) throw new TutorialScenarioError(`Duplicate tutorial step id '${id}'.`);
  seenIds.add(id);
  const prompt = nonEmptyString(input.prompt, `Step '${id}' prompt`);
  const highlight = parseHighlight(input.highlight, id);
  const expect = parseExpectedAction(input.expect, id);
  return { id, prompt, highlight, expect };
}

function parseHighlight(input: unknown, stepId: string): TutorialHighlight {
  if (!isRecord(input)) throw new TutorialScenarioError(`Step '${stepId}' highlight must be an object.`);
  if (input.kind === "anchor" && typeof input.anchor === "string" && (TUTORIAL_ANCHORS as readonly string[]).includes(input.anchor)) {
    assertExactKeys(input, ["kind", "anchor"], `Step '${stepId}' highlight`);
    return { kind: "anchor", anchor: input.anchor as TutorialAnchor };
  }
  if (input.kind === "player") {
    assertExactKeys(input, ["kind", "playerId"], `Step '${stepId}' highlight`);
    return { kind: "player", playerId: nonEmptyString(input.playerId, `Step '${stepId}' player highlight`) };
  }
  throw new TutorialScenarioError(`Step '${stepId}' has an invalid highlight.`);
}

function parseExpectedAction(input: unknown, stepId: string): TutorialExpectedAction {
  if (!isRecord(input) || typeof input.kind !== "string") {
    throw new TutorialScenarioError(`Step '${stepId}' expected action must be an object.`);
  }
  if (input.kind === "draw" || input.kind === "endPhase") {
    assertExactKeys(input, ["kind"], `Step '${stepId}' expected action`);
    return { kind: input.kind };
  }
  if (input.kind === "playCard") {
    assertExactKeys(input, ["kind", "typeKey", "source"], `Step '${stepId}' expected action`, ["source"]);
    const typeKey = nonEmptyString(input.typeKey, `Step '${stepId}' card type`);
    if (input.source !== undefined && input.source !== "literal" && input.source !== "conversion" && input.source !== "zhangba") {
      throw new TutorialScenarioError(`Step '${stepId}' has an invalid card source.`);
    }
    return { kind: "playCard", typeKey, ...(input.source ? { source: input.source } : {}) };
  }
  if (input.kind === "useSkill") {
    assertExactKeys(input, ["kind", "skillId"], `Step '${stepId}' expected action`);
    return { kind: "useSkill", skillId: nonEmptyString(input.skillId, `Step '${stepId}' skill id`) };
  }
  if (input.kind === "discard") {
    assertExactKeys(input, ["kind", "minimumCards"], `Step '${stepId}' expected action`, ["minimumCards"]);
    return input.minimumCards === undefined
      ? { kind: "discard" }
      : { kind: "discard", minimumCards: positiveInteger(input.minimumCards, `Step '${stepId}' minimum cards`) };
  }
  if (input.kind === "response") {
    assertExactKeys(input, ["kind", "decisionKind", "choice"], `Step '${stepId}' expected action`, ["choice"]);
    const decisionKind = nonEmptyString(input.decisionKind, `Step '${stepId}' response kind`);
    if (!(TUTORIAL_RESPONSE_DECISION_KINDS as readonly string[]).includes(decisionKind)) {
      throw new TutorialScenarioError(`Step '${stepId}' has an invalid response decision kind '${decisionKind}'.`);
    }
    return {
      kind: "response",
      decisionKind: decisionKind as TutorialResponseDecisionKind,
      ...(input.choice === undefined ? {} : { choice: nonEmptyString(input.choice, `Step '${stepId}' response choice`) }),
    };
  }
  throw new TutorialScenarioError(`Step '${stepId}' has unsupported expected action '${input.kind}'.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TutorialScenarioError(`${label} must be a non-empty string.`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new TutorialScenarioError(`${label} must be a positive integer.`);
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
  optional: readonly string[] = [],
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  const required = allowed.filter((key) => !optional.includes(key));
  const missing = required.filter((key) => !(key in value));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TutorialScenarioError(
      `${label} has invalid fields${unexpected.length ? `; unexpected: ${unexpected.join(", ")}` : ""}${missing.length ? `; missing: ${missing.join(", ")}` : ""}.`,
    );
  }
}
