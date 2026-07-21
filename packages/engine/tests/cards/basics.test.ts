import { describe, it, expect } from "vitest";
import "../../src/equipment/index";
import "../../src/generals/index";
import { createGame } from "../../src/index";
import { respond, type GameSession } from "../../src/core/decisions";
import { getPlayer } from "../../src/core/state";
import { forceIntoHand, passDraw } from "../_testUtils";

const SHAN = "heart_1_2"; // a real หลบ
const WUXIE = "club_13_1"; // a real ไร้ช่องโหว่
const SHUNSHOU = "spade_11_1"; // range-1 trick

function atP0(playerCount: number, seed: number): GameSession {
  const session = createGame({ playerCount, seed });
  passDraw(session); // advance past the ENG-004 draw gate
  delete session.rebuild; // out-of-band forceIntoHand below; keep it stable
  expect(session.state.pendingDecision!.kind).toBe("mainAction");
  expect(session.state.pendingDecision!.playerId).toBe("p0");
  return session;
}

// Regression for the crash the hardened flow-probe surfaced: หลบ / ไร้ช่องโหว่
// have no proactive play effect, so playing one as a main action used to fall
// through, DISCARD the card, open a wuxie window, and only THEN throw — a
// mutate-then-throw mid-resolution that stranded the room. It must now reject
// up front, atomically, and be safe to retry.
describe("reactive-only cards can't be played as a main action", () => {
  for (const [name, cardId] of [["หลบ (shan)", SHAN], ["ไร้ช่องโหว่ (wuxie)", WUXIE]] as const) {
    it(`${name}: rejected up front, hand untouched, retry works`, () => {
      const session = atP0(3, 71);
      forceIntoHand(session.state, "p0", cardId);
      const pd = session.state.pendingDecision!;

      expect(() =>
        respond(session, { decisionId: pd.id, playerId: "p0", choice: "playCard", cardIds: [cardId], targetIds: [] }),
      ).toThrow();

      // atomic: rejected UP FRONT — the card was NOT discarded (the old bug
      // discarded it and opened a wuxie window before throwing), still p0's
      // mainAction. (End-to-end retry-safety after a reject is covered by
      // retrySafety.test.ts and the shunshou case below.)
      expect(getPlayer(session.state, "p0").hand.some((c) => c.id === cardId)).toBe(true);
      expect(session.state.discardPile.some((c) => c.id === cardId)).toBe(false);
      expect(session.state.pendingDecision!.kind).toBe("mainAction");
      expect(session.state.pendingDecision!.playerId).toBe("p0");
    });
  }
});

// Regression for image #5 ("target p1 is out of range for shunshou"): the
// reject must not freeze the room.
describe("ฉวยโอกาสลักแกะ (shunshou) out-of-range reject is retry-safe", () => {
  it("stealing from a distance-2 target throws, then a retry continues", () => {
    // 5 players → seat 0 to seat 2 is distance 2; shunshou range is 1.
    const session = createGame({ playerCount: 5, seed: 505 });
    passDraw(session); // advance past the ENG-004 draw gate
    forceIntoHand(session.state, "p0", SHUNSHOU);
    const pd = session.state.pendingDecision!;

    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", choice: "playCard", cardIds: [SHUNSHOU], targetIds: ["p2"] }),
    ).toThrow(/out of range/);

    expect(session.state.pendingDecision).toBeDefined();
    expect(session.state.finished).toBe(false);
    respond(session, { decisionId: session.state.pendingDecision!.id, playerId: session.state.pendingDecision!.playerId, choice: "endPhase" });
    expect(session.state.pendingDecision !== undefined || session.state.finished).toBe(true);
  });
});
