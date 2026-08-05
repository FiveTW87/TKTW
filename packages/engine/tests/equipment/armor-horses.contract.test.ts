// TKTW_TEST_CASE_CATALOG.md → "การ์ด 32 ชนิด / Armor" + "Horses"
// (E-BAGUA, E-RENWANG, E-HORSE-MINUS, E-HORSE-PLUS).
//
// Horses are pure distance rules with no code of their own (core/distance.ts
// reads the slots), so those cases assert on distanceNet directly as well as
// through a real สังหาร — the derived number and the rule it gates must agree.
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, choose,
  expectDecision, expectAtomicReject, expectHp, expectZone, expectEquipped,
  expectHandSize, expectLog, expectNoLog, C, findCard,
} from "../_contract";
import { equip, setHand, clearHands, topOfDeck } from "../_contract/rig";
import { distanceNet, distanceBase, attackRange } from "../../src/core/distance";
import { cardsOfType } from "../_contract/cards";

const SHA = C.sha.spade!;              // black
const SHA_RED = C.sha.heart!;          // red
const SHA_B = findCard({ typeKey: "sha", suit: "club" });
const SHAN = C.shan.heart!;
const TAO = C.tao.heart!;
const RED_JUDGE = findCard({ typeKey: "tao", suit: "heart" });
const BLACK_JUDGE = findCard({ typeKey: "sha", suit: "club", exclude: [SHA_B] });

const MINUS_HORSES = ["horse_chitu", "horse_dilu", "horse_zhaohuang"] as const;
const PLUS_HORSES = ["horse_jueying", "horse_dawan", "horse_zixing"] as const;

describe("E-BAGUA — ค่ายกลแปดทิศ", () => {
  it("[E-BAGUA-01a] a red judgment is a free auto-dodge", () => {
    const g = contractGame({
      seed: SEED(601), hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [RED_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal"));
    expectHp(g.state, "p1", 4);
    expectLog(g.state, { eventType: "judgment", cardType: "bagua" }, 1);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[E-BAGUA-01b] a black judgment still leaves the target owing a หลบ", () => {
    const g = contractGame({
      seed: SEED(602), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [BLACK_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal"));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHAN, "discardPile"); // the armour did not save the card
  });

  it("[E-BAGUA-02a] after a failed judgment the target can still answer from hand", () => {
    const g = contractGame({
      seed: SEED(603), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [BLACK_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1");
  });

  it("[E-BAGUA-02b] พลิกชะตา decides the armour judgment with its replacement card", () => {
    const g = contractGame({
      seed: SEED(604), assigns: [["p2", "simayi"]],
      hands: { p0: [SHA], p1: [], p2: [RED_JUDGE] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [BLACK_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal"));
    step(g, { kind: "guicaiReplace", playerId: "p2" }, withCards(RED_JUDGE));
    // the swapped-in red card is what the armour reads
    expectHp(g.state, "p1", 4);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[E-BAGUA-03a] กระบี่ชิงกัง skips the armour judgment entirely", () => {
    const g = contractGame({
      seed: SEED(605), hands: { p0: [SHA], p1: [] },
      after: (s) => {
        equip(s, "p0", C.sword_qinggang.any);
        equip(s, "p1", C.bagua.any);
        topOfDeck(s, [RED_JUDGE]);
      },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" });
    expectNoLog(g.state, { eventType: "judgment", cardType: "bagua" });
  });

  it("[E-BAGUA-03b] against หอกฟางเทียน the armour judges once per required หลบ", () => {
    const g = contractGame({
      seed: SEED(606), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p1", C.bagua.any); topOfDeck(s, [RED_JUDGE, BLACK_JUDGE]); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal")); // slot 1: red, auto
    step(g, { kind: "judgmentReveal", playerId: "p1" }, choose("reveal")); // slot 2: black, fails
    const pd = expectDecision(g, { kind: "respondShan", playerId: "p1" });
    expect(pd.data.needed).toBe(1); // one slot was covered by the armour
  });
});

describe("E-RENWANG — โล่ราชันย์", () => {
  it("[E-RENWANG-01a] a black สังหาร is negated outright, with no dodge asked", () => {
    const g = contractGame({
      seed: SEED(611), hands: { p0: [SHA], p1: [SHAN] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHAN, "hand", "p1"); // nothing spent
    expectLog(g.state, { eventType: "renwangNegate", actorId: "p1" }, 1);
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[E-RENWANG-01b] a red สังหาร resolves normally", () => {
    const g = contractGame({
      seed: SEED(612), hands: { p0: [SHA_RED], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([SHA_RED], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[E-RENWANG-02a] a converted สังหาร is judged by the physical card's colour", () => {
    // กวนอู converts only RED cards, so his converted สังหาร always gets through.
    const g = contractGame({
      seed: SEED(613), assigns: [["p0", "guanyu"]],
      hands: { p0: [TAO], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([TAO], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[E-RENWANG-02b] a black card converted to สังหาร is still negated", () => {
    // จูล่ง converts a หลบ into a สังหาร; a black หลบ therefore stays black.
    const blackShan = cardsOfType("shan").find((id) => id.startsWith("spade") || id.startsWith("club"));
    const g = contractGame({
      seed: SEED(614), assigns: [["p0", "zhaoyun"]],
      hands: { p0: [blackShan ?? SHAN], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([blackShan ?? SHAN], ["p1"], "sha"));
    if (blackShan) {
      expectHp(g.state, "p1", 4);
      expectLog(g.state, { eventType: "renwangNegate" }, 1);
    } else {
      // the deck has no black หลบ, so this direction can only be red
      step(g, { kind: "respondShan", playerId: "p1" }, pass);
      expectHp(g.state, "p1", 3);
    }
  });

  it("[E-RENWANG-03a] กระบี่ชิงกัง pierces it", () => {
    const g = contractGame({
      seed: SEED(615), hands: { p0: [SHA], p1: [] },
      after: (s) => { equip(s, "p0", C.sword_qinggang.any); equip(s, "p1", C.renwang.any); },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
  });

  it("[E-RENWANG-03b] it does not protect against damage that is not a สังหาร", () => {
    const g = contractGame({
      seed: SEED(616), hands: { p0: [C.juedou.any], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(g, { kind: "mainAction" }, play([C.juedou.any], ["p1"]));
    step(g, { kind: "askWuxie", playerId: "p1" }, pass);
    step(g, { kind: "askWuxie", playerId: "p2" }, pass);
    step(g, { kind: "respondSha", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3); // duel damage ignores armour
  });
});

describe("E-HORSE-MINUS — ม้าลดระยะ", () => {
  it.each(MINUS_HORSES)("[E-HORSE-MINUS-01] %s reduces the distance from its wearer by 1", (typeKey) => {
    const g = contractGame({
      seed: SEED(621), playerCount: 5,
      after: (s) => equip(s, "p0", C[typeKey]!.any),
    });
    expect(distanceBase(g.state, "p0", "p2")).toBe(2);
    expect(distanceNet(g.state, "p0", "p2")).toBe(1);
  });

  it("[E-HORSE-MINUS-01b] the shortened distance actually brings a target into สังหาร range", () => {
    const g = contractGame({
      seed: SEED(622), playerCount: 5, hands: { p0: [SHA], p2: [] },
      after: (s) => equip(s, "p0", C.horse_chitu.any),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p2", 3);
  });

  it("[E-HORSE-MINUS-02] equipping a second −1 horse replaces the first and discards it", () => {
    const g = contractGame({
      seed: SEED(623), playerCount: 5,
      hands: { p0: [C.horse_dilu.any] },
      after: (s) => equip(s, "p0", C.horse_chitu.any),
    });
    step(g, { kind: "mainAction" }, play([C.horse_dilu.any], []));
    expectEquipped(g.state, "p0", "horseMinus", C.horse_dilu.any);
    expectZone(g.state, C.horse_chitu.any, "discardPile");
    expect(distanceNet(g.state, "p0", "p2")).toBe(1); // still exactly −1, not −2
  });

  it("[E-HORSE-MINUS-03a] it stacks with ม้าเฉียว's อาชาเสเหลียง", () => {
    const g = contractGame({
      seed: SEED(624), playerCount: 7, assigns: [["p0", "machao"]],
      after: (s) => equip(s, "p0", C.horse_chitu.any),
    });
    expect(distanceBase(g.state, "p0", "p3")).toBe(3);
    expect(distanceNet(g.state, "p0", "p3")).toBe(1); // −1 horse, −1 skill
  });

  it("[E-HORSE-MINUS-03b] it never changes the distance computed back toward the wearer", () => {
    const g = contractGame({
      seed: SEED(625), playerCount: 5,
      after: (s) => equip(s, "p0", C.horse_chitu.any),
    });
    expect(distanceNet(g.state, "p0", "p2")).toBe(1);
    expect(distanceNet(g.state, "p2", "p0")).toBe(2); // unchanged in reverse
  });
});

describe("E-HORSE-PLUS — ม้าเพิ่มระยะ", () => {
  it.each(PLUS_HORSES)("[E-HORSE-PLUS-01] %s adds 1 to the distance others compute to its wearer", (typeKey) => {
    const g = contractGame({
      seed: SEED(631), playerCount: 5,
      after: (s) => equip(s, "p1", C[typeKey]!.any),
    });
    expect(distanceBase(g.state, "p0", "p1")).toBe(1);
    expect(distanceNet(g.state, "p0", "p1")).toBe(2);
  });

  it("[E-HORSE-PLUS-01b] the extra distance actually puts the wearer out of สังหาร range", () => {
    const g = contractGame({
      seed: SEED(632), hands: { p0: [SHA], p1: [] },
      after: (s) => equip(s, "p1", C.horse_jueying.any),
    });
    expectAtomicReject(g, play([SHA], ["p1"]), /out of range/);
  });

  it("[E-HORSE-PLUS-02] equipping a second +1 horse replaces the first and discards it", () => {
    const g = contractGame({
      seed: SEED(633), playerCount: 5, currentSeat: 1,
      hands: { p1: [C.horse_dawan.any] },
      after: (s) => equip(s, "p1", C.horse_jueying.any),
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([C.horse_dawan.any], []));
    expectEquipped(g.state, "p1", "horsePlus", C.horse_dawan.any);
    expectZone(g.state, C.horse_jueying.any, "discardPile");
    expect(distanceNet(g.state, "p0", "p1")).toBe(2); // exactly +1, not +2
  });

  it("[E-HORSE-PLUS-03a] the two horse slots cancel out in the right direction", () => {
    const g = contractGame({
      seed: SEED(634), playerCount: 5,
      after: (s) => { equip(s, "p0", C.horse_chitu.any); equip(s, "p2", C.horse_jueying.any); },
    });
    // base 2, −1 from p0's own horse, +1 from p2's = 2
    expect(distanceNet(g.state, "p0", "p2")).toBe(2);
    // the reverse only sees p0's +0 and p2's −0 → base 2
    expect(distanceNet(g.state, "p2", "p0")).toBe(2);
  });

  it("[E-HORSE-PLUS-03b] weapon reach is a separate axis from the distance the horses set", () => {
    const g = contractGame({
      seed: SEED(635), playerCount: 5,
      after: (s) => { equip(s, "p0", C.qinglong.any); equip(s, "p2", C.horse_jueying.any); },
    });
    expect(attackRange(g.state, "p0")).toBe(3);
    expect(distanceNet(g.state, "p0", "p2")).toBe(3);
  });

  it("[E-HORSE-PLUS-03c] a horse destroyed by ง้าวกิเลน is recalculated immediately", () => {
    const g = contractGame({
      seed: SEED(636), playerCount: 5, hands: { p0: [SHA_B], p2: [] },
      after: (s) => { equip(s, "p0", C.qilin.any); equip(s, "p2", C.horse_jueying.any); },
    });
    expect(distanceNet(g.state, "p0", "p2")).toBe(3);
    step(g, { kind: "mainAction" }, play([SHA_B], ["p2"]));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectEquipped(g.state, "p2", "horsePlus", undefined);
    expect(distanceNet(g.state, "p0", "p2")).toBe(2);
  });
});
