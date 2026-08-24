import type { ResolvedRoomSettings } from "@tktw/shared";

export interface ServerPacingOverrides {
  decisionTimeoutMs?: number;
  gracePeriodMs?: number;
  revealDurationMs?: number;
  botAnswerDelayMs?: number;
}

export interface EffectiveRoomPacing {
  decisionTimeoutMs: number;
  gracePeriodMs: number;
  revealDurationMs: number;
  botAnswerDelayMs: number;
}

interface RoomPacingSource {
  pacing: ResolvedRoomSettings;
  pacingExplicit: boolean;
}

/** Converts wire-friendly seconds to server milliseconds once. Explicit host
 * settings are authoritative; server overrides remain available for rooms
 * that accepted the implicit Standard default (notably deterministic tests). */
export function resolveEffectiveRoomPacing(
  room: RoomPacingSource,
  overrides: ServerPacingOverrides,
): EffectiveRoomPacing {
  const selected: EffectiveRoomPacing = {
    decisionTimeoutMs: room.pacing.decisionTimeoutSec * 1_000,
    gracePeriodMs: room.pacing.reconnectGraceSec * 1_000,
    revealDurationMs: room.pacing.revealDurationSec * 1_000,
    botAnswerDelayMs: room.pacing.botAnswerDelayMs,
  };
  if (room.pacingExplicit) return selected;
  return {
    decisionTimeoutMs: overrides.decisionTimeoutMs ?? selected.decisionTimeoutMs,
    gracePeriodMs: overrides.gracePeriodMs ?? selected.gracePeriodMs,
    revealDurationMs: overrides.revealDurationMs ?? selected.revealDurationMs,
    botAnswerDelayMs: overrides.botAnswerDelayMs ?? selected.botAnswerDelayMs,
  };
}
