import { describe, it, expect } from "vitest";
import { relativeSeat, densityMode, arcPosition } from "../src/lib/seatLayout";

describe("relativeSeat (SPEC §11.3)", () => {
  it("is 0 for the viewer's own seat", () => {
    expect(relativeSeat(3, 3, 5)).toBe(0);
  });

  it("wraps clockwise around the table", () => {
    // viewer at seat 4 of 5 (0-indexed): seat 0 is 1 seat clockwise away
    expect(relativeSeat(0, 4, 5)).toBe(1);
    expect(relativeSeat(3, 4, 5)).toBe(4);
  });

  it("handles negative modulo correctly for every seat in a 10-player game", () => {
    const seen = new Set<number>();
    for (let target = 0; target < 10; target++) {
      const rel = relativeSeat(target, 7, 10);
      expect(rel).toBeGreaterThanOrEqual(0);
      expect(rel).toBeLessThan(10);
      seen.add(rel);
    }
    expect(seen.size).toBe(10); // a bijection — no two seats collide
  });
});

describe("densityMode (SPEC §11.3)", () => {
  it("3-5 players -> medium", () => {
    expect(densityMode(3)).toBe("medium");
    expect(densityMode(5)).toBe("medium");
  });
  it("6-8 players -> compact", () => {
    expect(densityMode(6)).toBe("compact");
    expect(densityMode(8)).toBe("compact");
  });
  it("9-10 players -> head", () => {
    expect(densityMode(9)).toBe("head");
    expect(densityMode(10)).toBe("head");
  });
});

describe("arcPosition", () => {
  it("spreads N-1 opponents across distinct positions with no overlap", () => {
    for (const playerCount of [3, 5, 8, 10]) {
      const positions = Array.from({ length: playerCount - 1 }, (_, i) => arcPosition(i + 1, playerCount));
      const keys = new Set(positions.map((p) => `${p.leftPct.toFixed(1)},${p.topPct.toFixed(1)}`));
      expect(keys.size).toBe(playerCount - 1);
      // all positions stay within the board's percentage box
      for (const p of positions) {
        expect(p.leftPct).toBeGreaterThan(-10);
        expect(p.leftPct).toBeLessThan(110);
        expect(p.topPct).toBeGreaterThan(-10);
        expect(p.topPct).toBeLessThan(110);
      }
    }
  });

  it("a single opponent (2-player game) centers on the arc", () => {
    const pos = arcPosition(1, 2);
    expect(pos.leftPct).toBeCloseTo(50, 0);
  });
});
