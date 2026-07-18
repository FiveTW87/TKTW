import { describe, it, expect } from "vitest";
import { gameWith, respond, getPlayer, forceIntoHand, CID } from "./_gh";

describe("Qun generals", () => {
  it("เตียวเสี้ยน จันทร์อำพราง (libu): draws 1 extra at the end of her turn", () => {
    const { state, session } = gameWith(501, 3, [["p0", "diaochan", true]]);
    respond(session, { decisionId: session.state.pendingDecision!.id, playerId: "p0", choice: "endPhase" });

    // Walk through the discard phase to the end-of-turn libu opt-in.
    let handBefore = -1;
    let guard = 0;
    while (guard++ < 10) {
      const pd = session.state.pendingDecision!;
      const sid = (pd.data as { skillId?: string }).skillId;
      if (pd.kind === "activateSkill" && sid === "diaochan_libu") {
        handBefore = getPlayer(state, "p0").hand.length;
        respond(session, { decisionId: pd.id, playerId: "p0" }); // accept
        break;
      }
      if (pd.kind === "discardTo") {
        const need = Number((pd.data as { mustDiscard?: number }).mustDiscard ?? 0);
        const ids = getPlayer(state, pd.playerId).hand.slice(0, need).map((c) => c.id);
        respond(session, { decisionId: pd.id, playerId: pd.playerId, cardIds: ids });
      } else {
        respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
      }
    }
    expect(handBefore).toBeGreaterThanOrEqual(0);
    expect(getPlayer(state, "p0").hand.length).toBe(handBefore + 1);
  });

  it("ฮัวโต๋ ถุงยาเขียว (qingnang): discard a card to heal an injured player 1", () => {
    const { state, session } = gameWith(502, 3, [["p0", "huatuo", true]]);
    const p1 = getPlayer(state, "p1");
    p1.hp = p1.maxHp - 1;
    getPlayer(state, "p0").hand = [];
    forceIntoHand(state, "p0", CID.blackSha);
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "useSkill", skillId: "huatuo_qingnang", cardIds: [CID.blackSha], targetIds: ["p1"] });

    expect(p1.hp).toBe(p1.maxHp); // healed 1
    expect(state.discardPile.some((c) => c.id === CID.blackSha)).toBe(true); // card spent
    expect(getPlayer(state, "p0").hand.some((c) => c.id === CID.blackSha)).toBe(false);
  });
});
