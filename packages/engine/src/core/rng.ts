// Seeded PRNG. Rule #4 (SPEC.md 0.0): Math.random() must never appear
// anywhere in engine/ — every random decision has to be reproducible from
// (seed, decision log) alone, or replay-based crash recovery breaks.

export interface Rng {
  next(): number; // float in [0, 1)
  nextInt(maxExclusive: number): number; // integer in [0, maxExclusive)
  shuffle<T>(arr: readonly T[]): T[];
}

// mulberry32 — small, fast, good-enough statistical quality for a card game,
// and trivially auditable (no hidden state beyond one 32-bit integer).
export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error("nextInt: maxExclusive must be > 0");
    return Math.floor(next() * maxExclusive);
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  }

  return { next, nextInt, shuffle };
}
