import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card, PlayerView } from "@tktw/shared";
import { useTableTransientUi } from "../src/hooks/useTableTransientUi";

const card = { id: "c1", typeKey: "sha", suit: "spade", rank: 7 } as Card;
const player = { id: "p1", name: "Bob" } as PlayerView;

afterEach(() => vi.useRealTimers());

describe("useTableTransientUi", () => {
  it("replaces and expires notices from one timer", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTableTransientUi({ decisionKey: "d1", matchId: "m1", viewerAlive: true }));
    act(() => result.current.notice.show("first"));
    act(() => { vi.advanceTimersByTime(1000); result.current.notice.show("second"); });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.state.notice).toBe("second");
    act(() => vi.advanceTimersByTime(900));
    expect(result.current.state.notice).toBeNull();
  });

  it("resets decision-scoped card/play choices while preserving table-scoped overlays and toast", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ key }) => useTableTransientUi({ decisionKey: key, matchId: "m1", viewerAlive: true }),
      { initialProps: { key: "d1" } },
    );
    act(() => {
      result.current.inspection.openPlayer(player);
      result.current.inspection.openCard(card, true);
      result.current.playChoice.open({ card, options: [] });
      result.current.discard.open();
      result.current.leaveConfirm.open();
      result.current.notice.show("old decision");
      result.current.toast.show({ glyph: "魏", name: "skill", owner: "曹操" });
    });

    rerender({ key: "d2" });
    expect(result.current.state.inspectingCard).toBeNull();
    expect(result.current.state.playChoice).toBeNull();
    expect(result.current.state.notice).toBeNull();
    expect(result.current.state.inspectingPlayer).toBe(player);
    expect(result.current.state.discardOpen).toBe(true);
    expect(result.current.state.leaveConfirmOpen).toBe(true);
    expect(result.current.state.toast?.name).toBe("skill");
    act(() => vi.advanceTimersByTime(1600));
    expect(result.current.state.toast).toBeNull();
  });

  it("keeps same-decision choices and scopes death dismissal to a match", () => {
    const { result, rerender } = renderHook(
      ({ key, matchId }) => useTableTransientUi({ decisionKey: key, matchId, viewerAlive: false }),
      { initialProps: { key: "d1", matchId: "m1" } },
    );
    act(() => result.current.inspection.openCard(card, true));
    rerender({ key: "d1", matchId: "m1" });
    expect(result.current.state.inspectingCard?.card.id).toBe(card.id);
    expect(result.current.state.showDeathDialog).toBe(true);
    act(() => result.current.death.dismiss());
    expect(result.current.state.showDeathDialog).toBe(false);
    rerender({ key: "d1", matchId: "m2" });
    expect(result.current.state.showDeathDialog).toBe(true);
  });
});
