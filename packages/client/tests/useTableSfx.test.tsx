import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameView } from "@tktw/shared";
import { useTableSfx } from "../src/hooks/useTableSfx";

function view({
  matchId = "m1",
  discardTopId = null,
  logs = [],
  turn = "p2",
}: {
  matchId?: string;
  discardTopId?: string | null;
  logs?: Array<Record<string, unknown>>;
  turn?: string;
} = {}): GameView {
  return {
    matchId,
    viewerPlayerId: "p1",
    players: [],
    currentTurnPlayerId: turn,
    gameLogs: logs,
    discardPileTop: discardTopId ? { id: discardTopId, typeKey: "sha", suit: "spade", rank: 7 } : undefined,
  } as unknown as GameView;
}

describe("useTableSfx", () => {
  it("keeps a rich initial snapshot silent and leaves combat sounds to the visible combat timeline", () => {
    const play = vi.fn();
    const initial = view({ logs: [{ id: "l0", eventType: "damage", actorId: "p2" }] });
    const { rerender } = renderHook(
      ({ gameView }) => useTableSfx({ connected: true, gameView, viewerPlayerId: "p1", play }),
      { initialProps: { gameView: initial } },
    );
    expect(play).not.toHaveBeenCalled();

    rerender({ gameView: view({
      discardTopId: "c2",
      turn: "p1",
      logs: [
        ...initial.gameLogs,
        { id: "l1", eventType: "skillUse", actorId: "p2" },
        { id: "l2", eventType: "draw", actorId: "p1" },
        { id: "l3", eventType: "damage", actorId: "p2" },
        { id: "l4", eventType: "dodge", actorId: "p1" },
        { id: "l5", eventType: "heal", actorId: "p1" },
        { id: "l6", eventType: "death", actorId: "p2" },
      ],
    }) });
    expect(play.mock.calls.map(([name]) => name)).toEqual(["cardPlay", "draw", "turnStart"]);
  });

  it("ignores another player's draw and silently re-primes on log rollback or match change", () => {
    const play = vi.fn();
    const first = view({ logs: [{ id: "l0", eventType: "damage" }] });
    const { rerender } = renderHook(
      ({ gameView }) => useTableSfx({ connected: true, gameView, viewerPlayerId: "p1", play }),
      { initialProps: { gameView: first } },
    );
    rerender({ gameView: view({ logs: [...first.gameLogs, { id: "l1", eventType: "draw", actorId: "p2" }] }) });
    expect(play).not.toHaveBeenCalled();
    rerender({ gameView: view({ logs: [] }) });
    rerender({ gameView: view({ matchId: "m2", logs: [{ id: "fresh", eventType: "death" }] }) });
    expect(play).not.toHaveBeenCalled();
  });

  it("waits for and silently primes the first fresh view after reconnect", () => {
    const play = vi.fn();
    const stale = view({ logs: [{ id: "l0", eventType: "damage" }] });
    const { rerender } = renderHook(
      ({ connected, gameView }) => useTableSfx({ connected, gameView, viewerPlayerId: "p1", play }),
      { initialProps: { connected: true, gameView: stale } },
    );
    rerender({ connected: false, gameView: stale });
    rerender({ connected: true, gameView: stale });
    const fresh = view({ logs: [...stale.gameLogs, { id: "l1", eventType: "damage" }] });
    rerender({ connected: true, gameView: fresh });
    expect(play).not.toHaveBeenCalled();
    rerender({ connected: true, gameView: view({ logs: [...fresh.gameLogs, { id: "l2", eventType: "heal" }] }) });
    expect(play).not.toHaveBeenCalled();
  });
});
