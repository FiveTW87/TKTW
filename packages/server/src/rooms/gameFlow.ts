// Everything that happens to a room's GameSession after it's created:
// broadcasting each player's own filtered view, and scheduling/cancelling
// the decision timeout. Kept separate from socketHandlers.ts so the "what
// happens after a decision resolves" logic isn't tangled up with socket.io
// event wiring.
import type { Server } from "socket.io";
import { projectFor, respond, simpleBotAnswer } from "@tktw/engine";
import { ServerEvents } from "@tktw/shared";
import { seatPlayerId, type GameRoom } from "./RoomManager";
import { defaultAnswerFor, DECISION_TIMEOUT_MS } from "../timeouts";

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

function clearRoomTimer(room: GameRoom): void {
  if (room.decisionTimer) {
    clearTimeout(room.decisionTimer);
    delete room.decisionTimer;
  }
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
}
