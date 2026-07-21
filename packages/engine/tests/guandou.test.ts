import { describe, it, expect } from "vitest";
import "../src/generals/index";
import "../src/equipment/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { assignGeneral } from "../src/core/generalAssign";
import { projectFor } from "../src/core/view";

// ENG-007 — ขงเบ้ง "อ่านดาววางกล" (guandou): only the owner may see the peeked
// card ids, and the ordering answer is validated (no dup / no extra).
function guandouGame(seed: number) {
  const rng = createRng(seed);
  const state = createInitialState({ playerCount: 3, seed }, rng);
  assignGeneral(state, "p0", "zhugeliang", true);
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  const session = createSession(runGame(ctx), state, rng);
  // TurnStart fires the guandou opt-in first — accept it to reach guandouOrder.
  const act = session.state.pendingDecision!;
  expect(act.kind).toBe("activateSkill");
  respond(session, { decisionId: act.id, playerId: "p0" });
  return session;
}

describe("ENG-007 guandou", () => {
  it("sends the peeked card ids ONLY to the owner (redacted for others)", () => {
    const session = guandouGame(701);
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("guandouOrder");

    // Owner sees the options; everyone else gets them stripped.
    const ownerView = projectFor(session.state, "p0");
    const otherView = projectFor(session.state, "p1");
    expect((ownerView.pendingDecision!.data as { options?: string[] }).options?.length).toBeGreaterThan(0);
    expect((otherView.pendingDecision!.data as { options?: string[] }).options).toBeUndefined();
  });

  it("rejects an ordering with a duplicate card id", () => {
    const session = guandouGame(702);
    const pd = session.state.pendingDecision!;
    const options = (pd.data as { options: string[] }).options;
    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", cardIds: [options[0]!, options[0]!] }),
    ).toThrow(/duplicate/);
  });

  it("rejects an ordering with an unknown card id", () => {
    const session = guandouGame(7021);
    const pd = session.state.pendingDecision!;
    expect(() =>
      respond(session, { decisionId: pd.id, playerId: "p0", cardIds: ["not_revealed"] }),
    ).toThrow(/not one of the revealed/);
  });

  it("accepts a valid ordering and advances", () => {
    const session = guandouGame(7022);
    const pd = session.state.pendingDecision!;
    const options = (pd.data as { options: string[] }).options;
    respond(session, { decisionId: pd.id, playerId: "p0", cardIds: [options[0]!] });
    expect(session.state.pendingDecision!.kind).not.toBe("guandouOrder");
  });

  it("a timeout default (no ids) keeps the order and advances", () => {
    const session = guandouGame(703);
    const pd = session.state.pendingDecision!;
    respond(session, { decisionId: pd.id, playerId: "p0", pass: true });
    expect(session.state.pendingDecision!.kind).not.toBe("guandouOrder");
  });
});
