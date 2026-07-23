export * from "./protocol/schema";
export * from "./protocol/views";
export * from "./events";
export * from "./roomTypes";

// Re-exported so the client's only game-protocol dependency is @tktw/shared —
// it never needs to reach into @tktw/engine directly (that stays a
// server-only dependency: rules engine + bot policies + socket-free
// simulation, none of which the client should be pulling into its bundle).
//
// Phase 5 (SPEC §9.2/§9.5): the client's VIEW-MODEL (GameView/PlayerView/
// DecisionView/LegalActionView/GameLogView/MatchResultView/CardView) comes
// exclusively from ./protocol/views.ts now — Zod-typed, one source of truth,
// assembled server-side from projectFor(state) + room meta. The engine's own
// GameView/PlayerView names were freed up by renaming them to
// ProjectedGameState/ProjectedPlayer (engine-internal only, never imported
// by the client). Bare domain vocabulary (Role/Faction/Card/...) and the
// outgoing-answer shape (PlayerAnswer) are still simple engine type aliases —
// they aren't part of the view-model, just shared vocabulary.
export type {
  PlayerAnswer,
  PendingDecision,
  Role,
  Faction,
  Gender,
  Card,
  LogEntry,
  Phase,
  MatchSummary,
  MatchPlayerSummary,
} from "@tktw/engine";
