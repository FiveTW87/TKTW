import { describe, it, expect } from "vitest";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { resolveWithWuxieWindow } from "../src/core/wuxieWindow";
import { makeEvent } from "../src/core/eventStack";
import type { PlayerAnswer } from "../src/types";
import { forceIntoHand } from "./_testUtils";

// The deck has exactly 4 real wuxie cards (SPEC 9.2) — reuse their real ids
// so cardById()/countsAsType() (which look up the static 104-card registry,
// not whatever a test fabricates) succeed.
const WUXIE_IDS = ["spade_13_2", "heart_13_1", "club_13_1", "club_13_2"];

// Drives resolveWithWuxieWindow directly (bypassing the session/respond()
// machinery) so this can test the recursive cancellation logic in
// isolation, without needing a real trick card implemented yet (P1).
describe("TC-1: nested wuxie cancellation (SPEC 15)", () => {
  it("A ดวล B, C-D-E each wuxie the previous one (3 = odd) -> original is cancelled", () => {
    const rng = createRng(1);
    const state = createInitialState({ playerCount: 5, seed: 1 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const ids = { p2: WUXIE_IDS[0]!, p3: WUXIE_IDS[1]!, p4: WUXIE_IDS[2]! };
    for (const pid of ["p2", "p3", "p4"] as const) forceIntoHand(state, pid, ids[pid]);

    const script: Record<string, PlayerAnswer> = {
      p0: { decisionId: "n/a", playerId: "p0", pass: true },
      p1: { decisionId: "n/a", playerId: "p1", pass: true },
      p2: { decisionId: "n/a", playerId: "p2", cardIds: [ids.p2] },
      p3: { decisionId: "n/a", playerId: "p3", cardIds: [ids.p3] },
      p4: { decisionId: "n/a", playerId: "p4", cardIds: [ids.p4] },
    };
    const used = new Set<string>();

    const event = makeEvent(state, "juedou", "p0", ["p1"]);
    const gen = resolveWithWuxieWindow(ctx, event);
    let result = gen.next();
    while (!result.done) {
      const d = result.value;
      let answer = script[d.playerId]!;
      if (answer.cardIds && used.has(d.playerId)) {
        answer = { decisionId: "n/a", playerId: d.playerId, pass: true };
      }
      if (answer.cardIds) used.add(d.playerId);
      result = gen.next(answer);
    }

    expect(result.value).toBe(false); // duel does NOT resolve — it was cancelled
    expect(event.cancelled).toBe(true);
    // all three wuxie cards were actually spent
    for (const pid of ["p2", "p3", "p4"]) {
      const p = state.players.find((pl) => pl.id === pid)!;
      expect(p.hand.some((c) => c.typeKey === "wuxie")).toBe(false);
    }
    expect(state.discardPile.filter((c) => c.typeKey === "wuxie")).toHaveLength(3);
  });

  it("an even number of stacked wuxie lets the original resolve", () => {
    const rng = createRng(2);
    const state = createInitialState({ playerCount: 4, seed: 2 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const ids = { p1: WUXIE_IDS[0]!, p2: WUXIE_IDS[1]! };
    for (const pid of ["p1", "p2"] as const) forceIntoHand(state, pid, ids[pid]);

    const script: Record<string, PlayerAnswer> = {
      p0: { decisionId: "n/a", playerId: "p0", pass: true },
      p1: { decisionId: "n/a", playerId: "p1", cardIds: [ids.p1] },
      p2: { decisionId: "n/a", playerId: "p2", cardIds: [ids.p2] },
      p3: { decisionId: "n/a", playerId: "p3", pass: true },
    };
    const used = new Set<string>();

    const event = makeEvent(state, "juedou", "p0", ["p3"]);
    const gen = resolveWithWuxieWindow(ctx, event);
    let result = gen.next();
    while (!result.done) {
      const d = result.value;
      let answer = script[d.playerId]!;
      if (answer.cardIds && used.has(d.playerId)) {
        answer = { decisionId: "n/a", playerId: d.playerId, pass: true };
      }
      if (answer.cardIds) used.add(d.playerId);
      result = gen.next(answer);
    }

    expect(result.value).toBe(true); // 2 wuxie stacked = even = original resolves
    expect(event.cancelled).toBe(false);
  });
});
