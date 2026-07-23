// The lobby/room-level shapes both server and client need to agree on —
// distinct from GameView (the engine's own hidden-info-filtered state),
// which is re-exported as-is from @tktw/engine in index.ts.
import type { MatchSummary } from "@tktw/engine";
// "abandoned" = the match ended early because everyone else forfeited/left —
// distinct from "ended" (a real win/loss result) so the client can say so.
// "revealing" = SPEC 7.2's brief role-reveal screen: roles are already
// assigned in the engine, but the server withholds the first pickGeneral
// decision until the reveal timer expires.
export type RoomPhase = "lobby" | "revealing" | "playing" | "ended" | "abandoned";

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
  /** ms-epoch deadline of the "revealing" phase (SPEC 7.2) — set only while
   *  phase === "revealing", so a rejoin during reveal restores the same
   *  countdown instead of resetting it. */
  revealExpiresAt?: number;
  /** SPEC 8.2: each match randomizes a fresh player->seat permutation, so
   *  engine seat k is no longer necessarily lobby seat k. Maps engine seat
   *  index -> this room's (stable, lobby-order) seats array index, so the
   *  client can look up a board player's connectionStatus without engine
   *  seat and lobby seat needing to coincide. Present only while a match's
   *  seat assignment exists (i.e. not in "lobby"). */
  lobbySeatOfEngineSeat?: number[];
}

/** SPEC 8.4 — engine's pure MatchSummary plus the server-only bits it can't
 *  compute itself (matchId identity, wall-clock duration). Broadcast once a
 *  match finishes (ServerEvents.MatchResult) and re-sent on a rejoin into an
 *  "ended" room. */
export interface MatchResult extends MatchSummary {
  matchId: string;
  durationMs: number;
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
