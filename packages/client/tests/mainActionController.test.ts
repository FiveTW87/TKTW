import type { Card, GameView, PlayerView } from "@tktw/shared";
import { describe, expect, it, vi } from "vitest";
import type { InteractionState, SelectionController } from "../src/hooks/useInteraction";
import { createMainActionController } from "../src/hooks/mainActionController";

const card: Card = { id: "sha-1", typeKey: "sha", suit: "spade", rank: 7 };

function player(id: string, overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    id,
    seat: Number(id.slice(1)),
    name: id,
    roleRevealed: false,
    generalId: "caocao",
    faction: "wei",
    gender: "male",
    hp: 4,
    maxHp: 4,
    alive: true,
    hand: { count: 0 },
    equipment: {},
    judgmentZone: [],
    shaUsedThisTurn: 0,
    skillUsedThisTurn: {},
    ...overrides,
  } as PlayerView;
}

const idle: InteractionState = {
  selectedCardIds: [],
  selectedTargetIds: [],
  skillMode: null,
  zhangbaMode: false,
  selectedAsType: null,
};

function makeController({
  option,
  interaction = idle,
  me = player("p0", { hand: [card] }),
  others = [player("p1"), player("p2")],
}: {
  option: Record<string, unknown>;
  interaction?: InteractionState;
  me?: PlayerView;
  others?: PlayerView[];
}) {
  const pending = { id: "decision-1", kind: "mainAction", playerId: me.id, data: {} } as const;
  const gameView = {
    viewerPlayerId: me.id,
    viewerSeatIndex: me.seat,
    players: [me, ...others],
    currentTurnPlayerId: me.id,
    turnNumber: 1,
    currentPhase: "play",
    drawPileCount: 50,
    discardPile: [],
    discardPileCount: 0,
    eventStack: [],
    pendingDecision: pending,
    legalActions: [
      { kind: "playCard", options: [option] },
      { kind: "useSkill", options: [] },
      { kind: "endPhase" },
    ],
    finished: false,
    gameLogs: [],
  } as unknown as GameView;
  const commands: SelectionController["commands"] = {
    reset: vi.fn(),
    setCards: vi.fn(),
    setTargets: vi.fn(),
    toggleIndependentTarget: vi.fn(),
    stepDependentTarget: vi.fn(),
    beginPlay: vi.fn(),
    beginSkill: vi.fn(),
    beginZhangba: vi.fn(),
  };
  const submit = vi.fn(async () => undefined);
  const notify = vi.fn();
  const controller = createMainActionController({
    gameView,
    me,
    pending,
    isMyDecision: true,
    isMainAction: true,
    isDiscardTo: false,
    selection: { state: interaction, commands },
    submit,
    notify,
    requestPlayChoice: vi.fn(),
  });
  return { controller, commands, submit, notify, players: gameView.players };
}

describe("createMainActionController", () => {
  it("uses server-provided target eligibility instead of visible seats", () => {
    const { controller, players } = makeController({
      option: {
        source: "literal", typeKey: "sha", selectableCardIds: [card.id], minCards: 1, maxCards: 1,
        targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: ["p2"] },
        available: true,
      },
      interaction: { ...idle, selectedCardIds: [card.id] },
    });

    expect(controller.targets.isTargetable(players[1]!)).toBe(false);
    expect(controller.targets.isTargetable(players[2]!)).toBe(true);
  });

  it("preserves the authoritative first-to-second order for dependent targets", () => {
    const option = {
      source: "literal", typeKey: "jiedao", selectableCardIds: [card.id], minCards: 1, maxCards: 1,
      targeting: {
        kind: "dependent", minTargets: 2, maxTargets: 2,
        firstTargetIds: ["p1"], secondTargetIdsByFirst: { p1: ["p2"] },
      },
      available: true,
    };
    const first = makeController({ option, interaction: { ...idle, selectedCardIds: [card.id] } });
    first.controller.targets.tap("p1");
    expect(first.commands.stepDependentTarget).toHaveBeenCalledWith("p1");

    const second = makeController({ option, interaction: { ...idle, selectedCardIds: [card.id], selectedTargetIds: ["p1"] } });
    expect(second.controller.targets.isTargetable(second.players[2]!)).toBe(true);
    second.controller.targets.tap("p2");
    expect(second.commands.stepDependentTarget).toHaveBeenCalledWith("p2");
  });

  it("submits an implicit self-target Tao immediately without a client target id", () => {
    const tao = { ...card, id: "tao-1", typeKey: "tao", suit: "heart" } as Card;
    const me = player("p0", { hp: 3, hand: [tao] });
    const { controller, submit } = makeController({
      me,
      option: {
        source: "literal", typeKey: "tao", selectableCardIds: [tao.id], minCards: 1, maxCards: 1,
        targeting: { kind: "independent", minTargets: 0, maxTargets: 1, eligibleTargetIds: [me.id], implicitTargetId: me.id },
        available: true,
      },
    });

    controller.cards.tap(tao);
    expect(submit).toHaveBeenCalledWith({ decisionId: "decision-1", choice: "playCard", cardIds: [tao.id], targetIds: [] });
  });

  it("reports an unavailable server option instead of constructing a play", () => {
    const { controller, submit, notify } = makeController({
      option: {
        source: "literal", typeKey: "sha", selectableCardIds: [card.id], minCards: 1, maxCards: 1,
        targeting: { kind: "independent", minTargets: 1, maxTargets: 1, eligibleTargetIds: [] },
        available: false, unavailableReason: "no_legal_target",
      },
    });

    controller.cards.tap(card);
    expect(notify).toHaveBeenCalledWith("ตอนนี้ไม่มีเป้าหมายที่ถูกกติกา");
    expect(submit).not.toHaveBeenCalled();
  });
});
