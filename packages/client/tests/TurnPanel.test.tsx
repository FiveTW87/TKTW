import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnPanel } from "../src/components/board/TurnPanel";

describe("TurnPanel urgency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("enters one explicit live urgent state at five seconds and reaches zero", () => {
    const expiresAt = Date.now() + 7_000;
    const { container } = render(<TurnPanel turnNumber={1} phaseLabel="เฟสลงการ์ด" currentTurnPlayerName="โจโฉ" expiresAt={expiresAt} serverNow={Date.now()} />);
    expect(container.firstElementChild).not.toHaveClass("is-urgent");
    expect(screen.queryByText("ด่วน")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2_000));
    expect(container.firstElementChild).toHaveClass("is-urgent");
    expect(screen.getByText("ด่วน")).toHaveAttribute("aria-live", "assertive");
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
