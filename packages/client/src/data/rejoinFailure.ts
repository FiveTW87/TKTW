export type RejoinFailureKind = "room-lost" | "access-expired" | "transport" | "unknown";

export function classifyRejoinFailure(error: string): RejoinFailureKind {
  const normalized = error.trim().toLowerCase();
  if (normalized.includes("room not found")) return "room-lost";
  if (normalized.includes("invalid session token") || normalized.includes("not a member of this room")) {
    return "access-expired";
  }
  if (
    normalized.includes("connection timeout")
    || normalized.includes("ack timeout")
    || normalized.includes("transport")
    || normalized.includes("network")
  ) return "transport";
  return "unknown";
}
