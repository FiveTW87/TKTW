// The lobby/room-level shapes both server and client need to agree on —
// distinct from GameView (the engine's own hidden-info-filtered state),
// which is re-exported as-is from @tktw/engine in index.ts.
export type RoomPhase = "lobby" | "playing" | "ended";

// "connected" = socket attached; "reconnecting" = dropped, still inside the
// grace period (seat held); "gone" = grace expired / forfeited (seat kept for
// board presence, but the player is out).
export type ConnectionStatus = "connected" | "reconnecting" | "gone";

export interface RoomStateSeat {
  name: string;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  isHost: boolean;
  isBot: boolean;
}

export interface RoomStatePayload {
  code: string;
  phase: RoomPhase;
  seats: RoomStateSeat[];
  /** The recipient's own seat index — survives a lobby re-index so a client
   *  can always find itself without trusting a locally-cached seatIndex. */
  yourSeatIndex?: number;
  /** Set once the match starts; part of the reconnect restore payload. */
  matchId?: string;
  /** ms-epoch deadline of the current pending decision, for the countdown /
   *  reconnect deadline restore (full serverNow/expiresAt is Phase 5). */
  decisionExpiresAt?: number;
}

export type SimpleAck = { ok: true } | { ok: false; error: string };

export type CreateRoomAck =
  | { ok: true; roomCode: string; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };

export type JoinRoomAck =
  | { ok: true; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };

export type RejoinRoomAck =
  | { ok: true; seatIndex: number; phase: RoomPhase; matchId?: string }
  | { ok: false; error: string };

export type LeaveRoomAck = SimpleAck;

export type QuickstartWithBotsAck =
  | { ok: true; roomCode: string; sessionToken: string; seatIndex: number }
  | { ok: false; error: string };
