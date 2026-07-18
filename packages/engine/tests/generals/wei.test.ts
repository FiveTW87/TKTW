import { describe, it, expect } from "vitest";
import { gameWith, respond, getPlayer, countsAsType, forceIntoHand, passWuxie, planJudgment, cardById, CID } from "./_gh";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { runGame } from "../../src/core/turnLoop";
import { createSession } from "../../src/core/decisions";
import { assignGeneral } from "../../src/core/generalAssign";
import type { GameState } from "../../src/types";

/** A game where a delayed trick sits in `owner`'s judgment zone and the top of
 *  the deck is rigged to `judgeId`, all set BEFORE the turn loop runs so the
 *  first judge phase resolves it. */
function gameWithZone(seed: number, assigns: Array<[string, string, boolean?]>, ownerJudgePid: string, delayedId: string, judgeId: string) {
  const rng = createRng(seed);
  const state: GameState = createInitialState({ playerCount: assigns.length, seed }, rng);
  for (const [pid, gen, lord] of assigns) assignGeneral(state, pid, gen, lord ?? false);
  const strip = (id: string) => {
    for (const p of state.players) {
      p.hand = p.hand.filter((c) => c.id !== id);
      p.judgmentZone = p.judgmentZone.filter((c) => c.id !== id);
    }
    state.drawPile = state.drawPile.filter((c) => c.id !== id);
    state.discardPile = state.discardPile.filter((c) => c.id !== id);
  };
  strip(delayedId);
  getPlayer(state, ownerJudgePid).judgmentZone.push(cardById(delayedId));
  strip(judgeId);
  state.drawPile.push(cardById(judgeId)); // popped first as the judgment
  const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
  const session = createSession(runGame(ctx), state, rng);
  return { state, session };
}

// Drive past the interactive judgment reveal(s) plus any askWuxie in one step.
function revealAndSettle(session: ReturnType<typeof gameWith>["session"]): void {
  let n = 0;
  while (n++ < 30) {
    const pd = session.state.pendingDecision;
    if (!pd) return;
    if (pd.kind === "askWuxie") respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
    else if (pd.kind === "judgmentReveal") respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "reveal" });
    else return;
  }
}

describe("Wei generals", () => {
  it("โจโฉ วีรบุรุษเจ้าเล่ห์ (jianxiong): recovers the card that damaged him", () => {
    const { state, session } = gameWith(401, 3, [["p0", "sunquan", true], ["p1", "caocao"]]);
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p1").hand = []; // no หลบ → the สังหาร lands
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    // caocao also has hujia — its opt-in fires first (no-op here, he isn't lord).
    // Walk to the jianxiong opt-in, declining/passing anything else.
    let guard = 0;
    while (guard++ < 8) {
      const pd = session.state.pendingDecision!;
      const sid = (pd.data as { skillId?: string }).skillId;
      if (pd.kind === "activateSkill" && sid === "caocao_jianxiong") {
        respond(session, { decisionId: pd.id, playerId: pd.playerId }); // accept
        break;
      }
      respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
    }
    expect(getPlayer(state, "p1").hand.some((c) => c.id === CID.blackSha)).toBe(true);
  });

  it("โจโฉ คุ้มกันราชา (hujia): does NOT prompt when Cao Cao is the ATTACKER", () => {
    const { state, session } = gameWith(4021, 3, [["p0", "caocao", true], ["p1", "sunquan"], ["p2", "sunquan"]]);
    getPlayer(state, "p0").role = "lord";
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p1").hand = [];
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    // Cao Cao is attacking — hujia must never be offered to him here.
    const pd = session.state.pendingDecision;
    const isHujiaPrompt = pd?.kind === "activateSkill" && (pd.data as { skillId?: string }).skillId === "caocao_hujia";
    expect(isHujiaPrompt).toBe(false);
  });

  it("โจโฉ คุ้มกันราชา (hujia): a Wei ally plays หลบ for the lord when HE is attacked", () => {
    const { state, session } = gameWith(402, 3, [["p0", "sunquan", true], ["p1", "caocao"], ["p2", "zhangliao"]]);
    getPlayer(state, "p1").role = "lord";
    getPlayer(state, "p1").hand = []; // caocao has no หลบ of his own
    getPlayer(state, "p2").hand = [];
    forceIntoHand(state, "p2", CID.redShan); // the Wei ally does
    forceIntoHand(state, "p0", CID.blackSha);
    const before = getPlayer(state, "p1").hp;

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("caocao_hujia");
    respond(session, { decisionId: act.id, playerId: "p1" }); // accept
    const vol = session.state.pendingDecision!;
    expect(vol.kind).toBe("hujiaVolunteer");
    expect(vol.playerId).toBe("p2");
    respond(session, { decisionId: vol.id, playerId: "p2", cardIds: [CID.redShan] });

    expect(getPlayer(state, "p1").hp).toBe(before); // auto-dodged, no damage
    expect(getPlayer(state, "p2").hand.some((c) => c.id === CID.redShan)).toBe(false); // spent
  });

  it("กุยแก ริษยาฟ้า (yidu): keeps his own judgment card", () => {
    // guojia holds a lebusishu; rig the judgment to a heart he then keeps.
    const { state, session } = gameWithZone(403, [["p0", "guojia", true], ["p1", "sunquan"], ["p2", "sunquan"]], "p0", "spade_12_2", CID.redShan);
    passWuxie(session);
    const reveal = session.state.pendingDecision!;
    expect(reveal.kind).toBe("judgmentReveal");
    respond(session, { decisionId: reveal.id, playerId: "p0", choice: "reveal" });
    // yidu is an optional AfterJudge trigger → accept
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("guojia_yidu");
    respond(session, { decisionId: act.id, playerId: "p0" });
    expect(getPlayer(state, "p0").hand.some((c) => c.id === CID.redShan)).toBe(true);
  });

  it("กุยแก แผนสุดท้าย (yiji): on losing HP, reveals 2 cards and distributes them", () => {
    const { state, session } = gameWith(404, 3, [["p0", "sunquan", true], ["p1", "guojia"]]);
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p1").hand = [];
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    const maybeShan = session.state.pendingDecision!;
    if (maybeShan.kind === "respondShan") respond(session, { decisionId: maybeShan.id, playerId: "p1", pass: true });

    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("guojia_yiji");
    respond(session, { decisionId: act.id, playerId: "p1" }); // accept
    // two yijiGive decisions — keep both himself
    for (let i = 0; i < 2; i++) {
      const give = session.state.pendingDecision!;
      expect(give.kind).toBe("yijiGive");
      respond(session, { decisionId: give.id, playerId: "p1", targetIds: ["p1"] });
    }
    expect(getPlayer(state, "p1").hand.length).toBe(2); // both kept
  });

  it("สุมาอี้ โต้กลับ (fankui): steals a card from whoever damaged him", () => {
    const { state, session } = gameWith(405, 3, [["p0", "sunquan", true], ["p1", "simayi"]]);
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p1").hand = [];
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    const maybeShan = session.state.pendingDecision!;
    if (maybeShan.kind === "respondShan") respond(session, { decisionId: maybeShan.id, playerId: "p1", pass: true });

    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("simayi_fankui");
    respond(session, { decisionId: act.id, playerId: "p1" });
    const pick = session.state.pendingDecision!;
    expect(pick.kind).toBe("fankuiPick");
    respond(session, { decisionId: pick.id, playerId: "p1" }); // random from attacker
    expect(getPlayer(state, "p1").hand.length).toBe(1); // stole 1 from p0
  });

  it("สุมาอี้ อัจฉริยะปีศาจ (guicai): replaces a judgment card from his hand", () => {
    // p0 holds a lebusishu to judge; simayi (p1) swaps the result from hand.
    const { state, session } = gameWithZone(406, [["p0", "sunquan", true], ["p1", "simayi"], ["p2", "sunquan"]], "p0", "spade_12_2", CID.blackSha2);
    getPlayer(state, "p1").hand = [];
    forceIntoHand(state, "p1", CID.redShan); // the replacement card
    passWuxie(session);
    const reveal = session.state.pendingDecision!;
    expect(reveal.kind).toBe("judgmentReveal");
    respond(session, { decisionId: reveal.id, playerId: "p0", choice: "reveal" });
    // guicai is locked → its own prompt appears directly (no activateSkill)
    const swap = session.state.pendingDecision!;
    expect(swap.kind).toBe("guicaiReplace");
    expect(swap.playerId).toBe("p1");
    respond(session, { decisionId: swap.id, playerId: "p1", cardIds: [CID.redShan] });
    expect(getPlayer(state, "p1").hand.some((c) => c.id === CID.redShan)).toBe(false); // spent as the judgment
    expect(state.log.some((e) => e.text.includes("อัจฉริยะปีศาจ"))).toBe(true);
  });

  it("เอียนสี โฉมงาม (guose): a black card counts as หลบ", () => {
    const { state } = gameWith(407, 3, [["p0", "zhenji", true]]);
    expect(countsAsType(state, "p0", CID.blackDuel, "shan")).toBe(true); // black
    expect(countsAsType(state, "p0", CID.diamond, "shan")).toBe(false); // red
  });

  it("เอียนสี เทพีลั่วสุ่ย (luoshen): keeps each black judgment and re-judges", () => {
    const { state, session } = gameWith(408, 3, [["p0", "zhenji", true]]);
    // Rig the judge loop: one black (kept) then one red (stops). planJudgment
    // pushes to the end (popped first), so push red first, then black.
    planJudgment(state, (suit) => suit === "heart" || suit === "diamond");
    planJudgment(state, (suit) => suit === "spade" || suit === "club");

    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("zhenji_luoshen");
    respond(session, { decisionId: act.id, playerId: "p0" }); // accept

    const kept = state.log.filter((e) => e.text.includes("เทพีลั่วสุ่ย")).length;
    expect(kept).toBe(1); // exactly one black card kept before the red stopped it
    revealAndSettle(session);
  });
});
