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

function basePlayer(id: string, seat: number) {
  return {
    id,
    seat,
    name: id,
    role: id === "p0" ? "lord" : undefined,
    roleRevealed: id === "p0",
    generalId: "none",
    faction: "qun",
    gender: "male",
    hp: 4,
    maxHp: 4,
    alive: true,
    hand: id === "p0" ? [] : { count: 0 },
    equipment: {},
    judgmentZone: [],
    shaUsedThisTurn: 0,
    skillUsedThisTurn: {},
  };
}

async function enterRoom(roomCode: string) {
  const user = userEvent.setup();
  render(<App />);
  fakeSocket.fire("connect");
  await waitFor(() => expect(screen.getByPlaceholderText("ใส่ชื่อของคุณ")).toBeInTheDocument());
  await user.type(screen.getByPlaceholderText("ใส่ชื่อของคุณ"), "Alice");
  await user.click(screen.getByRole("button", { name: "สร้างห้องใหม่" }));
  await waitFor(() => expect(sentEvents.some((e) => e.event === "room:create")).toBe(true));
  respondTo("room:create", { ok: true, roomCode, sessionToken: "c".repeat(20), seatIndex: 0 });
  await waitFor(() => expect(screen.getByText(roomCode)).toBeInTheDocument());
  // SPEC 8.3: game:answer is stamped with matchId (gameStore reads it from
  // room:state) — the real server always sends one once a match starts, but
  // this harness only ever fires game:view directly, so supply it here.
  fakeSocket.fire("room:state", { code: roomCode, phase: "playing", seats: [], matchId: "test-match" });
  return user;
}

describe("General select screen", () => {
  it("picking a general and confirming sends game:answer with that choice", async () => {
    const user = await enterRoom("PICKME");

    fakeSocket.fire("game:view", {
      viewerPlayerId: "p0",
      viewerSeatIndex: 0,
      players: [basePlayer("p0", 0), basePlayer("p1", 1), basePlayer("p2", 2)],
      currentTurnPlayerId: "p0",
      turnNumber: 0,
      currentPhase: "prepare",
      drawPileCount: 90,
      discardPile: [], discardPileCount: 0,
      eventStack: [],
      pendingDecision: {
        id: "dec_1",
        kind: "pickGeneral",
        playerId: "p0",
        data: { options: ["caocao", "liubei", "sunquan", "guanyu", "zhaoyun"] },
      },
      finished: false,
      gameLogs: [],
    });

    await waitFor(() => expect(screen.getByText("เลือกนายพลของคุณ")).toBeInTheDocument());
    expect(screen.getByText("โจโฉ")).toBeInTheDocument();
    expect(screen.getByText("เล่าปี่")).toBeInTheDocument();
    // skills are narrated on each general card now
    expect(screen.getByText("พลิกภัยเป็นกล")).toBeInTheDocument(); // caocao_jianxiong
    expect(screen.getByText("ปันทรัพย์รวมใจ")).toBeInTheDocument(); // liubei_rende

    const confirmBtn = screen.getByRole("button", { name: "ยืนยัน" });
    expect(confirmBtn).toBeDisabled();

    await user.click(screen.getByText("โจโฉ"));
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    await waitFor(() => expect(sentEvents.some((e) => e.event === "game:answer")).toBe(true));
    const answerCall = sentEvents.find((e) => e.event === "game:answer")!;
    expect(answerCall.payload).toEqual({ roomCode: "PICKME", matchId: "test-match", decisionId: "dec_1", choice: "caocao", clientActionId: expect.any(String) });
  });

  it("shows a waiting indicator (not the picker) when it's someone else's pick", async () => {
    await enterRoom("WAITED");

    fakeSocket.fire("game:view", {
      viewerPlayerId: "p0",
      viewerSeatIndex: 0,
      players: [basePlayer("p0", 0), basePlayer("p1", 1), basePlayer("p2", 2)],
      currentTurnPlayerId: "p0",
      turnNumber: 0,
      currentPhase: "prepare",
      drawPileCount: 90,
      discardPile: [], discardPileCount: 0,
      eventStack: [],
      pendingDecision: {
        id: "dec_2",
        kind: "pickGeneral",
        playerId: "p1",
        data: { options: ["huanggai", "sunshangxiang", "zhouyu"] },
      },
      finished: false,
      gameLogs: [],
    });

    await waitFor(() => expect(screen.getByText(/รอ p1 เลือกนายพล/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "ยืนยัน" })).not.toBeInTheDocument();
  });

  // SPEC §7.3 — the selector's screen must show a Timer, which previously
  // didn't render anywhere on this screen at all.
  it("shows a countdown when the decision carries a deadline", async () => {
    await enterRoom("TIMER1");
    const now = Date.now();

    fakeSocket.fire("game:view", {
      viewerPlayerId: "p0",
      viewerSeatIndex: 0,
      players: [basePlayer("p0", 0), basePlayer("p1", 1), basePlayer("p2", 2)],
      currentTurnPlayerId: "p0",
      turnNumber: 0,
      currentPhase: "prepare",
      drawPileCount: 90,
      discardPile: [], discardPileCount: 0,
      eventStack: [],
      pendingDecision: {
        id: "dec_timer",
        kind: "pickGeneral",
        playerId: "p0",
        data: { options: ["caocao", "liubei"] },
        startedAt: now,
        expiresAt: now + 15000,
      },
      finished: false,
      gameLogs: [],
      serverNow: now,
    });

    expect(await screen.findByText(/เหลือ \d+ วินาที/)).toBeInTheDocument();
  });
});
