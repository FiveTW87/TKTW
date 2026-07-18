// The lobby/room-level shapes both server and client need to agree on —
// distinct from GameView (the engine's own hidden-info-filtered state),
// which is re-exported as-is from @tktw/engine in index.ts.
export type RoomPhase = "lobby" | "playing" | "ended";

export interface RoomStateSeat {
  name: string;
  connected: boolean;
  isHost: boolean;
  isBot: boolean;
}

export interface RoomStatePayload {
  code: string;
  phase: RoomPhase;
  seats: RoomStateSeat[];
}

export type SimpleAck = { ok: true } | { ok: false; error: string };

export type CreateRoomAck =
  | { ok: true; roomCode: string; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };

export type JoinRoomAck =
  | { ok: true; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };

export type RejoinRoomAck =
  | { ok: true; seatIndex: number; phase: RoomPhase }
  | { ok: false; error: string };

export type QuickstartWithBotsAck =
  | { ok: true; roomCode: string; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };
