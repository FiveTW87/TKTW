// TKTW_TEST_CASE_CATALOG.md → "นายพล 25 ตัว / วุย"
// (G-CAOCAO, G-SIMAYI, G-XIAHOUDUN, G-CAOREN, G-ZHANGLIAO, G-GUOJIA, G-ZHENJI).
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, accept, withCards, withTargets, choose, useSkill,
  runTo, passWuxie, playTrick, expectDecision, expectAtomicReject, expectNoSkillPrompt,
  acceptSkill, declineSkill, expectHp, expectAlive, expectZone, expectHandSize, expectHandIds,
  expectUsage, expectLog, expectNoLog, expectDiscarded, expectSkillUsed, nextTurnOf,
  C, findCard, findCards, allCards,
} from "../_contract";
import { equip, setHp, killOff, topOfDeck, setDrawPile, setDiscardPile, setHand, clearHands, detach, putInJudgmentZone } from "../_contract/rig";
import { colorOf } from "../../src/types";

const SHA = C.sha.spade!;
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHA_C = findCard({ typeKey: "sha", suit: "diamond" });
const SHAN = C.shan.heart!;
const SHAN_B = findCard({ typeKey: "shan", suit: "diamond" });
const TAO = C.tao.heart!;
const NANMAN = C.nanman.any;
const JUEDOU = C.juedou.any;
const WUZHONG = C.wuzhong.any;
const BLACK_A = findCard({ typeKey: "guohe", suit: "spade" });
const BLACK_B = findCard({ typeKey: "guohe", suit: "club" });
const RED_A = findCard({ typeKey: "wuzhong", suit: "heart" });
const RED_B = findCard({ typeKey: "wuzhong", suit: "diamond" });
const HEART_JUDGE = findCard({ typeKey: "tao", suit: "heart" });
const SPADE_JUDGE = findCard({ typeKey: "sha", suit: "spade", rank: 7 });

describe("G-CAOCAO โจโฉ — พลิกภัยเป็นกล / ใต้ธงวุย", () => {
  it("[G-CAOCAO-01] takes the physical สังหาร that hurt him out of the discard pile", () => {
    const g = contractGame({
      seed: SEED(801), currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [SHA], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "caocao_jianxiong");
    expectZone(g.state, SHA, "hand", "p0");
    expectHp(g.state, "p0", 3);
    expectSkillUsed(g.state, "caocao_jianxiong", 1);
  });

  it("[G-CAOCAO-02a] it also fires on ท้าศึกเดี่ยว damage", () => {
    const g = contractGame({
      seed: SEED(802), currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [JUEDOU], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([JUEDOU], ["p0"]));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    acceptSkill(g, "caocao_jianxiong");
    expectZone(g.state, JUEDOU, "hand", "p0");
  });

  it("[G-CAOCAO-02b] it also fires on ศึกชนเผ่าใต้ damage", () => {
    const g = contractGame({
      seed: SEED(803), currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [NANMAN], p0: [], p2: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    acceptSkill(g, "caocao_jianxiong");
    expectZone(g.state, NANMAN, "hand", "p0");
  });

  it("[G-CAOCAO-03] the condition is the physical card, not the สังหาร type", () => {
    // กวนอู attacks with a red ท้อ converted to สังหาร — โจโฉ must receive that
    // physical ท้อ, proving the skill reads the source CARD not the played type.
    const g = contractGame({
      seed: SEED(804), currentSeat: 1,
      assigns: [["p0", "caocao"], ["p1", "guanyu"]],
      hands: { p1: [TAO], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([TAO], ["p0"], "sha"));
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "caocao_jianxiong");
    expectZone(g.state, TAO, "hand", "p0");
    expect(g.p("p0").hand[0]!.typeKey).toBe("tao");
  });

  it("[G-CAOCAO-04] declining leaves the card in the discard pile", () => {
    const g = contractGame({
      seed: SEED(805), currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [SHA], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    declineSkill(g, "caocao_jianxiong");
    expectZone(g.state, SHA, "discardPile");
    expectHandSize(g.state, "p0", 0);
    expectNoLog(g.state, { eventType: "skillUse", skillId: "caocao_jianxiong" });
  });

  it("[G-CAOCAO-05] damage with no source card yields nothing", () => {
    // สายฟ้า damage carries no sourceCardId at all. Hand is pinned to a known
    // 4 cards (not the natural deal) so this holds under any shuffle — the
    // dealt hand may or may not include the shandian card itself depending on
    // seed, which would otherwise make the "untouched" assertion seed-dependent.
    const g = contractGame({
      seed: SEED(806),
      assigns: [["p0", "caocao"]],
      before: (s) => {
        putInJudgmentZone(s, "p0", C.shandian.any);
        topOfDeck(s, [SPADE_JUDGE]);
        setHand(s, "p0", [SHA_B, SHA_C, SHAN, SHAN_B]);
      },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    expectHp(g.state, "p0", 1); // 3 damage, no source card
    expectNoLog(g.state, { eventType: "skillUse", skillId: "caocao_jianxiong" });
    expectHandIds(g.state, "p0", [SHA_B, SHA_C, SHAN, SHAN_B]); // untouched
  });

  it("[G-CAOCAO-06] a source card already gone from the discard pile is not conjured back", () => {
    const g = contractGame({
      seed: SEED(808), currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [SHA], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    // the สังหาร leaves the discard pile before he answers the prompt
    expectDecision(g, { kind: "activateSkill", skillId: "caocao_jianxiong" });
    detach(g.state, SHA);
    step(g, { kind: "activateSkill", skillId: "caocao_jianxiong" }, accept);
    expectHandSize(g.state, "p0", 0); // nothing duplicated into his hand
  });

  it("[G-CAOCAO-07] a multi-target สังหาร still yields exactly the one physical card", () => {
    const g = contractGame({
      seed: SEED(809), playerCount: 4, currentSeat: 1,
      assigns: [["p0", "caocao"]],
      hands: { p1: [SHA], p0: [], p2: [], p3: [] },
      after: (s) => equip(s, "p1", C.fangtian.any),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p2", "p3", "p0"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    step(g, { kind: "respondShan", playerId: "p3" }, pass);
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "caocao_jianxiong");
    expectHandIds(g.state, "p0", [SHA]);
    expectZone(g.state, SHA, "hand", "p0"); // exactly one zone, no clone
  });

  it("[G-CAOCAO-08] as lord with no หลบ, a วุย ally's หลบ saves him", () => {
    const g = contractGame({
      seed: SEED(810), currentSeat: 1,
      assigns: [["p0", "caocao", true], ["p1", "guanyu"], ["p2", "simayi"]],
      hands: { p1: [SHA], p0: [], p2: [SHAN] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    acceptSkill(g, "caocao_hujia");
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHAN));
    expectHp(g.state, "p0", 5);
    expectZone(g.state, SHAN, "discardPile");
    expectSkillUsed(g.state, "caocao_hujia", 1);
  });

  it("[G-CAOCAO-09] allies are polled in seat order and a pass moves on to the next", () => {
    const g = contractGame({
      seed: SEED(811), playerCount: 4, currentSeat: 1,
      assigns: [["p0", "caocao", true], ["p2", "simayi"], ["p3", "zhenji"]],
      hands: { p1: [SHA], p0: [], p2: [], p3: [SHAN] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    acceptSkill(g, "caocao_hujia");
    const asked: string[] = [];
    while (g.session.state.pendingDecision?.kind === "hujiaVolunteer") {
      const pd = g.pd();
      asked.push(pd.playerId);
      if (pd.playerId === "p3") step(g, { kind: "hujiaVolunteer" }, withCards(SHAN));
      else step(g, { kind: "hujiaVolunteer" }, pass);
    }
    expect(asked).toEqual(["p2", "p3"]); // seat order after the lord, วุย only
    expectHp(g.state, "p0", 5);
  });

  it("[G-CAOCAO-10] non-วุย players, the dead and โจโฉ himself are never asked", () => {
    const g = contractGame({
      seed: SEED(812), playerCount: 4, currentSeat: 1,
      assigns: [["p0", "caocao", true], ["p2", "guanyu"], ["p3", "simayi"]],
      hands: { p1: [SHA], p0: [SHAN], p2: [SHAN_B], p3: [] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; killOff(s, "p3"); },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    acceptSkill(g, "caocao_hujia");
    // p2 is จ๊ก, p3 is dead, p0 is โจโฉ — nobody is eligible
    expectDecision(g, { kind: "respondShan", playerId: "p0" });
  });

  it("[G-CAOCAO-11a] a non-lord โจโฉ gets no ally cover", () => {
    const g = contractGame({
      seed: SEED(813), currentSeat: 1,
      assigns: [["p0", "caocao"], ["p2", "simayi"]],
      hands: { p1: [SHA], p0: [], p2: [SHAN] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    // no hujiaVolunteer may be raised on the way to his own dodge
    runTo(g, { kind: "respondShan", playerId: "p0" }, {
      max: 20,
      defaults: {
        hujiaVolunteer: () => { throw new Error("a non-lord โจโฉ must not summon ally cover"); },
      },
    });
    step(g, { kind: "respondShan" }, pass);
    expectHp(g.state, "p0", 3);
    expectZone(g.state, SHAN, "hand", "p2");
  });

  it("[G-CAOCAO-11b] as the attacker he never triggers his own lord cover", () => {
    const g = contractGame({
      seed: SEED(814),
      assigns: [["p0", "caocao", true], ["p2", "simayi"]],
      hands: { p0: [SHA], p1: [], p2: [SHAN] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" });
  });

  it("[G-CAOCAO-12a] a legal converted หลบ from the ally is accepted", () => {
    const g = contractGame({
      seed: SEED(815), currentSeat: 1,
      assigns: [["p0", "caocao", true], ["p2", "zhenji"]],
      hands: { p1: [SHA], p0: [], p2: [BLACK_A] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    acceptSkill(g, "caocao_hujia");
    // เอียนสี converts a black card to หลบ
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(BLACK_A));
    expectHp(g.state, "p0", 5);
    expectZone(g.state, BLACK_A, "discardPile");
  });

  it("[G-CAOCAO-12b] a card that does not count as หลบ is refused", () => {
    const g = contractGame({
      seed: SEED(816), currentSeat: 1,
      assigns: [["p0", "caocao", true], ["p2", "simayi"]],
      hands: { p1: [SHA], p0: [], p2: [BLACK_A] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    acceptSkill(g, "caocao_hujia");
    expectAtomicReject(g, withCards(BLACK_A), /does not count as shan/);
  });
});

describe("G-SIMAYI สุมาอี้ — ชิงคืนหลังศึก / พลิกชะตา", () => {
  it("[G-SIMAYI-01] steals a card from whoever hurt him", () => {
    const g = contractGame({
      seed: SEED(821), currentSeat: 1,
      assigns: [["p0", "simayi"]],
      hands: { p1: [SHA, SHAN], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "simayi_fankui");
    step(g, { kind: "fankuiPick", playerId: "p0" }, withCards(SHAN));
    expectZone(g.state, SHAN, "hand", "p0");
    expectHandSize(g.state, "p1", 0);
    expectSkillUsed(g.state, "simayi_fankui", 1);
  });

  it("[G-SIMAYI-02] naming a card the source does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(822), currentSeat: 1,
      assigns: [["p0", "simayi"]],
      hands: { p1: [SHA, SHAN], p0: [], p2: [SHAN_B] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "simayi_fankui");
    expectAtomicReject(g, withCards(SHAN_B)); // p2's card, not p1's
  });

  it("[G-SIMAYI-03a] an empty-handed source yields no prompt", () => {
    const g = contractGame({
      seed: SEED(823), currentSeat: 1,
      assigns: [["p0", "simayi"]],
      hands: { p1: [SHA], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    // p1 spent their only card on the สังหาร — nothing left to take
    acceptSkill(g, "simayi_fankui");
    expectDecision(g, { kind: "mainAction", playerId: "p1" });
    expectHandSize(g.state, "p0", 0);
  });

  it("[G-SIMAYI-03b] sourceless damage does not trigger it", () => {
    const g = contractGame({
      seed: SEED(824), assigns: [["p0", "simayi"]],
      hands: { p0: [] },
      after: (s) => setHp(s, "p0", 3),
    });
    // no attacker at all: nothing should be offered on the way to his action
    expectNoSkillPrompt(g, "simayi_fankui", { kind: "mainAction", playerId: "p0" });
  });

  it("[G-SIMAYI-04a] replaces someone else's judgment with a card from his hand", () => {
    const g = contractGame({
      seed: SEED(825), assigns: [["p1", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART_JUDGE]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p1" }, withCards(HEART_JUDGE));
    expect(g.state.skipPlayPhase).toBeUndefined(); // the heart decided it
    expectSkillUsed(g.state, "simayi_guicai", 1);
    expect([...g.state.log].reverse().find((entry) => entry.eventType === "judgmentReplace")).toMatchObject({
      actorId: "p1",
      targetIds: ["p0"],
      cardId: HEART_JUDGE,
      data: {
        previousCardId: SPADE_JUDGE,
        previousSuit: "spade",
        previousRank: 7,
        suit: "heart",
      },
    });
  });

  it("[G-SIMAYI-04b] he can also replace his own judgment", () => {
    const g = contractGame({
      seed: SEED(826), assigns: [["p0", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p0", [HEART_JUDGE]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p0" }, withCards(HEART_JUDGE));
    expect(g.state.skipPlayPhase).toBeUndefined();
  });

  it("[G-SIMAYI-05] the old card goes to discard and the new one becomes the judgment", () => {
    const g = contractGame({
      seed: SEED(827), assigns: [["p1", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART_JUDGE]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p1" }, withCards(HEART_JUDGE));
    expectZone(g.state, SPADE_JUDGE, "discardPile");  // replaced
    expectZone(g.state, HEART_JUDGE, "discardPile");  // the judgment card, now spent
    expectHandSize(g.state, "p1", 0);
  });

  it("[G-SIMAYI-06a] passing leaves the judgment untouched", () => {
    const g = contractGame({
      seed: SEED(828), assigns: [["p1", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART_JUDGE]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p1" }, pass);
    expect(g.state.skipPlayPhase).toBe(true); // the spade stood
    expectZone(g.state, HEART_JUDGE, "hand", "p1");
  });

  it("[G-SIMAYI-06b] with an empty hand he is not prompted at all", () => {
    const g = contractGame({
      seed: SEED(829), assigns: [["p1", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => clearHands(s),
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    expect(g.state.skipPlayPhase).toBe(true);
    expectDecision(g, { kind: "drawCard", playerId: "p0" });
  });

  it("[G-SIMAYI-06c] an invalid replacement card is refused and the judgment stands", () => {
    const g = contractGame({
      seed: SEED(830), assigns: [["p1", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART_JUDGE]); setHand(s, "p2", [RED_A]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    expectAtomicReject(g, withCards(RED_A)); // p2's card
  });

  it("[G-SIMAYI-07] two สุมาอี้ are polled in order and the last replacement is what counts", () => {
    const g = contractGame({
      seed: SEED(831), playerCount: 4,
      assigns: [["p1", "simayi"], ["p2", "simayi"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [SPADE_JUDGE]);
      },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART_JUDGE]); setHand(s, "p2", [BLACK_A]); },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    const asked: string[] = [];
    asked.push(g.pd().playerId);
    step(g, { kind: "guicaiReplace" }, withCards(HEART_JUDGE));
    asked.push(g.pd().playerId);
    step(g, { kind: "guicaiReplace" }, withCards(BLACK_A)); // black overrides the heart
    expect(asked).toEqual(["p1", "p2"]);
    expect(g.state.skipPlayPhase).toBe(true); // the LAST card (black spade) decided it
  });
});

describe("G-XIAHOUDUN แฮหัวตุ้น — เนตรเดียวทวงแค้น", () => {
  function hurtXiahoudun(seed: number, attackerHand: string[], opts: { alive?: boolean } = {}) {
    const g = contractGame({
      seed: SEED(seed), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, ...attackerHand], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    return g;
  }

  it("[G-XIAHOUDUN-01] a heart judgment costs the attacker nothing", () => {
    const g = contractGame({
      seed: SEED(841), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN, SHAN_B], p0: [] },
      after: (s) => topOfDeck(s, [HEART_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    expectHp(g.state, "p1", 4);
    expectHandSize(g.state, "p1", 2);
  });

  it("[G-XIAHOUDUN-02] a non-heart judgment lets the attacker pay two cards", () => {
    const g = contractGame({
      seed: SEED(842), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN, SHAN_B], p0: [] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "ganglieChoice", playerId: "p1" }, choose("discard2"));
    step(g, { kind: "discardChosenBy", playerId: "p1" }, withCards(SHAN, SHAN_B));
    expectDiscarded(g.state, SHAN, SHAN_B);
    expectHp(g.state, "p1", 4);
  });

  it("[G-XIAHOUDUN-03] the attacker may take 1 HP instead", () => {
    const g = contractGame({
      seed: SEED(843), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN, SHAN_B], p0: [] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "ganglieChoice", playerId: "p1" }, choose("loseHp"));
    expectHp(g.state, "p1", 3);
    expectHandSize(g.state, "p1", 2);
  });

  it("[G-XIAHOUDUN-04] an attacker with fewer than two cards must take the HP loss", () => {
    const g = contractGame({
      seed: SEED(844), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN], p0: [] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "ganglieChoice", playerId: "p1" }, choose("discard2")); // only 1 card
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[G-XIAHOUDUN-05a] a duplicated discard id is refused", () => {
    const g = contractGame({
      seed: SEED(845), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN, SHAN_B], p0: [] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "ganglieChoice", playerId: "p1" }, choose("discard2"));
    expectAtomicReject(g, withCards(SHAN, SHAN), /duplicate/);
  });

  it("[G-XIAHOUDUN-05b] discarding a card the attacker does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(846), currentSeat: 1,
      assigns: [["p0", "xiahoudun"]],
      hands: { p1: [SHA, SHAN, SHAN_B], p0: [], p2: [RED_A] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "xiahoudun_ganglie");
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "ganglieChoice", playerId: "p1" }, choose("discard2"));
    expectAtomicReject(g, withCards(SHAN, RED_A), /not selectable/);
  });

  it("[G-XIAHOUDUN-06] sourceless damage never triggers it", () => {
    const g = contractGame({
      seed: SEED(847), assigns: [["p0", "xiahoudun"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const sd = s.drawPile.find((c) => c.typeKey === "shandian")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== sd.id);
        p0.judgmentZone.push(sd);
        topOfDeck(s, [SPADE_JUDGE]);
      },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    // 3 สายฟ้า damage with no attacker — เนตรเดียวทวงแค้น has nobody to punish,
    // so it must run no judgment and inflict nothing on anyone.
    expectHp(g.state, "p0", 1);
    runTo(g, { kind: "drawCard" }, { max: 20 });
    expectNoLog(g.state, { eventType: "judgment", cardType: "xiahoudun_ganglie" });
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p2", 4);
  });
});

describe("G-CAOREN เคาทู — เปลือยเกราะท้าศึก", () => {
  it("[G-CAOREN-01] declining draws the normal 2 and grants no bonus", () => {
    const g = contractGame({
      seed: SEED(851), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    declineSkill(g, "caoren_tuoyi");
    const pd = expectDecision(g, { kind: "drawCard", playerId: "p0" });
    expect(pd.data.count).toBe(2);
    step(g, { kind: "drawCard" }, choose("draw"));
    expectUsage(g.state, "p0", { skills: { caoren_tuoyi_active: 0 } });
  });

  it("[G-CAOREN-02] accepting draws one fewer", () => {
    const g = contractGame({
      seed: SEED(852), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    const pd = expectDecision(g, { kind: "drawCard", playerId: "p0" });
    expect(pd.data.count).toBe(1);
    expect(pd.data.modifier).toBe(-1);
    expectSkillUsed(g.state, "caoren_tuoyi", 1);
  });

  it("[G-CAOREN-03a] his สังหาร deals 1 extra damage", () => {
    const g = contractGame({
      seed: SEED(853), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [SHA]);
    clearHands(g.state, ["p1", "p2"]);
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 2); // 1 + 1 bonus
  });

  it("[G-CAOREN-03b] his ท้าศึกเดี่ยว also deals 1 extra damage", () => {
    const g = contractGame({
      seed: SEED(854), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [JUEDOU]);
    clearHands(g.state, ["p1", "p2"]);
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 2);
  });

  it("[G-CAOREN-04] AOE and non-สังหาร damage carry the same bonus (implemented simplification)", () => {
    const g = contractGame({
      seed: SEED(855), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [NANMAN]);
    clearHands(g.state, ["p1", "p2"]);
    playTrick(g, [NANMAN], []);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    // src/core/triggers.ts:66 documents damageBonus as applying to ALL damage
    // this player deals, not only สังหาร/ดวล as the skill text says.
    expectHp(g.state, "p1", 2);
    expectHp(g.state, "p2", 2);
  });

  it("[G-CAOREN-05a] the bonus does not leak to any other player's damage", () => {
    const g = contractGame({
      seed: SEED(856), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    clearHands(g.state);
    step(g, { kind: "mainAction" }, choose("endPhase"));
    runTo(g, { kind: "mainAction", playerId: "p1" });
    setHand(g.state, "p1", [SHA]);
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p2", 3); // plain 1 damage
  });

  it("[G-CAOREN-05b] the bonus expires when his next turn begins", () => {
    const g = contractGame({
      seed: SEED(857), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    clearHands(g.state);
    step(g, { kind: "mainAction" }, choose("endPhase"));
    runTo(g, (pd) => pd.kind === "activateSkill" && pd.data.skillId === "caoren_tuoyi" && g.state.turnNumber > 1, { max: 200 });
    expectUsage(g.state, "p0", { skills: { caoren_tuoyi_active: 0 } });
    declineSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [SHA]);
    clearHands(g.state, ["p1", "p2"]);
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3); // no bonus this turn
  });

  it("[G-CAOREN-06] the bonus applies to each สังหาร he lands that turn", () => {
    const g = contractGame({
      seed: SEED(858), assigns: [["p0", "caoren"]], keepDrawGate: true,
    });
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [SHA, SHA_B]);
    clearHands(g.state, ["p1", "p2"]);
    equip(g.state, "p0", C.crossbow.any);
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "mainAction" }, play([SHA_B], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p1", 2);
    expectHp(g.state, "p2", 2);
  });
});

describe("G-ZHANGLIAO เตียวเลี้ยว — แปดร้อยทลายค่าย", () => {
  it("[G-ZHANGLIAO-01] declining keeps the normal 2-card draw", () => {
    const g = contractGame({
      seed: SEED(861), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    declineSkill(g, "zhangliao_tuxi");
    const pd = expectDecision(g, { kind: "drawCard", playerId: "p0" });
    expect(pd.data.count).toBe(2);
  });

  it("[G-ZHANGLIAO-02] taking one target steals a card and cancels the draw", () => {
    const g = contractGame({
      seed: SEED(862), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
      before: (s) => { s.players.find((p) => p.id === "p1")!.hand.length; },
    });
    acceptSkill(g, "zhangliao_tuxi");
    step(g, { kind: "tuxiTargets", playerId: "p0" }, withTargets("p1"));
    step(g, { kind: "pickCardFromPlayer", playerId: "p0" }, pass);
    expectHandSize(g.state, "p0", 5); // 4 dealt + 1 stolen, no draw
    expectHandSize(g.state, "p1", 3);
    expectSkillUsed(g.state, "zhangliao_tuxi", 1);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[G-ZHANGLIAO-03] taking two targets steals one from each", () => {
    const g = contractGame({
      seed: SEED(863), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    acceptSkill(g, "zhangliao_tuxi");
    step(g, { kind: "tuxiTargets", playerId: "p0" }, withTargets("p1", "p2"));
    step(g, { kind: "pickCardFromPlayer", playerId: "p0" }, pass);
    step(g, { kind: "pickCardFromPlayer", playerId: "p0" }, pass);
    expectHandSize(g.state, "p0", 6);
    expectHandSize(g.state, "p1", 3);
    expectHandSize(g.state, "p2", 3);
  });

  it("[G-ZHANGLIAO-04] with nobody holding cards he is not prompted and draws normally", () => {
    const g = contractGame({
      seed: SEED(864), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
      before: (s) => { for (const p of s.players) if (p.id !== "p0") s.drawPile.unshift(...p.hand.splice(0)); },
    });
    acceptSkill(g, "zhangliao_tuxi");
    const pd = expectDecision(g, { kind: "drawCard", playerId: "p0" });
    expect(pd.data.count).toBe(2); // no eligible victims → skill did not commit
  });

  it("[G-ZHANGLIAO-05a] naming himself is refused", () => {
    const g = contractGame({
      seed: SEED(865), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    acceptSkill(g, "zhangliao_tuxi");
    expectAtomicReject(g, withTargets("p0"));
  });

  it("[G-ZHANGLIAO-05b] naming a dead player is refused", () => {
    const g = contractGame({
      seed: SEED(866), playerCount: 4, assigns: [["p0", "zhangliao"]], keepDrawGate: true,
      before: (s) => killOff(s, "p1"),
    });
    acceptSkill(g, "zhangliao_tuxi");
    expectAtomicReject(g, withTargets("p1"));
  });

  it("[G-ZHANGLIAO-05c] naming an empty-handed player is refused", () => {
    const g = contractGame({
      seed: SEED(867), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
      before: (s) => { s.drawPile.unshift(...s.players.find((p) => p.id === "p1")!.hand.splice(0)); },
    });
    acceptSkill(g, "zhangliao_tuxi");
    expectAtomicReject(g, withTargets("p1"));
  });

  it("[G-ZHANGLIAO-05d] naming the same player twice is refused", () => {
    const g = contractGame({
      seed: SEED(868), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    acceptSkill(g, "zhangliao_tuxi");
    expectAtomicReject(g, withTargets("p1", "p1"));
  });

  it("[G-ZHANGLIAO-05e] naming more than two targets is refused", () => {
    const g = contractGame({
      seed: SEED(869), playerCount: 5, assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    acceptSkill(g, "zhangliao_tuxi");
    expectAtomicReject(g, withTargets("p1", "p2", "p3"));
  });

  it("[G-ZHANGLIAO-06] the victim's hidden hand is never exposed in the decision payload", () => {
    const g = contractGame({
      seed: SEED(870), assigns: [["p0", "zhangliao"]], keepDrawGate: true,
    });
    acceptSkill(g, "zhangliao_tuxi");
    const targets = expectDecision(g, { kind: "tuxiTargets", playerId: "p0" });
    // only counts, never card ids
    const eligible = targets.data.eligible as Array<{ id: string; count: number }>;
    expect(eligible.every((e) => typeof e.count === "number")).toBe(true);
    const victimHand = g.p("p1").hand.map((c) => c.id);
    expect(JSON.stringify(targets.data)).not.toContain(victimHand[0]!);

    step(g, { kind: "tuxiTargets" }, withTargets("p1"));
    const pick = expectDecision(g, { kind: "pickCardFromPlayer", playerId: "p0" });
    expect(pick.data.handCount).toBe(4);
    expect(pick.data.visibleIds).toEqual([]); // equipment only, and p1 has none
    expect(JSON.stringify(pick.data)).not.toContain(victimHand[0]!);
  });
});

describe("G-GUOJIA กุยแก — เก็บลิขิตฟ้า / กลฝากยามโรยแรง", () => {
  function guojiaJudging(seed: number, judgeCard: string) {
    return contractGame({
      seed: SEED(seed), assigns: [["p0", "guojia"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [judgeCard]);
      },
    });
  }

  it("[G-GUOJIA-01] he may keep the card his own judgment turned up", () => {
    const g = guojiaJudging(881, HEART_JUDGE);
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    acceptSkill(g, "guojia_yidu");
    expectZone(g.state, HEART_JUDGE, "hand", "p0");
    expectSkillUsed(g.state, "guojia_yidu", 1);
  });

  it("[G-GUOJIA-02] declining leaves the card in the discard pile", () => {
    const g = guojiaJudging(882, HEART_JUDGE);
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    declineSkill(g, "guojia_yidu");
    expectZone(g.state, HEART_JUDGE, "discardPile");
  });

  it("[G-GUOJIA-03] someone else's judgment does not trigger it", () => {
    const g = contractGame({
      seed: SEED(883), assigns: [["p1", "guojia"]],
      before: (s) => {
        const p0 = s.players.find((p) => p.id === "p0")!;
        const lebu = s.drawPile.find((c) => c.typeKey === "lebusishu")!;
        s.drawPile = s.drawPile.filter((c) => c.id !== lebu.id);
        p0.judgmentZone.push(lebu);
        topOfDeck(s, [HEART_JUDGE]);
      },
    });
    passWuxie(g);
    step(g, { kind: "judgmentReveal" }, choose("reveal"));
    // p0 is judging, not กุยแก — the card must stay in the discard pile no
    // matter what กุยแก answers.
    runTo(g, { kind: "drawCard", playerId: "p0" }, { max: 20, defaults: { activateSkill: accept } });
    expectZone(g.state, HEART_JUDGE, "discardPile");
    expectNoLog(g.state, { eventType: "skillUse", skillId: "guojia_yidu" });
  });

  it("[G-GUOJIA-04a] losing 1 HP reveals 2 cards he may keep himself", () => {
    const pool = findCards(2, { typeKey: "shan" });
    const g = contractGame({
      seed: SEED(884), currentSeat: 1,
      assigns: [["p0", "guojia"]],
      hands: { p1: [SHA], p0: [] },
      after: (s) => topOfDeck(s, pool),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "guojia_yiji");
    step(g, { kind: "yijiGive", playerId: "p0" }, withTargets("p0"));
    step(g, { kind: "yijiGive", playerId: "p0" }, withTargets("p0"));
    expectZone(g.state, pool[0]!, "hand", "p0");
    expectZone(g.state, pool[1]!, "hand", "p0");
  });

  it("[G-GUOJIA-04b] he may split the two cards between different players", () => {
    const pool = findCards(2, { typeKey: "shan" });
    const g = contractGame({
      seed: SEED(885), currentSeat: 1,
      assigns: [["p0", "guojia"]],
      hands: { p1: [SHA], p0: [], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "guojia_yiji");
    step(g, { kind: "yijiGive", playerId: "p0" }, withTargets("p2"));
    step(g, { kind: "yijiGive", playerId: "p0" }, withTargets("p0"));
    expectZone(g.state, pool[0]!, "hand", "p2");
    expectZone(g.state, pool[1]!, "hand", "p0");
  });

  it("[G-GUOJIA-05] losing N HP runs N separate rounds of two cards", () => {
    const pool = findCards(4, { typeKey: "shan" });
    const g = contractGame({
      seed: SEED(886), currentSeat: 1,
      assigns: [["p0", "guojia"], ["p1", "caoren"]],
      hands: { p1: [SHA], p0: [] },
      after: (s) => topOfDeck(s, pool),
      keepDrawGate: true,
    });
    // เคาทู's +1 damage makes it a 2-point hit → two รอบ of กลฝากยามโรยแรง
    acceptSkill(g, "caoren_tuoyi");
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p1", [SHA]);
    clearHands(g.state, ["p0"]);
    topOfDeck(g.state, pool);
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    let rounds = 0;
    for (let i = 0; i < 6; i++) {
      const pd = g.session.state.pendingDecision;
      if (pd?.kind === "activateSkill" && pd.data.skillId === "guojia_yiji") { rounds++; step(g, { kind: "activateSkill" }, accept); continue; }
      if (pd?.kind === "yijiGive") { step(g, { kind: "yijiGive" }, withTargets("p0")); continue; }
      break;
    }
    expect(rounds).toBe(2);
    expectHp(g.state, "p0", 1); // guojia maxHp 3, took 2
  });

  it("[G-GUOJIA-06] a short deck ends the distribution safely", () => {
    const g = contractGame({
      seed: SEED(887), currentSeat: 1,
      assigns: [["p0", "guojia"]],
      hands: { p1: [SHA], p0: [] },
      after: (s) => { s.drawPile = []; s.discardPile = []; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "guojia_yiji");
    // the สังหาร is the only card in the discard pile → at most 1 reveal
    for (let i = 0; i < 3 && g.session.state.pendingDecision?.kind === "yijiGive"; i++) {
      step(g, { kind: "yijiGive" }, withTargets("p0"));
    }
    expectDecision(g, { kind: "mainAction", playerId: "p1" });
  });

  it("[G-GUOJIA-07a] handing a card to an unknown player is refused", () => {
    const pool = findCards(2, { typeKey: "shan" });
    const g = contractGame({
      seed: SEED(888), currentSeat: 1,
      assigns: [["p0", "guojia"]],
      hands: { p1: [SHA], p0: [] },
      after: (s) => topOfDeck(s, pool),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "guojia_yiji");
    expectAtomicReject(g, withTargets("pX"), /no such player/);
  });

  it("[G-GUOJIA-07b] handing a card to a dead player is refused", () => {
    const pool = findCards(2, { typeKey: "shan" });
    const g = contractGame({
      seed: SEED(889), playerCount: 4, currentSeat: 1,
      assigns: [["p0", "guojia"]],
      hands: { p1: [SHA], p0: [], p2: [], p3: [] },
      after: (s) => { topOfDeck(s, pool); killOff(s, "p3"); },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    acceptSkill(g, "guojia_yiji");
    expectAtomicReject(g, withTargets("p3"));
  });
});

describe("G-ZHENJI เอียนสี — เงางามหลบคม / ร่ายระบำลั่วสุ่ย", () => {
  const blackCards = allCards({ color: "black" }).filter((id) => !id.startsWith("spade_1_"));

  it.each(["spade", "club"] as const)("[G-ZHENJI-01a] a %s card counts as หลบ for her", (suit) => {
    const black = findCard({ suit, typeKey: "guohe" });
    const g = contractGame({
      seed: SEED(901), currentSeat: 1,
      assigns: [["p0", "zhenji"]],
      hands: { p1: [SHA], p0: [black] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(black));
    expectHp(g.state, "p0", 3);
    expectZone(g.state, black, "discardPile");
  });

  it("[G-ZHENJI-01b] a red card is not a หลบ for her", () => {
    const g = contractGame({
      seed: SEED(902), currentSeat: 1,
      assigns: [["p0", "zhenji"]],
      hands: { p1: [SHA], p0: [RED_A] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    expectAtomicReject(g, withCards(RED_A), /does not count as shan/);
  });

  it("[G-ZHENJI-02a] the conversion does not leak to another player", () => {
    const g = contractGame({
      seed: SEED(903), currentSeat: 1,
      assigns: [["p2", "zhenji"]],
      hands: { p1: [SHA], p0: [BLACK_A] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    expectAtomicReject(g, withCards(BLACK_A), /does not count as shan/);
  });

  it("[G-ZHENJI-02b] a black card is still not playable as a หลบ main action", () => {
    const g = contractGame({
      seed: SEED(904), assigns: [["p0", "zhenji"]], keepDrawGate: true,
    });
    declineSkill(g, "zhenji_luoshen"); // her TurnStart skill asks first
    step(g, { kind: "drawCard" }, choose("draw"));
    setHand(g.state, "p0", [BLACK_A]);
    expectAtomicReject(g, play([BLACK_A], ["p1"], "shan"), /ตอบโต้เท่านั้น/);
  });

  it("[G-ZHENJI-03] accepting judges repeatedly, keeping every black card until a red one", () => {
    const g = contractGame({
      seed: SEED(905), assigns: [["p0", "zhenji"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, [BLACK_A, BLACK_B, RED_A]),
    });
    acceptSkill(g, "zhenji_luoshen");
    expectZone(g.state, BLACK_A, "hand", "p0");
    expectZone(g.state, BLACK_B, "hand", "p0");
    expectZone(g.state, RED_A, "discardPile");
    expectLog(g.state, { eventType: "skillUse", skillId: "zhenji_luoshen" }, 2);
  });

  it("[G-ZHENJI-04] a red card on the very first judgment stops it at once", () => {
    const g = contractGame({
      seed: SEED(906), assigns: [["p0", "zhenji"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, [RED_A, BLACK_A]),
    });
    acceptSkill(g, "zhenji_luoshen");
    expectZone(g.state, RED_A, "discardPile");
    expectNoLog(g.state, { eventType: "skillUse", skillId: "zhenji_luoshen" });
    expectZone(g.state, BLACK_A, "drawPile");
  });

  it("[G-ZHENJI-05] declining runs no judgment at all", () => {
    const g = contractGame({
      seed: SEED(907), assigns: [["p0", "zhenji"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, [BLACK_A, BLACK_B, RED_A]),
    });
    declineSkill(g, "zhenji_luoshen");
    expectZone(g.state, BLACK_A, "drawPile");
    expectNoLog(g.state, { eventType: "skillUse", skillId: "zhenji_luoshen" });
    expectDecision(g, { kind: "drawCard", playerId: "p0" });
  });

  it("[G-ZHENJI-06] พลิกชะตา's replacement colour is what ends the loop", () => {
    const g = contractGame({
      seed: SEED(908), assigns: [["p0", "zhenji"], ["p1", "simayi"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, [BLACK_A, RED_A]),
      after: (s) => { clearHands(s); setHand(s, "p1", [RED_B]); },
    });
    acceptSkill(g, "zhenji_luoshen");
    // สุมาอี้ swaps the first (black) judgment for a red one → the loop ends
    step(g, { kind: "guicaiReplace", playerId: "p1" }, withCards(RED_B));
    expectHandSize(g.state, "p0", 0); // nothing collected — hands were cleared
    expectZone(g.state, RED_B, "discardPile");
    expectNoLog(g.state, { eventType: "skillUse", skillId: "zhenji_luoshen" });
  });

  it("[G-ZHENJI-07] an exhausted deck ends the loop safely instead of crashing", () => {
    const g = contractGame({
      seed: SEED(909), assigns: [["p0", "zhenji"]], keepDrawGate: true,
      before: (s) => { setDrawPile(s, [BLACK_A]); setDiscardPile(s, []); },
    });
    // She keeps the single black card, then the loop wants another judgment
    // with both piles empty — that must end the skill, not blow up the turn.
    acceptSkill(g, "zhenji_luoshen");
    expect(g.session.state.pendingDecision).toBeDefined();
    expectZone(g.state, BLACK_A, "hand", "p0");
  });
});
