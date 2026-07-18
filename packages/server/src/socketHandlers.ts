import type { Server, Socket } from "socket.io";
import { projectFor, respond, type PlayerAnswer } from "@tktw/engine";
import {
  createRoomSchema,
  joinRoomSchema,
  rejoinRoomSchema,
  startGameSchema,
  answerSchema,
  quickstartWithBotsSchema,
  ClientEvents,
  ServerEvents,
  type AnswerInput,
} from "@tktw/shared";
import { RoomManager, RoomError, seatPlayerId, type GameRoom } from "./rooms/RoomManager";
import { afterRespond } from "./rooms/gameFlow";

interface SocketData {
  roomCode?: string;
  seatIndex?: number;
}

type Ack = (response: Record<string, unknown>) => void;

function ok(ack: Ack, extra: Record<string, unknown> = {}): void {
  ack({ ok: true, ...extra });
}

function fail(ack: Ack, err: unknown, fallback: string): void {
  if (err instanceof RoomError || err instanceof Error) {
    ack({ ok: false, error: err.message });
    return;
  }
  ack({ ok: false, error: fallback });
}

function broadcastLobby(io: Server, room: GameRoom): void {
  io.to(room.code).emit(ServerEvents.RoomState, {
    code: room.code,
    phase: room.phase,
    seats: room.seats.map((s) => ({ name: s.name, connected: s.connected, isHost: s.isHost, isBot: s.isBot })),
  });
}

function sendViewTo(room: GameRoom, seatIndex: number, socket: Socket): void {
  if (!room.session) return;
  socket.emit(ServerEvents.GameView, projectFor(room.session.state, seatPlayerId(seatIndex)));
}

// zod's .optional() yields `T | undefined` keys that are always *present*,
// which exactOptionalPropertyTypes treats as distinct from an absent key —
// build PlayerAnswer field-by-field so an omitted client field stays
// structurally absent rather than present-with-undefined.
function toPlayerAnswer(playerId: string, fields: AnswerInput): PlayerAnswer {
  const answer: PlayerAnswer = { decisionId: fields.decisionId, playerId };
  if (fields.choice !== undefined) answer.choice = fields.choice;
  if (fields.cardIds !== undefined) answer.cardIds = fields.cardIds;
  if (fields.targetIds !== undefined) answer.targetIds = fields.targetIds;
  if (fields.skillId !== undefined) answer.skillId = fields.skillId;
  if (fields.asType !== undefined) answer.asType = fields.asType;
  if (fields.pass !== undefined) answer.pass = fields.pass;
  return answer;
}

export interface SocketHandlerOptions {
  decisionTimeoutMs?: number;
}

export function registerSocketHandlers(
  io: Server,
  rooms: RoomManager,
  opts: SocketHandlerOptions = {},
): void {
  const { decisionTimeoutMs } = opts;
  const runAfterRespond = (room: GameRoom): void =>
    decisionTimeoutMs === undefined
      ? afterRespond(io, room)
      : afterRespond(io, room, decisionTimeoutMs);

  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on(ClientEvents.RoomCreate, (raw: unknown, ack: Ack) => {
      const parsed = createRoomSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      const { room, sessionToken, seatIndex } = rooms.createRoom(parsed.data.playerName);
      rooms.attachSocket(room, seatIndex, socket.id);
      data.roomCode = room.code;
      data.seatIndex = seatIndex;
      void socket.join(room.code);

      ok(ack, { roomCode: room.code, sessionToken, seatIndex });
      broadcastLobby(io, room);
    });

    socket.on(ClientEvents.RoomQuickstartWithBots, (raw: unknown, ack: Ack) => {
      const parsed = quickstartWithBotsSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      let result: ReturnType<RoomManager["quickstartWithBots"]>;
      try {
        result = rooms.quickstartWithBots(parsed.data.playerName, parsed.data.botCount);
      } catch (err) {
        return fail(ack, err, "failed to start");
      }
      const { room, sessionToken, seatIndex } = result;
      rooms.attachSocket(room, seatIndex, socket.id);
      data.roomCode = room.code;
      data.seatIndex = seatIndex;
      void socket.join(room.code);

      ok(ack, { roomCode: room.code, sessionToken, seatIndex });
      broadcastLobby(io, room);
      runAfterRespond(room); // the room is already "playing" — broadcast the first game:view
    });

    socket.on(ClientEvents.RoomJoin, (raw: unknown, ack: Ack) => {
      const parsed = joinRoomSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      try {
        const { room, sessionToken, seatIndex } = rooms.joinRoom(
          parsed.data.roomCode,
          parsed.data.playerName,
        );
        rooms.attachSocket(room, seatIndex, socket.id);
        data.roomCode = room.code;
        data.seatIndex = seatIndex;
        void socket.join(room.code);

        ok(ack, { sessionToken, seatIndex });
        broadcastLobby(io, room);
      } catch (err) {
        fail(ack, err, "join failed");
      }
    });

    socket.on(ClientEvents.RoomRejoin, (raw: unknown, ack: Ack) => {
      const parsed = rejoinRoomSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      try {
        const { room, seatIndex } = rooms.rejoin(parsed.data.roomCode, parsed.data.sessionToken);
        rooms.attachSocket(room, seatIndex, socket.id);
        data.roomCode = room.code;
        data.seatIndex = seatIndex;
        void socket.join(room.code);

        ok(ack, { seatIndex, phase: room.phase });
        broadcastLobby(io, room);
        if (room.phase === "playing") sendViewTo(room, seatIndex, socket);
      } catch (err) {
        fail(ack, err, "rejoin failed");
      }
    });

    socket.on(ClientEvents.RoomStart, (raw: unknown, ack: Ack) => {
      const parsed = startGameSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      const room = rooms.getRoom(parsed.data.roomCode);
      if (!room) return fail(ack, new RoomError("room not found"), "room not found");
      if (data.roomCode !== room.code || data.seatIndex === undefined) {
        return fail(ack, new RoomError("not a member of this room"), "not a member of this room");
      }

      try {
        rooms.startGame(room, data.seatIndex);
      } catch (err) {
        return fail(ack, err, "failed to start");
      }
      ok(ack);
      broadcastLobby(io, room);
      runAfterRespond(room); // broadcasts the first game:view, arms the first timeout
    });

    socket.on(ClientEvents.GameAnswer, (raw: unknown, ack: Ack) => {
      const parsed = answerSchema.safeParse(raw);
      if (!parsed.success) return fail(ack, parsed.error, "invalid payload");

      const room = rooms.getRoom(parsed.data.roomCode);
      if (!room || room.phase !== "playing" || !room.session) {
        return fail(ack, new RoomError("game is not in progress"), "game is not in progress");
      }
      if (data.roomCode !== room.code || data.seatIndex === undefined) {
        return fail(ack, new RoomError("not a member of this room"), "not a member of this room");
      }

      const pending = room.session.state.pendingDecision;
      const myPlayerId = seatPlayerId(data.seatIndex);
      if (!pending) return fail(ack, new RoomError("no pending decision"), "no pending decision");
      if (pending.playerId !== myPlayerId) {
        return fail(ack, new RoomError("not your decision to answer"), "not your decision to answer");
      }

      try {
        respond(room.session, toPlayerAnswer(myPlayerId, parsed.data));
      } catch (err) {
        // The atomicity audit's whole payoff: a thrown respond() call is
        // guaranteed to have left state and pendingDecision exactly as they
        // were, so it's safe to just report the error back — the client
        // can retry the same decision, no room-level recovery needed.
        return fail(ack, err, "invalid move");
      }
      ok(ack);
      runAfterRespond(room);
    });

    socket.on("disconnect", () => {
      if (!data.roomCode) return;
      const room = rooms.getRoom(data.roomCode);
      if (!room) return;
      rooms.disconnectSocket(room, socket.id);
      if (room.phase === "lobby") broadcastLobby(io, room);
    });
  });
}
