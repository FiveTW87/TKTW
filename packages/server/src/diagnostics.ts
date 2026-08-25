export type DiagnosticEvent =
  | "room.rejoin"
  | "game.answer"
  | "socket.disconnect"
  | "decision.timeout"
  | "decision.fallback"
  | "player.forfeit";

export type DiagnosticOutcome =
  | "attempt"
  | "scheduled"
  | "triggered"
  | "accepted"
  | "success"
  | "rejected"
  | "recovered"
  | "failed";

export interface DiagnosticInput {
  event: DiagnosticEvent;
  outcome: DiagnosticOutcome;
  roomCode?: string;
  matchId?: string;
  decisionId?: string;
  clientActionId?: string;
  seatIndex?: number;
  reason?: string;
  errorName?: string;
  error?: unknown;
}

export interface ServerDiagnosticRecord {
  timestamp: number;
  event: DiagnosticEvent;
  outcome: DiagnosticOutcome;
  roomCode?: string;
  matchId?: string;
  decisionId?: string;
  clientActionId?: string;
  seatIndex?: number;
  errorName?: string;
  reason?: string;
}

export type DiagnosticSink = (record: ServerDiagnosticRecord) => void;
export type DiagnosticReporter = (input: DiagnosticInput) => void;

const MAX_REASON_LENGTH = 240;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const NAMED_TOKEN_PATTERN = /\b(?:session[ _-]?token|token)\s*[:=]?\s*[a-z0-9._-]{8,}/gi;
const OPAQUE_VALUE_PATTERN = /\b[a-z0-9_-]{24,}\b/gi;

function safeReason(value: string): string {
  return value
    .replace(UUID_PATTERN, "[redacted]")
    .replace(NAMED_TOKEN_PATTERN, (match) => match.replace(/[a-z0-9._-]{8,}$/i, "[redacted]"))
    .replace(OPAQUE_VALUE_PATTERN, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REASON_LENGTH);
}

function normalizedError(error: unknown): { errorName?: string; reason?: string } {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      ...(error.message ? { reason: safeReason(error.message) } : {}),
    };
  }
  if (typeof error === "string" && error) return { reason: safeReason(error) };
  if (error === undefined) return {};
  return { errorName: "NonError", reason: "non-error throw" };
}

/** Build from a strict allowlist so an accidental raw socket/engine payload on
 * the input object cannot cross the diagnostics boundary at runtime. */
export function buildDiagnosticRecord(
  input: DiagnosticInput,
  clock: () => number = Date.now,
): ServerDiagnosticRecord {
  const error = input.error !== undefined
    ? normalizedError(input.error)
    : (input.errorName ? { errorName: input.errorName.replace(/[^a-z0-9_.-]/gi, "").slice(0, 60) } : {});
  return {
    timestamp: clock(),
    event: input.event,
    outcome: input.outcome,
    ...(input.roomCode ? { roomCode: input.roomCode } : {}),
    ...(input.matchId ? { matchId: input.matchId } : {}),
    ...(input.decisionId ? { decisionId: input.decisionId } : {}),
    ...(input.clientActionId ? { clientActionId: input.clientActionId } : {}),
    ...(Number.isInteger(input.seatIndex) && input.seatIndex! >= 0 ? { seatIndex: input.seatIndex } : {}),
    ...error,
    ...(!error.reason && input.reason ? { reason: safeReason(input.reason) } : {}),
  };
}

export function createDiagnosticReporter(
  sink: DiagnosticSink,
  clock: () => number = Date.now,
): DiagnosticReporter {
  return (input) => {
    try {
      sink(buildDiagnosticRecord(input, clock));
    } catch {
      // Diagnostics are observational and can never own room control flow.
    }
  };
}

export const reportServerDiagnostic = createDiagnosticReporter((record) => {
  if (process.env.NODE_ENV !== "test") console.log(JSON.stringify(record));
});
