import { act, renderHook } from "@testing-library/react";
import type { GameLogView } from "@tktw/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTableFeedbackPresentation } from "../src/hooks/useTableFeedbackPresentation";

function log(id: string, eventType: string, overrides: Partial<GameLogView> = {}): GameLogView {
  return { id, turn: 1, eventType, visibility: "public", ...overrides };
}

describe("useTableFeedbackPresentation", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps the initial snapshot silent then presents judgment feedback in order", () => {
    const reveal = log("j0", "judgmentReveal", { actorId: "p1", cardType: "tao", data: { suit: "heart", rank: 8, reason: "bagua" } });
    const replace = log("j1", "judgmentReplace", { actorId: "p2", targetIds: ["p1"], cardType: "sha", data: { suit: "spade", rank: 7 } });
    const { result, rerender } = renderHook(
      ({ logs }) => useTableFeedbackPresentation({ connected: true, matchId: "m1", logs, turnNumber: 1, phase: "judge", currentTurnPlayerName: "ผู้เล่นหนึ่ง" }),
      { initialProps: { logs: [reveal] as GameLogView[] } },
    );
    expect(result.current).toEqual([]);
    act(() => rerender({ logs: [reveal, replace] }));
    expect(result.current.map((cue) => cue.kind)).toEqual(["judgmentReplace"]);
  });

  it("presents Wuxie depth and one final result, then expires bounded cues", () => {
    const { result, rerender } = renderHook(
      ({ logs }) => useTableFeedbackPresentation({ connected: true, matchId: "m1", logs, turnNumber: 1, phase: "play", currentTurnPlayerName: "ผู้เล่นหนึ่ง" }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [
      log("w0", "wuxie", { actorId: "p2", data: { targetType: "juedou", depth: 2 } }),
      log("w1", "wuxieResult", { actorId: "p1", data: { targetType: "juedou", effective: false } }),
    ] }));
    expect(result.current[0]).toMatchObject({ kind: "wuxieCounter", depth: 2 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.some((cue) => cue.kind === "wuxieResult" && !cue.effective)).toBe(true);
    act(() => vi.advanceTimersByTime(1800));
    expect(result.current).toEqual([]);
  });

  it("announces a new turn once and suppresses its simultaneous prepare phase cue", () => {
    const logs: GameLogView[] = [];
    const { result, rerender } = renderHook(
      ({ turnNumber, phase }) => useTableFeedbackPresentation({ connected: true, matchId: "m1", logs, turnNumber, phase, currentTurnPlayerName: "โจโฉ" }),
      { initialProps: { turnNumber: 1, phase: "end" } },
    );
    act(() => rerender({ turnNumber: 2, phase: "prepare" }));
    expect(result.current).toEqual([expect.objectContaining({ kind: "turn", turnNumber: 2, playerName: "โจโฉ" })]);
    act(() => rerender({ turnNumber: 2, phase: "draw" }));
    expect(result.current.some((cue) => cue.kind === "phase" && cue.phase === "draw")).toBe(true);
  });

  it("clears on disconnect, ignores the stale view, and primes the first fresh snapshot silently", () => {
    const initial: GameLogView[] = [];
    const appended = [log("j0", "judgmentReveal", { actorId: "p1" })];
    const fresh = [...appended];
    const { result, rerender } = renderHook(
      ({ connected, logs }) => useTableFeedbackPresentation({ connected, matchId: "m1", logs, turnNumber: 1, phase: "judge", currentTurnPlayerName: "p1" }),
      { initialProps: { connected: true, logs: initial } },
    );
    act(() => rerender({ connected: true, logs: appended }));
    expect(result.current).not.toEqual([]);
    act(() => rerender({ connected: false, logs: appended }));
    expect(result.current).toEqual([]);
    act(() => rerender({ connected: true, logs: appended }));
    expect(result.current).toEqual([]);
    act(() => rerender({ connected: true, logs: fresh }));
    expect(result.current).toEqual([]);
  });
});
