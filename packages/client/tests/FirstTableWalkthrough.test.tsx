import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FirstTableWalkthrough } from "../src/components/FirstTableWalkthrough";
import { useAssistStore } from "../src/store/assistStore";

describe("FirstTableWalkthrough", () => {
  beforeEach(() => {
    localStorage.clear();
    useAssistStore.setState({ level: "basic", walkthrough: { status: "new", step: 0 } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens on the first table, explains all four regions, and completes", async () => {
    const user = userEvent.setup();
    render(<FirstTableWalkthrough />);

    expect(await screen.findByRole("region", { name: "คำแนะนำโต๊ะเล่น" })).toBeInTheDocument();
    expect(screen.getByText("กลางโต๊ะและสถานะปัจจุบัน")).toBeInTheDocument();
    const firstNext = screen.getByRole("button", { name: "ถัดไป" });
    expect(firstNext).toHaveFocus();
    await user.click(firstNext);
    expect(screen.getByText("ผู้เล่นรอบโต๊ะ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(screen.getByText("พื้นที่ของคุณ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(screen.getByText("เมนูช่วยเหลือ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "เข้าใจแล้ว" }));

    expect(screen.queryByRole("region", { name: "คำแนะนำโต๊ะเล่น" })).not.toBeInTheDocument();
    expect(useAssistStore.getState().walkthrough.status).toBe("completed");
  });

  it("pauses on Escape without permanently skipping progress", async () => {
    render(<FirstTableWalkthrough />);
    await screen.findByRole("region", { name: "คำแนะนำโต๊ะเล่น" });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("region", { name: "คำแนะนำโต๊ะเล่น" })).not.toBeInTheDocument();
    expect(useAssistStore.getState().walkthrough).toEqual({ status: "paused", step: 0 });
  });

  it("skips permanently until the player explicitly replays the guide", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FirstTableWalkthrough />);
    await screen.findByRole("region", { name: "คำแนะนำโต๊ะเล่น" });
    await user.click(screen.getByRole("button", { name: "ข้ามคำแนะนำ" }));
    expect(useAssistStore.getState().walkthrough.status).toBe("skipped");

    unmount();
    render(<FirstTableWalkthrough />);
    expect(screen.queryByRole("region", { name: "คำแนะนำโต๊ะเล่น" })).not.toBeInTheDocument();
  });

  it("highlights the current table region and repositions after the viewport changes", async () => {
    const target = document.createElement("div");
    target.className = "table-central-anchor";
    let left = 100;
    target.getBoundingClientRect = () => ({ left, top: 70, width: 260, height: 140, right: left + 260, bottom: 210, x: left, y: 70, toJSON: () => ({}) });
    document.body.appendChild(target);

    const { container } = render(<FirstTableWalkthrough />);
    await waitFor(() => expect(container.querySelector("[data-assist-highlight]")).not.toBeNull());
    const highlight = container.querySelector<HTMLElement>("[data-assist-highlight]")!;
    expect(highlight).toHaveStyle({ left: "92px", top: "62px", width: "276px", height: "156px" });

    left = 130;
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(highlight).toHaveStyle({ left: "122px" }));
    target.remove();
  });

  it("keeps the highlight semantic but disables its travel animation for reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const target = document.createElement("div");
    target.className = "table-central-anchor";
    target.getBoundingClientRect = () => ({ left: 40, top: 40, width: 200, height: 100, right: 240, bottom: 140, x: 40, y: 40, toJSON: () => ({}) });
    document.body.appendChild(target);

    const { container } = render(<FirstTableWalkthrough />);
    await waitFor(() => expect(container.querySelector("[data-assist-highlight]")).not.toBeNull());
    expect(container.querySelector("[data-assist-highlight]")).toHaveStyle({ transition: "none" });
    target.remove();
  });

  it("prefers the compact mobile region when desktop and mobile anchors coexist", async () => {
    useAssistStore.setState({ level: "detailed", walkthrough: { status: "active", step: 1 } });
    const mobile = document.createElement("div");
    mobile.className = "mobile-opponent-rail";
    mobile.getBoundingClientRect = () => ({ left: 12, top: 20, width: 300, height: 64, right: 312, bottom: 84, x: 12, y: 20, toJSON: () => ({}) });
    const desktop = document.createElement("div");
    desktop.className = "table-board-ring";
    desktop.getBoundingClientRect = () => ({ left: 90, top: 90, width: 700, height: 400, right: 790, bottom: 490, x: 90, y: 90, toJSON: () => ({}) });
    document.body.append(mobile, desktop);

    const { container } = render(<FirstTableWalkthrough />);
    await waitFor(() => expect(container.querySelector("[data-assist-highlight]")).not.toBeNull());
    expect(container.querySelector("[data-assist-highlight]")).toHaveStyle({ left: "4px", top: "12px", width: "316px", height: "80px" });
    mobile.remove();
    desktop.remove();
  });

  it("moves the explanation panel away from a lower self-area highlight", async () => {
    useAssistStore.setState({ level: "basic", walkthrough: { status: "active", step: 2 } });
    const selfArea = document.createElement("div");
    selfArea.className = "mobile-command-dock";
    selfArea.getBoundingClientRect = () => ({ left: 20, top: 520, width: 700, height: 160, right: 720, bottom: 680, x: 20, y: 520, toJSON: () => ({}) });
    document.body.appendChild(selfArea);

    render(<FirstTableWalkthrough />);
    const panel = await screen.findByRole("region", { name: "คำแนะนำโต๊ะเล่น" });
    await waitFor(() => expect(panel).toHaveStyle({ top: "24px", bottom: "auto" }));
    selfArea.remove();
  });
});
