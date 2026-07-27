import { describe, it, expect } from "vitest";
import { playSfx } from "../src/lib/sfx";
import { useSfxStore } from "../src/store/sfxStore";

// jsdom has no Web Audio API — playSfx must no-op safely rather than throw,
// for every named effect and regardless of mute/volume state.
describe("playSfx (synthesized sound effects)", () => {
  it("no-ops without throwing for every effect when AudioContext is unavailable", () => {
    const names = ["cardPlay", "skillUse", "draw", "damage", "turnStart", "win", "lose"] as const;
    for (const name of names) {
      expect(() => playSfx(name)).not.toThrow();
    }
  });

  it("no-ops when muted", () => {
    useSfxStore.getState().setMuted(true);
    expect(() => playSfx("cardPlay")).not.toThrow();
    useSfxStore.getState().setMuted(false);
  });

  it("no-ops when volume is 0", () => {
    useSfxStore.getState().setVolume(0);
    expect(() => playSfx("cardPlay")).not.toThrow();
    useSfxStore.getState().setVolume(0.6);
  });
});
