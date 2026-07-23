// Drives the actual rendered App through create-room -> waiting-room -> start,
// against a fake (but protocol-shaped) socket — proves the buttons are wired
// up and emit exactly what the server expects, not just that they typecheck.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

// The zustand store is a module-level singleton — it survives across `it()`
// blocks in the same file even though each block mounts a fresh <App/>, so
// without this reset the 2nd test would inherit the 1st test's room/session.
beforeEach(() => {
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
});

describe("Lobby -> waiting room -> start", () => {
  it("creating a room emits room:create and renders the waiting room from the ack", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
    await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));

    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
    const createCall = sentEvents.find((e) => e.event === "room:create")!;
    expect(createCall.payload).toEqual({ playerName: "Alice" });

    respondTo("room:create", { ok: true, roomCode: "ABCDEF", sessionToken: "a".repeat(20), seatIndex: 0 });

    await waitFor(() => expect(screen.getByText("ABCDEF")).toBeInTheDocument());

    fakeSocket.fire("room:state", {
      code: "ABCDEF",
      phase: "lobby",
      seats: [
        { name: "Alice", connected: true, isHost: true },
        { name: "Bob", connected: true, isHost: false },
        { name: "Carol", connected: true, isHost: false },
      ],
    });

    const startBtn = await screen.findByRole("button", { name: /เริ่มเกม/ });
    await waitFor(() => expect(startBtn).toBeEnabled());

    await user.click(startBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:start")).toBe(true));
    expect(sentEvents.find((e) => e.event === "room:start")!.payload).toEqual({ roomCode: "ABCDEF" });
  });

  it("the start button stays disabled below 3 players", async () => {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");

    await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
    await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
    respondTo("room:create", { ok: true, roomCode: "GHIJKL", sessionToken: "b".repeat(20), seatIndex: 0 });
    await waitFor(() => expect(screen.getByText("GHIJKL")).toBeInTheDocument());

    fakeSocket.fire("room:state", {
      code: "GHIJKL",
      phase: "lobby",
      seats: [{ name: "Alice", connected: true, isHost: true }],
    });

    const startBtn = await screen.findByRole("button", { name: /เริ่มเกม/ });
    expect(startBtn).toBeDisabled();
  });
});
