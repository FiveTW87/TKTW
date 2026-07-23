// The lobby/room-level shapes both server and client need to agree on —
// distinct from GameView (Phase 5's unified, Zod-typed view-model in
// ./protocol/views.ts).
import type { MatchResultView } from "./protocol/views";
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
  /** ms-epoch deadline of the "revealing" phase (SPEC 7.2) — set only while
   *  phase === "revealing", so a rejoin during reveal restores the same
   *  countdown instead of resetting it. Once a match is actually playing,
   *  the equivalent per-decision deadline lives on GameView.pendingDecision
   *  (Phase 5, §9.4) instead — "revealing" has no GameView yet, so this is
   *  the one phase that still needs its own timer field here. */
  revealExpiresAt?: number;
}

/** SPEC 8.4 / 9.2 — engine's pure MatchSummary plus the server-only bits it
 *  can't compute itself (matchId identity, wall-clock duration), Zod-typed
 *  as MatchResultView (./protocol/views.ts) so there's one definition, not
 *  two structurally-identical ones. Broadcast once a match finishes
 *  (ServerEvents.MatchResult), re-sent on a rejoin into an "ended" room, and
 *  also embedded as GameView.result. */
export type MatchResult = MatchResultView;

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
