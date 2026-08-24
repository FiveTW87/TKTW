import { z } from "zod";

export const ROOM_PACING_PRESETS = {
  beginner: {
    decisionTimeoutSec: 60,
    reconnectGraceSec: 90,
    revealDurationSec: 10,
    botAnswerDelayMs: 900,
  },
  standard: {
    decisionTimeoutSec: 30,
    reconnectGraceSec: 45,
    revealDurationSec: 8,
    botAnswerDelayMs: 600,
  },
  fast: {
    decisionTimeoutSec: 15,
    reconnectGraceSec: 30,
    revealDurationSec: 4,
    botAnswerDelayMs: 250,
  },
} as const;

export type NamedRoomPacingPreset = keyof typeof ROOM_PACING_PRESETS;
export type RoomPacingPreset = NamedRoomPacingPreset | "custom";

export const ROOM_PACING_LIMITS = {
  decisionTimeoutSec: { min: 15, max: 180 },
  reconnectGraceSec: { min: 15, max: 300 },
  revealDurationSec: { min: 3, max: 20 },
  botAnswerDelayMs: { min: 100, max: 2_000 },
} as const;

const boundedInteger = (limits: { min: number; max: number }) =>
  z.number().int().min(limits.min).max(limits.max);

export const customRoomSettingsSchema = z.object({
  preset: z.literal("custom"),
  decisionTimeoutSec: boundedInteger(ROOM_PACING_LIMITS.decisionTimeoutSec),
  reconnectGraceSec: boundedInteger(ROOM_PACING_LIMITS.reconnectGraceSec),
  revealDurationSec: boundedInteger(ROOM_PACING_LIMITS.revealDurationSec),
  botAnswerDelayMs: boundedInteger(ROOM_PACING_LIMITS.botAnswerDelayMs),
}).strict();

export const roomSettingsSelectionSchema = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("beginner") }).strict(),
  z.object({ preset: z.literal("standard") }).strict(),
  z.object({ preset: z.literal("fast") }).strict(),
  customRoomSettingsSchema,
]);

export type RoomSettingsSelection = z.infer<typeof roomSettingsSelectionSchema>;

export interface ResolvedRoomSettings {
  preset: RoomPacingPreset;
  decisionTimeoutSec: number;
  reconnectGraceSec: number;
  revealDurationSec: number;
  botAnswerDelayMs: number;
}

export function resolveRoomSettings(
  selection?: RoomSettingsSelection,
  legacyDecisionTimeoutSec?: number,
): ResolvedRoomSettings {
  if (selection?.preset === "custom") return { ...selection };
  if (selection) return { preset: selection.preset, ...ROOM_PACING_PRESETS[selection.preset] };
  if (legacyDecisionTimeoutSec !== undefined) {
    return {
      preset: "custom",
      ...ROOM_PACING_PRESETS.standard,
      decisionTimeoutSec: legacyDecisionTimeoutSec,
    };
  }
  return { preset: "standard", ...ROOM_PACING_PRESETS.standard };
}
