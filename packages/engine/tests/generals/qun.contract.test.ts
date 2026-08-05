// TKTW_TEST_CASE_CATALOG.md → "นายพล 25 ตัว / ก๊กอื่น"
// (G-LUBU, G-DIAOCHAN, G-HUATUO).
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, withTargets, choose, useSkill,
  runTo, passWuxie, playTrick, expectDecision, expectAtomicReject, expectNoSkillPrompt,
  expectHp, expectAlive, expectZone, expectHandSize, expectUsage, expectLog, expectNoLog,
  expectDiscarded, expectSkillUsed, nextTurnOf, C, findCard, findCards,
} from "../_contract";
import { equip, setHp, killOff, topOfDeck, setHand, clearHands } from "../_contract/rig";

const SHA = C.sha.spade!;
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHA_C = findCard({ typeKey: "sha", suit: "diamond" });
const SHAN = C.shan.heart!;
const SHAN_B = findCard({ typeKey: "shan", suit: "diamond" });
const SHAN_C = findCard({ typeKey: "shan", suit: "heart", exclude: [SHAN] });
const TAO = C.tao.heart!;
const TAO_B = findCard({ typeKey: "tao", suit: "diamond" });
const JUEDOU = C.juedou.any;
const RED_JUDGE = findCard({ typeKey: "wuzhong", suit: "heart" });
const BLACK_JUDGE = findCard({ typeKey: "guohe", suit: "spade" });
const BLACK_CARD = findCard({ typeKey: "guohe", suit: "club" });

describe("G-LUBU ลิโป้ — หอกฟางเทียนข่มทัพ", () => {
  it("[G-LUBU-01a] with no หลบ the target simply takes the hit", () => {
    const g = contractGame({
      seed: SEED(701), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[G-LUBU-01b] one หลบ is not enough — it is not spent and the hit lands", () => {
    const g = contractGame({
      seed: SEED(702), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[G-LUBU-01c] two หลบ dodge it and both are spent", () => {
    const g = contractGame({
      seed: SEED(703), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    const pd = expectDecision(g, { kind: "respondShan", playerId: "p1" });
    expect(pd.data.needed).toBe(2);
    step(g, { kind: "respondShan" }, withCards(SHAN, SHAN_B));
    expectHp(g.state, "p1", 4);
    expectDiscarded(g.state, SHAN, SHAN_B);
  });

  it("[G-LUBU-02] converted หลบ count toward the pair", () => {
    const g = contractGame({
      seed: SEED(704), assigns: [["p0", "lubu"], ["p1", "zhaoyun"]],
      hands: { p0: [SHA], p1: [SHA_B, SHA_C] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHA_B, SHA_C));
    expectHp(g.state, "p1", 4);
    expectDiscarded(g.state, SHA_B, SHA_C);
  });

  it("[G-LUBU-03] his ท้าศึกเดี่ยว makes the opponent answer two สังหาร each round", () => {
    const g = contractGame({
      seed: SEED(705), assigns: [["p0", "lubu"]],
      hands: { p0: [JUEDOU], p1: [SHA_B, SHA_C] },
    });
    playTrick(g, [JUEDOU], ["p1"]);
    const first = expectDecision(g, { kind: "respondSha", playerId: "p1" });
    expect(first.data.needed).toBe(2);
    step(g, { kind: "respondSha" }, withCards(SHA_B, SHA_C));
    expectDiscarded(g.state, SHA_B, SHA_C);
  });

  it("[G-LUBU-04] ลิโป้'s own side of the duel still answers with a single สังหาร", () => {
    const g = contractGame({
      seed: SEED(706), assigns: [["p0", "lubu"]],
      hands: { p0: [JUEDOU, SHA], p1: [SHA_B, SHA_C] },
    });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B, SHA_C));
    const mine = expectDecision(g, { kind: "respondSha", playerId: "p0" });
    expect(mine.data.needed).toBe(1);
    step(g, { kind: "respondSha" }, withCards(SHA));
    // back to p1, who is now out of สังหาร
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[G-LUBU-05a] คุ้มกันราชา must cover BOTH required หลบ to save the lord", () => {
    const g = contractGame({
      seed: SEED(707), playerCount: 3,
      assigns: [["p0", "lubu"], ["p1", "caocao", true], ["p2", "simayi"]],
      hands: { p0: [SHA], p1: [], p2: [SHAN, SHAN_B] },
      after: (s) => { s.players.find((p) => p.id === "p1")!.role = "lord"; },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // one OnNeedDodge fires per required หลบ
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHAN));
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHAN_B));
    expectHp(g.state, "p1", 5);
    expectDiscarded(g.state, SHAN, SHAN_B);
  });

  it("[G-LUBU-05b] โล่ราชันย์ negates his black สังหาร before the two-หลบ demand", () => {
    const g = contractGame({
      seed: SEED(708), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHAN, "hand", "p1"); // immunity costs nothing
    expectLog(g.state, { eventType: "renwangNegate" }, 1);
  });

  it("[G-LUBU-05c] ทหารม้าเหล็ก blocking the dodge overrides the two-หลบ demand entirely", () => {
    const g = contractGame({
      seed: SEED(709), assigns: [["p0", "machao"], ["p1", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => topOfDeck(s, [RED_JUDGE]),
    });
    // ม้าเฉียว attacks; his own tieqi judgment blocks the dodge. ลิโป้'s skill
    // belongs to the attacker, so it does not raise the requirement here.
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[G-LUBU-05d] the requirement belongs to the attacker, not the table", () => {
    const g = contractGame({
      seed: SEED(710), playerCount: 3, currentSeat: 1,
      assigns: [["p0", "lubu"]],
      hands: { p1: [SHA], p2: [SHAN] },
    });
    // p1 (not ลิโป้) attacks — a single หลบ is enough.
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p2"]));
    const pd = expectDecision(g, { kind: "respondShan", playerId: "p2" });
    expect(pd.data.needed).toBe(1);
    step(g, { kind: "respondShan" }, withCards(SHAN));
    expectHp(g.state, "p2", 4);
  });
});

describe("G-DIAOCHAN เตียวเสี้ยน — กลหญิงงามแตกสัมพันธ์ / จันทร์หลบโฉม", () => {
  it("[G-DIAOCHAN-01] discards 1 and forces a duel between two living men", () => {
    const g = contractGame({
      seed: SEED(721), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD], p1: [SHA_B], p2: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
    expectZone(g.state, BLACK_CARD, "discardPile");
    expectSkillUsed(g.state, "diaochan_lijian", 1);
    // the duel runs p2 -> p1: p1 answers first
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    expectHp(g.state, "p2", 3);
    expectHp(g.state, "p0", 3); // เตียวเสี้ยน maxHp 3, untouched by her own scheme
  });

  it("[G-DIAOCHAN-02a] a female target is refused", () => {
    const g = contractGame({
      seed: SEED(722), assigns: [["p0", "diaochan"], ["p1", "zhenji"]],
      hands: { p0: [BLACK_CARD] },
    });
    expectAtomicReject(g, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
  });

  it("[G-DIAOCHAN-02b] naming herself is refused", () => {
    const g = contractGame({
      seed: SEED(723), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD] },
    });
    expectAtomicReject(g, useSkill("diaochan_lijian", [BLACK_CARD], ["p0", "p1"]));
  });

  it("[G-DIAOCHAN-02c] naming the same player twice is refused", () => {
    const g = contractGame({
      seed: SEED(724), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD] },
    });
    expectAtomicReject(g, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p1"]));
  });

  it("[G-DIAOCHAN-02d] a dead target is refused", () => {
    const g = contractGame({
      seed: SEED(725), playerCount: 4, assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD] },
      after: (s) => killOff(s, "p1"),
    });
    expectAtomicReject(g, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
  });

  it("[G-DIAOCHAN-02e] a card she does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(726), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD], p1: [SHA] },
    });
    expectAtomicReject(g, useSkill("diaochan_lijian", [SHA], ["p1", "p2"]));
  });

  it("[G-DIAOCHAN-02f] a second use in the same turn is refused and it resets next turn", () => {
    const g = contractGame({
      seed: SEED(727), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD, BLACK_JUDGE], p1: [], p2: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { skills: { diaochan_lijian: 1 } });
    expectAtomicReject(g, useSkill("diaochan_lijian", [BLACK_JUDGE], ["p1", "p2"]), /already used/);
  });

  it("[G-DIAOCHAN-02g] the once-per-turn counter resets on her next turn", () => {
    const g = contractGame({
      seed: SEED(728), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD], p1: [], p2: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    nextTurnOf(g, "p0");
    expectUsage(g.state, "p0", { skills: { diaochan_lijian: 0 } });
  });

  it("[G-DIAOCHAN-03a] the forced duel needs no physical ท้าศึกเดี่ยว card", () => {
    const g = contractGame({
      seed: SEED(729), assigns: [["p0", "diaochan"]],
      hands: { p0: [BLACK_CARD], p1: [], p2: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
    expectDecision(g, { kind: "respondSha", playerId: "p1" });
    expect(g.state.discardPile.some((c) => c.typeKey === "juedou")).toBe(false);
  });

  it("[G-DIAOCHAN-03b] หอกฟางเทียน applies inside a duel she started", () => {
    const g = contractGame({
      seed: SEED(730), assigns: [["p0", "diaochan"], ["p2", "lubu"]],
      hands: { p0: [BLACK_CARD], p1: [SHA_B, SHA_C], p2: [] },
    });
    // duel source is p2 (ลิโป้), so p1 must answer with two สังหาร
    step(g, { kind: "mainAction" }, useSkill("diaochan_lijian", [BLACK_CARD], ["p1", "p2"]));
    const pd = expectDecision(g, { kind: "respondSha", playerId: "p1" });
    expect(pd.data.needed).toBe(2);
  });

  it("[G-DIAOCHAN-04] จันทร์หลบโฉม draws her 1 card at the end of her turn", () => {
    const g = contractGame({
      seed: SEED(731), assigns: [["p0", "diaochan"]], hands: { p0: [] },
    });
    step(g, { kind: "mainAction" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId, choice: "endPhase" }));
    step(g, { kind: "activateSkill", skillId: "diaochan_libu" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    expectHandSize(g.state, "p0", 1);
    expectSkillUsed(g.state, "diaochan_libu", 1);
  });

  it("[G-DIAOCHAN-05a] it fires for its owner only, once per turn end", () => {
    const g = contractGame({
      seed: SEED(732), assigns: [["p0", "diaochan"]], hands: { p0: [] },
    });
    step(g, { kind: "mainAction" }, choose("endPhase"));
    step(g, { kind: "activateSkill", skillId: "diaochan_libu" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    expectLog(g.state, { eventType: "skillUse", skillId: "diaochan_libu" }, 1);
    // p1's turn end must not offer it to her again
    expectNoSkillPrompt(g, "diaochan_libu", (pd) => pd.kind === "mainAction" && pd.playerId === "p2", { max: 60 });
  });

  it("[G-DIAOCHAN-05b] declining it draws nothing", () => {
    const g = contractGame({
      seed: SEED(733), assigns: [["p0", "diaochan"]], hands: { p0: [] },
    });
    step(g, { kind: "mainAction" }, choose("endPhase"));
    step(g, { kind: "activateSkill", skillId: "diaochan_libu" }, pass);
    expectHandSize(g.state, "p0", 0);
    expectNoLog(g.state, { eventType: "skillUse", skillId: "diaochan_libu" });
  });
});

describe("G-HUATUO ฮัวโต๋ — คัมภีร์ถุงเขียว / เข็มทองต่อชีพ", () => {
  it("[G-HUATUO-01] discards 1 card to heal an injured player by 1", () => {
    const g = contractGame({
      seed: SEED(741), assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD] },
      after: (s) => setHp(s, "p1", 2),
    });
    step(g, { kind: "mainAction" }, useSkill("huatuo_qingnang", [BLACK_CARD], ["p1"]));
    expectHp(g.state, "p1", 3);
    expectZone(g.state, BLACK_CARD, "discardPile");
    expectSkillUsed(g.state, "huatuo_qingnang", 1);
  });

  it("[G-HUATUO-02a] a full-HP target is refused", () => {
    const g = contractGame({
      seed: SEED(742), assigns: [["p0", "huatuo"]], hands: { p0: [BLACK_CARD] },
    });
    expectAtomicReject(g, useSkill("huatuo_qingnang", [BLACK_CARD], ["p1"]));
  });

  it("[G-HUATUO-02b] a dead target is refused", () => {
    const g = contractGame({
      seed: SEED(743), playerCount: 4, assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD] },
      after: (s) => { setHp(s, "p1", 2); killOff(s, "p1"); },
    });
    expectAtomicReject(g, useSkill("huatuo_qingnang", [BLACK_CARD], ["p1"]));
  });

  it("[G-HUATUO-02c] a card he does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(744), assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD], p1: [SHA] },
      after: (s) => setHp(s, "p1", 2),
    });
    expectAtomicReject(g, useSkill("huatuo_qingnang", [SHA], ["p1"]));
  });

  it("[G-HUATUO-02d] a second use in the same turn is refused", () => {
    const g = contractGame({
      seed: SEED(745), assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD, BLACK_JUDGE] },
      after: (s) => { setHp(s, "p1", 1); setHp(s, "p2", 2); },
    });
    step(g, { kind: "mainAction" }, useSkill("huatuo_qingnang", [BLACK_CARD], ["p1"]));
    expectHp(g.state, "p1", 2);
    expectAtomicReject(g, useSkill("huatuo_qingnang", [BLACK_JUDGE], ["p2"]), /already used/);
  });

  it("[G-HUATUO-02e] the counter resets on his next turn", () => {
    const g = contractGame({
      seed: SEED(746), assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, useSkill("huatuo_qingnang", [BLACK_CARD], ["p1"]));
    nextTurnOf(g, "p0");
    expectUsage(g.state, "p0", { skills: { huatuo_qingnang: 0 } });
  });

  it("[G-HUATUO-03] he can heal himself as well as another player", () => {
    const g = contractGame({
      seed: SEED(747), assigns: [["p0", "huatuo"]],
      hands: { p0: [BLACK_CARD] },
      after: (s) => setHp(s, "p0", 1),
    });
    step(g, { kind: "mainAction" }, useSkill("huatuo_qingnang", [BLACK_CARD], ["p0"]));
    expectHp(g.state, "p0", 2);
  });

  it("[G-HUATUO-04] outside his own turn a red card counts as ท้อ for a dying player", () => {
    const g = contractGame({
      seed: SEED(748), playerCount: 3,
      assigns: [["p2", "huatuo"]],
      hands: { p0: [SHA], p1: [], p2: [RED_JUDGE] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p2" }, withCards(RED_JUDGE));
    expectAlive(g.state, "p1", true);
    expectHp(g.state, "p1", 1);
    expectZone(g.state, RED_JUDGE, "discardPile");
  });

  it("[G-HUATUO-05a] a black card is refused as ท้อ", () => {
    const g = contractGame({
      seed: SEED(749), playerCount: 3,
      assigns: [["p2", "huatuo"]],
      hands: { p0: [SHA], p1: [], p2: [BLACK_CARD] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    expectAtomicReject(g, withCards(BLACK_CARD), /does not count as tao/);
  });

  it("[G-HUATUO-05b] on his own turn the conversion is unavailable", () => {
    const g = contractGame({
      seed: SEED(750), playerCount: 3,
      assigns: [["p0", "huatuo"]],
      hands: { p0: [RED_JUDGE, C.juedou.any], p1: [SHA_B] },
      after: (s) => setHp(s, "p0", 1),
    });
    // He starts a duel he then loses, dying on his own turn: เข็มทองต่อชีพ
    // must not let him convert a red card to save himself.
    playTrick(g, [C.juedou.any], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 0);
    expectDecision(g, { kind: "respondTao", playerId: "p0" });
    expectAtomicReject(g, withCards(RED_JUDGE), /does not count as tao/);
  });

  it("[G-HUATUO-06a] he may convert to rescue himself when it is someone else's turn", () => {
    const g = contractGame({
      seed: SEED(751), playerCount: 3,
      assigns: [["p1", "huatuo"]],
      hands: { p0: [SHA], p1: [RED_JUDGE] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, withCards(RED_JUDGE));
    expectAlive(g.state, "p1", true);
  });

  it("[G-HUATUO-06b] the conversion does not leak to any other player", () => {
    const g = contractGame({
      seed: SEED(752), playerCount: 3,
      assigns: [["p2", "huatuo"]],
      hands: { p0: [SHA], p1: [RED_JUDGE] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    // p1 is not ฮัวโต๋ — the same red card is not a ท้อ in their hands.
    expectAtomicReject(g, withCards(RED_JUDGE), /does not count as tao/);
  });
});
