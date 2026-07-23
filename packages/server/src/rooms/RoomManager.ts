// Pure room/session lifecycle — no socket.io, no timers, so it's testable
// without spinning up a real server. Reconnect identity is a room-scoped
// session token (crypto.randomUUID(), handed to the client once at
// create/join and presented again on rejoin), not socket.id or IP/name
// matching — sockets come and go across reconnects, tokens don't.
//
// Rooms live purely in memory (no DB, per spec) and only need to survive a
// client's tab close while this process stays up — not a full server
// restart. GameSession's own decisionLog/recoverGame machinery exists for
// that harder problem but isn't wired in here; see gameFlow.ts.
import { randomUUID } from "node:crypto";
import { createIdentityGame, createRng, type GameSession } from "@tktw/engine";
import { ROOM_CODE_ALPHABET, type RoomPhase, type ConnectionStatus, type MatchResult } from "@tktw/shared";

export type { RoomPhase };

export interface SeatSlot {
  name: string;
  sessionToken: string;
  socketId?: string;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  /** Bot seats never have a real socket; their decisions are auto-answered
   *  by gameFlow.ts shortly after they become pending (see BOT_ANSWER_DELAY_MS)
   *  instead of waiting on the AFK timeout. */
  isBot: boolean;
  /** Part B: per-seat grace timer armed on an in-match disconnect. */
  graceTimer?: ReturnType<typeof setTimeout>;
}

export interface GameRoom {
  code: string;
  phase: RoomPhase;
  seats: SeatSlot[];
  session?: GameSession;
  /** Set when the match starts — part of the reconnect restore payload. */
  matchId?: string;
  /** SPEC 8.2: this match's player->seat permutation, indexed by lobby seat
   *  (room.seats index) -> engine seat (the `p{k}` id used in GameView).
   *  Freshly randomized every match/rematch — never the identity mapping,
   *  and never reused from a previous match. Absent in "lobby". */
  seatAssignment?: number[];
  /** ms-epoch when the current match's session was created (SPEC 8.4
   *  duration). Absent in "lobby". */
  matchStartedAt?: number;
  /** SPEC 8.4: the finished match's result, computed once at game-end and
   *  kept around so a rejoin into "ended" can resend it (server.ts driven). */
  result?: MatchResult;
  createdAt: number;
  /** Timestamp of the moment the room's connected-socket count first hit
   *  zero, or null while at least one seat is connected. The GC sweep only
   *  ever looks at this — a room with people in it is never touched no
   *  matter how old it is. */
  emptySince: number | null;
  /** Owned by gameFlow.ts; declared here since GameSession already makes
   *  GameRoom non-serializable, so there's no purity left to protect. */
  decisionTimer?: ReturnType<typeof setTimeout>;
  /** ms-epoch deadline of the current pending decision — surfaced per-viewer
   *  as GameView.pendingDecision.expiresAt (Phase 5, §9.4). */
  decisionExpiresAt?: number;
  /** ms-epoch the current pending decision's timer was armed — the other
   *  half of §9.4's timer shape (GameView.pendingDecision.startedAt). */
  decisionStartedAt?: number;
  /** SPEC 7.2: fires when the role-reveal screen's timer expires, flipping
   *  phase "revealing" -> "playing" and arming the lord's pickGeneral timer. */
  revealTimer?: ReturnType<typeof setTimeout>;
  /** ms-epoch deadline of the "revealing" phase (reconnect restore). */
  revealExpiresAt?: number;
  /** SPEC §9.1 — clientActionId idempotency for game:answer. Maps a
   *  successfully-applied clientActionId to the ack it produced, so a
   *  lost-ack retry (same id) replays that success instead of failing as a
   *  stale decisionId (the original attempt already advanced the decision).
   *  Only successes are cached — a genuine rejection is safe to just
   *  re-validate and re-reject identically. Reset every new match. */
  answeredActionIds?: Map<string, { ok: true }>;
}

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export function seatPlayerId(seatIndex: number): string {
  return `p${seatIndex}`;
}

export class RoomError extends Error {}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }

  createRoom(hostName: string): { room: GameRoom; sessionToken: string; seatIndex: number } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const sessionToken = randomUUID();
    const room: GameRoom = {
      code,
      phase: "lobby",
      seats: [{ name: hostName, sessionToken, connected: true, connectionStatus: "connected", isHost: true, isBot: false }],
      createdAt: Date.now(),
      emptySince: null,
    };
    this.rooms.set(code, room);
    return { room, sessionToken, seatIndex: 0 };
  }

  joinRoom(code: string, name: string): { room: GameRoom; sessionToken: string; seatIndex: number } {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("room not found");
    if (room.phase !== "lobby") throw new RoomError("game already started");
    if (room.seats.length >= MAX_PLAYERS) throw new RoomError("room is full");
    // ROOM-001: a duplicate display name is rejected so nobody can imitate an
    // existing player (identity is the token, but a clashing name is bad UX).
    if (room.seats.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      throw new RoomError("ชื่อนี้มีคนใช้แล้วในห้อง");
    }
    const sessionToken = randomUUID();
    room.seats.push({ name, sessionToken, connected: true, connectionStatus: "connected", isHost: false, isBot: false });
    room.emptySince = null;
    return { room, sessionToken, seatIndex: room.seats.length - 1 };
  }

  /** One-click solo test mode (SPEC's own testing needs, not from the client
   *  spec): create a room, fill the rest of the seats with bots, and start
   *  immediately — no join step, no waiting on other humans. */
  quickstartWithBots(
    hostName: string,
    botCount: number,
  ): { room: GameRoom; sessionToken: string; seatIndex: number } {
    const { room, sessionToken, seatIndex } = this.createRoom(hostName);
    for (let i = 1; i <= botCount; i++) {
      room.seats.push({
        name: `บอท ${i}`,
        sessionToken: randomUUID(),
        connected: true,
        connectionStatus: "connected",
        isHost: false,
        isBot: true,
      });
    }
    this.startGame(room, seatIndex);
    return { room, sessionToken, seatIndex };
  }

  /** Presenting a valid session token re-attaches a (possibly new) socket
   *  to the seat it was issued for — the only path back into a room after
   *  a tab close/reopen. */
  rejoin(code: string, sessionToken: string): { room: GameRoom; seatIndex: number } {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("room not found");
    const seatIndex = room.seats.findIndex((s) => s.sessionToken === sessionToken);
    if (seatIndex < 0) throw new RoomError("invalid session token for this room");
    return { room, seatIndex };
  }

  /** Invalidate a seat's session token WITHOUT removing the seat (SPEC 6.7:
   *  a forfeited player keeps their board position, but can never rejoin).
   *  Replacing the token with a fresh secret nobody holds is enough — the
   *  old token now matches no seat, so rejoin(oldToken) fails. */
  revokeSeatToken(room: GameRoom, seatIndex: number): void {
    const seat = room.seats[seatIndex];
    if (seat) seat.sessionToken = randomUUID();
  }

  attachSocket(room: GameRoom, seatIndex: number, socketId: string): void {
    const seat = room.seats[seatIndex];
    if (!seat) throw new RoomError("no such seat");
    seat.socketId = socketId;
    seat.connected = true;
    seat.connectionStatus = "connected";
    if (seat.graceTimer) {
      clearTimeout(seat.graceTimer);
      delete seat.graceTimer;
    }
    room.emptySince = null;
  }

  disconnectSocket(room: GameRoom, socketId: string): void {
    const seat = room.seats.find((s) => s.socketId === socketId);
    if (!seat) return;
    seat.connected = false;
    // Dropped but recoverable within the grace window (Part B arms the timer
    // that flips this to "gone"); a lobby drop is likewise just reconnecting.
    if (seat.connectionStatus !== "gone") seat.connectionStatus = "reconnecting";
    delete seat.socketId;
    // Bot seats don't count toward "someone's here" — a room left with only
    // bots in it after the last human leaves must still be reclaimable.
    if (room.seats.every((s) => s.isBot || !s.connected)) {
      room.emptySince = Date.now();
    }
    // Host auto-transfer applies in the lobby and post-game (SPEC 8.6): a
    // "host" action (starting the game / returning to lobby) exists in both.
    // Mid-match there's no host action left to perform, so nothing to hand off.
    if ((room.phase === "lobby" || room.phase === "ended") && seat.isHost) {
      seat.isHost = false;
      const next = room.seats.find((s) => s.connected);
      if (next) next.isHost = true;
    }
  }

  startGame(room: GameRoom, requestingSeatIndex: number): void {
    if (room.phase !== "lobby") throw new RoomError("game already started");
    const requester = room.seats[requestingSeatIndex];
    if (!requester?.isHost) throw new RoomError("only the host can start the game");
    if (room.seats.length < MIN_PLAYERS) {
      throw new RoomError(`need at least ${MIN_PLAYERS} players to start`);
    }
    const n = room.seats.length;
    // SPEC 8.2: every match (first and rematch alike) gets its own fresh
    // seed — reusing room-level state here would replay the identical deal
    // every rematch. The seat permutation gets an independent seed so it
    // isn't just a byproduct of whatever the identity game's own internal
    // shuffles happen to draw first.
    const matchSeed = Math.floor(Math.random() * 1_000_000_000);
    const seatSeed = Math.floor(Math.random() * 1_000_000_000);
    // seatAssignment[lobbyIndex] = engineSeat: a fresh player->seat
    // permutation, decoupled from lobby join order (§8.2's "ห้ามใช้ Seat
    // เดิมเพียงเพราะเป็น Rematch" / "Lobby Join Order ไม่ถือเป็น Match Seat").
    const seatAssignment = createRng(seatSeed).shuffle([...Array(n).keys()]);
    const names = new Array<string>(n);
    room.seats.forEach((seat, lobbyIndex) => {
      names[seatAssignment[lobbyIndex]!] = seat.name;
    });
    room.session = createIdentityGame({
      playerCount: n,
      seed: matchSeed,
      names,
    });
    room.seatAssignment = seatAssignment;
    room.matchId = randomUUID();
    room.matchStartedAt = Date.now();
    delete room.result;
    room.answeredActionIds = new Map(); // fresh match -> fresh idempotency cache
    // SPEC 7.2: roles are already assigned inside createIdentityGame (the
    // engine session is paused at the lord's first pickGeneral), but the
    // server withholds it behind a brief reveal screen before general
    // selection actually starts — see gameFlow.ts:beginRevealPhase.
    room.phase = "revealing";
  }

  /** SPEC 8.5: from the result screen, send a finished match's room back to
   *  the lobby for a rematch. Host-driven restart from there (no per-player
   *  ready gate) — the host simply calls startGame again afterward, which
   *  mints a fresh seed/matchId/seatAssignment same as a first match.
   *  Prunes any seat that isn't currently connected (a forfeited "gone" seat,
   *  or someone who dropped and never reconnected) — SPEC 8.5/8.7: some
   *  players leaving must not block the rest from returning to lobby. */
  returnToLobby(room: GameRoom): void {
    if (room.phase !== "ended") throw new RoomError("match is not over");
    room.seats = room.seats.filter((s) => s.connected);
    if (!room.seats.some((s) => s.isHost)) {
      const next = room.seats[0];
      if (next) next.isHost = true;
    }
    delete room.session;
    delete room.matchId;
    delete room.seatAssignment;
    delete room.matchStartedAt;
    delete room.result;
    delete room.answeredActionIds;
    room.phase = "lobby";
    if (room.seats.length === 0) room.emptySince = Date.now();
  }

  /** Explicit leave from the LOBBY (ROOM-002/003): the seat and its token are
   *  removed outright. Returns the removed seat index (or -1). Mid-match leave
   *  is a forfeit, handled in gameFlow (Part B). Re-index of higher seats is
   *  the caller's concern (socket data.seatIndex fixup). */
  leaveLobby(room: GameRoom, seatIndex: number): number {
    if (room.phase !== "lobby") throw new RoomError("not in lobby");
    const seat = room.seats[seatIndex];
    if (!seat) return -1;
    const wasHost = seat.isHost;
    room.seats.splice(seatIndex, 1);
    if (wasHost && room.seats.length > 0) {
      const next = room.seats.find((s) => s.connected) ?? room.seats[0]!;
      next.isHost = true;
    }
    if (room.seats.every((s) => s.isBot || !s.connected)) {
      room.emptySince = Date.now();
    }
    return seatIndex;
  }

  /** Deletes every room whose emptySince is older than graceMs. Returns the
   *  codes removed, purely so callers can log/clear associated timers. */
  sweep(graceMs: number): string[] {
    const now = Date.now();
    const removed: string[] = [];
    for (const [code, room] of this.rooms) {
      if (room.emptySince !== null && now - room.emptySince > graceMs) {
        if (room.decisionTimer) clearTimeout(room.decisionTimer);
        for (const seat of room.seats) if (seat.graceTimer) clearTimeout(seat.graceTimer);
        this.rooms.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  size(): number {
    return this.rooms.size;
  }
}
