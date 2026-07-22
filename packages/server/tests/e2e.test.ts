// End-to-end over a real socket.io transport (ephemeral port, socket.io-client).
// Engine correctness (full games playing out, all 25 generals, both fuzz
// suites) is already exhaustively covered in packages/engine — this file's
// job is the server layer itself: does the protocol wire up correctly, are
// unauthorized/invalid answers rejected safely (the atomicity audit's whole
// payoff), does reconnect-by-token work, does the timeout default fire, and
// does room GC actually reclaim an abandoned room.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import type { RoomStatePayload } from "@tktw/shared";
import { createTktwServer, type TktwServer } from "../src/server";

let server: TktwServer;
let port: number;
const clients: ClientSocket[] = [];

function connectClient(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${port}`, { transports: ["websocket"] });
    clients.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function emitAck<T = Record<string, unknown>>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => resolve(response));
  });
}

function waitForEvent<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

function waitUntilView<T>(socket: ClientSocket, predicate: (v: T) => boolean, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("game:view", handler);
      reject(new Error("waitUntilView: timed out waiting for a matching game:view"));
    }, timeoutMs);
    function handler(v: T) {
      if (!predicate(v)) return;
      clearTimeout(timer);
      socket.off("game:view", handler);
      resolve(v);
    }
    socket.on("game:view", handler);
  });
}

function waitForRoomState(
  socket: ClientSocket,
  predicate: (v: RoomStatePayload) => boolean,
  timeoutMs = 10_000,
): Promise<RoomStatePayload> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("room:state", handler);
      reject(new Error("waitForRoomState: timed out waiting for a matching room:state"));
    }, timeoutMs);
    function handler(v: RoomStatePayload) {
      if (!predicate(v)) return;
      clearTimeout(timer);
      socket.off("room:state", handler);
      resolve(v);
    }
    socket.on("room:state", handler);
  });
}

async function createAndFillRoom(names: string[]) {
  const sockets: ClientSocket[] = [];
  for (const name of names) sockets.push(await connectClient());

  const hostAck = await emitAck<{ ok: true; roomCode: string; sessionToken: string; seatIndex: number }>(
    sockets[0]!,
    "room:create",
    { playerName: names[0] },
  );
  expect(hostAck.ok).toBe(true);
  const roomCode = hostAck.roomCode;
  const tokens = [hostAck.sessionToken];

  for (let i = 1; i < sockets.length; i++) {
    const ack = await emitAck<{ ok: true; sessionToken: string; seatIndex: number }>(
      sockets[i]!,
      "room:join",
      { roomCode, playerName: names[i] },
    );
    expect(ack.ok).toBe(true);
    expect(ack.seatIndex).toBe(i);
    tokens.push(ack.sessionToken);
  }
  return { sockets, roomCode, tokens };
}

beforeEach(async () => {
  server = createTktwServer({
    roomGcGraceMs: 24 * 60 * 60 * 1000,
    roomGcSweepIntervalMs: 60 * 60 * 1000,
    decisionTimeoutMs: 30_000,
  });
  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  port = (server.httpServer.address() as AddressInfo).port;
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.disconnect();
  await server.close();
});

describe("room lifecycle", () => {
  it("create + join populates seats and broadcasts room:state to everyone already in the room", async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    const carol = await connectClient();

    const hostAck = await emitAck<{ ok: true; roomCode: string }>(alice, "room:create", {
      playerName: "Alice",
    });
    const roomCode = hostAck.roomCode;

    // Attach each listener before the join that triggers its broadcast —
    // bob's own "room:state" (2 seats) arrives at Alice on its own network
    // timing, independent of when bob's join ack resolves.
    const afterBobJoins = waitForEvent<{ seats: Array<{ name: string }> }>(alice, "room:state");
    await emitAck(bob, "room:join", { roomCode, playerName: "Bob" });
    await afterBobJoins;

    const afterCarolJoins = waitForEvent<{ seats: Array<{ name: string }> }>(alice, "room:state");
    await emitAck(carol, "room:join", { roomCode, playerName: "Carol" });
    const state = await afterCarolJoins;
    expect(state.seats.map((s) => s.name)).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("rejects starting with fewer than 3 players", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob"]);
    const ack = await emitAck<{ ok: boolean; error?: string }>(sockets[0]!, "room:start", { roomCode });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/at least 3/);
  });

  it("rejects a non-host trying to start", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const ack = await emitAck<{ ok: boolean; error?: string }>(sockets[1]!, "room:start", { roomCode });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/host/);
  });

  it("host starting the game broadcasts an initial game:view to every seat", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const views = Promise.all(sockets.map((s) => waitForEvent<{ viewerId: string }>(s, "game:view")));
    const ack = await emitAck<{ ok: boolean }>(sockets[0]!, "room:start", { roomCode });
    expect(ack.ok).toBe(true);
    const resolved = await views;
    expect(resolved.map((v) => v.viewerId).sort()).toEqual(["p0", "p1", "p2"]);
  });
});

describe("answer authorization and validation", () => {
  it("rejects an answer from a player whose turn it isn't, without disturbing state", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const p0View = waitForEvent<{ pendingDecision?: { id: string; playerId: string } }>(
      sockets[0]!,
      "game:view",
    );
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const view = await p0View;
    // Identity mode's first decision is always the lord (seat 0)'s general pick.
    expect(view.pendingDecision?.playerId).toBe("p0");

    const wrongAck = await emitAck<{ ok: boolean; error?: string }>(sockets[1]!, "game:answer", {
      roomCode,
      decisionId: view.pendingDecision!.id,
      pass: true,
    });
    expect(wrongAck.ok).toBe(false);
    expect(wrongAck.error).toMatch(/not your decision/);
  });

  it("rejects a stale decisionId cleanly", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const ack = await emitAck<{ ok: boolean; error?: string }>(sockets[0]!, "game:answer", {
      roomCode,
      decisionId: "dec_not_real",
      pass: true,
    });
    expect(ack.ok).toBe(false);
  });

  it("the correct player answering advances the game and rebroadcasts views", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const p0View = waitForEvent<{ pendingDecision?: { id: string; playerId: string } }>(
      sockets[0]!,
      "game:view",
    );
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const view = await p0View;

    const nextViews = Promise.all(sockets.map((s) => waitForEvent<{ pendingDecision?: unknown }>(s, "game:view")));
    const ack = await emitAck<{ ok: boolean }>(sockets[0]!, "game:answer", {
      roomCode,
      decisionId: view.pendingDecision!.id,
      pass: true, // "just randomize my general" per pickGeneral's resolvePick semantics
    });
    expect(ack.ok).toBe(true);
    const resolved = await nextViews;
    // every connected seat gets a fresh view after any decision resolves
    expect(resolved).toHaveLength(3);
  });
});

describe("reconnect via session token", () => {
  it("rejoining with the stored token re-attaches the same seat and resends the current view", async () => {
    const { sockets, roomCode, tokens } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    await emitAck(sockets[0]!, "room:start", { roomCode });
    await waitForEvent(sockets[1]!, "game:view"); // let seat 1's view arrive before disconnecting it

    sockets[1]!.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    const reconnected = await connectClient();
    const viewPromise = waitForEvent<{ viewerId: string }>(reconnected, "game:view");
    const ack = await emitAck<{ ok: boolean; seatIndex: number; phase: string }>(
      reconnected,
      "room:rejoin",
      { roomCode, sessionToken: tokens[1] },
    );
    expect(ack.ok).toBe(true);
    expect(ack.seatIndex).toBe(1);
    expect(ack.phase).toBe("playing");
    const view = await viewPromise;
    expect(view.viewerId).toBe("p1");
  });

  it("rejects an unknown session token", async () => {
    const { roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const socket = await connectClient();
    const ack = await emitAck<{ ok: boolean; error?: string }>(socket, "room:rejoin", {
      roomCode,
      sessionToken: "0123456789abcdef0123456789abcdef",
    });
    expect(ack.ok).toBe(false);
  });
});

describe("decision timeout default-answer", () => {
  it("an unanswered decision resolves on its own after the timeout", async () => {
    for (const c of clients.splice(0)) c.disconnect();
    await server.close();
    server = createTktwServer({
      roomGcGraceMs: 24 * 60 * 60 * 1000,
      roomGcSweepIntervalMs: 60 * 60 * 1000,
      decisionTimeoutMs: 50,
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    port = (server.httpServer.address() as AddressInfo).port;

    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const firstView = waitForEvent<{ pendingDecision?: { id: string } }>(sockets[0]!, "game:view");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const first = await firstView;

    // Nobody answers — the 50ms timeout should fire the default answer and
    // move the game to the next decision on its own.
    const second = await waitForEvent<{ pendingDecision?: { id: string } }>(sockets[0]!, "game:view");
    expect(second.pendingDecision?.id).not.toBe(first.pendingDecision?.id);
  });
});

describe("room garbage collection", () => {
  it("sweeps a room once everyone has been disconnected past the grace period", async () => {
    for (const c of clients.splice(0)) c.disconnect();
    await server.close();
    server = createTktwServer({ roomGcGraceMs: 30, roomGcSweepIntervalMs: 20 });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    port = (server.httpServer.address() as AddressInfo).port;

    const socket = await connectClient();
    const createAck = await emitAck<{ ok: true; roomCode: string }>(socket, "room:create", {
      playerName: "Solo",
    });
    expect(server.rooms.getRoom(createAck.roomCode)).toBeDefined();

    socket.disconnect();
    await new Promise((r) => setTimeout(r, 150));

    expect(server.rooms.getRoom(createAck.roomCode)).toBeUndefined();
  });
});

describe("quickstart with bots", () => {
  it("starts immediately, and the bot seats resolve their own decisions with no client input", async () => {
    const socket = await connectClient();

    // Registered before the emit so no broadcast can slip past unheard.
    const firstPick = waitUntilView<{ pendingDecision?: { id: string; playerId: string; kind: string } }>(
      socket,
      (v) => v.pendingDecision?.playerId === "p0" && v.pendingDecision?.kind === "pickGeneral",
      5_000,
    );
    // ENG-004: p0's own turn now opens on a จั่วการ์ด decision it must answer.
    const firstDraw = waitUntilView<{ pendingDecision?: { id: string; playerId: string; kind: string } }>(
      socket,
      (v) => v.pendingDecision?.playerId === "p0" && v.pendingDecision?.kind === "drawCard",
      12_000,
    );
    const backToMainAction = waitUntilView<{ pendingDecision?: { id: string; playerId: string; kind: string } }>(
      socket,
      (v) => v.pendingDecision?.playerId === "p0" && v.pendingDecision?.kind === "mainAction",
      15_000,
    );

    const ack = await emitAck<{ ok: boolean; roomCode: string; seatIndex: number }>(
      socket,
      "room:quickstartWithBots",
      { playerName: "Solo", botCount: 2 },
    );
    expect(ack.ok).toBe(true);
    expect(ack.seatIndex).toBe(0);

    const first = await firstPick;
    expect(first.pendingDecision?.playerId).toBe("p0"); // seat 0 is always the lord, picks first

    // Answer only my own decisions (pick, then draw). From here nobody else
    // answers anything — both bot seats (p1, p2) must resolve their own
    // decisions unattended for control to ever cycle back to p0's mainAction.
    await emitAck(socket, "game:answer", {
      roomCode: ack.roomCode,
      decisionId: first.pendingDecision!.id,
      pass: true,
    });

    const draw = await firstDraw;
    await emitAck(socket, "game:answer", {
      roomCode: ack.roomCode,
      decisionId: draw.pendingDecision!.id,
      choice: "draw",
    });

    const final = await backToMainAction;
    expect(final.pendingDecision?.playerId).toBe("p0");
  });

  it("rejects an out-of-range bot count", async () => {
    const socket = await connectClient();
    const ack = await emitAck<{ ok: boolean; error?: string }>(socket, "room:quickstartWithBots", {
      playerName: "Solo",
      botCount: 0,
    });
    expect(ack.ok).toBe(false);
  });
});

// Phase 2 Part A: player identity (name uniqueness + token authority), explicit
// lobby leave (seat removal + token revocation + re-index), and the mid-match
// connection-status broadcast. Grace-expiry death / forfeit is Part B.
describe("identity, leave & connection status (Phase 2 Part A)", () => {
  it("rejects a duplicate display name (case-insensitive)", async () => {
    const host = await connectClient();
    const hostAck = await emitAck<{ ok: boolean; roomCode: string }>(host, "room:create", {
      playerName: "Alice",
    });
    expect(hostAck.ok).toBe(true);

    const joiner = await connectClient();
    const ack = await emitAck<{ ok: boolean; error?: string }>(joiner, "room:join", {
      roomCode: hostAck.roomCode,
      playerName: "  ALICE ", // different case/whitespace, same identity
    });
    expect(ack.ok).toBe(false);
    expect(ack.error).toContain("ชื่อ");
  });

  it("leaving the lobby removes the seat, re-indexes the rest, and revokes the token", async () => {
    const { sockets, roomCode, tokens } = await createAndFillRoom(["Alice", "Bob", "Carol"]);

    // Carol sits at index 2; once Bob leaves she must be told she's now index 1.
    const carolResynced = waitForRoomState(sockets[2]!, (s) => s.yourSeatIndex === 1);

    const leaveAck = await emitAck<{ ok: boolean }>(sockets[1]!, "room:leave", { roomCode });
    expect(leaveAck.ok).toBe(true);

    const carolState = await carolResynced;
    expect(carolState.seats.map((s) => s.name)).toEqual(["Alice", "Carol"]);

    // Bob's old token is gone — a rejoin with it must fail, not silently
    // re-seat him or take someone else's seat.
    const bobAgain = await connectClient();
    const rejoin = await emitAck<{ ok: boolean }>(bobAgain, "room:rejoin", {
      roomCode,
      sessionToken: tokens[1],
    });
    expect(rejoin.ok).toBe(false);
  });

  it("rejects a rejoin with a forged / unknown session token", async () => {
    const { roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const intruder = await connectClient();
    const ack = await emitAck<{ ok: boolean }>(intruder, "room:rejoin", {
      roomCode,
      sessionToken: "00000000-0000-0000-0000-000000000000",
    });
    expect(ack.ok).toBe(false);
  });

  it("broadcasts connectionStatus=reconnecting when a seat drops mid-match", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const startAck = await emitAck<{ ok: boolean }>(sockets[0]!, "room:start", { roomCode });
    expect(startAck.ok).toBe(true);

    // Carol should hear that Bob's seat (index 1) flipped to reconnecting.
    const seen = waitForRoomState(sockets[2]!, (s) => s.seats[1]?.connectionStatus === "reconnecting");
    sockets[1]!.disconnect();

    const state = await seen;
    expect(state.seats[1]!.connectionStatus).toBe("reconnecting");
    expect(state.seats[1]!.connected).toBe(false);
    // The seat is HELD, not removed — reconnect-by-token is still possible.
    expect(state.seats).toHaveLength(3);
  });
});

// Phase 2 Part B: grace-expiry death, leave-mid-match forfeit, and abandoned.
// These need a real (short) grace window, so each swaps in a fresh server
// configured with gracePeriodMs — the shared beforeEach server keeps the long
// default so it never auto-forfeits under the other suites.
describe("forfeit: grace expiry, leave-mid-match, abandoned (Phase 2 Part B)", () => {
  async function useGraceServer(gracePeriodMs: number): Promise<void> {
    for (const c of clients.splice(0)) c.disconnect();
    await server.close();
    server = createTktwServer({
      roomGcGraceMs: 24 * 60 * 60 * 1000,
      roomGcSweepIntervalMs: 60 * 60 * 1000,
      decisionTimeoutMs: 30_000,
      gracePeriodMs,
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    port = (server.httpServer.address() as AddressInfo).port;
  }

  async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (cond()) return;
      await new Promise((r) => setTimeout(r, 15));
    }
    throw new Error("waitFor: condition not met in time");
  }

  it("grace expiry forfeits the seat: status 'gone', token revoked, seat kept", async () => {
    await useGraceServer(60);
    const { sockets, roomCode, tokens } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    expect((await emitAck<{ ok: boolean }>(sockets[0]!, "room:start", { roomCode })).ok).toBe(true);

    // Bob (seat 1, never the lord) drops and never comes back → after grace,
    // Alice hears the seat flip to "gone".
    const goneSeen = waitForRoomState(sockets[0]!, (s) => s.seats[1]?.connectionStatus === "gone");
    sockets[1]!.disconnect();

    const state = await goneSeen;
    expect(state.seats[1]!.connectionStatus).toBe("gone");
    expect(state.seats).toHaveLength(3); // seat HELD (SPEC 6.7), not removed

    // The forfeited token is revoked — the old one can never rejoin.
    const bobAgain = await connectClient();
    const rejoin = await emitAck<{ ok: boolean }>(bobAgain, "room:rejoin", {
      roomCode,
      sessionToken: tokens[1],
    });
    expect(rejoin.ok).toBe(false);
  });

  it("leaving mid-match forfeits immediately without waiting out the grace window", async () => {
    await useGraceServer(60_000); // long grace — a leave must NOT wait for it
    const { sockets, roomCode, tokens } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    expect((await emitAck<{ ok: boolean }>(sockets[0]!, "room:start", { roomCode })).ok).toBe(true);

    const goneSeen = waitForRoomState(sockets[0]!, (s) => s.seats[1]?.connectionStatus === "gone");
    const leaveAck = await emitAck<{ ok: boolean }>(sockets[1]!, "room:leave", { roomCode });
    expect(leaveAck.ok).toBe(true);

    const state = await goneSeen;
    expect(state.seats[1]!.connectionStatus).toBe("gone");
    expect(state.seats).toHaveLength(3);

    const bobAgain = await connectClient();
    const rejoin = await emitAck<{ ok: boolean }>(bobAgain, "room:rejoin", {
      roomCode,
      sessionToken: tokens[1],
    });
    expect(rejoin.ok).toBe(false);
  });

  it("abandons the match once every human has dropped", async () => {
    await useGraceServer(150);
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    expect((await emitAck<{ ok: boolean }>(sockets[0]!, "room:start", { roomCode })).ok).toBe(true);

    // Drop a NON-lord first (its grace fires first) then the rest. By the time
    // that first forfeit fires, nobody human is connected → abandoned (before a
    // later lord forfeit could turn it into a no_winner result instead).
    sockets[1]!.disconnect();
    sockets[2]!.disconnect();
    sockets[0]!.disconnect();

    await waitFor(() => server.rooms.getRoom(roomCode)?.phase === "abandoned");
    expect(server.rooms.getRoom(roomCode)?.phase).toBe("abandoned");
  });
});
