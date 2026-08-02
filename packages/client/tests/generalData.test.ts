import { describe, it, expect } from "vitest";
import { GENERALS } from "@tktw/engine";
import { GENERAL_DISPLAY } from "../src/data/generalNames";

// Client-side maxHp is a mirrored copy (the engine has no channel to send it
// before a general is revealed — see GeneralSelect.tsx / RulesModal.tsx).
// This guards against silent drift whenever a general's HP is rebalanced.
describe("generalNames.ts maxHp mirrors the engine registry", () => {
  it("every general known to the engine has a matching client entry", () => {
    for (const [id, def] of Object.entries(GENERALS)) {
      expect(GENERAL_DISPLAY[id], `missing client entry for "${id}"`).toBeDefined();
      expect(GENERAL_DISPLAY[id]!.maxHp, `maxHp mismatch for "${id}"`).toBe(def.maxHp);
    }
  });

  it("has no client entries for unknown generalIds", () => {
    for (const id of Object.keys(GENERAL_DISPLAY)) {
      expect(GENERALS[id], `client has "${id}" but the engine doesn't`).toBeDefined();
    }
  });
});
