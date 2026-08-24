// Drives the actual rendered App through create-room -> waiting-room -> start,
// against a fake (but protocol-shaped) socket — proves the buttons are wired
// up and emit exactly what the server expects, not just that they typecheck.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { fakeSocket, sentEvents, respondTo, clearSent } = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers: Record<string, Handler[]> = {};
  const sentEvents: Array<{ event: string; payload: unknown; ack?: (res: unknown) => void }> = [];
  const fakeSocket = {
    connected: false,
    on(event: string, handler: Handler) {
      (handlers[event] ??= []).push(handler);
    },
    emit(event: string, payload: unknown, ack?: (res: unknown) => void) {
      sentEvents.push({ event, payload, ack });
    },
    fire(event: string, ...args: unknown[]) {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
  };
  function respondTo(event: string, response: unknown) {
    const entry = [...sentEvents].reverse().find((e) => e.event === event && e.ack);
    entry?.ack?.(response);
  }
  function clearSent() {
    sentEvents.length = 0;
  }
  return { fakeSocket, sentEvents, respondTo, clearSent };
});

vi.mock("socket.io-client", () => ({ io: () => fakeSocket }));

import App from "../src/App";
import { useGameStore } from "../src/store/gameStore";
import { useAssistStore } from "../src/store/assistStore";

// The zustand store is a module-level singleton — it survives across `it()`
// blocks in the same file even though each block mounts a fresh <App/>, so
// without this reset the 2nd test would inherit the 1st test's room/session.
beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 768 });
  clearSent();
  useGameStore.setState({
    connected: false,
    initialized: false,
    roomCode: null,
    sessionToken: null,
    seatIndex: null,
    matchId: null,
    roomState: null,
    gameView: null,
    matchResult: null,
    error: null,
    answeringId: null,
  });
  useAssistStore.setState({ level: "basic", walkthrough: { status: "new", step: 0 } });
});

describe("Lobby -> waiting room -> start", () => {
  it("creating a room emits room:create and renders the waiting room from the ack", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await user.click(await screen.findByRole("button", { name: "สร้างห้องใหม่" }));
    await waitFor(() => expect(screen.getAllByPlaceholderText("ใส่ชื่อของคุณ").length).toBeGreaterThan(0));
    await user.type(screen.getAllByPlaceholderText("ใส่ชื่อของคุณ")[0]!, "Alice");
    await user.click(screen.getByRole("button", { name: "สร้างห้อง" }));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
    const createCall = sentEvents.find((e) => e.event === "room:create")!;
    expect(createCall.payload).toEqual({ playerName: "Alice", settings: { preset: "standard" } });

    respondTo("room:create", { ok: true, roomCode: "ABCDEF", sessionToken: "a".repeat(20), seatIndex: 0 });

    await waitFor(() => expect(screen.getByText("ABCDEF")).toBeInTheDocument());

    fakeSocket.fire("room:state", {
      code: "ABCDEF",
      phase: "lobby",
      settings: { preset: "beginner", decisionTimeoutSec: 60, reconnectGraceSec: 90, revealDurationSec: 10, botAnswerDelayMs: 900 },
      seats: [
        { name: "Alice", connected: true, isHost: true },
        { name: "Bob", connected: true, isHost: false },
        { name: "Carol", connected: true, isHost: false },
      ],
    });

    const pacing = await screen.findByRole("region", { name: "กติกาห้อง" });
    expect(within(pacing).getByText("มือใหม่")).toBeInTheDocument();
    expect(within(pacing).getByText("ตัดสินใจ 60 วิ")).toBeInTheDocument();
    expect(within(pacing).getByText("กลับเข้าเกม 90 วิ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ตั้งค่าคำแนะนำ" }));
    expect(screen.getByText(/ห้องผู้เริ่มต้นแนะนำระดับ “ละเอียด”/)).toBeInTheDocument();
    expect(useAssistStore.getState().level).toBe("basic");
    await user.click(screen.getByRole("button", { name: "เสร็จสิ้น" }));

    const startBtn = await screen.findByRole("button", { name: /เริ่มศึก/ });
    await waitFor(() => expect(startBtn).toBeEnabled());

    await user.click(startBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:start")).toBe(true));
    expect(sentEvents.find((e) => e.event === "room:start")!.payload).toEqual({ roomCode: "ABCDEF" });
  });

  it("the start button stays disabled below 3 players", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await user.click(await screen.findByRole("button", { name: "สร้างห้องใหม่" }));
    await waitFor(() => expect(screen.getAllByPlaceholderText("ใส่ชื่อของคุณ").length).toBeGreaterThan(0));
    await user.type(screen.getAllByPlaceholderText("ใส่ชื่อของคุณ")[0]!, "Alice");
    await user.click(screen.getByRole("button", { name: "สร้างห้อง" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
    respondTo("room:create", { ok: true, roomCode: "GHIJKL", sessionToken: "b".repeat(20), seatIndex: 0 });
    await waitFor(() => expect(screen.getByText("GHIJKL")).toBeInTheDocument());

    fakeSocket.fire("room:state", {
      code: "GHIJKL",
      phase: "lobby",
      settings: { preset: "standard", decisionTimeoutSec: 30, reconnectGraceSec: 45, revealDurationSec: 8, botAnswerDelayMs: 600 },
      seats: [{ name: "Alice", connected: true, isHost: true }],
    });

    const startBtn = await screen.findByRole("button", { name: /เริ่มศึก/ });
    expect(startBtn).toBeDisabled();
  });

  it("keeps advanced custom settings collapsed and emits a complete bounded custom selection", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await user.click(await screen.findByRole("button", { name: "สร้างห้องใหม่" }));
    const advanced = await screen.findByRole("button", { name: "ตั้งค่าขั้นสูง" });
    expect(advanced).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("spinbutton", { name: "เวลาตัดสินใจ (วินาที)" })).not.toBeInTheDocument();

    await user.click(advanced);
    expect(advanced).toHaveAttribute("aria-expanded", "true");
    const decision = screen.getByRole("spinbutton", { name: "เวลาตัดสินใจ (วินาที)" });
    await user.clear(decision);
    expect(screen.getByRole("button", { name: "สร้างห้อง" })).toBeDisabled();
    await user.type(decision, "75");
    await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Custom Host");
    await user.click(screen.getByRole("button", { name: "สร้างห้อง" }));

    await waitFor(() => expect(sentEvents.some((event) => event.event === "room:create")).toBe(true));
    expect(sentEvents.find((event) => event.event === "room:create")?.payload).toEqual({
      playerName: "Custom Host",
      settings: { preset: "custom", decisionTimeoutSec: 75, reconnectGraceSec: 45, revealDurationSec: 8, botAnswerDelayMs: 600 },
    });
  });

  it("uses the same selected named preset for bot quickstart", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await user.click(await screen.findByRole("button", { name: "สร้างห้องใหม่" }));
    await user.click(await screen.findByRole("button", { name: /รวดเร็ว/ }));
    await user.click(screen.getByRole("button", { name: "เล่นกับบอท (ทดสอบคนเดียว)" }));

    await waitFor(() => expect(sentEvents.some((event) => event.event === "room:quickstartWithBots")).toBe(true));
    expect(sentEvents.find((event) => event.event === "room:quickstartWithBots")?.payload).toEqual({
      playerName: "ผู้เล่นทดสอบ",
      botCount: 2,
      settings: { preset: "fast" },
    });
  });

  it("keeps preset and advanced controls scrollable at the 740x360 compact gate", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 740 });
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 360 });
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await user.click(await screen.findByRole("button", { name: "สร้างห้องใหม่" }));
    const dialog = await screen.findByRole("dialog", { name: "สร้างห้องใหม่" });
    expect(dialog).toHaveStyle({ maxHeight: "94vh", overflowY: "auto" });
    expect(within(dialog).getAllByRole("button", { pressed: false }).length).toBe(2);
    await user.click(within(dialog).getByRole("button", { name: "ตั้งค่าขั้นสูง" }));
    expect(within(dialog).getAllByRole("spinbutton")).toHaveLength(4);
  });
});
