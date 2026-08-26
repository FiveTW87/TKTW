import { describe, expect, it } from "vitest";
import { SFX_BANK, SFX_NAMES } from "../src/audio/sfxBank";

describe("SFX-002 sound bank contract", () => {
  it("defines one bounded layered recipe for every public cue", () => {
    expect(new Set(SFX_NAMES).size).toBe(SFX_NAMES.length);
    expect(Object.keys(SFX_BANK).sort()).toEqual([...SFX_NAMES].sort());
    for (const name of SFX_NAMES) {
      const recipe = SFX_BANK[name];
      expect(recipe.layers.length, name).toBeGreaterThan(0);
      expect(recipe.layers.length, name).toBeLessThanOrEqual(4);
      expect(recipe.maxVoices, name).toBeGreaterThan(0);
      expect(recipe.maxVoices, name).toBeLessThanOrEqual(2);
      expect(recipe.outputGain, name).toBeGreaterThan(0);
      expect(recipe.outputGain, name).toBeLessThanOrEqual(1);
      for (const layer of recipe.layers) {
        expect(layer.delayMs, name).toBeGreaterThanOrEqual(0);
        expect(layer.durationMs, name).toBeGreaterThan(0);
        expect(layer.durationMs, name).toBeLessThanOrEqual(1_000);
        expect(layer.gain, name).toBeGreaterThan(0);
        expect(layer.gain, name).toBeLessThanOrEqual(1);
        if (layer.kind === "tone") {
          expect(layer.frequency, name).toBeGreaterThan(0);
          if (layer.endFrequency !== undefined) expect(layer.endFrequency, name).toBeGreaterThan(0);
        } else {
          expect(layer.filterFrequency, name).toBeGreaterThan(0);
        }
      }
    }
  });

  it("reserves the strongest mix and priority for Shandian impact", () => {
    expect(SFX_BANK.lightning.priority).toBe(4);
    expect(SFX_BANK.lightning.outputGain).toBe(1);
    expect(SFX_BANK.lightning.maxVoices).toBe(1);
    expect(new Set(SFX_BANK.lightning.layers.map((layer) => layer.kind))).toEqual(new Set(["tone", "noise"]));
  });
});
