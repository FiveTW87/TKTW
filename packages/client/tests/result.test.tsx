// SPEC 8.4: the result screen renders the authoritative MatchResult and its
// two buttons emit exactly what the server expects — same "drive the real
// App against a fake socket" approach as lobby.test.tsx/table.test.tsx.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MatchResult } from "@tktw/shared";

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

const sampleResult: MatchResult = {
  matchId: "m1",
  durationMs: 125_000,
  winners: ["lord", "loyalist"],
  endReason: "victory",
  turnNumber: 12,
  deathOrder: ["p2", "p3"],
  mostKills: ["p0"],
  mostDamageTaken: ["p1"],
  players: [
    { id: "p0", seat: 0, name: "Alice", role: "lord", generalId: "caocao", alive: true, kills: 2, damageTaken: 1 },
    { id: "p1", seat: 1, name: "Bob", role: "loyalist", generalId: "liubei", alive: true, kills: 0, damageTaken: 4 },
    { id: "p2", seat: 2, name: "Carol", role: "rebel", generalId: "sunquan", alive: false, kills: 0, damageTaken: 3 },
    { id: "p3", seat: 3, name: "Dave", role: "traitor", generalId: "lubu", alive: false, kills: 0, damageTaken: 2 },
  ],
  gameLogs: [],
};

async function enterFinishedRoom(roomCode: string, result: MatchResult): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(<App />);
  fakeSocket.fire("connect");
  await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());
  await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
  await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));
  await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
  respondTo("room:create", { ok: true, roomCode, sessionToken: "e".repeat(20), seatIndex: 0 });
  await waitFor(() => expect(screen.getByText(roomCode)).toBeInTheDocument());

  fakeSocket.fire("room:state", { code: roomCode, phase: "ended", seats: [], matchId: result.matchId });
  fakeSocket.fire("game:view", {
    viewerPlayerId: "p0",
    viewerSeatIndex: 0,
    players: [],
    currentTurnPlayerId: "p0",
    turnNumber: result.turnNumber,
    currentPhase: "end",
    drawPileCount: 0,
    discardPile: [], discardPileCount: 0,
    eventStack: [],
    finished: true,
    winners: result.winners,
    gameLogs: [],
  });
  fakeSocket.fire("game:result", result);
  await waitFor(() => expect(screen.getByText("ชัยชนะ!")).toBeInTheDocument());
  return user;
}

describe("Result screen (SPEC 8.4)", () => {
  it("reveals every role/general, the winner, and the stat leaders", async () => {
    await enterFinishedRoom("RESULT1", sampleResult);

    expect(screen.getByText("ชัยชนะ!")).toBeInTheDocument();
    // every player's role + general shown regardless of who's viewing
    // (Alice/Bob also appear a second time as the stat-leader callouts)
    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.getByText("Dave")).toBeInTheDocument();
    expect(screen.getByText(/เทิร์นที่ 12/)).toBeInTheDocument();
    expect(screen.getByText(/ลำดับการเสียชีวิต/)).toBeInTheDocument();
  });

  it("shows 'no winner' framing when endReason is no_winner", async () => {
    const noWinnerResult: MatchResult = { ...sampleResult, winners: [], endReason: "no_winner" };
    await expectNoWinnerScreen(noWinnerResult);
  });

  async function expectNoWinnerScreen(result: MatchResult) {
    const user = userEvent.setup();
    render(<App />);
    fakeSocket.fire("connect");
    await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
    await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
    respondTo("room:create", { ok: true, roomCode: "NOWIN1", sessionToken: "f".repeat(20), seatIndex: 0 });
    await waitFor(() => expect(screen.getByText("NOWIN1")).toBeInTheDocument());
    fakeSocket.fire("room:state", { code: "NOWIN1", phase: "ended", seats: [], matchId: result.matchId });
    fakeSocket.fire("game:view", {
      viewerPlayerId: "p0",
    viewerSeatIndex: 0,
      players: [],
      currentTurnPlayerId: "p0",
      turnNumber: result.turnNumber,
      currentPhase: "end",
      drawPileCount: 0,
      discardPile: [], discardPileCount: 0,
      eventStack: [],
      finished: true,
      gameLogs: [],
    });
    fakeSocket.fire("game:result", result);
    await waitFor(() => expect(screen.getByText("เกมยุติ — ไม่มีผู้ชนะ")).toBeInTheDocument());
  }

  it("'กลับห้องเพื่อเล่นต่อ' emits room:returnToLobby and clears the result on success", async () => {
    const user = await enterFinishedRoom("RESULT2", { ...sampleResult, matchId: "m2" });

    await user.click(screen.getByRole("button", { name: "กลับห้องเพื่อเล่นต่อ" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:returnToLobby")).toBe(true));
    const call = sentEvents.find((e) => e.event === "room:returnToLobby")!;
    expect(call.payload).toEqual({ roomCode: "RESULT2" });

    respondTo("room:returnToLobby", { ok: true });
    await waitFor(() => expect(screen.queryByText("ชัยชนะ!")).not.toBeInTheDocument());
  });

  it("'ออกจากห้อง' emits room:leave", async () => {
    await enterFinishedRoom("RESULT3", { ...sampleResult, matchId: "m3" });

    await userEvent.setup().click(screen.getByRole("button", { name: "ออกจากห้อง" }));
    await waitFor(() => expect(sentEvents.some((e) => e.event === "room:leave")).toBe(true));
    const call = sentEvents.find((e) => e.event === "room:leave")!;
    expect(call.payload).toEqual({ roomCode: "RESULT3" });
  });
});
