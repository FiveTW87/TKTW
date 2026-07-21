import { describe, it, expect } from "vitest";
import "../src/equipment/index";
import "../src/generals/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { assignGeneral } from "../src/core/generalAssign";
import { getPlayer } from "../src/core/state";

// ENG-004 — the draw phase is gated behind an explicit `drawCard` decision:
// the player presses จั่วการ์ด (or a timeout default answers), and the whole
// draw — base 2 plus any modifiers — happens in ONE transaction, exactly once.
function freshTurn(seed: number, general = "sunquan") {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount: 3, seed }, rng);
  assignGeneral(state, "p0", general, true);
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  const session = createSession(runGame(ctx), state, rng);
  return { state, session };
}

describe("ENG-004 draw phase gating", () => {
  it("the first turn opens on a drawCard decision (base count 2)", () => {
    const { state, session } = freshTurn(1);
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("drawCard");
    expect(pd.playerId).toBe("p0");
    const data = pd.data as { count: number; base: number; skills: string[] };
    expect(data.count).toBe(2);
    expect(data.base).toBe(2);
    expect(data.skills).toEqual([]);

    const before = getPlayer(state, "p0").hand.length;
    respond(session, { decisionId: pd.id, playerId: "p0", choice: "draw" });
    expect(getPlayer(state, "p0").hand.length).toBe(before + 2);
    expect(session.state.pendingDecision!.kind).toBe("mainAction");
  });

  it("any answer draws (a timeout default that just passes still draws)", () => {
    const { state, session } = freshTurn(2);
    const pd = session.state.pendingDecision!;
    const before = getPlayer(state, "p0").hand.length;
    respond(session, { decisionId: pd.id, playerId: "p0", pass: true }); // the safe default
    expect(getPlayer(state, "p0").hand.length).toBe(before + 2);
  });

  it("a stale/duplicate answer can't draw twice", () => {
    const { state, session } = freshTurn(3);
    const pd = session.state.pendingDecision!;
    const before = getPlayer(state, "p0").hand.length;
    respond(session, { decisionId: pd.id, playerId: "p0", choice: "draw" });
    const afterOne = getPlayer(state, "p0").hand.length;
    expect(afterOne).toBe(before + 2);
    // replaying the same decision id is rejected — no second draw
    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", choice: "draw" }),
    ).toThrow();
    expect(getPlayer(state, "p0").hand.length).toBe(afterOne);
  });

  it("เตียวเลี้ยว จู่โจม (tuxi) replaces the draw entirely — no drawCard gate", () => {
    // p0 = zhangliao; tuxi (optional DrawPhaseStart) steals instead of drawing.
    const { session } = freshTurn(4, "zhangliao");
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("zhangliao_tuxi");
    respond(session, { decisionId: act.id, playerId: "p0" }); // accept → steal
    // tuxi sets a -2 modifier → computed draw is 0 → the draw gate is skipped
    const pick = session.state.pendingDecision!;
    expect(pick.kind).not.toBe("drawCard");
  });
});
