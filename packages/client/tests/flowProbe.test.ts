// Deterministic soak guard built on the flow probe: play every general in
// seat 0 across random 3-10 player games with a fault-injecting random bot,
// and lock in the invariants the probe established — no crash/hang, no UI
// copy/routing gaps, every card type reachable, every observable skill fires.
// Fixed seed → same games every run.
import { describe, it, expect } from "vitest";
import { runProbe, observableSkills, CARD_TYPES } from "../probe/flowProbe";

describe("flow-probe soak (every general × random player counts)", () => {
  // 30 games/general × 25 = 750 games at a fixed seed: enough that every
  // observable skill except the documented-rare jiehun fires, fast enough for
  // CI. Sweep harder locally via the CLI (probe/flowProbe.ts --games N).
  const f = runProbe(30, 424242);

  it("never crashes or hangs on random + deliberately-illegal input", () => {
    expect(f.crashes).toEqual([]);
    expect(f.hangs).toEqual([]);
    // faults DID happen (proving the fault injector ran) and were absorbed
    expect(f.rejectedInputs).toBeGreaterThan(0);
  });

  it("every seat-0 decision has real UI copy/routing (no raw variable-name fallbacks)", () => {
    expect(Object.keys(f.copyDefaultKinds)).toEqual([]);
  });

  it("every card type gets played", () => {
    const gaps = CARD_TYPES.filter((t) => !f.cardsPlayed.has(t));
    expect(gaps).toEqual([]);
  });

  it("every observable general skill fires in real play (bar documented rare triggers)", () => {
    // jiehun needs an opponent to strip sunshangxiang's *equipment* specifically
    // — a board state random play almost never reaches. It's pinned directly in
    // engine/tests/equipmentRiders.test.ts instead. Any OTHER never-fired skill
    // is a real regression.
    const KNOWN_RARE = new Set(["sunshangxiang_jiehun"]);
    const gaps = observableSkills().filter((s) => !f.skillsFired.has(s) && !KNOWN_RARE.has(s));
    expect(gaps).toEqual([]);
  });
});
