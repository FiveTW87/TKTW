// Everything that happens to a room's GameSession after it's created:
// broadcasting each player's own filtered view, and scheduling/cancelling
// the decision timeout. Kept separate from socketHandlers.ts so the "what
// happens after a decision resolves" logic isn't tangled up with socket.io
// event wiring.
import type { Server } from "socket.io";
import { projectFor, respond, simpleBotAnswer, forfeitIdentityPlayer, type GameSession } from "@tktw/engine";
import { ServerEvents, type RoomStatePayload, type RoomStateSeat } from "@tktw/shared";
import { seatPlayerId, RoomManager, type GameRoom } from "./RoomManager";
import { defaultAnswerFor, DECISION_TIMEOUT_MS, GRACE_PERIOD_MS } from "../timeouts";

/** Bot seats answer their own turn shortly after it becomes pending, using
 *  the engine's real bot policy (not the conservative AFK default) — short
 *  enough to keep a solo test game moving, long enough to actually follow
 *  what just happened in the log. */
export const BOT_ANSWER_DELAY_MS = 600;

export function broadcastViews(io: Server, room: GameRoom): void {
  if (!room.session) return;
  room.seats.forEach((seat, i) => {
    if (!seat.connected || !seat.socketId) return;
    const view = projectFor(room.session!.state, seatPlayerId(i));
    io.to(seat.socketId).emit(ServerEvents.GameView, view);
  });
}

function roomStateSeat(s: GameRoom["seats"][number]): RoomStateSeat {
  return { name: s.name, connected: s.connected, connectionStatus: s.connectionStatus, isHost: s.isHost, isBot: s.isBot };
}

/** Broadcast the room-level meta (seats + connection status + match/deadline)
 *  PER SOCKET, so each client also learns its own current seat index — that
 *  survives a lobby re-index without trusting a locally-cached value. */
export function broadcastRoomState(io: Server, room: GameRoom): void {
  const base: Omit<RoomStatePayload, "yourSeatIndex"> = {
    code: room.code,
    phase: room.phase,
    seats: room.seats.map(roomStateSeat),
    ...(room.matchId ? { matchId: room.matchId } : {}),
    ...(room.decisionExpiresAt ? { decisionExpiresAt: room.decisionExpiresAt } : {}),
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

function isBotDecision(room: GameRoom, playerId: string): boolean {
  const seatIndex = Number(playerId.slice(1));
  return Number.isNaN(seatIndex) ? false : !!room.seats[seatIndex]?.isBot;
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

export function scheduleTimeout(io: Server, room: GameRoom, timeoutMs = DECISION_TIMEOUT_MS): void {
  clearRoomTimer(room);
  const session = room.session;
  const pending = session?.state.pendingDecision;
  if (!session || !pending) return;
  const decisionId = pending.id;
  const isBotTurn = isBotDecision(room, pending.playerId);
  const delay = isBotTurn ? BOT_ANSWER_DELAY_MS : timeoutMs;
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
    afterRespond(io, room, timeoutMs);
  }, delay);
}

/** Call after any successful respond() — including the very first one right
 *  after room.session is created — to broadcast the new state and arm the
 *  next decision's timeout. */
export function afterRespond(io: Server, room: GameRoom, timeoutMs = DECISION_TIMEOUT_MS): void {
  if (room.session?.state.finished) {
    room.phase = "ended";
    clearRoomTimer(room);
  }
  broadcastViews(io, room);
  if (room.phase === "playing") scheduleTimeout(io, room, timeoutMs);
  broadcastRoomState(io, room); // refresh connection status + decision deadline
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
  if (room.phase !== "playing") return false;
  if (room.session?.state.finished) return false;
  if (anyHumanConnected(room)) return false;
  room.phase = "abandoned";
  clearRoomTimer(room);
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
): void {
  const seat = room.seats[seatIndex];
  if (!seat) return;
  rooms.revokeSeatToken(room, seatIndex);
  seat.connectionStatus = "gone";
  if (seat.graceTimer) {
    clearTimeout(seat.graceTimer);
    delete seat.graceTimer;
  }

  const session = room.session;
  if (room.phase === "playing" && session) {
    forfeitIdentityPlayer(session, seatPlayerId(seatIndex));
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
    }
  }

  broadcastViews(io, room);
  if (maybeAbandon(io, room)) return;
  if (room.phase === "playing") scheduleTimeout(io, room, timeoutMs);
  broadcastRoomState(io, room);
}

/** Arm the per-seat grace timer on an in-match disconnect. A reconnect clears
 *  it (RoomManager.attachSocket); otherwise it forfeits when it fires. */
export function armGraceTimer(
  io: Server,
  rooms: RoomManager,
  room: GameRoom,
  seatIndex: number,
  opts: { graceMs?: number; decisionTimeoutMs?: number } = {},
): void {
  const seat = room.seats[seatIndex];
  if (!seat) return;
  if (seat.graceTimer) clearTimeout(seat.graceTimer);
  const graceMs = opts.graceMs ?? GRACE_PERIOD_MS;
  seat.graceTimer = setTimeout(() => {
    delete seat.graceTimer;
    // A reconnect (or a game that already ended) makes the forfeit moot.
    if (seat.connected || room.phase !== "playing") return;
    forfeitAndContinue(io, rooms, room, seatIndex, opts.decisionTimeoutMs);
  }, graceMs);
}
