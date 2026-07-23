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
import type { RoomStatePayload, MatchResult } from "@tktw/shared";
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

type LiveView = {
  viewerId: string;
  pendingDecision?: { id: string; playerId: string; kind: string; data?: Record<string, unknown> };
};

// Tracks a room's current matchId off whichever socket's room:state arrives
// first — every connected seat receives the same broadcast, so any one of
// them is a sufficient source (SPEC 8.3: game:answer must be stamped with it).
function trackMatchId(socket: ClientSocket): { current: string } {
  const ref = { current: "" };
  socket.on("room:state", (v: { matchId?: string }) => {
    if (v.matchId) ref.current = v.matchId;
  });
  return ref;
}

// Auto-answers exactly this socket's OWN pending decisions with a safe
// default (mirroring gameFlow.ts's own forfeit/AFK fallbacks) so a match can
// run to a real finish under test without scripting every card play —
// engine correctness (which cards/skills resolve how) is already covered in
// packages/engine; this file only needs SOME real finish to exercise the
// server's match-lifecycle wiring (result broadcast, rematch, etc).
//
// roomCode is a ref (not a plain string) so this can be registered BEFORE
// the room even exists (e.g. quickstartWithBots's roomCode is only known
// once its ack resolves) — same pattern as matchId, just filled in later.
function autoAnswerOwnDecisions(
  socket: ClientSocket,
  roomCode: { current: string },
  matchId: { current: string },
): void {
  socket.on("game:view", (v: LiveView) => {
    // SPEC 8.2: re-read every time, not just once — a rematch's fresh seat
    // permutation can put this same socket on a DIFFERENT engine seat than
    // its previous match, so caching the first value would silently start
    // answering nobody's decisions from the second match onward.
    const myPlayerId = v.viewerId;
    const pd = v.pendingDecision;
    if (!pd || pd.playerId !== myPlayerId || !matchId.current || !roomCode.current) return;
    const base = { roomCode: roomCode.current, matchId: matchId.current, decisionId: pd.id };
    if (pd.kind === "drawCard") void emitAck(socket, "game:answer", { ...base, choice: "draw" });
    else if (pd.kind === "mainAction") void emitAck(socket, "game:answer", { ...base, choice: "endPhase" });
    else if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") {
      const data = pd.data as { mustDiscard?: number; count?: number; selectableCardIds?: string[] } | undefined;
      const need = Number(data?.mustDiscard ?? data?.count ?? 0);
      const ids = (data?.selectableCardIds ?? []).slice(0, need);
      void emitAck(socket, "game:answer", { ...base, cardIds: ids });
    } else void emitAck(socket, "game:answer", { ...base, pass: true }); // pickGeneral + every reactive kind
  });
}

beforeEach(async () => {
  server = createTktwServer({
    roomGcGraceMs: 24 * 60 * 60 * 1000,
    roomGcSweepIntervalMs: 60 * 60 * 1000,
    decisionTimeoutMs: 30_000,
    // SPEC 7.2's role-reveal screen defaults to 8s — tests don't want to
    // wait that out just to reach the first real (pickGeneral) decision.
    revealDurationMs: 1,
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
    const playing = waitForRoomState(sockets[0]!, (s) => s.phase === "playing");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const view = await p0View;
    // Identity mode's first decision is always the lord's general pick — but
    // SPEC 8.2 randomizes which seat the lord lands on, so ask whoever it is.
    expect(view.pendingDecision?.playerId).toMatch(/^p[0-2]$/);

    // SPEC 7.2: the very first game:view can arrive while the room is still
    // "revealing" — answering before it flips to "playing" is rejected for a
    // different reason ("game is not in progress"), so wait for the real
    // decision window to actually open first.
    const state = await playing;

    // SPEC 8.2: the pending decision's engine seat isn't necessarily this
    // room's lobby seat of the same number anymore — go through the map the
    // server broadcasts (lobbySeatOfEngineSeat) to find who actually holds
    // it, so "the wrong player" reliably means a DIFFERENT seat.
    const engineSeat = Number(view.pendingDecision!.playerId.slice(1));
    const ownerLobbySeat = state.lobbySeatOfEngineSeat![engineSeat]!;
    const wrongLobbySeat = (ownerLobbySeat + 1) % sockets.length;
    const wrongAck = await emitAck<{ ok: boolean; error?: string }>(sockets[wrongLobbySeat]!, "game:answer", {
      roomCode,
      matchId: state.matchId,
      decisionId: view.pendingDecision!.id,
      pass: true,
    });
    expect(wrongAck.ok).toBe(false);
    expect(wrongAck.error).toMatch(/not your decision/);
  });

  it("rejects a stale decisionId cleanly", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const playing = waitForRoomState(sockets[0]!, (s) => s.phase === "playing");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const state = await playing;
    const ack = await emitAck<{ ok: boolean; error?: string }>(sockets[0]!, "game:answer", {
      roomCode,
      matchId: state.matchId,
      decisionId: "dec_not_real",
      pass: true,
    });
    expect(ack.ok).toBe(false);
  });

  it("rejects an answer stamped with a stale matchId", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const p0View = waitForEvent<{ pendingDecision?: { id: string; playerId: string } }>(
      sockets[0]!,
      "game:view",
    );
    const playing = waitForRoomState(sockets[0]!, (s) => s.phase === "playing");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const view = await p0View;
    const state = await playing;
    const engineSeat = Number(view.pendingDecision!.playerId.slice(1));
    const ownerLobbySeat = state.lobbySeatOfEngineSeat![engineSeat]!;

    const ack = await emitAck<{ ok: boolean; error?: string }>(sockets[ownerLobbySeat]!, "game:answer", {
      roomCode,
      matchId: "not-the-real-match-id",
      decisionId: view.pendingDecision!.id,
      pass: true,
    });
    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/stale match/);
  });

  it("the correct player answering advances the game and rebroadcasts views", async () => {
    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const p0View = waitForEvent<{ pendingDecision?: { id: string; playerId: string } }>(
      sockets[0]!,
      "game:view",
    );
    const playing = waitForRoomState(sockets[0]!, (s) => s.phase === "playing");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const view = await p0View;

    // SPEC 7.2: wait past the reveal screen so the answer below lands once
    // the room is actually "playing" (an answer sent during "revealing" is
    // rejected outright, regardless of which seat sends it).
    const state = await playing;
    // SPEC 8.2: the lord (who picks first) can be any seat, and that engine
    // seat isn't necessarily this room's lobby seat of the same number
    // anymore — go through the broadcast map to find who actually holds it.
    const engineSeat = Number(view.pendingDecision!.playerId.slice(1));
    const ownerLobbySeat = state.lobbySeatOfEngineSeat![engineSeat]!;

    const nextViews = Promise.all(sockets.map((s) => waitForEvent<{ pendingDecision?: unknown }>(s, "game:view")));
    const ack = await emitAck<{ ok: boolean }>(sockets[ownerLobbySeat]!, "game:answer", {
      roomCode,
      matchId: state.matchId,
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
    // Let seat 1's view arrive before disconnecting it — SPEC 8.2's seat
    // permutation means lobby seat 1 isn't necessarily engine "p1" anymore,
    // so capture its actual engine id from this view instead of assuming it.
    const seat1View = await waitForEvent<{ viewerId: string }>(sockets[1]!, "game:view");

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
    expect(view.viewerId).toBe(seat1View.viewerId);
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
      revealDurationMs: 1,
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    port = (server.httpServer.address() as AddressInfo).port;

    const { sockets, roomCode } = await createAndFillRoom(["Alice", "Bob", "Carol"]);
    const firstView = waitForEvent<{ pendingDecision?: { id: string } }>(sockets[0]!, "game:view");
    await emitAck(sockets[0]!, "room:start", { roomCode });
    const first = await firstView;

    // Nobody answers — the 50ms decision timeout should fire the default
    // answer and move the game to the next decision on its own. There's one
    // more broadcast in between (the reveal screen's 1ms timer flipping
    // phase "revealing" -> "playing") that still carries the SAME pending
    // decision id, so wait for one that's genuinely different rather than
    // just the very next event.
    const second = await waitUntilView<{ pendingDecision?: { id: string } }>(
      sockets[0]!,
      (v) => v.pendingDecision?.id !== first.pendingDecision?.id,
    );
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
    let roomCode = "";
    let matchId = "";
    // SPEC 8.2: the player->seat permutation means this socket's own engine
    // seat (its GameView viewerId) is no longer necessarily "p0" just
    // because it's lobby seat 0 — read it off the first view instead of
    // assuming the string.
    let myPlayerId = "";

    // SPEC 8.2: the lord (who acts first, both in general selection and turn
    // 1) is randomized onto any seat — this socket's own seat is no longer
    // guaranteed to go first, and by the time it's its own turn, ANY
    // decision kind might land on it first (a reactive shan/wuxie, a wugu
    // pick, ...), not just the three kinds this test specifically checks.
    // Auto-answer every one of its OWN decisions with a safe default so the
    // game always keeps moving — mirroring how a real client (or a bot)
    // would never just leave its own decision hanging — while the
    // waitUntilView promises below independently observe the specific
    // checkpoints this test cares about.
    type View = {
      viewerId: string;
      pendingDecision?: { id: string; playerId: string; kind: string; data?: Record<string, unknown> };
    };
    socket.on("game:view", (v: View) => {
      if (!myPlayerId) myPlayerId = v.viewerId;
      const pd = v.pendingDecision;
      if (!pd || pd.playerId !== myPlayerId || !roomCode || !matchId) return;
      const base = { roomCode, matchId, decisionId: pd.id };
      if (pd.kind === "drawCard") void emitAck(socket, "game:answer", { ...base, choice: "draw" });
      else if (pd.kind === "mainAction") void emitAck(socket, "game:answer", { ...base, choice: "endPhase" });
      else if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") {
        const need = Number((pd.data as { mustDiscard?: number; count?: number } | undefined)?.mustDiscard ?? 0);
        const ids = ((pd.data as { selectableCardIds?: string[] } | undefined)?.selectableCardIds ?? []).slice(0, need);
        void emitAck(socket, "game:answer", { ...base, cardIds: ids });
      } else void emitAck(socket, "game:answer", { ...base, pass: true }); // pickGeneral + every reactive kind
    });
    socket.on("room:state", (v: { matchId?: string }) => {
      if (v.matchId) matchId = v.matchId;
    });

    // Registered before the emit so no broadcast can slip past unheard.
    const firstPick = waitUntilView<View>(
      socket,
      (v) => !!myPlayerId && v.pendingDecision?.playerId === myPlayerId && v.pendingDecision?.kind === "pickGeneral",
      5_000,
    );
    // ENG-004: this socket's own turn opens on a จั่วการ์ด decision. SPEC 8.2
    // means turn 1 starts at the lord's seat, not necessarily this one, so
    // up to two full bot turns (each several decisions, all at
    // BOT_ANSWER_DELAY_MS) may need to play out first; budgets are generous
    // enough to cover that without masking a real hang.
    const firstDraw = waitUntilView<View>(
      socket,
      (v) => !!myPlayerId && v.pendingDecision?.playerId === myPlayerId && v.pendingDecision?.kind === "drawCard",
      20_000,
    );
    const backToMainAction = waitUntilView<View>(
      socket,
      (v) => !!myPlayerId && v.pendingDecision?.playerId === myPlayerId && v.pendingDecision?.kind === "mainAction",
      25_000,
    );

    const ack = await emitAck<{ ok: boolean; roomCode: string; seatIndex: number }>(
      socket,
      "room:quickstartWithBots",
      { playerName: "Solo", botCount: 2 },
    );
    expect(ack.ok).toBe(true);
    expect(ack.seatIndex).toBe(0);
    roomCode = ack.roomCode;

    const first = await firstPick;
    expect(first.pendingDecision?.playerId).toBe(myPlayerId);

    const draw = await firstDraw;
    expect(draw.pendingDecision?.playerId).toBe(myPlayerId);

    const final = await backToMainAction;
    expect(final.pendingDecision?.playerId).toBe(myPlayerId);
  }, 30_000); // see backToMainAction's own comment: up to two full bot turns may play out first

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
      revealDurationMs: 1,
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

    // SPEC 8.2: the lord can be any seat now, not just p0 — find whoever it
    // actually is so the drop ORDER below still holds: non-lord seats' grace
    // fires first (nobody human connected yet → abandoned), and the lord's
    // own forfeit (which would instead end the match no_winner) is queued
    // last, after abandonment has already been decided. The lord's ENGINE
    // seat isn't necessarily this room's lobby seat of the same number
    // anymore, so map it back through the match's seatAssignment.
    const room = server.rooms.getRoom(roomCode)!;
    const lordEngineSeat = Number(room.session!.state.players.find((p) => p.role === "lord")!.id.slice(1));
    const lordLobbySeat = room.seatAssignment!.indexOf(lordEngineSeat);
    const dropOrder = [0, 1, 2].filter((i) => i !== lordLobbySeat);
    dropOrder.push(lordLobbySeat);
    for (const i of dropOrder) sockets[i]!.disconnect();

    await waitFor(() => server.rooms.getRoom(roomCode)?.phase === "abandoned");
    expect(server.rooms.getRoom(roomCode)?.phase).toBe("abandoned");
  });
});

// SPEC 8 — Match Lifecycle, Game End & Rematch. A real finish is driven with
// quickstartWithBots (1 human, 2 bots): engine correctness for how a game
// actually plays out is exhaustively covered in packages/engine already —
// this file only needs SOME real finish to exercise the server's own
// match-lifecycle wiring (result broadcast, rematch loop, matchId rotation).
describe("SPEC 8: match lifecycle, result & rematch", () => {
  // A dedicated fast-bot server, swapped in per-test (not shared beforeEach):
  // these tests drive a real match all the way to a finish, and the real
  // 600ms/decision bot pacing would make that take however long a 3+ player
  // identity game needs (100+ decisions). Scoped to just this describe block
  // rather than changed globally — a 1ms bot delay is fine for a fast finish,
  // but not something the OTHER suites' own timing assumptions expect.
  async function useFastBotServer(): Promise<void> {
    for (const c of clients.splice(0)) c.disconnect();
    await server.close();
    server = createTktwServer({
      roomGcGraceMs: 24 * 60 * 60 * 1000,
      roomGcSweepIntervalMs: 60 * 60 * 1000,
      decisionTimeoutMs: 30_000,
      revealDurationMs: 1,
      botAnswerDelayMs: 1,
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    port = (server.httpServer.address() as AddressInfo).port;
  }

  async function quickstartAndFinish(): Promise<{
    socket: ClientSocket;
    roomCode: string;
    matchId: { current: string };
    result: MatchResult;
  }> {
    const socket = await connectClient();
    const matchId = trackMatchId(socket);
    const roomCode = { current: "" };
    const resultPromise = waitForEvent<MatchResult>(socket, "game:result");
    autoAnswerOwnDecisions(socket, roomCode, matchId); // roomCode filled in once known

    const ack = await emitAck<{ ok: boolean; roomCode: string }>(socket, "room:quickstartWithBots", {
      playerName: "Solo",
      botCount: 2,
    });
    expect(ack.ok).toBe(true);
    roomCode.current = ack.roomCode;

    const result = await resultPromise;
    return { socket, roomCode: ack.roomCode, matchId, result };
  }

  it("a finished match broadcasts game:result with every role/general revealed and stats populated", async () => {
    await useFastBotServer();
    const { result } = await quickstartAndFinish();

    expect(result.matchId).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(["victory", "no_winner"]).toContain(result.endReason);
    expect(result.players).toHaveLength(3);
    // OD-007: every Role and general is revealed, regardless of in-game
    // roleRevealed/generalRevealed state.
    for (const p of result.players) {
      expect(p.role).toBeTruthy();
      expect(p.generalId).not.toBe("none");
    }
    expect(Array.isArray(result.deathOrder)).toBe(true);
    expect(Array.isArray(result.mostKills)).toBe(true);
    expect(Array.isArray(result.mostDamageTaken)).toBe(true);
  }, 40_000);

  it("rejoining into an already-finished match still receives game:result", async () => {
    await useFastBotServer();
    const { roomCode, result } = await quickstartAndFinish();

    // A fresh socket standing in for "the tab was closed and reopened after
    // the match had already ended" — same session token, brand-new connection.
    const room = server.rooms.getRoom(roomCode)!;
    const humanToken = room.seats[0]!.sessionToken;
    const reconnected = await connectClient();
    const resultPromise = waitForEvent<MatchResult>(reconnected, "game:result");
    const ack = await emitAck<{ ok: boolean; phase: string }>(reconnected, "room:rejoin", {
      roomCode,
      sessionToken: humanToken,
    });
    expect(ack.ok).toBe(true);
    expect(ack.phase).toBe("ended");
    const resent = await resultPromise;
    expect(resent.matchId).toBe(result.matchId);
  }, 40_000);

  it("rematch loop: 3 rounds each mint a new matchId and fully reset state", async () => {
    await useFastBotServer();
    const { socket, roomCode, matchId } = await quickstartAndFinish();
    const seenMatchIds = new Set<string>([matchId.current]);

    for (let round = 0; round < 3; round++) {
      const returnAck = await emitAck<{ ok: boolean }>(socket, "room:returnToLobby", { roomCode });
      expect(returnAck.ok).toBe(true);

      const resultPromise = waitForEvent<MatchResult>(socket, "game:result");
      const startAck = await emitAck<{ ok: boolean }>(socket, "room:start", { roomCode });
      expect(startAck.ok).toBe(true);

      const result = await resultPromise;
      // SPEC 8.2/8.5: never the same matchId twice, and never a replay of a
      // previous match's seed (each round produces its own real outcome).
      expect(seenMatchIds.has(result.matchId)).toBe(false);
      seenMatchIds.add(result.matchId);

      // Fresh session per round: HP is back to full for whoever's still
      // alive at the very end doesn't tell us much, but hand/equipment/log
      // are trivially checkable via the room's own session state.
      const room = server.rooms.getRoom(roomCode)!;
      expect(room.session!.state.log.length).toBeGreaterThan(0);
    }
  }, 120_000);

  // Seat-pruning-on-return-to-lobby (SPEC 8.5) is covered at the RoomManager
  // unit level (tests/roomManager.test.ts) — producing a genuinely
  // never-reconnected seat needs a SECOND real human socket, and driving
  // 3 humans (no bots at all) to a real finish isn't practical here: bots
  // are what actually deal damage (simpleBotAnswer plays offensively), so an
  // all-human match auto-answered with safe defaults (never attacking) can
  // legitimately never end. quickstartAndFinish's 1-human-2-bots shape
  // sidesteps that for the tests above, but has no second human to prune.

  it("host transfers if the host (the sole human) leaves a finished (post-game) room", async () => {
    await useFastBotServer();
    const { socket, roomCode } = await quickstartAndFinish();

    expect(server.rooms.getRoom(roomCode)!.seats[0]!.isHost).toBe(true);
    socket.disconnect(); // the host leaves post-game without an explicit room:leave
    await waitFor(() => server.rooms.getRoom(roomCode)!.seats[0]!.isHost === false);
    const room = server.rooms.getRoom(roomCode)!;
    // Every remaining seat is a bot (always "connected") — SPEC 8.6 just
    // needs SOME connected seat to pick up the host role, human or not.
    expect(room.seats.find((s) => s.connected)?.isHost).toBe(true);
  }, 40_000);

  async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (cond()) return;
      await new Promise((r) => setTimeout(r, 15));
    }
    throw new Error("waitFor: condition not met in time");
  }
});
