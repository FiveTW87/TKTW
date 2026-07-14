// Everything that happens to a room's GameSession after it's created:
// broadcasting each player's own filtered view, and scheduling/cancelling
// the decision timeout. Kept separate from socketHandlers.ts so the "what
// happens after a decision resolves" logic isn't tangled up with socket.io
// event wiring.
import type { Server } from "socket.io";
import { projectFor, respond } from "@tktw/engine";
import { seatPlayerId, type GameRoom } from "./RoomManager";
import { defaultAnswerFor, DECISION_TIMEOUT_MS } from "../timeouts";

export function broadcastViews(io: Server, room: GameRoom): void {
  if (!room.session) return;
  room.seats.forEach((seat, i) => {
    if (!seat.connected || !seat.socketId) return;
    const view = projectFor(room.session!.state, seatPlayerId(i));
    io.to(seat.socketId).emit("game:view", view);
  });
}

function clearRoomTimer(room: GameRoom): void {
  if (room.decisionTimer) {
    clearTimeout(room.decisionTimer);
    delete room.decisionTimer;
  }
}

export function scheduleTimeout(io: Server, room: GameRoom, timeoutMs = DECISION_TIMEOUT_MS): void {
  clearRoomTimer(room);
  const session = room.session;
  const pending = session?.state.pendingDecision;
  if (!session || !pending) return;
  const decisionId = pending.id;

  room.decisionTimer = setTimeout(() => {
    // The decision may have already been answered (or the room GC'd) by
    // the time this fires — only act if it's still the same one waiting.
    if (session.state.pendingDecision?.id !== decisionId) return;
    try {
      respond(session, defaultAnswerFor(session));
    } catch (err) {
      // The default answer is engine-trusted and should never throw, but a
      // bug here must stall this one room, not take the process down with
      // every other room's connections in it.
      console.error(`[room ${room.code}] timeout auto-answer failed:`, err);
      return;
    }
    afterRespond(io, room, timeoutMs);
  }, timeoutMs);
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
}
