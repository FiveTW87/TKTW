// TKTW_TEST_CASE_CATALOG.md → "นายพล 25 ตัว / จ๊ก"
// (G-LIUBEI, G-GUANYU, G-ZHANGFEI, G-ZHAOYUN, G-MACHAO, G-ZHUGELIANG, G-PANGTONG).
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, accept, withCards, withTargets, choose, useSkill,
  runTo, passWuxie, playTrick, expectDecision, expectAtomicReject, expectNoSkillPrompt,
  acceptSkill, declineSkill, expectHp, expectAlive, expectZone, expectHandSize, expectHandIds,
  expectUsage, expectLog, expectNoLog, expectDiscarded, expectSkillUsed, nextTurnOf,
  C, findCard, findCards, allCards,
} from "../_contract";
import { equip, setHp, killOff, topOfDeck, setDrawPile, setDiscardPile, setHand, clearHands, putInJudgmentZone, assertCardConservation } from "../_contract/rig";
import { projectFor } from "../../src/core/view";
import { distanceNet, distanceBase } from "../../src/core/distance";

const SHA = C.sha.spade!;
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHA_C = findCard({ typeKey: "sha", suit: "diamond" });
const SHAN = C.shan.heart!;
const SHAN_B = findCard({ typeKey: "shan", suit: "diamond" });
const TAO = C.tao.heart!;
const TAO_B = findCard({ typeKey: "tao", suit: "diamond" });
const WUZHONG = C.wuzhong.any;
const GUOHE = C.guohe.any;
const NANMAN = C.nanman.any;
const JUEDOU = C.juedou.any;
const LEBU = C.lebusishu.any;
const SHUNSHOU = C.shunshou.any;
const RED_A = findCard({ typeKey: "wuzhong", suit: "heart" });
const BLACK_A = findCard({ typeKey: "guohe", suit: "spade" });
const HEART_JUDGE = findCard({ typeKey: "tao", suit: "heart" });
const SPADE_JUDGE = findCard({ typeKey: "sha", suit: "spade", rank: 7 });

describe("G-LIUBEI เล่าปี่ — ปันทรัพย์รวมใจ / ธงจ๊กเรียกศึก", () => {
  it("[G-LIUBEI-01] gives a card to another player and it really moves", () => {
    const g = contractGame({
      seed: SEED(1001), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA], p1: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA], ["p1"]));
    expectZone(g.state, SHA, "hand", "p1");
    expectHandSize(g.state, "p0", 0);
    expectSkillUsed(g.state, "liubei_rende", 1);
  });

  it("[G-LIUBEI-02] giving two cards in a turn heals him exactly once", () => {
    const g = contractGame({
      seed: SEED(1002), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA, SHA_B], p1: [] },
      after: (s) => setHp(s, "p0", 2),
    });
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA], ["p1"]));
    expectHp(g.state, "p0", 2);
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA_B], ["p1"]));
    expectHp(g.state, "p0", 3);
    expectLog(g.state, { eventType: "heal", actorId: "p0" }, 1);
  });

  it("[G-LIUBEI-03] giving three or more still heals only once", () => {
    const g = contractGame({
      seed: SEED(1003), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA, SHA_B, SHA_C, TAO], p1: [] },
      after: (s) => setHp(s, "p0", 1),
    });
    for (const id of [SHA, SHA_B, SHA_C, TAO]) {
      step(g, { kind: "mainAction" }, useSkill("liubei_rende", [id], ["p1"]));
    }
    expectHp(g.state, "p0", 2);
    expectLog(g.state, { eventType: "heal", actorId: "p0" }, 1);
  });

  it("[G-LIUBEI-04a] a card he does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(1004), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA], p1: [SHA_B] },
    });
    expectAtomicReject(g, useSkill("liubei_rende", [SHA_B], ["p1"]));
  });

  it("[G-LIUBEI-04b] giving to himself is refused", () => {
    const g = contractGame({
      seed: SEED(1005), assigns: [["p0", "liubei"]], hands: { p0: [SHA] },
    });
    expectAtomicReject(g, useSkill("liubei_rende", [SHA], ["p0"]));
  });

  it("[G-LIUBEI-04c] giving to a dead player is refused", () => {
    const g = contractGame({
      seed: SEED(1006), playerCount: 4, assigns: [["p0", "liubei"]],
      hands: { p0: [SHA] },
      after: (s) => killOff(s, "p1"),
    });
    expectAtomicReject(g, useSkill("liubei_rende", [SHA], ["p1"]));
  });

  it("[G-LIUBEI-04d] naming no target at all is refused", () => {
    const g = contractGame({
      seed: SEED(1007), assigns: [["p0", "liubei"]], hands: { p0: [SHA] },
    });
    expectAtomicReject(g, useSkill("liubei_rende", [SHA], []));
  });

  it("[G-LIUBEI-04e] the heal never exceeds his max HP", () => {
    const g = contractGame({
      seed: SEED(1008), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA, SHA_B], p1: [] },
    });
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA], ["p1"]));
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA_B], ["p1"]));
    expectHp(g.state, "p0", 4); // already full, capped
  });

  it("[G-LIUBEI-05] the give counter resets on his next turn", () => {
    const g = contractGame({
      seed: SEED(1009), assigns: [["p0", "liubei"]],
      hands: { p0: [SHA, SHA_B], p1: [] },
      after: (s) => setHp(s, "p0", 1),
    });
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA], ["p1"]));
    step(g, { kind: "mainAction" }, useSkill("liubei_rende", [SHA_B], ["p1"]));
    expectHp(g.state, "p0", 2);
    nextTurnOf(g, "p0");
    expectUsage(g.state, "p0", { skills: { liubei_rende_given: 0, liubei_rende_healed: 0 } });
  });

  it("[G-LIUBEI-06] as lord, a จ๊ก ally answers a สังหาร demand for him", () => {
    const g = contractGame({
      seed: SEED(1010), currentSeat: 1,
      assigns: [["p0", "liubei", true], ["p2", "guanyu"]],
      hands: { p1: [NANMAN], p0: [], p2: [SHA_B] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    acceptSkill(g, "liubei_hujia");
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHA_B));
    expectHp(g.state, "p0", 5);
    expectHp(g.state, "p2", 3);
    expectSkillUsed(g.state, "liubei_hujia", 1);
  });

  it("[G-LIUBEI-07] only living จ๊ก allies other than himself are polled, in seat order", () => {
    const g = contractGame({
      seed: SEED(1011), playerCount: 4, currentSeat: 1,
      // p2 is วุย (and carries no OnDamaged trigger to interrupt the poll)
      assigns: [["p0", "liubei", true], ["p2", "zhenji"], ["p3", "zhaoyun"]],
      hands: { p1: [NANMAN], p0: [SHA], p2: [SHA_B], p3: [SHA_C] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p3" }, pass);
    acceptSkill(g, "liubei_hujia");
    const asked: string[] = [];
    while (g.session.state.pendingDecision?.kind === "hujiaVolunteer") {
      asked.push(g.pd().playerId);
      step(g, { kind: "hujiaVolunteer" }, pass);
    }
    expect(asked).toEqual(["p3"]); // p2 is วุย, p0 is เล่าปี่ himself
  });

  it("[G-LIUBEI-08a] a converted สังหาร from กวนอู is accepted", () => {
    const g = contractGame({
      seed: SEED(1012), currentSeat: 1,
      assigns: [["p0", "liubei", true], ["p2", "guanyu"]],
      hands: { p1: [NANMAN], p0: [], p2: [TAO] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    acceptSkill(g, "liubei_hujia");
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(TAO));
    expectHp(g.state, "p0", 5);
    expectZone(g.state, TAO, "discardPile");
  });

  it("[G-LIUBEI-08b] a card that does not count as สังหาร is refused", () => {
    const g = contractGame({
      seed: SEED(1013), currentSeat: 1,
      assigns: [["p0", "liubei", true], ["p2", "zhaoyun"]],
      hands: { p1: [NANMAN], p0: [], p2: [GUOHE] },
      after: (s) => { s.players.find((p) => p.id === "p0")!.role = "lord"; },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    acceptSkill(g, "liubei_hujia");
    expectAtomicReject(g, withCards(GUOHE), /does not count as sha/);
  });

  it("[G-LIUBEI-09] a non-lord เล่าปี่ gets no ally cover", () => {
    const g = contractGame({
      seed: SEED(1014), currentSeat: 1,
      assigns: [["p0", "liubei"], ["p2", "guanyu"]],
      hands: { p1: [NANMAN], p0: [], p2: [SHA_B] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    runTo(g, { kind: "respondSha", playerId: "p0" }, {
      max: 20,
      defaults: { hujiaVolunteer: () => { throw new Error("a non-lord เล่าปี่ must not summon ally cover"); } },
    });
    step(g, { kind: "respondSha" }, pass);
    expectHp(g.state, "p0", 3);
  });
});

describe("G-GUANYU กวนอู — คมง้าวชาด", () => {
  it.each([
    ["basic", C.tao.heart!],
    ["trick", findCard({ typeKey: "wuzhong", suit: "heart" })],
    ["equipment", findCard({ typeKey: "horse_chitu" })],
  ])("[G-GUANYU-01] a red %s card plays as สังหาร", (_kind, cardId) => {
    const g = contractGame({
      seed: SEED(1021), assigns: [["p0", "guanyu"]],
      hands: { p0: [cardId], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([cardId], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectZone(g.state, cardId, "discardPile");
  });

  it("[G-GUANYU-02] a red card also answers a reactive สังหาร demand", () => {
    const g = contractGame({
      seed: SEED(1022), currentSeat: 1,
      assigns: [["p0", "guanyu"]],
      hands: { p1: [JUEDOU], p0: [TAO] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([JUEDOU], ["p0"]));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p0" }, withCards(TAO));
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it.each(["spade", "club"] as const)("[G-GUANYU-03] a %s card is refused as สังหาร", (suit) => {
    const black = findCard({ typeKey: "guohe", suit });
    const g = contractGame({
      seed: SEED(1023), assigns: [["p0", "guanyu"]],
      hands: { p0: [black], p1: [] },
    });
    expectAtomicReject(g, play([black], ["p1"], "sha"), /cannot play/);
  });

  it("[G-GUANYU-04a] the conversion does not leak to another player", () => {
    const g = contractGame({
      seed: SEED(1024), currentSeat: 1,
      assigns: [["p0", "guanyu"]],
      hands: { p1: [TAO], p0: [] },
    });
    expectAtomicReject(g, play([TAO], ["p0"], "sha"), /cannot play/);
  });

  it("[G-GUANYU-04b] a converted สังหาร still counts against the once-per-turn limit", () => {
    const g = contractGame({
      seed: SEED(1025), assigns: [["p0", "guanyu"]],
      hands: { p0: [TAO, TAO_B], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([TAO], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 1 });
    expectAtomicReject(g, play([TAO_B], ["p1"], "sha"), /usage limit/);
  });

  it("[G-GUANYU-04c] a converted สังหาร still obeys attack range", () => {
    const g = contractGame({
      seed: SEED(1026), playerCount: 5, assigns: [["p0", "guanyu"]],
      hands: { p0: [TAO] },
    });
    expectAtomicReject(g, play([TAO], ["p2"], "sha"), /out of range/);
  });
});

describe("G-ZHANGFEI เตียวหุย — คำรามสะพานเตียงปัน", () => {
  it("[G-ZHANGFEI-01] he may play a second, third and further สังหาร in one turn", () => {
    const g = contractGame({
      seed: SEED(1031), assigns: [["p0", "zhangfei"]],
      hands: { p0: [SHA, SHA_B, SHA_C], p1: [] },
    });
    for (const id of [SHA, SHA_B, SHA_C]) {
      step(g, { kind: "mainAction" }, play([id], ["p1"]));
      step(g, { kind: "respondShan", playerId: "p1" }, pass);
    }
    expectUsage(g.state, "p0", { sha: 3 });
    expectHp(g.state, "p1", 1);
  });

  it("[G-ZHANGFEI-02a] he still cannot reach a target outside his range", () => {
    const g = contractGame({
      seed: SEED(1032), playerCount: 5, assigns: [["p0", "zhangfei"]],
      hands: { p0: [SHA, SHA_B] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectAtomicReject(g, play([SHA_B], ["p2"]), /out of range/);
  });

  it("[G-ZHANGFEI-02b] he still needs an actual สังหาร in hand", () => {
    const g = contractGame({
      seed: SEED(1033), assigns: [["p0", "zhangfei"]],
      hands: { p0: [GUOHE], p1: [] },
    });
    expectAtomicReject(g, play([GUOHE], ["p1"], "sha"), /cannot play/);
  });

  it("[G-ZHANGFEI-03a] the counter still resets between turns", () => {
    const g = contractGame({
      seed: SEED(1034), assigns: [["p0", "zhangfei"]],
      hands: { p0: [SHA, SHA_B], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "mainAction" }, play([SHA_B], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 2 });
    nextTurnOf(g, "p0");
    expectUsage(g.state, "p0", { sha: 0 });
  });

  it("[G-ZHANGFEI-03b] nobody else gains unlimited สังหาร from him", () => {
    const g = contractGame({
      seed: SEED(1035), currentSeat: 1, assigns: [["p0", "zhangfei"]],
      hands: { p1: [SHA, SHA_B], p2: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectAtomicReject(g, play([SHA_B], ["p2"]), /usage limit/);
  });
});

describe("G-ZHAOYUN จูล่ง — เจ็ดเข้าเจ็ดออก", () => {
  it("[G-ZHAOYUN-01a] a หลบ plays as a สังหาร in his main action", () => {
    const g = contractGame({
      seed: SEED(1041), assigns: [["p0", "zhaoyun"]],
      hands: { p0: [SHAN], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([SHAN], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "discardPile");
  });

  it("[G-ZHAOYUN-01b] a หลบ also answers a demand for a สังหาร", () => {
    const g = contractGame({
      seed: SEED(1042), currentSeat: 1,
      assigns: [["p0", "zhaoyun"]],
      hands: { p1: [JUEDOU], p0: [SHAN] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([JUEDOU], ["p0"]));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p0" }, withCards(SHAN));
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[G-ZHAOYUN-02] a สังหาร dodges an incoming สังหาร", () => {
    const g = contractGame({
      seed: SEED(1043), currentSeat: 1,
      assigns: [["p0", "zhaoyun"]],
      hands: { p1: [SHA], p0: [SHA_B] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(SHA_B));
    expectHp(g.state, "p0", 4);
    expectZone(g.state, SHA_B, "discardPile");
  });

  it("[G-ZHAOYUN-03a] a card of any other type is refused in either direction", () => {
    const g = contractGame({
      seed: SEED(1044), assigns: [["p0", "zhaoyun"]],
      hands: { p0: [GUOHE], p1: [] },
    });
    expectAtomicReject(g, play([GUOHE], ["p1"], "sha"), /cannot play/);
  });

  it("[G-ZHAOYUN-03b] the conversion does not leak to another player", () => {
    const g = contractGame({
      seed: SEED(1045), currentSeat: 1,
      assigns: [["p0", "zhaoyun"]],
      hands: { p1: [SHAN], p2: [] },
    });
    expectAtomicReject(g, play([SHAN], ["p2"], "sha"), /cannot play/);
  });

  it("[G-ZHAOYUN-04a] his converted สังหาร still counts against the usage limit", () => {
    const g = contractGame({
      seed: SEED(1046), assigns: [["p0", "zhaoyun"]],
      hands: { p0: [SHAN, SHAN_B], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([SHAN], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectAtomicReject(g, play([SHAN_B], ["p1"], "sha"), /usage limit/);
  });

  it("[G-ZHAOYUN-04b] he answers ศึกชนเผ่าใต้ with a หลบ converted to สังหาร", () => {
    const g = contractGame({
      seed: SEED(1047), currentSeat: 1,
      assigns: [["p0", "zhaoyun"]],
      hands: { p1: [NANMAN], p0: [SHAN], p2: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p0" }, withCards(SHAN));
    expectHp(g.state, "p0", 4);
  });

  it("[G-ZHAOYUN-04c] he answers ห่าธนู with a สังหาร converted to หลบ", () => {
    const g = contractGame({
      seed: SEED(1048), currentSeat: 1,
      assigns: [["p0", "zhaoyun"]],
      hands: { p1: [C.wanjian.any], p0: [SHA_B], p2: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([C.wanjian.any], []));
    passWuxie(g);
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(SHA_B));
    expectHp(g.state, "p0", 4);
  });

  it("[G-ZHAOYUN-04d] against หอกฟางเทียน both required หลบ may be converted สังหาร", () => {
    const g = contractGame({
      seed: SEED(1049), currentSeat: 1,
      assigns: [["p0", "zhaoyun"], ["p1", "lubu"]],
      hands: { p1: [SHA], p0: [SHA_B, SHA_C] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(SHA_B, SHA_C));
    expectHp(g.state, "p0", 4);
    expectDiscarded(g.state, SHA_B, SHA_C);
  });
});

describe("G-MACHAO ม้าเฉียว — อาชาเสเหลียง / ม้าเหล็กทะลวงค่าย", () => {
  it("[G-MACHAO-01a] every distance he computes is 1 shorter", () => {
    const g = contractGame({ seed: SEED(1051), playerCount: 7, assigns: [["p0", "machao"]] });
    expect(distanceBase(g.state, "p0", "p2")).toBe(2);
    expect(distanceNet(g.state, "p0", "p2")).toBe(1);
    expect(distanceBase(g.state, "p0", "p3")).toBe(3);
    expect(distanceNet(g.state, "p0", "p3")).toBe(2);
  });

  it("[G-MACHAO-01b] the distance others compute toward him is unchanged", () => {
    const g = contractGame({ seed: SEED(1052), playerCount: 7, assigns: [["p0", "machao"]] });
    expect(distanceNet(g.state, "p2", "p0")).toBe(2);
    expect(distanceNet(g.state, "p3", "p0")).toBe(3);
  });

  it("[G-MACHAO-02a] it stacks with a −1 horse and with a +1 horse on the target", () => {
    const g = contractGame({
      seed: SEED(1053), playerCount: 7, assigns: [["p0", "machao"]],
      after: (s) => { equip(s, "p0", C.horse_chitu.any); equip(s, "p3", C.horse_jueying.any); },
    });
    // base 3, −1 skill, −1 horse, +1 target horse
    expect(distanceNet(g.state, "p0", "p3")).toBe(2);
  });

  it("[G-MACHAO-02b] weapon reach is applied on top of the shortened distance", () => {
    const g = contractGame({
      seed: SEED(1054), playerCount: 7, assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p3: [] },
      after: (s) => equip(s, "p0", C.qinglong.any), // range 3
    });
    expect(distanceNet(g.state, "p0", "p3")).toBe(2);
    step(g, { kind: "mainAction" }, play([SHA], ["p3"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    runTo(g, { kind: "mainAction", playerId: "p0" }, { max: 20 });
  });

  it("[G-MACHAO-03] a red ม้าเหล็ก judgment stops the target dodging", () => {
    const g = contractGame({
      seed: SEED(1055), assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => topOfDeck(s, [HEART_JUDGE]),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1"); // never got to play it
    expectLog(g.state, { eventType: "machaoTieqiJudge", actorId: "p0" }, 1);
  });

  it("[G-MACHAO-04] a black judgment leaves the dodge available", () => {
    const g = contractGame({
      seed: SEED(1056), assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectHp(g.state, "p1", 4);
    expectNoLog(g.state, { eventType: "machaoTieqiJudge" });
  });

  it("[G-MACHAO-05] it only fires when he is the source of the สังหาร", () => {
    const g = contractGame({
      seed: SEED(1057), currentSeat: 1, assigns: [["p0", "machao"]],
      hands: { p1: [SHA], p0: [SHAN] },
      after: (s) => topOfDeck(s, [HEART_JUDGE]),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    // no judgment: he is the defender here
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(SHAN));
    expectHp(g.state, "p0", 4);
    expectNoLog(g.state, { eventType: "machaoTieqiJudge" });
  });

  it("[G-MACHAO-06] พลิกชะตา's replacement decides the ม้าเหล็ก judgment", () => {
    const g = contractGame({
      seed: SEED(1058), assigns: [["p0", "machao"], ["p2", "simayi"]],
      hands: { p0: [SHA], p1: [SHAN], p2: [HEART_JUDGE] },
      after: (s) => topOfDeck(s, [SPADE_JUDGE]),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p2" }, withCards(HEART_JUDGE));
    // black judgment swapped for a red one → the dodge is now blocked
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[G-MACHAO-07a] โล่ราชันย์ immunity still applies even when the dodge is blocked", () => {
    const g = contractGame({
      seed: SEED(1059), assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p1", C.renwang.any); topOfDeck(s, [HEART_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    expectHp(g.state, "p1", 4);
    expectLog(g.state, { eventType: "renwangNegate" }, 1);
  });

  it("[G-MACHAO-07b] ค่ายกลแปดทิศ cannot save a target whose dodge is blocked", () => {
    const g = contractGame({
      seed: SEED(1060), assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [HEART_JUDGE, TAO_B]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    expectHp(g.state, "p1", 3);
  });

  it("[G-MACHAO-07c] it judges once per target of a multi-target สังหาร", () => {
    const g = contractGame({
      seed: SEED(1061), playerCount: 4, assigns: [["p0", "machao"]],
      hands: { p0: [SHA], p1: [], p2: [], p3: [] },
      after: (s) => equip(s, "p0", C.fangtian.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1", "p2", "p3"]));
    let judgments = 0;
    for (let i = 0; i < 12; i++) {
      const pd = g.session.state.pendingDecision;
      if (!pd || pd.kind === "mainAction") break;
      if (pd.kind === "judgmentReveal") judgments++;
      step(g, {}, (d) => ({ decisionId: d.id, playerId: d.playerId, choice: "reveal", pass: d.kind !== "judgmentReveal" }));
    }
    expect(judgments).toBe(3);
  });

  it("[G-MACHAO-07d] ไต้เกี้ยว's redirect and the block are resolved on the right player", () => {
    const g = contractGame({
      seed: SEED(1062), assigns: [["p0", "machao"], ["p1", "daiqiao"]],
      hands: { p0: [SHA], p1: [SHAN], p2: [] },
      after: (s) => topOfDeck(s, [HEART_JUDGE]),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // Both hooks are locked OnShaTargeted handlers; the attacker's own (seat 0)
    // runs before the defender's (seat 1).
    step(g, { kind: "judgmentReveal", playerId: "p0" }, choose("reveal"));
    step(g, { kind: "huibiRedirect", playerId: "p1" }, (pd) => ({
      decisionId: pd.id, playerId: "p1", cardIds: [SHAN], targetIds: ["p2"],
    }));
    expectHp(g.state, "p1", 3); // daiqiao maxHp 3, untouched
    expectHp(g.state, "p2", 3); // the redirected victim ate it
  });
});

describe("G-ZHUGELIANG ขงเบ้ง — อ่านดาววางกล / กลเมืองว่าง", () => {
  const pool = findCards(5, { typeKey: "shan" });

  it("[G-ZHUGELIANG-01a] he peeks min(5, living players) cards", () => {
    const g = contractGame({
      seed: SEED(1071), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    const pd = expectDecision(g, { kind: "guandouOrder", playerId: "p0" });
    expect((pd.data.options as unknown[]).length).toBe(3); // 3 alive
  });

  it("[G-ZHUGELIANG-01b] the peeked cards are hidden from every other viewer", () => {
    const g = contractGame({
      seed: SEED(1072), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    const mine = projectFor(g.state, "p0");
    const theirs = projectFor(g.state, "p1");
    expect((mine.pendingDecision!.data.options as unknown[]).length).toBe(3);
    expect(theirs.pendingDecision!.data).toEqual({});
  });

  it("[G-ZHUGELIANG-02a] the chosen order goes on top, drawn first", () => {
    const g = contractGame({
      seed: SEED(1073), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    const seen = (g.pd().data.options as Array<{ id: string }>).map((c) => c.id);
    step(g, { kind: "guandouOrder" }, withCards(seen[2]!, seen[0]!, seen[1]!));
    step(g, { kind: "drawCard" }, choose("draw"));
    const hand = g.p("p0").hand.map((c) => c.id);
    expect(hand.slice(-2)).toEqual([seen[2]!, seen[0]!]);
  });

  it("[G-ZHUGELIANG-02b] cards left unlisted sink to the bottom of the deck", () => {
    const g = contractGame({
      seed: SEED(1074), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    const seen = (g.pd().data.options as Array<{ id: string }>).map((c) => c.id);
    step(g, { kind: "guandouOrder" }, withCards(seen[0]!));
    // the other two are now at the very bottom
    expect(g.state.drawPile.slice(0, 2).map((c) => c.id).sort()).toEqual([seen[1]!, seen[2]!].sort());
    expect(g.state.drawPile[g.state.drawPile.length - 1]!.id).toBe(seen[0]!);
  });

  it("[G-ZHUGELIANG-03a] a duplicated id in the ordering is refused", () => {
    const g = contractGame({
      seed: SEED(1075), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    const seen = (g.pd().data.options as Array<{ id: string }>).map((c) => c.id);
    expectAtomicReject(g, withCards(seen[0]!, seen[0]!), /duplicate/);
  });

  it("[G-ZHUGELIANG-03b] an id outside the revealed set is refused", () => {
    const g = contractGame({
      seed: SEED(1076), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    expectAtomicReject(g, withCards("spade_13_1"), /not one of the revealed/);
  });

  it("[G-ZHUGELIANG-03c] an unknown card id is refused", () => {
    const g = contractGame({
      seed: SEED(1077), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => topOfDeck(s, pool),
    });
    acceptSkill(g, "zhugeliang_guandou");
    expectAtomicReject(g, withCards("not_a_card"), /not one of the revealed/);
  });

  it("[G-ZHUGELIANG-04] a short draw pile is topped up from a reshuffled discard pile", () => {
    const g = contractGame({
      seed: SEED(1078), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => {
        setDrawPile(s, [pool[0]!]);
        setDiscardPile(s, [pool[1]!, pool[2]!, pool[3]!]);
      },
    });
    acceptSkill(g, "zhugeliang_guandou");
    const pd = expectDecision(g, { kind: "guandouOrder", playerId: "p0" });
    expect((pd.data.options as unknown[]).length).toBe(3);
  });

  it("[G-ZHUGELIANG-05] the top-up duplicates nothing and loses nothing", () => {
    const g = contractGame({
      seed: SEED(1079), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => {
        setDrawPile(s, [pool[0]!]);
        setDiscardPile(s, [pool[1]!, pool[2]!, pool[3]!]);
      },
    });
    acceptSkill(g, "zhugeliang_guandou");
    const seen = (g.pd().data.options as Array<{ id: string }>).map((c) => c.id);
    expect(new Set(seen).size).toBe(seen.length);
    step(g, { kind: "guandouOrder" }, withCards(...seen));
    assertCardConservation(g.state);
  });

  it("[G-ZHUGELIANG-06] with fewer cards than needed it reveals what exists and moves on", () => {
    const g = contractGame({
      seed: SEED(1080), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => { setDrawPile(s, [pool[0]!]); setDiscardPile(s, []); },
    });
    acceptSkill(g, "zhugeliang_guandou");
    const pd = expectDecision(g, { kind: "guandouOrder", playerId: "p0" });
    expect((pd.data.options as unknown[]).length).toBe(1);
    step(g, { kind: "guandouOrder" }, withCards(pool[0]!));
    expectDecision(g, { kind: "drawCard", playerId: "p0" });
  });

  it("[G-ZHUGELIANG-07] with both piles empty no empty decision is raised", () => {
    const g = contractGame({
      seed: SEED(1081), assigns: [["p0", "zhugeliang"]], keepDrawGate: true,
      before: (s) => { setDrawPile(s, []); setDiscardPile(s, []); },
    });
    acceptSkill(g, "zhugeliang_guandou");
    expectDecision(g, { kind: "drawCard", playerId: "p0" });
  });

  it("[G-ZHUGELIANG-08a] with an empty hand he cannot be targeted by สังหาร", () => {
    const g = contractGame({
      seed: SEED(1082), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [SHA], p0: [] },
    });
    expectAtomicReject(g, play([SHA], ["p0"]), /cannot be targeted/);
  });

  it("[G-ZHUGELIANG-08b] with an empty hand he cannot be targeted by ท้าศึกเดี่ยว", () => {
    const g = contractGame({
      seed: SEED(1083), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [JUEDOU], p0: [] },
    });
    expectAtomicReject(g, play([JUEDOU], ["p0"]), /cannot be targeted/);
  });

  it("[G-ZHUGELIANG-09] holding a single card makes him targetable again", () => {
    const g = contractGame({
      seed: SEED(1084), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [SHA], p0: [SHAN] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    step(g, { kind: "respondShan", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 2); // zhugeliang maxHp 3
  });

  it("[G-ZHUGELIANG-10a] AOE tricks still reach him with an empty hand", () => {
    const g = contractGame({
      seed: SEED(1085), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [NANMAN], p0: [], p2: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([NANMAN], []));
    passWuxie(g);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 2);
  });

  it("[G-ZHUGELIANG-10b] other single-target tricks still reach him", () => {
    const g = contractGame({
      seed: SEED(1086), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [LEBU], p0: [] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([LEBU], ["p0"]));
    expectZone(g.state, LEBU, "judgment", "p0");
  });

  it("[G-ZHUGELIANG-11] the immunity is evaluated when the สังหาร is played, not later", () => {
    const g = contractGame({
      seed: SEED(1087), currentSeat: 1, assigns: [["p0", "zhugeliang"]],
      hands: { p1: [SHA], p0: [SHAN] },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p0"]));
    // he empties his hand by dodging — the สังหาร already targeted him legally
    step(g, { kind: "respondShan", playerId: "p0" }, withCards(SHAN));
    expectHp(g.state, "p0", 3);
    expectHandSize(g.state, "p0", 0);
  });
});

describe("G-PANGTONG หองหยิม — ปัญญากลจักร / เครื่องกลไร้พรมแดน", () => {
  it("[G-PANGTONG-01] an instant trick played from hand draws him 1", () => {
    const g = contractGame({
      seed: SEED(1091), assigns: [["p0", "pangtong"]],
      hands: { p0: [WUZHONG], p1: [], p2: [] },
    });
    playTrick(g, [WUZHONG], []);
    acceptSkill(g, "pangtong_juhui");
    expectHandSize(g.state, "p0", 3); // 2 from เนรมิต + 1 from the skill
    expectSkillUsed(g.state, "pangtong_juhui", 1);
  });

  it("[G-PANGTONG-02a] a basic card does not trigger it", () => {
    const g = contractGame({
      seed: SEED(1092), assigns: [["p0", "pangtong"]],
      hands: { p0: [SHA], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectNoSkillPrompt(g, "pangtong_juhui", { kind: "mainAction", playerId: "p0" });
  });

  it("[G-PANGTONG-02b] a delayed trick does not trigger it", () => {
    const g = contractGame({
      seed: SEED(1093), assigns: [["p0", "pangtong"]],
      hands: { p0: [LEBU], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([LEBU], ["p1"]));
    expectNoSkillPrompt(g, "pangtong_juhui", { kind: "mainAction", playerId: "p0" });
  });

  it("[G-PANGTONG-02c] equipping does not trigger it", () => {
    const g = contractGame({
      seed: SEED(1094), assigns: [["p0", "pangtong"]],
      hands: { p0: [C.crossbow.any] },
    });
    step(g, { kind: "mainAction" }, play([C.crossbow.any], []));
    expectNoSkillPrompt(g, "pangtong_juhui", { kind: "mainAction", playerId: "p0" });
  });

  it("[G-PANGTONG-02d] a converted trick does not trigger it", () => {
    const g = contractGame({
      seed: SEED(1095), assigns: [["p0", "pangtong"], ["p1", "ganning"]],
      currentSeat: 1,
      hands: { p1: [BLACK_A], p0: [SHA] },
    });
    // No general converts a card INTO a trick for หองหยิม himself, so the
    // observable half of the rule is that a converted trick played by anyone
    // else draws him nothing.
    step(g, { kind: "mainAction", playerId: "p1" }, play([BLACK_A], ["p0"], "guohe"));
    passWuxie(g);
    step(g, { kind: "pickCardFromPlayer", playerId: "p1" }, pass);
    runTo(g, { kind: "mainAction", playerId: "p1" }, { max: 20, defaults: { activateSkill: accept } });
    expectNoLog(g.state, { eventType: "skillUse", skillId: "pangtong_juhui" });
  });

  it("[G-PANGTONG-03] a trick cancelled by ไร้ช่องโหว่ still counts as used, once", () => {
    const g = contractGame({
      seed: SEED(1096), assigns: [["p0", "pangtong"]],
      hands: { p0: [WUZHONG], p1: [C.wuxie.any], p2: [] },
    });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(C.wuxie.any));
    passWuxie(g);
    acceptSkill(g, "pangtong_juhui");
    expectLog(g.state, { eventType: "skillUse", skillId: "pangtong_juhui" }, 1);
  });

  it("[G-PANGTONG-04] a multi-target trick triggers it once, not once per target", () => {
    const g = contractGame({
      seed: SEED(1097), playerCount: 4, assigns: [["p0", "pangtong"]],
      hands: { p0: [NANMAN], p1: [], p2: [], p3: [] },
    });
    playTrick(g, [NANMAN], []);
    for (const pid of ["p1", "p2", "p3"]) step(g, { kind: "respondSha", playerId: pid }, pass);
    acceptSkill(g, "pangtong_juhui");
    expectLog(g.state, { eventType: "skillUse", skillId: "pangtong_juhui" }, 1);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[G-PANGTONG-05] เครื่องกลไร้พรมแดน lifts a trick's own range restriction", () => {
    const g = contractGame({
      seed: SEED(1098), playerCount: 7, assigns: [["p0", "pangtong"]],
      hands: { p0: [SHUNSHOU], p3: [SHA] },
    });
    expect(distanceNet(g.state, "p0", "p3")).toBe(3);
    playTrick(g, [SHUNSHOU], ["p3"]);
    step(g, { kind: "pickCardFromPlayer", playerId: "p0" }, pass);
    expectZone(g.state, SHA, "hand", "p0");
  });

  it("[G-PANGTONG-06a] it does not lift a สังหาร's weapon range", () => {
    const g = contractGame({
      seed: SEED(1099), playerCount: 7, assigns: [["p0", "pangtong"]],
      hands: { p0: [SHA] },
    });
    expectAtomicReject(g, play([SHA], ["p3"]), /out of range/);
  });

  it("[G-PANGTONG-06b] it does not lift ลกซุน's targeting immunity", () => {
    const g = contractGame({
      seed: SEED(1100), playerCount: 7,
      assigns: [["p0", "pangtong"], ["p3", "luxun"]],
      hands: { p0: [SHUNSHOU], p3: [SHA] },
    });
    expectAtomicReject(g, play([SHUNSHOU], ["p3"]), /cannot be targeted/);
  });

  it("[G-PANGTONG-06c] it does not allow a duplicate delayed trick in a judgment zone", () => {
    const g = contractGame({
      seed: SEED(1101), playerCount: 7, assigns: [["p0", "pangtong"]],
      hands: { p0: [LEBU] },
      after: (s) => putInJudgmentZone(s, "p3", findCard({ typeKey: "lebusishu", exclude: [LEBU] })),
    });
    expectAtomicReject(g, play([LEBU], ["p3"]), /already has a lebusishu/);
  });
});
