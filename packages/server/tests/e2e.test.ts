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
