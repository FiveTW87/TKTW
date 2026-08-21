import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameView, PlayerView } from "@tktw/shared";
import { useDecisionController } from "../src/hooks/useDecisionController";

function player(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    id: "p0", seat: 0, name: "Alice", roleRevealed: true, generalId: "caocao", faction: "wei", gender: "male",
    hp: 4, maxHp: 4, alive: true, hand: [], equipment: {}, judgmentZone: [], shaUsedThisTurn: 0,
    skillUsedThisTurn: {}, ...overrides,
  } as PlayerView;
}

function view(me: PlayerView, pendingDecision: GameView["pendingDecision"], overrides: Partial<GameView> = {}): GameView {
  return {
    viewerPlayerId: me.id, players: [me], pendingDecision, currentTurnPlayerId: me.id,
    legalActions: [], gameLogs: [], ...overrides,
  } as GameView;
}

describe("useDecisionController", () => {
  const controller = (gameView: GameView, me: PlayerView, answer = vi.fn()) =>
    useDecisionController({ gameView, me, answer, onAutoToast: vi.fn() });

  it("auto-passes askWuxie once when no matching card exists", async () => {
    const me = player();
    const gameView = view(me, { id: "d1", kind: "askWuxie", playerId: me.id, data: {} });
    const answer = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(() => controller(gameView, me, answer));
    await waitFor(() => expect(answer).toHaveBeenCalledWith({ decisionId: "d1", pass: true }));
    rerender();
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it("keeps a legal reactive response in the dialog route", () => {
    const me = player({ hand: [{ id: "w1", typeKey: "wuxie", suit: "spade", rank: 1 }] });
    const gameView = view(me, { id: "d2", kind: "askWuxie", playerId: me.id, data: {} });
    const { result } = renderHook(() => controller(gameView, me));
    expect(result.current.route).toEqual({ kind: "modal" });
  });

  it("routes inline activateSkill without opening a modal", () => {
    const me = player({ generalId: "caoren" });
    const gameView = view(me, { id: "d3", kind: "activateSkill", playerId: me.id, data: { skillId: "caoren_tuoyi" } });
    const { result } = renderHook(() => controller(gameView, me));
    expect(result.current.pendingActivateMode).toBe("inline");
    expect(result.current.route).toEqual({ kind: "inlineSkill", skillId: "caoren_tuoyi" });
  });

  it("releases busy even when an answer rejects", async () => {
    const me = player();
    const gameView = view(me, { id: "d4", kind: "mainAction", playerId: me.id, data: {} });
    const answer = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => controller(gameView, me, answer));
    await act(async () => {
      await expect(result.current.runAnswer({ decisionId: "d4", choice: "endPhase" })).rejects.toThrow("network");
    });
    expect(result.current.busy).toBe(false);
  });
});
