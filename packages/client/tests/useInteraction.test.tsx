import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useInteraction } from "../src/hooks/useInteraction";

describe("useInteraction", () => {
  it("starts empty and exposes no reducer vocabulary", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    expect(result.current.state).toEqual({
      selectedCardIds: [], selectedTargetIds: [], skillMode: null, zhangbaMode: false, selectedAsType: null,
    });
  });

  it("exposes an empty selection immediately when the decision changes", () => {
    const { result, rerender } = renderHook(({ key }) => useInteraction(key), { initialProps: { key: "dec_1" } });
    act(() => result.current.commands.beginPlay(["c1"], "sha", ["p1"]));
    expect(result.current.state.selectedCardIds).toEqual(["c1"]);
    rerender({ key: "dec_2" });
    expect(result.current.state.selectedCardIds).toEqual([]);
    expect(result.current.state.selectedTargetIds).toEqual([]);
    expect(result.current.state.selectedAsType).toBeNull();
  });

  it("preserves selection across same-key rerenders", () => {
    const { result, rerender } = renderHook(({ key }) => useInteraction(key), { initialProps: { key: "dec_1" } });
    act(() => result.current.commands.setCards(["c1"]));
    rerender({ key: "dec_1" });
    expect(result.current.state.selectedCardIds).toEqual(["c1"]);
  });

  it("beginPlay, beginSkill, and beginZhangba atomically clear incompatible modes", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current.commands.beginPlay(["c1"], "sha", ["p1"]));
    expect(result.current.state).toMatchObject({ selectedCardIds: ["c1"], selectedTargetIds: ["p1"], selectedAsType: "sha", skillMode: null, zhangbaMode: false });
    act(() => result.current.commands.beginSkill("lijian"));
    expect(result.current.state).toMatchObject({ selectedCardIds: [], selectedTargetIds: [], selectedAsType: null, skillMode: "lijian", zhangbaMode: false });
    act(() => result.current.commands.beginZhangba());
    expect(result.current.state).toMatchObject({ selectedCardIds: [], selectedTargetIds: [], selectedAsType: null, skillMode: null, zhangbaMode: true });
  });

  it("independent targets drop the oldest selection at the cap", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current.commands.toggleIndependentTarget("p1", 2));
    act(() => result.current.commands.toggleIndependentTarget("p2", 2));
    act(() => result.current.commands.toggleIndependentTarget("p3", 2));
    expect(result.current.state.selectedTargetIds).toEqual(["p2", "p3"]);
  });

  it("dependent targets preserve first→second ordering and support reset/replacement", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current.commands.stepDependentTarget("p1"));
    act(() => result.current.commands.stepDependentTarget("p2"));
    expect(result.current.state.selectedTargetIds).toEqual(["p1", "p2"]);
    act(() => result.current.commands.stepDependentTarget("p3"));
    expect(result.current.state.selectedTargetIds).toEqual(["p1", "p3"]);
    act(() => result.current.commands.stepDependentTarget("p3"));
    expect(result.current.state.selectedTargetIds).toEqual(["p1"]);
    act(() => result.current.commands.stepDependentTarget("p1"));
    expect(result.current.state.selectedTargetIds).toEqual([]);
  });

  it("reset clears cards, targets, and every mode", () => {
    const { result } = renderHook(() => useInteraction("dec_1"));
    act(() => result.current.commands.beginPlay(["c1"], "sha", ["p1"]));
    act(() => result.current.commands.reset());
    expect(result.current.state).toMatchObject({ selectedCardIds: [], selectedTargetIds: [], skillMode: null, zhangbaMode: false, selectedAsType: null });
  });
});
