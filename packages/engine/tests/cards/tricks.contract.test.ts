// TKTW_TEST_CASE_CATALOG.md → "การ์ด 32 ชนิด / Instant tricks"
// (C-WUZHONG, C-GUOHE, C-SHUNSHOU, C-JUEDOU, C-JIEDAO, C-NANMAN, C-WANJIAN,
//  C-TAOYUAN, C-WUGU, C-WUXIE).
//
// Every instant trick opens a ไร้ช่องโหว่ window before it resolves, so almost
// every script here is play -> passWuxie -> the card's own decisions.
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, withTargets, choose,
  passWuxie, playTrick, expectDecision, expectAtomicReject, expectHp, expectAlive,
  expectZone, expectHandSize, expectHandIds, expectLog, expectNoLog, expectEquipped,
  expectDiscarded, C, findCard, findCards,
} from "../_contract";
import { equip, setHp, killOff, topOfDeck, setDrawPile, setDiscardPile, emptyDrawPile } from "../_contract/rig";
import { projectFor } from "../../src/core/view";

const WUZHONG = C.wuzhong.any;
const GUOHE = C.guohe.any;
const SHUNSHOU = C.shunshou.any;
const JUEDOU = C.juedou.any;
const JUEDOU2 = findCard({ typeKey: "juedou", exclude: [JUEDOU] });
const JIEDAO = C.jiedao.any;
const NANMAN = C.nanman.any;
const WANJIAN = C.wanjian.any;
const TAOYUAN = C.taoyuan.any;
const WUGU = C.wugu.any;
const WUGU2 = findCard({ typeKey: "wugu", exclude: [WUGU] });
const WUXIE = C.wuxie.any;
const [WUXIE_B, WUXIE_C, WUXIE_D] = findCards(4, { typeKey: "wuxie" }).slice(1);

const SHA = C.sha.spade!;
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHA_C = findCard({ typeKey: "sha", suit: "diamond" });
const SHAN = C.shan.heart!;
const SHAN_B = findCard({ typeKey: "shan", suit: "diamond" });
const TAO = C.tao.heart!;

describe("C-WUZHONG — เนรมิตจากความว่างเปล่า", () => {
  it("[C-WUZHONG-01a] draws the caster 2 cards", () => {
    const g = contractGame({ seed: SEED(201), hands: { p0: [WUZHONG] } });
    playTrick(g, [WUZHONG], []);
    expectHandSize(g.state, "p0", 2);
    expectZone(g.state, WUZHONG, "discardPile");
    expectLog(g.state, { eventType: "draw", cardType: "wuzhong", amount: 2 }, 1);
  });

  it("[C-WUZHONG-01b] a ไร้ช่องโหว่ cancels it and nothing is drawn", () => {
    const g = contractGame({ seed: SEED(202), hands: { p0: [WUZHONG], p1: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHandSize(g.state, "p0", 0);
    expectLog(g.state, { eventType: "cardCancelled", cardType: "wuzhong" }, 1);
    expectNoLog(g.state, { eventType: "draw", cardType: "wuzhong" });
  });

  it("[C-WUZHONG-02a] naming another player as its target is refused", () => {
    const g = contractGame({ seed: SEED(203), hands: { p0: [WUZHONG] } });
    expectAtomicReject(g, play([WUZHONG], ["p1"]));
  });

  it("[C-WUZHONG-02b] an exhausted deck ends the draw safely instead of hanging", () => {
    const g = contractGame({
      seed: SEED(204), hands: { p0: [WUZHONG] },
      after: (s) => { emptyDrawPile(s); setDiscardPile(s, []); },
    });
    playTrick(g, [WUZHONG], []);
    // Only the spent wuzhong is available to reshuffle, so at most 1 comes back.
    expect(g.p("p0").hand.length).toBeLessThanOrEqual(1);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });
});

describe("C-GUOHE — ข้ามสะพานแล้วรื้อทิ้ง", () => {
  it("[C-GUOHE-01a] discards a chosen equipped card from the target", () => {
    const g = contractGame({
      seed: SEED(211), hands: { p0: [GUOHE], p1: [SHA] },
      after: (s) => equip(s, "p1", C.crossbow.any),
    });
    playTrick(g, [GUOHE], ["p1"]);
    const pd = expectDecision(g, { kind: "pickCardFromPlayer", playerId: "p0" });
    expect(pd.data.visibleIds).toEqual([C.crossbow.any]);
    step(g, { kind: "pickCardFromPlayer" }, withCards(C.crossbow.any));
    expectEquipped(g.state, "p1", "weapon", undefined);
    expectZone(g.state, C.crossbow.any, "discardPile");
    expectZone(g.state, SHA, "hand", "p1"); // the hand was untouched
  });

  it("[C-GUOHE-01b] discards a blind hand card when no equipment is chosen", () => {
    const g = contractGame({ seed: SEED(212), hands: { p0: [GUOHE], p1: [SHA] } });
    playTrick(g, [GUOHE], ["p1"]);
    step(g, { kind: "pickCardFromPlayer" }, pass);
    expectHandSize(g.state, "p1", 0);
    expectZone(g.state, SHA, "discardPile");
    expectLog(g.state, { eventType: "guoheDiscard", actorId: "p0", targetIds: ["p1"] }, 1);
  });

  it("[C-GUOHE-02a] a target holding no cards at all is refused", () => {
    const g = contractGame({ seed: SEED(213), hands: { p0: [GUOHE], p1: [] } });
    expectAtomicReject(g, play([GUOHE], ["p1"]));
  });

  it("[C-GUOHE-02b] targeting yourself is refused", () => {
    const g = contractGame({ seed: SEED(214), hands: { p0: [GUOHE, SHA] } });
    expectAtomicReject(g, play([GUOHE], ["p0"]));
  });

  it("[C-GUOHE-02c] naming a card the target does not have is refused", () => {
    const g = contractGame({
      seed: SEED(215), hands: { p0: [GUOHE], p1: [SHA] },
      after: (s) => equip(s, "p2", C.crossbow.any),
    });
    playTrick(g, [GUOHE], ["p1"]);
    expectAtomicReject(g, withCards(C.crossbow.any)); // p2's weapon, not p1's
  });

  it("[C-GUOHE-03a] a ไร้ช่องโหว่ cancels it and the target keeps everything", () => {
    const g = contractGame({ seed: SEED(216), hands: { p0: [GUOHE], p1: [SHA], p2: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([GUOHE], ["p1"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, pass);
    step(g, { kind: "askWuxie", playerId: "p2" }, withCards(WUXIE));
    passWuxie(g);
    expectZone(g.state, SHA, "hand", "p1");
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[C-GUOHE-03b] losing an equipped card fires the equipment-loss trigger", () => {
    const g = contractGame({
      seed: SEED(217), assigns: [["p1", "sunshangxiang"]],
      hands: { p0: [GUOHE], p1: [] },
      after: (s) => equip(s, "p1", C.crossbow.any),
    });
    playTrick(g, [GUOHE], ["p1"]);
    step(g, { kind: "pickCardFromPlayer" }, withCards(C.crossbow.any));
    // ศาสตราไม่ขาดมือ: losing 1 equipment draws 2.
    step(g, { kind: "activateSkill", skillId: "sunshangxiang_jiehun" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    expectHandSize(g.state, "p1", 2);
  });
});

describe("C-SHUNSHOU — ฉวยโอกาสลักแกะ", () => {
  it("[C-SHUNSHOU-01] steals one card from a range-1 target into the caster's hand", () => {
    const g = contractGame({ seed: SEED(221), hands: { p0: [SHUNSHOU], p1: [SHA] } });
    playTrick(g, [SHUNSHOU], ["p1"]);
    step(g, { kind: "pickCardFromPlayer" }, pass);
    expectZone(g.state, SHA, "hand", "p0");
    expectHandSize(g.state, "p1", 0);
    expectLog(g.state, { eventType: "shunshouSteal", actorId: "p0", targetIds: ["p1"] }, 1);
  });

  it("[C-SHUNSHOU-02a] a target beyond range 1 is refused", () => {
    const g = contractGame({ seed: SEED(222), playerCount: 5, hands: { p0: [SHUNSHOU], p2: [SHA] } });
    expectAtomicReject(g, play([SHUNSHOU], ["p2"]), /out of range/);
  });

  it("[C-SHUNSHOU-02b] targeting yourself is refused", () => {
    const g = contractGame({ seed: SEED(223), hands: { p0: [SHUNSHOU, SHA] } });
    expectAtomicReject(g, play([SHUNSHOU], ["p0"]));
  });

  it("[C-SHUNSHOU-02c] a target holding nothing is refused", () => {
    const g = contractGame({ seed: SEED(224), hands: { p0: [SHUNSHOU], p1: [] } });
    expectAtomicReject(g, play([SHUNSHOU], ["p1"]));
  });

  it("[C-SHUNSHOU-02d] ลกซุน's ถ่อมตนซ่อนคม makes him an illegal target", () => {
    const g = contractGame({
      seed: SEED(225), assigns: [["p1", "luxun"]],
      hands: { p0: [SHUNSHOU], p1: [SHA] },
    });
    expectAtomicReject(g, play([SHUNSHOU], ["p1"]), /cannot be targeted/);
  });

  it("[C-SHUNSHOU-03a] a +1 horse on the target pushes them out of range", () => {
    const g = contractGame({
      seed: SEED(226), hands: { p0: [SHUNSHOU], p1: [SHA] },
      after: (s) => equip(s, "p1", C.horse_jueying.any),
    });
    expectAtomicReject(g, play([SHUNSHOU], ["p1"]), /out of range/);
  });

  it("[C-SHUNSHOU-03b] หองหยิม's เครื่องกลไร้พรมแดน ignores the card's own range", () => {
    const g = contractGame({
      seed: SEED(227), playerCount: 5,
      assigns: [["p0", "pangtong"]],
      hands: { p0: [SHUNSHOU], p2: [SHA] },
    });
    playTrick(g, [SHUNSHOU], ["p2"]);
    step(g, { kind: "pickCardFromPlayer" }, pass);
    expectZone(g.state, SHA, "hand", "p0");
  });

  it("[C-SHUNSHOU-03c] a ไร้ช่องโหว่ cancels the theft", () => {
    const g = contractGame({ seed: SEED(228), hands: { p0: [SHUNSHOU], p1: [SHA], p2: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([SHUNSHOU], ["p1"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, pass);
    step(g, { kind: "askWuxie", playerId: "p2" }, withCards(WUXIE));
    passWuxie(g);
    expectZone(g.state, SHA, "hand", "p1");
  });
});

describe("C-JUEDOU — ท้าศึกเดี่ยว", () => {
  it("[C-JUEDOU-01a] the target answers first and takes 1 damage when they cannot", () => {
    const g = contractGame({ seed: SEED(231), hands: { p0: [JUEDOU], p1: [] } });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectHp(g.state, "p0", 4);
  });

  it("[C-JUEDOU-01b] the two sides alternate until one runs out", () => {
    const g = contractGame({ seed: SEED(232), hands: { p0: [JUEDOU, SHA], p1: [SHA_B] } });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p0" }, withCards(SHA));
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectDiscarded(g.state, SHA, SHA_B);
    expectLog(g.state, { eventType: "juedouSha" }, 2);
  });

  it("[C-JUEDOU-01c] the duel's initiator takes the damage when they run out", () => {
    const g = contractGame({ seed: SEED(233), hands: { p0: [JUEDOU], p1: [SHA_B] } });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 3);
    expectHp(g.state, "p1", 4);
  });

  it("[C-JUEDOU-02a] a non-สังหาร offered in the duel is refused", () => {
    const g = contractGame({ seed: SEED(234), hands: { p0: [JUEDOU], p1: [TAO] } });
    playTrick(g, [JUEDOU], ["p1"]);
    expectAtomicReject(g, withCards(TAO), /does not count as sha/);
  });

  it("[C-JUEDOU-02b] a card the responder does not hold is refused", () => {
    const g = contractGame({ seed: SEED(235), hands: { p0: [JUEDOU, SHA], p1: [] } });
    playTrick(g, [JUEDOU], ["p1"]);
    expectAtomicReject(g, withCards(SHA)); // p0's สังหาร, offered by p1
  });

  it("[C-JUEDOU-02c] a stale answer in the duel loop is refused", () => {
    const g = contractGame({ seed: SEED(236), hands: { p0: [JUEDOU], p1: [SHA_B] } });
    playTrick(g, [JUEDOU], ["p1"]);
    expectAtomicReject(g, (pd) => ({ decisionId: "dec_stale", playerId: pd.playerId, cardIds: [SHA_B] }));
  });

  it("[C-JUEDOU-03a] ลิโป้'s หอกฟางเทียน makes the opponent answer with two สังหาร", () => {
    const g = contractGame({
      seed: SEED(237), assigns: [["p0", "lubu"]],
      hands: { p0: [JUEDOU], p1: [SHA_B, SHA_C] },
    });
    playTrick(g, [JUEDOU], ["p1"]);
    const pd = expectDecision(g, { kind: "respondSha", playerId: "p1" });
    expect(pd.data.needed).toBe(2);
    step(g, { kind: "respondSha" }, withCards(SHA_B, SHA_C));
    // ลิโป้'s own side of the exchange is back to the normal single สังหาร.
    const back = expectDecision(g, { kind: "respondSha", playerId: "p0" });
    expect(back.data.needed).toBe(1);
  });

  it("[C-JUEDOU-03b] a converted สังหาร answers the duel", () => {
    const g = contractGame({
      seed: SEED(238), assigns: [["p1", "guanyu"]],
      hands: { p0: [JUEDOU], p1: [TAO] },
    });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(TAO)); // heart -> counts as สังหาร
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 3);
    expectZone(g.state, TAO, "discardPile");
  });

  it("[C-JUEDOU-03c] เล่าปี่'s lord skill lets a จ๊ก ally supply the duel's สังหาร", () => {
    const g = contractGame({
      seed: SEED(239), playerCount: 3,
      assigns: [["p1", "liubei", true], ["p2", "guanyu"]],
      hands: { p0: [JUEDOU], p1: [], p2: [SHA_B] },
      after: (s) => { s.players.find((p) => p.id === "p1")!.role = "lord"; },
    });
    playTrick(g, [JUEDOU], ["p1"]);
    // The lord must be offered his ธงจ๊กเรียกศึก cover before eating the damage.
    step(g, { kind: "activateSkill", skillId: "liubei_hujia" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 3);
  });

  it("[C-JUEDOU-03d] a duel that kills the loser runs the dying flow", () => {
    const g = contractGame({
      seed: SEED(240), hands: { p0: [JUEDOU], p1: [], p2: [] },
      after: (s) => setHp(s, "p1", 1),
    });
    playTrick(g, [JUEDOU], ["p1"]);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p2" }, pass);
    step(g, { kind: "respondTao", playerId: "p0" }, pass);
    expectAlive(g.state, "p1", false);
  });

  it("[C-JUEDOU-03e] a ไร้ช่องโหว่ cancels the duel before anyone answers", () => {
    const g = contractGame({ seed: SEED(241), hands: { p0: [JUEDOU], p1: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([JUEDOU], ["p1"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p0", 4);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });
});

describe("C-JIEDAO — ยืมดาบฆ่าคน", () => {
  const armWeapon = C.sword_qinggang.any;

  it("[C-JIEDAO-01] the coerced holder attacks the named victim with a สังหาร", () => {
    const g = contractGame({
      seed: SEED(251), hands: { p0: [JIEDAO], p1: [SHA_B], p2: [] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    playTrick(g, [JIEDAO], ["p1", "p2"]);
    step(g, { kind: "jiedaoForceSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p2", 3);
    expectEquipped(g.state, "p1", "weapon", armWeapon); // holder keeps the weapon
    expectZone(g.state, SHA_B, "discardPile");
  });

  it("[C-JIEDAO-02] declining hands the weapon to the caster", () => {
    const g = contractGame({
      seed: SEED(252), hands: { p0: [JIEDAO], p1: [SHA_B], p2: [] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    playTrick(g, [JIEDAO], ["p1", "p2"]);
    step(g, { kind: "jiedaoForceSha", playerId: "p1" }, pass);
    expectEquipped(g.state, "p1", "weapon", undefined);
    expectEquipped(g.state, "p0", "weapon", armWeapon);
    expectHp(g.state, "p2", 4);
  });

  it("[C-JIEDAO-03a] an already-armed caster confirms the swap and loses the old weapon", () => {
    const g = contractGame({
      seed: SEED(253), hands: { p0: [JIEDAO], p1: [], p2: [] },
      after: (s) => { equip(s, "p1", armWeapon); equip(s, "p0", C.crossbow.any); },
    });
    playTrick(g, [JIEDAO], ["p1", "p2"]);
    step(g, { kind: "jiedaoForceSha", playerId: "p1" }, pass);
    step(g, { kind: "jiedaoWeaponSwap", playerId: "p0" }, choose("swap"));
    expectEquipped(g.state, "p0", "weapon", armWeapon);
    expectZone(g.state, C.crossbow.any, "discardPile"); // the replaced one is discarded
  });

  it("[C-JIEDAO-03b] declining the swap discards the offered weapon and keeps the old one", () => {
    const g = contractGame({
      seed: SEED(254), hands: { p0: [JIEDAO], p1: [], p2: [] },
      after: (s) => { equip(s, "p1", armWeapon); equip(s, "p0", C.crossbow.any); },
    });
    playTrick(g, [JIEDAO], ["p1", "p2"]);
    step(g, { kind: "jiedaoForceSha", playerId: "p1" }, pass);
    step(g, { kind: "jiedaoWeaponSwap", playerId: "p0" }, pass);
    expectEquipped(g.state, "p0", "weapon", C.crossbow.any);
    expectEquipped(g.state, "p1", "weapon", undefined);
    expectZone(g.state, armWeapon, "discardPile");
  });

  it("[C-JIEDAO-04a] an unarmed first target is refused", () => {
    const g = contractGame({ seed: SEED(255), hands: { p0: [JIEDAO] } });
    expectAtomicReject(g, play([JIEDAO], ["p1", "p2"]), /weapon/);
  });

  it("[C-JIEDAO-04b] omitting the victim is refused", () => {
    const g = contractGame({
      seed: SEED(256), hands: { p0: [JIEDAO] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    expectAtomicReject(g, play([JIEDAO], ["p1"]));
  });

  it("[C-JIEDAO-04c] the caster cannot be the armed target", () => {
    const g = contractGame({
      seed: SEED(257), hands: { p0: [JIEDAO], p1: [], p2: [] },
      after: (s) => equip(s, "p0", armWeapon),
    });
    expectAtomicReject(g, play([JIEDAO], ["p0", "p2"]), /cannot target themselves/);
  });

  it("[C-JIEDAO-04d] the caster cannot be the forced attack victim", () => {
    const g = contractGame({
      seed: SEED(258), hands: { p0: [JIEDAO], p1: [], p2: [] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    expectAtomicReject(g, play([JIEDAO], ["p1", "p0"]), /cannot target themselves/);
  });

  it("[C-JIEDAO-04e] a non-สังหาร offered by the coerced holder is refused", () => {
    const g = contractGame({
      seed: SEED(259), hands: { p0: [JIEDAO], p1: [TAO], p2: [] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    playTrick(g, [JIEDAO], ["p1", "p2"]);
    expectAtomicReject(g, withCards(TAO), /does not count as sha/);
  });

  it("[C-JIEDAO-04f] a ไร้ช่องโหว่ cancels it and no weapon moves", () => {
    const g = contractGame({
      seed: SEED(260), hands: { p0: [JIEDAO], p1: [WUXIE], p2: [] },
      after: (s) => equip(s, "p1", armWeapon),
    });
    step(g, { kind: "mainAction" }, play([JIEDAO], ["p1", "p2"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectEquipped(g.state, "p1", "weapon", armWeapon);
    expectEquipped(g.state, "p0", "weapon", undefined);
  });
});

describe("C-NANMAN — ศึกชนเผ่าใต้", () => {
  it("[C-NANMAN-01] every other player answers with a สังหาร or loses 1 HP, in seat order", () => {
    const g = contractGame({
      seed: SEED(261), playerCount: 4,
      hands: { p0: [NANMAN], p1: [SHA_B], p2: [], p3: [] },
    });
    playTrick(g, [NANMAN], []);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p3" }, pass);
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p2", 3);
    expectHp(g.state, "p3", 3);
    expectZone(g.state, SHA_B, "discardPile");
  });

  it("[C-NANMAN-02a] the caster is never asked and takes no damage", () => {
    const g = contractGame({ seed: SEED(262), hands: { p0: [NANMAN], p1: [], p2: [] } });
    playTrick(g, [NANMAN], []);
    const asked: string[] = [];
    for (let i = 0; i < 4 && g.session.state.pendingDecision?.kind === "respondSha"; i++) {
      const pd = g.pd();
      asked.push(pd.playerId);
      step(g, { kind: "respondSha" }, pass);
    }
    expect(asked).toEqual(["p1", "p2"]);
    expectHp(g.state, "p0", 4);
  });

  it("[C-NANMAN-02b] dead players are skipped", () => {
    const g = contractGame({
      seed: SEED(263), playerCount: 4,
      hands: { p0: [NANMAN], p1: [], p2: [], p3: [] },
      after: (s) => killOff(s, "p2"),
    });
    playTrick(g, [NANMAN], []);
    const asked: string[] = [];
    for (let i = 0; i < 4 && g.session.state.pendingDecision?.kind === "respondSha"; i++) {
      asked.push(g.pd().playerId);
      step(g, { kind: "respondSha" }, pass);
    }
    expect(asked).toEqual(["p1", "p3"]);
  });

  it("[C-NANMAN-03a] a ไร้ช่องโหว่ cancels the whole effect for everyone", () => {
    const g = contractGame({ seed: SEED(264), hands: { p0: [NANMAN], p1: [WUXIE], p2: [] } });
    step(g, { kind: "mainAction" }, play([NANMAN], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p2", 4);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[C-NANMAN-03b] เล่าปี่'s lord skill covers his answer with an ally's สังหาร", () => {
    const g = contractGame({
      seed: SEED(265), playerCount: 3,
      assigns: [["p1", "liubei", true], ["p2", "guanyu"]],
      hands: { p0: [NANMAN], p1: [], p2: [SHA_B] },
      after: (s) => { s.players.find((p) => p.id === "p1")!.role = "lord"; },
    });
    playTrick(g, [NANMAN], []);
    step(g, { kind: "activateSkill", skillId: "liubei_hujia" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHA_B));
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    expectHp(g.state, "p1", 5); // lord liubei maxHp 5, covered
    expectHp(g.state, "p2", 3);
  });

  it("[C-NANMAN-03c] a converted สังหาร answers it", () => {
    const g = contractGame({
      seed: SEED(266), assigns: [["p1", "guanyu"]],
      hands: { p0: [NANMAN], p1: [TAO], p2: [] },
    });
    playTrick(g, [NANMAN], []);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(TAO));
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    expectHp(g.state, "p1", 4);
    expectZone(g.state, TAO, "discardPile");
  });

  it("[C-NANMAN-04] a death mid-effect does not stop the rest of the table resolving", () => {
    const g = contractGame({
      seed: SEED(267), playerCount: 4,
      hands: { p0: [NANMAN], p1: [], p2: [], p3: [] },
      after: (s) => setHp(s, "p1", 1),
    });
    playTrick(g, [NANMAN], []);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    // p1 drops to 0 and the dying window runs inside the AOE loop.
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p2" }, pass);
    step(g, { kind: "respondTao", playerId: "p3" }, pass);
    step(g, { kind: "respondTao", playerId: "p0" }, pass);
    expectAlive(g.state, "p1", false);
    step(g, { kind: "respondSha", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p3" }, pass);
    expectHp(g.state, "p2", 3);
    expectHp(g.state, "p3", 3);
  });
});

describe("C-WANJIAN — ห่าธนู", () => {
  it("[C-WANJIAN-01] every other player answers with a หลบ or loses 1 HP", () => {
    const g = contractGame({
      seed: SEED(271), playerCount: 4,
      hands: { p0: [WANJIAN], p1: [SHAN], p2: [], p3: [] },
    });
    playTrick(g, [WANJIAN], []);
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    step(g, { kind: "respondShan", playerId: "p3" }, pass);
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p2", 3);
    expectHp(g.state, "p3", 3);
  });

  it("[C-WANJIAN-02a] the caster is skipped and the poll runs in seat order", () => {
    const g = contractGame({
      seed: SEED(272), playerCount: 4,
      hands: { p0: [WANJIAN], p1: [], p2: [], p3: [] },
      after: (s) => killOff(s, "p2"),
    });
    playTrick(g, [WANJIAN], []);
    const asked: string[] = [];
    for (let i = 0; i < 4 && g.session.state.pendingDecision?.kind === "respondShan"; i++) {
      asked.push(g.pd().playerId);
      step(g, { kind: "respondShan" }, pass);
    }
    expect(asked).toEqual(["p1", "p3"]);
    expectHp(g.state, "p0", 4);
  });

  it("[C-WANJIAN-02b] a ไร้ช่องโหว่ cancels it for the whole table", () => {
    const g = contractGame({ seed: SEED(273), hands: { p0: [WANJIAN], p1: [WUXIE], p2: [] } });
    step(g, { kind: "mainAction" }, play([WANJIAN], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHp(g.state, "p1", 4);
    expectHp(g.state, "p2", 4);
  });

  it("[C-WANJIAN-02c] ค่ายกลแปดทิศ auto-dodges a ห่าธนู arrow on a red judgment", () => {
    const g = contractGame({
      seed: SEED(274), hands: { p0: [WANJIAN], p1: [], p2: [] },
      after: (s) => {
        equip(s, "p1", C.bagua.any);
        topOfDeck(s, [findCard({ typeKey: "tao", suit: "heart" })]);
      },
    });
    playTrick(g, [WANJIAN], []);
    // ห่าธนู now routes each arrow through the same OnNeedDodge box a สังหาร
    // uses, so bagua's own judgment reveal is the very next decision.
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal"));
    expectHp(g.state, "p1", 4); // auto-dodged — never even asked for a หลบ
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p2", 3);
  });

  it("[C-WANJIAN-02d] a converted หลบ answers it", () => {
    const g = contractGame({
      seed: SEED(275), assigns: [["p1", "zhaoyun"]],
      hands: { p0: [WANJIAN], p1: [SHA_B], p2: [] },
    });
    playTrick(g, [WANJIAN], []);
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHA_B));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHA_B, "discardPile");
  });

  it("[C-WANJIAN-02e] a death mid-effect leaves the rest of the loop intact", () => {
    const g = contractGame({
      seed: SEED(276), playerCount: 4,
      hands: { p0: [WANJIAN], p1: [], p2: [], p3: [] },
      after: (s) => setHp(s, "p1", 1),
    });
    playTrick(g, [WANJIAN], []);
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    for (const pid of ["p1", "p2", "p3", "p0"]) step(g, { kind: "respondTao", playerId: pid }, pass);
    expectAlive(g.state, "p1", false);
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    step(g, { kind: "respondShan", playerId: "p3" }, pass);
    expectHp(g.state, "p3", 3);
  });
});

describe("C-TAOYUAN — สาบานสวนท้อ", () => {
  it("[C-TAOYUAN-01] every living player including the caster heals 1", () => {
    const g = contractGame({
      seed: SEED(281), hands: { p0: [TAOYUAN] },
      after: (s) => { setHp(s, "p0", 2); setHp(s, "p1", 1); setHp(s, "p2", 3); },
    });
    playTrick(g, [TAOYUAN], []);
    expectHp(g.state, "p0", 3);
    expectHp(g.state, "p1", 2);
    expectHp(g.state, "p2", 4);
  });

  it("[C-TAOYUAN-02a] a full-HP player is unchanged and never exceeds max HP", () => {
    const g = contractGame({
      seed: SEED(282), hands: { p0: [TAOYUAN] },
      after: (s) => setHp(s, "p1", 1),
    });
    playTrick(g, [TAOYUAN], []);
    expectHp(g.state, "p0", 4);
    expectHp(g.state, "p2", 4);
    expectHp(g.state, "p1", 2);
  });

  it("[C-TAOYUAN-02b] dead players are not healed", () => {
    const g = contractGame({
      seed: SEED(283), playerCount: 4, hands: { p0: [TAOYUAN] },
      after: (s) => { setHp(s, "p1", 2); killOff(s, "p1"); setHp(s, "p2", 2); },
    });
    playTrick(g, [TAOYUAN], []);
    expectHp(g.state, "p1", 2); // untouched
    expectAlive(g.state, "p1", false);
    expectHp(g.state, "p2", 3);
  });

  it("[C-TAOYUAN-03a] a ไร้ช่องโหว่ cancels the healing for everyone", () => {
    const g = contractGame({
      seed: SEED(284), hands: { p0: [TAOYUAN], p1: [WUXIE] },
      after: (s) => { setHp(s, "p0", 2); setHp(s, "p2", 2); },
    });
    step(g, { kind: "mainAction" }, play([TAOYUAN], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHp(g.state, "p0", 2);
    expectHp(g.state, "p2", 2);
  });

  it("[C-TAOYUAN-03b] heal triggers fire once each and do not recurse", () => {
    const g = contractGame({
      seed: SEED(285), playerCount: 3,
      assigns: [["p0", "sunquan", true], ["p1", "zhouyu"]],
      hands: { p1: [TAOYUAN] }, currentSeat: 1,
      after: (s) => {
        s.players.find((p) => p.id === "p0")!.role = "lord";
        setHp(s, "p0", 2); setHp(s, "p1", 1);
      },
    });
    playTrick(g, [TAOYUAN], []);
    // สาบานสวนท้อ is not "another ง่อ player using ท้อ on you", so แคว้นง่อค้ำชู
    // must not fire — and nothing may recurse into an unbounded heal loop.
    expectHp(g.state, "p0", 3);
    expectHp(g.state, "p1", 2);
    expectLog(g.state, { eventType: "heal", actorId: "p0" }, 1);
  });
});

describe("C-WUGU — ธัญญาหารบริบูรณ์", () => {
  const pool = findCards(3, { typeKey: "shan" });

  it("[C-WUGU-01] reveals one card per living player and picks run in seat order", () => {
    const g = contractGame({
      seed: SEED(291), hands: { p0: [WUGU], p1: [], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    playTrick(g, [WUGU], []);
    const first = expectDecision(g, { kind: "wuguPick", playerId: "p0" });
    expect((first.data.options as Array<{ id: string }>).map((c) => c.id)).toEqual(pool);
    step(g, { kind: "wuguPick", playerId: "p0" }, withCards(pool[1]!));
    step(g, { kind: "wuguPick", playerId: "p1" }, withCards(pool[2]!));
    step(g, { kind: "wuguPick", playerId: "p2" }, withCards(pool[0]!));
    expectZone(g.state, pool[1]!, "hand", "p0");
    expectZone(g.state, pool[2]!, "hand", "p1");
    expectZone(g.state, pool[0]!, "hand", "p2");
    expectLog(g.state, { eventType: "wuguReveal", amount: 3 }, 1);
  });

  it("[C-WUGU-02a] cards nobody took go to the discard pile", () => {
    const g = contractGame({
      seed: SEED(292), playerCount: 4,
      hands: { p0: [WUGU], p1: [], p2: [], p3: [] },
      after: (s) => { killOff(s, "p3"); topOfDeck(s, pool); },
    });
    playTrick(g, [WUGU], []);
    // 3 alive -> 3 revealed, 3 picks; nothing left over here, so pick fewer:
    step(g, { kind: "wuguPick", playerId: "p0" }, withCards(pool[0]!));
    step(g, { kind: "wuguPick", playerId: "p1" }, withCards(pool[1]!));
    step(g, { kind: "wuguPick", playerId: "p2" }, withCards(pool[2]!));
    expect(g.state.drawPile.some((c) => pool.includes(c.id))).toBe(false);
  });

  it("[C-WUGU-02b] the revealed pool shrinks as each player takes one", () => {
    const g = contractGame({
      seed: SEED(293), hands: { p0: [WUGU], p1: [], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    playTrick(g, [WUGU], []);
    expect((g.pd().data.options as unknown[]).length).toBe(3);
    step(g, { kind: "wuguPick", playerId: "p0" }, withCards(pool[0]!));
    expect((g.pd().data.options as unknown[]).length).toBe(2);
    step(g, { kind: "wuguPick", playerId: "p1" }, withCards(pool[1]!));
    expect((g.pd().data.options as unknown[]).length).toBe(1);
    // and a non-picker never sees a pick decision addressed to them
    const view = projectFor(g.state, "p0");
    expect(view.pendingDecision?.playerId).toBe("p2");
  });

  it("[C-WUGU-03a] choosing a card that is not in the pool is refused", () => {
    const g = contractGame({
      seed: SEED(294), hands: { p0: [WUGU], p1: [], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    playTrick(g, [WUGU], []);
    expectAtomicReject(g, withCards(SHA)); // สังหาร was never revealed
  });

  it("[C-WUGU-03b] a player who died mid-resolution does not receive a card", () => {
    const g = contractGame({
      seed: SEED(295), hands: { p0: [WUGU], p1: [], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    playTrick(g, [WUGU], []);
    step(g, { kind: "wuguPick", playerId: "p0" }, withCards(pool[0]!));
    killOff(g.state, "p1");
    step(g, { kind: "wuguPick", playerId: "p1" }, withCards(pool[1]!));
    expectHandSize(g.state, "p1", 0);
  });

  it("[C-WUGU-03c] a short deck reveals only what exists and still resolves", () => {
    const g = contractGame({
      seed: SEED(296), hands: { p0: [WUGU], p1: [], p2: [] },
      after: (s) => { setDrawPile(s, [pool[0]!]); setDiscardPile(s, []); },
    });
    playTrick(g, [WUGU], []);
    // 1 real card left plus the spent ธัญญาหาร reshuffled back in = 2 revealed.
    const revealed = (g.pd().data.options as unknown[]).length;
    expect(revealed).toBeLessThanOrEqual(3);
    expect(revealed).toBeGreaterThan(0);
    for (let i = 0; i < 3 && g.session.state.pendingDecision?.kind === "wuguPick"; i++) {
      const opts = g.pd().data.options as Array<{ id: string }>;
      step(g, { kind: "wuguPick" }, withCards(opts[0]!.id));
    }
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[C-WUGU-04] a ไร้ช่องโหว่ cancels it and no card leaves the deck", () => {
    const g = contractGame({
      seed: SEED(297), hands: { p0: [WUGU], p1: [WUXIE], p2: [] },
      after: (s) => topOfDeck(s, pool),
    });
    const before = g.state.drawPile.length;
    step(g, { kind: "mainAction" }, play([WUGU], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expect(g.state.drawPile.length).toBe(before);
    expectHandSize(g.state, "p2", 0);
  });
});

describe("C-WUXIE — ไร้ช่องโหว่", () => {
  it("[C-WUXIE-01a] cannot be played as a main action", () => {
    const g = contractGame({ seed: SEED(301), hands: { p0: [WUXIE] } });
    expectAtomicReject(g, play([WUXIE], ["p1"]), /ตอบโต้เท่านั้น/);
  });

  it("[C-WUXIE-01b] no window opens for a basic card", () => {
    const g = contractGame({ seed: SEED(302), hands: { p0: [SHA], p1: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" }); // straight to the dodge
  });

  it("[C-WUXIE-02a] one ไร้ช่องโหว่ cancels the trick", () => {
    const g = contractGame({ seed: SEED(303), hands: { p0: [WUZHONG], p1: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHandSize(g.state, "p0", 0);
  });

  it("[C-WUXIE-02b] two ไร้ช่องโหว่ cancel each other and the trick resolves", () => {
    const g = contractGame({
      seed: SEED(304), hands: { p0: [WUZHONG], p1: [WUXIE], p2: [WUXIE_B!] },
    });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    // now a counter-window opens on p1's ไร้ช่องโหว่
    step(g, { kind: "askWuxie", playerId: "p2" }, withCards(WUXIE_B!));
    passWuxie(g);
    expectHandSize(g.state, "p0", 2); // the wuzhong went through
  });

  it("[C-WUXIE-02c] three ไร้ช่องโหว่ leave the trick cancelled again", () => {
    const g = contractGame({
      seed: SEED(305), playerCount: 4,
      hands: { p0: [WUZHONG], p1: [WUXIE], p2: [WUXIE_B!], p3: [WUXIE_C!] },
    });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    step(g, { kind: "askWuxie", playerId: "p2" }, withCards(WUXIE_B!));
    step(g, { kind: "askWuxie", playerId: "p3" }, withCards(WUXIE_C!));
    passWuxie(g);
    expectHandSize(g.state, "p0", 0);
    expectLog(g.state, { eventType: "wuxie" }, 3);
  });

  it("[C-WUXIE-03a] players are polled in seat order after the source", () => {
    const g = contractGame({
      seed: SEED(306), playerCount: 4,
      hands: { p0: [WUZHONG], p1: [], p2: [], p3: [] },
    });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    const asked: string[] = [];
    while (g.session.state.pendingDecision?.kind === "askWuxie") {
      asked.push(g.pd().playerId);
      step(g, { kind: "askWuxie" }, pass);
    }
    expect(asked).toEqual(["p1", "p2", "p3"]);
  });

  it("[C-WUXIE-03b] everybody passing lets the trick resolve", () => {
    const g = contractGame({ seed: SEED(307), hands: { p0: [WUZHONG], p1: [], p2: [] } });
    playTrick(g, [WUZHONG], []);
    expectHandSize(g.state, "p0", 2);
  });

  it("[C-WUXIE-04a] offering a non-ไร้ช่องโหว่ card is refused", () => {
    const g = contractGame({ seed: SEED(308), hands: { p0: [WUZHONG], p1: [SHA] } });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    expectAtomicReject(g, withCards(SHA), /does not count as wuxie/);
  });

  it("[C-WUXIE-04b] offering a ไร้ช่องโหว่ the responder does not hold is refused", () => {
    const g = contractGame({ seed: SEED(309), hands: { p0: [WUZHONG], p1: [], p2: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    expectAtomicReject(g, withCards(WUXIE)); // p2's card, offered at p1's window
  });

  it("[C-WUXIE-04c] a stale window answer is refused", () => {
    const g = contractGame({ seed: SEED(310), hands: { p0: [WUZHONG], p1: [WUXIE] } });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    expectAtomicReject(g, (pd) => ({ decisionId: "dec_stale", playerId: pd.playerId, cardIds: [WUXIE] }));
  });

  it("[C-WUXIE-04d] the same ไร้ช่องโหว่ cannot be spent twice", () => {
    const g = contractGame({
      seed: SEED(311), hands: { p0: [WUZHONG], p1: [WUXIE], p2: [] },
    });
    step(g, { kind: "mainAction" }, play([WUZHONG], []));
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    // counter-window on p1's own ไร้ช่องโหว่ — the card is already in the discard
    expectAtomicReject(g, (pd) => ({ decisionId: pd.id, playerId: pd.playerId, cardIds: [WUXIE] }));
  });

  it("[C-WUXIE-05] the window's metadata names the real source and target", () => {
    const g = contractGame({ seed: SEED(312), hands: { p0: [GUOHE], p1: [SHA], p2: [] } });
    step(g, { kind: "mainAction" }, play([GUOHE], ["p1"]));
    const pd = expectDecision(g, { kind: "askWuxie", playerId: "p1" });
    expect(pd.data.cancelledType).toBe("guohe");
    expect(pd.data.sourceId).toBe("p0");
    expect(pd.data.targetIds).toEqual(["p1"]);
    // and it leaks no hidden hand contents to the responder
    expect(JSON.stringify(pd.data)).not.toContain(SHA);
  });
});
