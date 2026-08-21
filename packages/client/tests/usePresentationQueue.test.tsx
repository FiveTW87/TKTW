import { act, renderHook } from "@testing-library/react";
import type { GameLogView } from "@tktw/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresentationEvent } from "../src/presentation/presentationEvents";
import { usePresentationQueue } from "../src/hooks/usePresentationQueue";

function log(id: string, eventType = "heal", actorId = "p1"): GameLogView {
  return { id, turn: 1, eventType, actorId, visibility: "public" };
}

describe("usePresentationQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("silently baselines history, then presents a multi-log append in received order", () => {
    const present = vi.fn<(event: PresentationEvent) => void>();
    const historical = log("log_2");
    const { rerender } = renderHook(
      ({ logs }) => usePresentationQueue({ matchId: "m1", logs, present, intervalMs: 20 }),
      { initialProps: { logs: [historical] } },
    );
    expect(present).not.toHaveBeenCalled();

    act(() => rerender({ logs: [historical, log("log_5", "skillUse"), log("log_9", "damage"), log("log_10", "death")] }));
    expect(present.mock.calls.map(([event]) => event.logId)).toEqual(["log_5"]);
    act(() => vi.advanceTimersByTime(60));
    expect(present.mock.calls.map(([event]) => event.logId)).toEqual(["log_5", "log_9", "log_10"]);
  });

  it("deduplicates repeated, overlapping, and duplicate-id snapshots", () => {
    const present = vi.fn<(event: PresentationEvent) => void>();
    const first = log("l0");
    const second = log("l1");
    const { rerender } = renderHook(
      ({ logs }) => usePresentationQueue({ matchId: "m1", logs, present, intervalMs: 10 }),
      { initialProps: { logs: [first] } },
    );
    act(() => rerender({ logs: [first, second, second] }));
    act(() => vi.runAllTimers());
    act(() => rerender({ logs: [first, second, second] }));
    expect(present).toHaveBeenCalledTimes(1);
    expect(present.mock.calls[0]?.[0].id).toBe("m1:l1:heal");
  });

  it("silently rebaselines same-length replacement, rollback, and match change", () => {
    const present = vi.fn<(event: PresentationEvent) => void>();
    const onReset = vi.fn();
    const { rerender } = renderHook(
      ({ matchId, logs }) => usePresentationQueue({ matchId, logs, present, onReset }),
      { initialProps: { matchId: "m1", logs: [log("l0"), log("l1")] } },
    );
    act(() => rerender({ matchId: "m1", logs: [log("l0"), log("replacement")] }));
    act(() => rerender({ matchId: "m1", logs: [log("l0")] }));
    act(() => rerender({ matchId: "m2", logs: [log("l0"), log("fresh")] }));
    expect(present).not.toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledTimes(3);
  });

  it("resets active presentation when the snapshot disappears", () => {
    const present = vi.fn<(event: PresentationEvent) => void>();
    const onReset = vi.fn();
    const { rerender } = renderHook(
      ({ matchId, logs }: { matchId: string | undefined; logs: GameLogView[] | undefined }) => (
        usePresentationQueue({ matchId, logs, present, onReset })
      ),
      { initialProps: { matchId: "m1", logs: [log("l0")] } },
    );
    act(() => rerender({ matchId: undefined, logs: undefined }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("continues on cadence when presenters throw or reject", async () => {
    const error = new Error("presentation failed");
    const onError = vi.fn();
    const seen: string[] = [];
    const present = vi.fn((event: PresentationEvent) => {
      seen.push(event.logId);
      if (event.logId === "throw") throw error;
      if (event.logId === "reject") return Promise.reject(error);
      return undefined;
    });
    const { rerender } = renderHook(
      ({ logs }) => usePresentationQueue({ matchId: "m", logs, present, onError, intervalMs: 10 }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log("throw"), log("reject"), log("after")] }));
    await act(async () => {
      vi.advanceTimersByTime(30);
      await Promise.resolve();
    });
    expect(seen).toEqual(["throw", "reject", "after"]);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("cancels queued timers on unmount", () => {
    const present = vi.fn<(event: PresentationEvent) => void>();
    const { rerender, unmount } = renderHook(
      ({ logs }) => usePresentationQueue({ matchId: "m", logs, present, intervalMs: 10 }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log("first"), log("never")] }));
    expect(present).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.runAllTimers());
    expect(present).toHaveBeenCalledTimes(1);
  });
});
