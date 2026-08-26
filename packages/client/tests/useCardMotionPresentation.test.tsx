import { act, renderHook } from "@testing-library/react";
import type { GameLogView } from "@tktw/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCardMotionPresentation } from "../src/hooks/useCardMotionPresentation";

function log(id: string, eventType: string, overrides: Partial<GameLogView> = {}): GameLogView {
  return { id, turn: 1, eventType, visibility: "public", ...overrides };
}

function anchor(key: string, left: number, top: number, width = 80, height = 60): HTMLElement {
  const element = document.createElement("div");
  element.dataset.cardMotionAnchor = key;
  element.getBoundingClientRect = () => ({ x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON: () => ({}) });
  document.body.appendChild(element);
  return element;
}

describe("useCardMotionPresentation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    anchor("player:p1:hand", 100, 300);
    anchor("pile:table", 420, 180);
    anchor("pile:draw", 360, 160);
    anchor("pile:discard", 500, 160);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("silently baselines history then presents public play source-to-destination", () => {
    const play = vi.fn();
    const historical = log("old", "cardPlay", { actorId: "p1", cardId: "c0", cardType: "sha" });
    const { result, rerender } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs, play }),
      { initialProps: { logs: [historical] as GameLogView[] } },
    );
    expect(result.current).toEqual([]);

    const next = log("new", "cardPlay", { actorId: "p1", cardId: "c1", cardType: "tao" });
    act(() => rerender({ logs: [historical, next] }));
    expect(result.current).toEqual([expect.objectContaining({
      id: "m1:new:motion:play",
      motion: "play",
      fromX: 140,
      fromY: 330,
      toX: 460,
      toY: 210,
      cardType: "tao",
      reduced: false,
    })]);
    expect(play).toHaveBeenCalledWith("cardPlay");
  });

  it("routes draw, discard, and equipment sounds from the visible motion", () => {
    anchor("player:p1:equipment", 120, 240);
    const play = vi.fn();
    const { rerender } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs, play, intervalMs: 0 }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log("draw", "draw", { actorId: "p1" })] }));
    act(() => vi.runOnlyPendingTimers());
    act(() => rerender({ logs: [
      log("draw", "draw", { actorId: "p1" }),
      log("discard", "discard", { actorId: "p1" }),
      log("equip", "equip", { actorId: "p1", cardType: "bagua" }),
    ] }));
    act(() => vi.advanceTimersByTime(220));
    expect(play.mock.calls.map(([name]) => name)).toEqual(["cardDraw", "cardDiscard", "equip"]);
  });

  it("retries a late destination once and drops a permanently missing destination", () => {
    const { result, rerender } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    const delayed = log("delayed", "placeDelayed", { actorId: "p1", targetIds: ["p2"], cardType: "lebusishu" });
    act(() => rerender({ logs: [delayed] }));
    expect(result.current).toEqual([]);
    anchor("player:p2:judgment", 700, 80);
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toHaveLength(1);

    const missing = log("missing", "placeDelayed", { actorId: "p1", targetIds: ["p3"], cardType: "shandian" });
    act(() => rerender({ logs: [delayed, missing] }));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.some((effect) => effect.id.includes("missing"))).toBe(false);
  });

  it("degrades a missing source to a destination cue after the retry bound", () => {
    const { result, rerender } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    const draw = log("draw", "draw", { actorId: "p1", amount: 2 });
    document.querySelector('[data-card-motion-anchor="pile:draw"]')?.remove();
    act(() => rerender({ logs: [draw] }));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.find((effect) => effect.motion === "draw")).toEqual(expect.objectContaining({
      fromX: 140,
      fromY: 330,
      toX: 140,
      toY: 330,
      reduced: true,
      amount: 2,
    }));
  });

  it("uses a short destination-only cue for reduced motion", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: true }) });
    const { result, rerender } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    act(() => rerender({ logs: [log("play", "cardPlay", { actorId: "p1", cardType: "sha" })] }));
    expect(result.current[0]).toEqual(expect.objectContaining({ fromX: 460, fromY: 210, toX: 460, toY: 210, reduced: true }));
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toEqual([]);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });

  it("caps overlap and clears effects/timers on stream reset and unmount", () => {
    const { result, rerender, unmount } = renderHook(
      ({ logs }) => useCardMotionPresentation({ connected: true, matchId: "m1", logs, intervalMs: 0 }),
      { initialProps: { logs: [] as GameLogView[] } },
    );
    const logs = Array.from({ length: 8 }, (_, index) => log(`p${index}`, "cardPlay", { actorId: "p1", cardType: "sha" }));
    act(() => rerender({ logs }));
    act(() => vi.runOnlyPendingTimers());
    expect(result.current).toHaveLength(6);
    act(() => rerender({ logs: [] }));
    expect(result.current).toEqual([]);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
