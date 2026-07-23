// Everything that happens to a room's GameSession after it's created:
// broadcasting each player's own filtered view, and scheduling/cancelling
// the decision timeout. Kept separate from socketHandlers.ts so the "what
// happens after a decision resolves" logic isn't tangled up with socket.io
// event wiring.
import type { Server } from "socket.io";
import { projectFor, respond, simpleBotAnswer, forfeitIdentityPlayer, summarizeMatch, type GameSession } from "@tktw/engine";
import { ServerEvents, type RoomStatePayload, type RoomStateSeat } from "@tktw/shared";
import { seatPlayerId, RoomManager, type GameRoom } from "./RoomManager";
import { defaultAnswerFor, DECISION_TIMEOUT_MS, GRACE_PERIOD_MS, REVEAL_DURATION_MS } from "../timeouts";

// SPEC 7.2: "revealing" (the role-reveal screen) and "playing" are both a
// live match — a seat's connection/grace handling shouldn't care which of
// the two sub-phases it's currently in.
function isMatchActive(room: GameRoom): boolean {
  return room.phase === "playing" || room.phase === "revealing";
}

// SPEC 8.2: each match randomizes a fresh player->seat permutation
// (RoomManager.startGame's room.seatAssignment[lobbyIndex] = engineSeat), so
// lobby seat index i and the engine's `p{i}` no longer necessarily coincide.
// Every place that used to assume they did routes through these two instead.
// Both fall back to the identity mapping when there's no assignment (lobby,
// or a room predating a match) so callers don't need their own guard.
export function engineSeatOf(room: GameRoom, lobbyIndex: number): number {
  return room.seatAssignment?.[lobbyIndex] ?? lobbyIndex;
}

function lobbySeatOf(room: GameRoom, engineSeat: number): number {
  const idx = room.seatAssignment?.indexOf(engineSeat) ?? -1;
  return idx >= 0 ? idx : engineSeat;
}

/** Bot seats answer their own turn shortly after it becomes pending, using
 *  the engine's real bot policy (not the conservative AFK default) — short
 *  enough to keep a solo test game moving, long enough to actually follow
 *  what just happened in the log. */
export const BOT_ANSWER_DELAY_MS = 600;

export function broadcastViews(io: Server, room: GameRoom): void {
  if (!room.session) return;
  room.seats.forEach((seat, i) => {
    if (!seat.connected || !seat.socketId) return;
    const view = projectFor(room.session!.state, seatPlayerId(engineSeatOf(room, i)));
    io.to(seat.socketId).emit(ServerEvents.GameView, view);
  });
}

function roomStateSeat(s: GameRoom["seats"][number]): RoomStateSeat {
  return { name: s.name, connected: s.connected, connectionStatus: s.connectionStatus, isHost: s.isHost, isBot: s.isBot };
}

// Inverts room.seatAssignment (lobbyIndex -> engineSeat) into engineSeat ->
// lobbyIndex, so the client can map a GameView board player (engine-seat
// ordered) back onto this room's (lobby-order) connection status without the
// two orderings needing to coincide. Absent outside an active match.
function lobbySeatOfEngineSeat(room: GameRoom): number[] | undefined {
  if (!room.seatAssignment) return undefined;
  const out = new Array<number>(room.seatAssignment.length);
  room.seatAssignment.forEach((engineSeat, lobbyIndex) => {
    out[engineSeat] = lobbyIndex;
  });
  return out;
}

/** Broadcast the room-level meta (seats + connection status + match/deadline)
 *  PER SOCKET, so each client also learns its own current seat index — that
 *  survives a lobby re-index without trusting a locally-cached value. */
export function broadcastRoomState(io: Server, room: GameRoom): void {
  const seatMap = lobbySeatOfEngineSeat(room);
  const base: Omit<RoomStatePayload, "yourSeatIndex"> = {
    code: room.code,
    phase: room.phase,
    seats: room.seats.map(roomStateSeat),
    ...(room.matchId ? { matchId: room.matchId } : {}),
    ...(room.decisionExpiresAt ? { decisionExpiresAt: room.decisionExpiresAt } : {}),
    ...(room.revealExpiresAt ? { revealExpiresAt: room.revealExpiresAt } : {}),
    ...(seatMap ? { lobbySeatOfEngineSeat: seatMap } : {}),
  };
  room.seats.forEach((seat, i) => {
    if (!seat.socketId) return;
    io.to(seat.socketId).emit(ServerEvents.RoomState, { ...base, yourSeatIndex: i });
  });
}

function clearRoomTimer(room: GameRoom): void {
  if (room.decisionTimer) {
    clearTimeout(room.decisionTimer);
    delete room.decisionTimer;
  }
  delete room.decisionExpiresAt;
}

function clearRevealTimer(room: GameRoom): void {
  if (room.revealTimer) {
    clearTimeout(room.revealTimer);
    delete room.revealTimer;
  }
  delete room.revealExpiresAt;
}

/** SPEC 8.4: compute the match's authoritative result exactly once, the
 *  moment state.finished flips true (from either a normal engine finish or a
 *  forfeit-driven one) — summarizeMatch is engine-pure; this just adds the
 *  server-only bits (matchId identity, wall-clock duration) it can't know.
 *  Idempotent (checks room.result) since both call sites can't race but
 *  might otherwise double-compute on a shared code path. */
function finalizeMatchResult(room: GameRoom): void {
  if (room.result || !room.session?.state.finished) return;
  const summary = summarizeMatch(room.session.state);
  room.result = {
    ...summary,
    matchId: room.matchId ?? "",
    durationMs: room.matchStartedAt ? Date.now() - room.matchStartedAt : 0,
  };
}

// MatchResult is the same for every viewer (no hidden-info filtering, unlike
// GameView) — one room-wide broadcast, not the per-seat pattern above.
function broadcastMatchResult(io: Server, room: GameRoom): void {
  if (!room.result) return;
  io.to(room.code).emit(ServerEvents.MatchResult, room.result);
}

/** SPEC 7.2: hold the match at "revealing" for a fixed window before the
 *  first pickGeneral (the lord's — already live inside the engine session,
 *  which pauses there synchronously) is actually surfaced/timed. Broadcasts
 *  now so clients can render the reveal screen from the projected view
 *  (own role; the lord's identity is public per SPEC either way), then flips
 *  to "playing" and arms the real decision timeout once the window elapses. */
export function beginRevealPhase(
  io: Server,
  room: GameRoom,
  revealMs = REVEAL_DURATION_MS,
  decisionTimeoutMs = DECISION_TIMEOUT_MS,
  botDelayMs = BOT_ANSWER_DELAY_MS,
): void {
  if (room.phase !== "revealing") return;
  room.revealExpiresAt = Date.now() + revealMs;
  broadcastViews(io, room);
  broadcastRoomState(io, room);
  room.revealTimer = setTimeout(() => {
    delete room.revealTimer;
    if (room.phase !== "revealing") return; // e.g. abandoned mid-reveal
    room.phase = "playing";
    delete room.revealExpiresAt;
    afterRespond(io, room, decisionTimeoutMs, botDelayMs);
  }, revealMs);
}

function isBotDecision(room: GameRoom, playerId: string): boolean {
  const engineSeat = Number(playerId.slice(1));
  if (Number.isNaN(engineSeat)) return false;
  return !!room.seats[lobbySeatOf(room, engineSeat)]?.isBot;
}

// A last-resort answer that always terminates a decision when the normal
// bot/AFK answer was rejected. `pass` is legal for every reactive decision
// and `endPhase` for mainAction; the discard decisions need actual cards, so
// spend the first N of the player's hand.
function safeFallbackAnswer(session: NonNullable<GameRoom["session"]>, decisionId: string, playerId: string, kind: string) {
  const base = { decisionId, playerId };
  if (kind === "mainAction") return { ...base, choice: "endPhase" };
  if (kind === "discardTo" || kind === "discardChosenBy") {
    const data = session.state.pendingDecision?.data as { mustDiscard?: number; count?: number } | undefined;
    const need = Number(data?.mustDiscard ?? data?.count ?? 0);
    const hand = session.state.players.find((p) => p.id === playerId)?.hand ?? [];
    return { ...base, cardIds: hand.slice(0, need).map((c) => c.id) };
  }
  return { ...base, pass: true };
}

export function scheduleTimeout(
  io: Server,
  room: GameRoom,
  timeoutMs = DECISION_TIMEOUT_MS,
  botDelayMs = BOT_ANSWER_DELAY_MS,
): void {
  clearRoomTimer(room);
  const session = room.session;
  const pending = session?.state.pendingDecision;
  if (!session || !pending) return;
  const decisionId = pending.id;
  const isBotTurn = isBotDecision(room, pending.playerId);
  const delay = isBotTurn ? botDelayMs : timeoutMs;
  room.decisionExpiresAt = Date.now() + delay;

  room.decisionTimer = setTimeout(() => {
    // The decision may have already been answered (or the room GC'd) by
    // the time this fires — only act if it's still the same one waiting.
    if (session.state.pendingDecision?.id !== decisionId) return;
    try {
      respond(session, isBotTurn ? simpleBotAnswer(session) : defaultAnswerFor(session));
    } catch (err) {
      // The bot/AFK answer was rejected by the engine. If we just bailed
      // here the decision would sit forever — nobody else may answer it (the
      // server rejects "not your decision"), so the WHOLE room would freeze.
      // Fall back to a guaranteed-terminating answer instead so play always
      // continues. This is the room-level counterpart to the client's own
      // "never strand a decision" guards.
      console.error(`[room ${room.code}] ${isBotTurn ? "bot" : "timeout"} auto-answer failed, using safe fallback:`, err);
      const pd = session.state.pendingDecision;
      try {
        if (!pd || pd.id !== decisionId) return; // already moved on
        respond(session, safeFallbackAnswer(session, pd.id, pd.playerId, pd.kind));
      } catch (err2) {
        // pass/endPhase should be legal for every decision kind, so this is
        // essentially unreachable — log loudly and leave the room paused
        // rather than busy-looping the same failing answer.
        console.error(`[room ${room.code}] safe fallback ALSO failed — room paused:`, err2);
        return;
      }
    }
    afterRespond(io, room, timeoutMs, botDelayMs);
  }, delay);
}

/** Call after any successful respond() — including the very first one right
 *  after room.session is created — to broadcast the new state and arm the
 *  next decision's timeout. */
export function afterRespond(
  io: Server,
  room: GameRoom,
  timeoutMs = DECISION_TIMEOUT_MS,
  botDelayMs = BOT_ANSWER_DELAY_MS,
): void {
  if (room.session?.state.finished) {
    room.phase = "ended";
    clearRoomTimer(room);
    finalizeMatchResult(room);
  }
  broadcastViews(io, room);
  if (room.phase === "playing") scheduleTimeout(io, room, timeoutMs, botDelayMs);
  broadcastRoomState(io, room); // refresh connection status + decision deadline
  broadcastMatchResult(io, room);
}

function isPlayerAlive(session: GameSession, playerId: string): boolean {
  return session.state.players.find((p) => p.id === playerId)?.alive ?? false;
}

// Terminates whatever decision a just-forfeited player still owns so the
// generator can advance past them. Each option is a clean no-op given the
// turn loop's alive-guards: mainAction ends the phase; a draw is skipped
// before any card is dealt; discard sees an already-emptied hand; a reactive
// pass declines. Mirrors timeouts.ts:safeFallbackAnswer.
function forfeitSkipAnswer(pending: NonNullable<GameSession["state"]["pendingDecision"]>) {
  const base = { decisionId: pending.id, playerId: pending.playerId };
  if (pending.kind === "mainAction") return { ...base, choice: "endPhase" };
  if (pending.kind === "discardTo" || pending.kind === "discardChosenBy") return { ...base, cardIds: [] };
  if (pending.kind === "drawCard") return { ...base, choice: "draw" };
  if (pending.kind === "pickGeneral") return base;
  return { ...base, pass: true };
}

// True while at least one human seat still has a live socket. (A "gone"
// seat is always disconnected, so this also excludes forfeited players.)
function anyHumanConnected(room: GameRoom): boolean {
  return room.seats.some((seat) => !seat.isBot && seat.connected);
}

// SPEC 6.6: if a forfeit leaves no human connected to the match (everyone
// else has dropped/left), abandon it rather than let bots play it out. A
// decisive result — including a lord's no_winner forfeit — is checked first
// (room.session.finished), so a real outcome always wins over "abandoned".
function maybeAbandon(io: Server, room: GameRoom): boolean {
  if (!isMatchActive(room)) return false;
  if (room.session?.state.finished) return false;
  if (anyHumanConnected(room)) return false;
  room.phase = "abandoned";
  clearRoomTimer(room);
  clearRevealTimer(room);
  for (const seat of room.seats) {
    if (seat.graceTimer) {
      clearTimeout(seat.graceTimer);
      delete seat.graceTimer;
    }
  }
  room.emptySince = Date.now(); // hand it to the GC sweep
  broadcastRoomState(io, room);
  return true;
}

/** SPEC 6.5: a seat forfeits (grace expired, or an explicit leave-mid-match).
 *  Revoke its token (seat kept — 6.7), mark it gone, kill the character
 *  cleanly in the engine, then drive the generator past any decision the dead
 *  player still owned so the rest of the table keeps playing. */
export function forfeitAndContinue(
  io: Server,
  rooms: RoomManager,
  room: GameRoom,
  seatIndex: number,
  timeoutMs = DECISION_TIMEOUT_MS,
  botDelayMs = BOT_ANSWER_DELAY_MS,
): void {
  const seat = room.seats[seatIndex];
  if (!seat) return;
  rooms.revokeSeatToken(room, seatIndex);
  seat.connectionStatus = "gone";
  // A grace-expiry forfeit already went through disconnectSocket (connected
  // is already false); an explicit mid-match leave (SPEC 6.2/6.3) hasn't —
  // the socket left the room but this seat's own bookkeeping never reflected
  // it. Make both paths agree: a "gone" seat is never "connected" (SPEC 8.5
  // relies on this to prune it on a later return-to-lobby).
  seat.connected = false;
  delete seat.socketId;
  if (seat.graceTimer) {
    clearTimeout(seat.graceTimer);
    delete seat.graceTimer;
  }

  const session = room.session;
  if (isMatchActive(room) && session) {
    forfeitIdentityPlayer(session, seatPlayerId(engineSeatOf(room, seatIndex)));
    let guard = 0;
    while (
      session.state.pendingDecision &&
      !session.state.finished &&
      !isPlayerAlive(session, session.state.pendingDecision.playerId)
    ) {
      try {
        respond(session, forfeitSkipAnswer(session.state.pendingDecision));
      } catch (err) {
        console.error(`[room ${room.code}] forfeit-drive answer was rejected — stopping:`, err);
        break;
      }
      if (++guard > 100) {
        console.error(`[room ${room.code}] forfeit-drive did not terminate — pausing`);
        break;
      }
    }
    if (session.state.finished) {
      room.phase = "ended";
      clearRoomTimer(room);
      clearRevealTimer(room);
      finalizeMatchResult(room);
    }
  }

  broadcastViews(io, room);
  if (maybeAbandon(io, room)) return;
  if (room.phase === "playing") scheduleTimeout(io, room, timeoutMs, botDelayMs);
  broadcastRoomState(io, room);
  broadcastMatchResult(io, room);
}

/** Arm the per-seat grace timer on an in-match disconnect. A reconnect clears
 *  it (RoomManager.attachSocket); otherwise it forfeits when it fires. */
export function armGraceTimer(
  io: Server,
  rooms: RoomManager,
  room: GameRoom,
  seatIndex: number,
  opts: { graceMs?: number; decisionTimeoutMs?: number; botDelayMs?: number } = {},
): void {
  const seat = room.seats[seatIndex];
  if (!seat) return;
  if (seat.graceTimer) clearTimeout(seat.graceTimer);
  const graceMs = opts.graceMs ?? GRACE_PERIOD_MS;
  seat.graceTimer = setTimeout(() => {
    delete seat.graceTimer;
    // A reconnect (or a game that already ended) makes the forfeit moot.
    if (seat.connected || !isMatchActive(room)) return;
    forfeitAndContinue(io, rooms, room, seatIndex, opts.decisionTimeoutMs, opts.botDelayMs);
  }, graceMs);
}
