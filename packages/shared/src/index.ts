export * from "./protocol/schema";
export * from "./events";
export * from "./roomTypes";

// Re-exported so the client's only game-protocol dependency is @tktw/shared —
// it never needs to reach into @tktw/engine directly (that stays a
// server-only dependency: rules engine + bot policies + socket-free
// simulation, none of which the client should be pulling into its bundle).
export type {
  GameView,
  PlayerView,
  HiddenCount,
} from "@tktw/engine";
export type {
  PlayerAnswer,
  PendingDecision,
  Role,
  Faction,
  Gender,
  Card,
  LogEntry,
  Phase,
} from "@tktw/engine";
