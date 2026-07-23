import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInteraction } from "../src/hooks/useInteraction";

describe("useInteraction (SPEC §11.1 InteractionMode)", () => {
  it("starts idle with empty selection", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    const [state] = result.current;
    expect(state.mode).toBe("idle");
    expect(state.selectedCardIds).toEqual([]);
    expect(state.selectedTargetIds).toEqual([]);
    expect(state.skillMode).toBeNull();
    expect(state.zhangbaMode).toBe(false);
  });

  it("SELECT_CARDS / SELECT_TARGETS / SET_SKILL_MODE update state", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current[1]({ type: "SELECT_CARDS", ids: ["c1"] }));
    act(() => result.current[1]({ type: "SELECT_TARGETS", ids: ["p1"] }));
    act(() => result.current[1]({ type: "SET_SKILL_MODE", skillId: "s1" }));
    const [state] = result.current;
    expect(state.selectedCardIds).toEqual(["c1"]);
    expect(state.selectedTargetIds).toEqual(["p1"]);
    expect(state.skillMode).toBe("s1");
  });

  it("resets all selection when the decision key changes (SPEC §6.3 — no restoring stale selection)", () => {
    const { result, rerender } = renderHook(({ key }) => useInteraction(key), { initialProps: { key: "dec_1" } });
    act(() => result.current[1]({ type: "SELECT_CARDS", ids: ["c1"] }));
    act(() => result.current[1]({ type: "SELECT_TARGETS", ids: ["p1"] }));
    expect(result.current[0].selectedCardIds).toEqual(["c1"]);

    rerender({ key: "dec_2" });

    expect(result.current[0].selectedCardIds).toEqual([]);
    expect(result.current[0].selectedTargetIds).toEqual([]);
  });

  it("does NOT reset when re-rendered with the same decision key", () => {
    const { result, rerender } = renderHook(({ key }) => useInteraction(key), { initialProps: { key: "dec_1" } });
    act(() => result.current[1]({ type: "SELECT_CARDS", ids: ["c1"] }));
    rerender({ key: "dec_1" });
    expect(result.current[0].selectedCardIds).toEqual(["c1"]);
  });

  it("TOGGLE_TARGET respects the max cap by dropping the oldest pick", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current[1]({ type: "TOGGLE_TARGET", id: "p1", max: 1 }));
    expect(result.current[0].selectedTargetIds).toEqual(["p1"]);
    act(() => result.current[1]({ type: "TOGGLE_TARGET", id: "p2", max: 1 }));
    expect(result.current[0].selectedTargetIds).toEqual(["p2"]); // p1 replaced, not stacked
  });

  it("RESET clears every field including skill/zhangba/asType modes", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => {
      result.current[1]({ type: "SELECT_CARDS", ids: ["c1"] });
      result.current[1]({ type: "SET_ZHANGBA_MODE", on: true });
      result.current[1]({ type: "SET_AS_TYPE", asType: "sha" });
    });
    act(() => result.current[1]({ type: "RESET" }));
    const [state] = result.current;
    expect(state.selectedCardIds).toEqual([]);
    expect(state.zhangbaMode).toBe(false);
    expect(state.selectedAsType).toBeNull();
  });
});
