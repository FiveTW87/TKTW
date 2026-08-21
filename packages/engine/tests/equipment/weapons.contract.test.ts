// TKTW_TEST_CASE_CATALOG.md → "การ์ด 32 ชนิด / Weapons"
// (E-CROSSBOW, E-SWORD-YY, E-SWORD-ICE, E-SWORD-QINGGANG, E-QINGLONG,
//  E-ZHANGBA, E-GUANSHI, E-FANGTIAN, E-QILIN).
//
// Most weapon "riders" live inline in src/cards/sha.ts and hang off a สังหาร's
// own resolution, so nearly every case here is: equip -> play สังหาร -> answer
// the rider's decision.
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, withTargets, choose,
  expectDecision, expectAtomicReject, expectHp, expectAlive, expectZone, expectNoSkillPrompt,
  expectHandSize, expectEquipped, expectUsage, expectLog, expectNoLog,
  expectDiscarded, nextTurnOf, C, findCard, findCards,
} from "../_contract";
import { equip, setHp, setHand, clearHands, killOff, topOfDeck } from "../_contract/rig";
import { attackRange, distanceNet } from "../../src/core/distance";

const SHA = C.sha.spade!;
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHA_C = findCard({ typeKey: "sha", suit: "diamond" });
const SHA_D = findCard({ typeKey: "sha", suit: "heart" });
const SHAN = C.shan.heart!;
const SHAN_B = findCard({ typeKey: "shan", suit: "diamond" });
const TAO = C.tao.heart!;
const WUZHONG = C.wuzhong.any;
const JUEDOU = C.juedou.any;
// Two ordinary non-สังหาร cards — ทวนงูจั้งปา's substitute and ง้าวกวนอู's
// force both need a pair that is not itself a สังหาร.
const [PAIR_A, PAIR_B] = findCards(2, { typeKey: "shan", exclude: [SHAN, SHAN_B] });
const HEART_JUDGE = findCard({ typeKey: "tao", suit: "heart" });
const SPADE_JUDGE = findCard({ typeKey: "sha", suit: "spade", rank: 7 });

describe("E-CROSSBOW — หน้าไม้กลจูกัดเหลียง", () => {
  it("[E-CROSSBOW-01a] its wearer may play สังหาร without the once-per-turn cap", () => {
    const g = contractGame({
      seed: SEED(501), hands: { p0: [SHA, SHA_B, SHA_C], p1: [] },
      after: (s) => equip(s, "p0", C.crossbow.any),
    });
    for (const id of [SHA, SHA_B, SHA_C]) {
      step(g, { kind: "mainAction" }, play([id], ["p1"]));
      step(g, { kind: "respondShan", playerId: "p1" }, pass);
    }
    expectUsage(g.state, "p0", { sha: 3 });
    expectHp(g.state, "p1", 1);
  });

  it("[E-CROSSBOW-01b] losing the crossbow restores the cap immediately", () => {
    const g = contractGame({
      seed: SEED(502), hands: { p0: [SHA, SHA_B], p1: [] },
      after: (s) => equip(s, "p0", C.crossbow.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    // the weapon is taken away mid-turn
    delete g.p("p0").equipment.weapon;
    expectAtomicReject(g, play([SHA_B], ["p1"]), /usage limit/);
  });

  it("[E-CROSSBOW-02] เตียวหุย's คำรามสะพานเตียงปัน and the crossbow do not double-count", () => {
    const g = contractGame({
      seed: SEED(503), assigns: [["p0", "zhangfei"]],
      hands: { p0: [SHA, SHA_B], p1: [] },
      after: (s) => equip(s, "p0", C.crossbow.any),
    });
    // Both grant "unlimited"; together they must still just be unlimited, and
    // replacing the weapon must not strand a stale bonus.
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "mainAction" }, play([SHA_B], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 2 });
    expectEquipped(g.state, "p0", "weapon", C.crossbow.any);
  });
});

describe("E-SWORD-YY — กระบี่หยินหยาง", () => {
  it("[E-SWORD-YY-01a] fires only when attacker and target differ in gender", () => {
    const g = contractGame({
      seed: SEED(511), assigns: [["p1", "zhenji"]], // female
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "swordYyChoice", playerId: "p1" });
  });

  it("[E-SWORD-YY-01b] does not fire between two players of the same gender", () => {
    const g = contractGame({
      seed: SEED(512), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" }); // straight to the dodge
  });

  it("[E-SWORD-YY-01c] does not fire for a player who is not the holder", () => {
    const g = contractGame({
      seed: SEED(513), assigns: [["p1", "zhenji"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p2", C.sword_yy.any), // a bystander holds it
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" });
  });

  it("[E-SWORD-YY-02a] the target may pay a card to avoid giving the holder a draw", () => {
    const g = contractGame({
      seed: SEED(514), assigns: [["p1", "zhenji"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "swordYyChoice", playerId: "p1" }, choose("discard", { cardIds: [SHAN] }));
    expectZone(g.state, SHAN, "discardPile");
    expectHandSize(g.state, "p0", 0); // the holder drew nothing
    expectLog(g.state, { eventType: "swordYyDiscard", actorId: "p1" }, 1);
  });

  it("[E-SWORD-YY-02b] declining lets the holder draw 1 instead", () => {
    const g = contractGame({
      seed: SEED(515), assigns: [["p1", "zhenji"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "swordYyChoice", playerId: "p1" }, choose("draw"));
    expectHandSize(g.state, "p0", 1);
    expectZone(g.state, SHAN, "hand", "p1");
    expectLog(g.state, { eventType: "swordYyDraw", actorId: "p0" }, 1);
  });

  it("[E-SWORD-YY-02c] a target with nothing to pay falls back to the holder's draw", () => {
    const g = contractGame({
      seed: SEED(516), assigns: [["p1", "zhenji"]],
      hands: { p0: [SHA], p1: [] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "swordYyChoice", playerId: "p1" }, choose("discard")); // no cards named
    expectHandSize(g.state, "p0", 1);
  });

  it("[E-SWORD-YY-02d] naming a card the target does not hold is refused", () => {
    const g = contractGame({
      seed: SEED(517), assigns: [["p1", "zhenji"]],
      hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_yy.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectAtomicReject(g, choose("discard", { cardIds: [SHAN_B] }));
  });
});

describe("E-SWORD-ICE — กระบี่น้ำแข็ง", () => {
  it("[E-SWORD-ICE-01] the holder may trade the damage for two of the target's cards", () => {
    const g = contractGame({
      seed: SEED(521), hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "swordIceChoice", playerId: "p0" }, choose("discard2"));
    step(g, { kind: "discardChosenBy", playerId: "p1" }, withCards(SHAN, SHAN_B));
    expectHp(g.state, "p1", 4); // damage traded away
    expectDiscarded(g.state, SHAN, SHAN_B);
    expectLog(g.state, { eventType: "swordIceDiscard", actorId: "p1" }, 1);
  });

  it("[E-SWORD-ICE-02a] a target with fewer than 2 cards is never offered the trade", () => {
    const g = contractGame({
      seed: SEED(522), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3); // straight to damage, no swordIceChoice
  });

  it("[E-SWORD-ICE-02b] declining the trade deals the damage normally", () => {
    const g = contractGame({
      seed: SEED(523), hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "swordIceChoice", playerId: "p0" }, choose("damage"));
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[E-SWORD-ICE-02c] a duplicated card id in the forced discard is refused", () => {
    const g = contractGame({
      seed: SEED(524), hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "swordIceChoice", playerId: "p0" }, choose("discard2"));
    expectAtomicReject(g, withCards(SHAN, SHAN), /duplicate/);
  });

  it("[E-SWORD-ICE-02d] discarding the wrong number of cards is refused", () => {
    const g = contractGame({
      seed: SEED(525), hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "swordIceChoice", playerId: "p0" }, choose("discard2"));
    expectAtomicReject(g, withCards(SHAN), /must discard 2/);
  });

  it("[E-SWORD-ICE-03] cancelling the damage must not fire the on-damaged triggers", () => {
    const g = contractGame({
      seed: SEED(526), assigns: [["p1", "caocao"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.sword_ice.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // โจโฉ carries คุ้มกันราชา as well, which asks at every dodge — decline it.
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, pass);
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "swordIceChoice", playerId: "p0" }, choose("discard2"));
    step(g, { kind: "discardChosenBy", playerId: "p1" }, withCards(SHAN, SHAN_B));
    // โจโฉ's พลิกภัยเป็นกล reacts to damage — no damage, no prompt, no steal.
    expectNoSkillPrompt(g, "caocao_jianxiong", { kind: "mainAction" });
    expectNoLog(g.state, { eventType: "skillUse", skillId: "caocao_jianxiong" });
    expectZone(g.state, SHA, "discardPile");
  });
});

describe("E-SWORD-QINGGANG — กระบี่ชิงกัง", () => {
  it("[E-SWORD-QINGGANG-01] its holder's สังหาร pierces ค่ายกลแปดทิศ", () => {
    const g = contractGame({
      seed: SEED(531), hands: { p0: [SHA], p1: [] },
      after: (s) => {
        equip(s, "p0", C.sword_qinggang.any);
        equip(s, "p1", C.bagua.any);
        topOfDeck(s, [HEART_JUDGE]); // a red judgment would normally auto-dodge
      },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // armour is ignored: no judgment happens, the target must answer directly
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectNoLog(g.state, { eventType: "judgment", cardType: "bagua" });
  });

  it("[E-SWORD-QINGGANG-02a] it also pierces โล่ราชันย์ against a black สังหาร", () => {
    const g = contractGame({
      seed: SEED(532), hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p0", C.sword_qinggang.any); equip(s, "p1", C.renwang.any); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectNoLog(g.state, { eventType: "renwangNegate" });
  });

  it("[E-SWORD-QINGGANG-02b] it does not pierce a skill-based targeting immunity", () => {
    const g = contractGame({
      seed: SEED(533), assigns: [["p1", "zhugeliang"]],
      hands: { p0: [SHA], p1: [] },
      after: (s) => equip(s, "p0", C.sword_qinggang.any),
    });
    // ขงเบ้ง with an empty hand cannot be targeted at all — armour-piercing is
    // irrelevant to that restriction.
    expectAtomicReject(g, play([SHA], ["p1"]), /cannot be targeted/);
  });

  it("[E-SWORD-QINGGANG-02c] the armour-piercing does not leak to other attackers", () => {
    const g = contractGame({
      seed: SEED(534), currentSeat: 1,
      hands: { p1: [SHA], p2: [] },
      after: (s) => {
        equip(s, "p0", C.sword_qinggang.any); // a bystander holds it
        equip(s, "p2", C.renwang.any);
      },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([SHA], ["p2"]));
    expectHp(g.state, "p2", 4);
    expectLog(g.state, { eventType: "renwangNegate", actorId: "p2" }, 1);
  });
});

describe("E-QINGLONG — ง้าวมังกรเขียว", () => {
  it("[E-QINGLONG-01] a dodged สังหาร lets the holder immediately play another", () => {
    const g = contractGame({
      seed: SEED(541), hands: { p0: [SHA, SHA_B], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.qinglong.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "qinglongReplay", playerId: "p0" }, choose("replay"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectDiscarded(g.state, SHA, SHA_B, SHAN);
    expectLog(g.state, { eventType: "qinglongReplay", actorId: "p0" }, 1);
  });

  it("[E-QINGLONG-02a] declining the replay ends the attack", () => {
    const g = contractGame({
      seed: SEED(542), hands: { p0: [SHA, SHA_B], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.qinglong.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "qinglongReplay", playerId: "p0" }, pass);
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHA_B, "hand", "p0"); // the second สังหาร is not spent
  });

  it("[E-QINGLONG-02b] with no second สังหาร in hand the replay is never offered", () => {
    const g = contractGame({
      seed: SEED(543), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.qinglong.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[E-QINGLONG-02c] a converted สังหาร is a valid replay and the replay does not chain forever", () => {
    const g = contractGame({
      seed: SEED(544), assigns: [["p0", "guanyu"]],
      hands: { p0: [SHA, TAO], p1: [SHAN, SHAN_B] },
      after: (s) => equip(s, "p0", C.qinglong.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "qinglongReplay", playerId: "p0" }, choose("replay")); // spends the red ท้อ
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN_B));
    // the replayed สังหาร may not itself trigger another replay
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
    expectZone(g.state, TAO, "discardPile");
  });
});

describe("E-ZHANGBA — ทวนงูจั้งปา", () => {
  it("[E-ZHANGBA-01a] two hand cards substitute for a สังหาร as a main action", () => {
    const g = contractGame({
      seed: SEED(551), hands: { p0: [PAIR_A!, PAIR_B!], p1: [] },
      after: (s) => equip(s, "p0", C.zhangba.any),
    });
    step(g, { kind: "mainAction" }, play([PAIR_A!, PAIR_B!], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectDiscarded(g.state, PAIR_A!, PAIR_B!);
    expectLog(g.state, { eventType: "zhangbaSha", actorId: "p0" }, 1);
  });

  it("[E-ZHANGBA-01b] two hand cards also answer a ดวล's demand for a สังหาร", () => {
    const g = contractGame({
      seed: SEED(552), hands: { p0: [JUEDOU], p1: [PAIR_A!, PAIR_B!] },
      after: (s) => equip(s, "p1", C.zhangba.any),
    });
    step(g, { kind: "mainAction" }, play([JUEDOU], ["p1"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, pass);
    step(g, { kind: "askWuxie", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p1" }, withCards(PAIR_A!, PAIR_B!));
    step(g, { kind: "respondSha", playerId: "p0" }, pass);
    expectHp(g.state, "p0", 3);
    expectHp(g.state, "p1", 4);
  });

  it("[E-ZHANGBA-02a] a duplicated card id in the substitute is refused", () => {
    const g = contractGame({
      seed: SEED(553), hands: { p0: [PAIR_A!, PAIR_B!], p1: [] },
      after: (s) => equip(s, "p0", C.zhangba.any),
    });
    expectAtomicReject(g, play([PAIR_A!, PAIR_A!], ["p1"]), /duplicate/);
  });

  it("[E-ZHANGBA-02b] a card outside the hand cannot be part of the substitute", () => {
    const g = contractGame({
      seed: SEED(554), hands: { p0: [PAIR_A!], p1: [PAIR_B!] },
      after: (s) => equip(s, "p0", C.zhangba.any),
    });
    expectAtomicReject(g, play([PAIR_A!, PAIR_B!], ["p1"]));
  });

  it("[E-ZHANGBA-02c] without the weapon two cards are never a legal play", () => {
    const g = contractGame({ seed: SEED(555), hands: { p0: [PAIR_A!, PAIR_B!], p1: [] } });
    expectAtomicReject(g, play([PAIR_A!, PAIR_B!], ["p1"]), /exactly 1 card/);
  });

  it("[E-ZHANGBA-03] the substitute still counts against the once-per-turn สังหาร limit", () => {
    const g = contractGame({
      seed: SEED(556), hands: { p0: [PAIR_A!, PAIR_B!, SHA], p1: [] },
      after: (s) => equip(s, "p0", C.zhangba.any),
    });
    step(g, { kind: "mainAction" }, play([PAIR_A!, PAIR_B!], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 1 });
    expectAtomicReject(g, play([SHA], ["p1"]), /usage limit/);
  });
});

describe("E-GUANSHI — ง้าวกวนอู", () => {
  it("[E-GUANSHI-01] discarding two cards forces a dodged สังหาร through", () => {
    const g = contractGame({
      seed: SEED(561), hands: { p0: [SHA, PAIR_A!, PAIR_B!], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.guanshi.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "guanshiForce", playerId: "p0" }, choose("force", { cardIds: [PAIR_A!, PAIR_B!] }));
    expectHp(g.state, "p1", 3);
    expectDiscarded(g.state, PAIR_A!, PAIR_B!);
    expectLog(g.state, { eventType: "guanshiForce", actorId: "p0" }, 1);
  });

  it("[E-GUANSHI-02a] declining leaves the dodge standing", () => {
    const g = contractGame({
      seed: SEED(562), hands: { p0: [SHA, PAIR_A!, PAIR_B!], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.guanshi.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "guanshiForce", playerId: "p0" }, pass);
    expectHp(g.state, "p1", 4);
    expectZone(g.state, PAIR_A!, "hand", "p0");
  });

  it("[E-GUANSHI-02b] fewer than two spare cards cannot force it", () => {
    const g = contractGame({
      seed: SEED(563), hands: { p0: [SHA, PAIR_A!], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.guanshi.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "guanshiForce", playerId: "p0" }, choose("force", { cardIds: [PAIR_A!] }));
    expectHp(g.state, "p1", 4); // a 1-card answer is not a valid force
    expectZone(g.state, PAIR_A!, "hand", "p0");
  });

  it("[E-GUANSHI-02c] naming a card the holder does not have is refused", () => {
    const g = contractGame({
      seed: SEED(564), hands: { p0: [SHA, PAIR_A!], p1: [SHAN, PAIR_B!] },
      after: (s) => equip(s, "p0", C.guanshi.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectAtomicReject(g, choose("force", { cardIds: [PAIR_A!, PAIR_B!] }));
  });

  it("[E-GUANSHI-03] a forced hit deals its damage exactly once", () => {
    const g = contractGame({
      seed: SEED(565), hands: { p0: [SHA, PAIR_A!, PAIR_B!], p1: [SHAN] },
      after: (s) => equip(s, "p0", C.guanshi.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    step(g, { kind: "guanshiForce", playerId: "p0" }, choose("force", { cardIds: [PAIR_A!, PAIR_B!] }));
    expectLog(g.state, { eventType: "damage", actorId: "p1", amount: 1 }, 1);
    expectHp(g.state, "p1", 3);
  });
});

describe("E-FANGTIAN — ทวนฟางเทียน", () => {
  it("[E-FANGTIAN-01] a สังหาร played as the last card in hand may hit up to 3 targets", () => {
    const g = contractGame({
      seed: SEED(571), playerCount: 4,
      hands: { p0: [SHA], p1: [], p2: [], p3: [] },
      after: (s) => equip(s, "p0", C.fangtian.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1", "p2", "p3"]));
    for (const pid of ["p1", "p2", "p3"]) step(g, { kind: "respondShan", playerId: pid }, pass);
    expectHp(g.state, "p1", 3);
    expectHp(g.state, "p2", 3);
    expectHp(g.state, "p3", 3);
    expectUsage(g.state, "p0", { sha: 1 });
  });

  it("[E-FANGTIAN-02a] with another card still in hand only one target is allowed", () => {
    const g = contractGame({
      seed: SEED(572), playerCount: 4,
      hands: { p0: [SHA, TAO], p1: [], p2: [] },
      after: (s) => equip(s, "p0", C.fangtian.any),
    });
    expectAtomicReject(g, play([SHA], ["p1", "p2"]), /1-1 target/);
  });

  it("[E-FANGTIAN-02b] the extra targets are unavailable without the weapon", () => {
    const g = contractGame({
      seed: SEED(573), playerCount: 4, hands: { p0: [SHA], p1: [], p2: [] },
    });
    expectAtomicReject(g, play([SHA], ["p1", "p2"]));
  });

  it("[E-FANGTIAN-03a] every named target must still be legal", () => {
    const g = contractGame({
      seed: SEED(574), playerCount: 4,
      hands: { p0: [SHA], p1: [], p2: [], p3: [] },
      after: (s) => { equip(s, "p0", C.fangtian.any); killOff(s, "p2"); },
    });
    expectAtomicReject(g, play([SHA], ["p1", "p2", "p3"]));
  });

  it("[E-FANGTIAN-03b] the same target cannot be named twice", () => {
    const g = contractGame({
      seed: SEED(575), playerCount: 4,
      hands: { p0: [SHA], p1: [], p2: [] },
      after: (s) => equip(s, "p0", C.fangtian.any),
    });
    expectAtomicReject(g, play([SHA], ["p1", "p1", "p2"]));
  });

  it("[E-FANGTIAN-03c] the targets resolve one at a time in the order given", () => {
    const g = contractGame({
      seed: SEED(576), playerCount: 4,
      hands: { p0: [SHA], p1: [], p2: [], p3: [] },
      after: (s) => equip(s, "p0", C.fangtian.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p3", "p1", "p2"]));
    const asked: string[] = [];
    for (let i = 0; i < 3; i++) {
      asked.push(g.pd().playerId);
      step(g, { kind: "respondShan" }, pass);
    }
    expect(asked).toEqual(["p3", "p1", "p2"]);
  });
});

describe("E-QILIN — ง้าวกิเลน", () => {
  it("[E-QILIN-01] a สังหาร that connects destroys one of the target's horses", () => {
    const g = contractGame({
      seed: SEED(581), playerCount: 5, hands: { p0: [SHA], p2: [] },
      after: (s) => { equip(s, "p0", C.qilin.any); equip(s, "p2", C.horse_chitu.any); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectEquipped(g.state, "p2", "horseMinus", undefined);
    expectZone(g.state, C.horse_chitu.any, "discardPile");
    expectLog(g.state, { eventType: "qilinDestroyHorse", actorId: "p2", cardId: C.horse_chitu.any, cardType: "horse_chitu" }, 1);
  });

  it("[E-QILIN-02a] a target with no horse is unaffected and never prompts", () => {
    const g = contractGame({
      seed: SEED(582), hands: { p0: [SHA], p1: [] },
      after: (s) => equip(s, "p0", C.qilin.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[E-QILIN-02b] with both horses the attacker picks which slot to destroy", () => {
    const g = contractGame({
      seed: SEED(583), playerCount: 5, hands: { p0: [SHA], p2: [] },
      after: (s) => {
        equip(s, "p0", C.qilin.any);
        equip(s, "p2", C.horse_chitu.any);
        equip(s, "p2", C.horse_jueying.any);
      },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    step(g, { kind: "qilinDestroyHorse", playerId: "p0" }, choose("horsePlus"));
    expectEquipped(g.state, "p2", "horsePlus", undefined);
    expectEquipped(g.state, "p2", "horseMinus", C.horse_chitu.any);
  });

  it("[E-QILIN-02c] a dodged สังหาร destroys nothing", () => {
    const g = contractGame({
      seed: SEED(584), playerCount: 5, hands: { p0: [SHA], p2: [SHAN] },
      after: (s) => { equip(s, "p0", C.qilin.any); equip(s, "p2", C.horse_chitu.any); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, withCards(SHAN));
    expectEquipped(g.state, "p2", "horseMinus", C.horse_chitu.any);
  });

  it("[E-QILIN-03a] distance is recomputed once the horse is gone", () => {
    const g = contractGame({
      seed: SEED(585), playerCount: 5, hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p0", C.qilin.any); equip(s, "p1", C.horse_jueying.any); },
    });
    expect(distanceNet(g.state, "p0", "p1")).toBe(2); // +1 horse pushes them away
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectEquipped(g.state, "p1", "horsePlus", undefined);
    expect(distanceNet(g.state, "p0", "p1")).toBe(1);
  });

  it("[E-QILIN-03b] destroying a horse fires the equipment-loss trigger", () => {
    const g = contractGame({
      seed: SEED(586), playerCount: 5,
      assigns: [["p2", "sunshangxiang"]],
      hands: { p0: [SHA], p2: [] },
      after: (s) => { equip(s, "p0", C.qilin.any); equip(s, "p2", C.horse_chitu.any); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    // ศาสตราไม่ขาดมือ must see the horse leave and draw 2.
    step(g, { kind: "activateSkill", skillId: "sunshangxiang_jiehun" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    expectHandSize(g.state, "p2", 2);
  });
});
