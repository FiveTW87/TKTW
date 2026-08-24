import { describe, expect, it } from "vitest";
import { resolveRoomSettings } from "@tktw/shared";
import { resolveEffectiveRoomPacing } from "../src/rooms/roomPacing";

describe("resolveEffectiveRoomPacing", () => {
  it("lets server test/deployment overrides replace only an implicit Standard selection", () => {
    expect(resolveEffectiveRoomPacing(
      { pacing: resolveRoomSettings(), pacingExplicit: false },
      { decisionTimeoutMs: 50, gracePeriodMs: 70, revealDurationMs: 1, botAnswerDelayMs: 2 },
    )).toEqual({ decisionTimeoutMs: 50, gracePeriodMs: 70, revealDurationMs: 1, botAnswerDelayMs: 2 });
  });

  it("makes every explicit named/custom room selection override server defaults", () => {
    expect(resolveEffectiveRoomPacing(
      { pacing: resolveRoomSettings({ preset: "beginner" }), pacingExplicit: true },
      { decisionTimeoutMs: 50, gracePeriodMs: 70, revealDurationMs: 1, botAnswerDelayMs: 2 },
    )).toEqual({ decisionTimeoutMs: 60_000, gracePeriodMs: 90_000, revealDurationMs: 10_000, botAnswerDelayMs: 900 });

    expect(resolveEffectiveRoomPacing({
      pacing: resolveRoomSettings({
        preset: "custom",
        decisionTimeoutSec: 75,
        reconnectGraceSec: 120,
        revealDurationSec: 12,
        botAnswerDelayMs: 750,
      }),
      pacingExplicit: true,
    }, {})).toEqual({ decisionTimeoutMs: 75_000, gracePeriodMs: 120_000, revealDurationMs: 12_000, botAnswerDelayMs: 750 });
  });
});
