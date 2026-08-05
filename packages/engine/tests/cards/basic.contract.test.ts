// TKTW_TEST_CASE_CATALOG.md → "การ์ด 32 ชนิด / Basic" (C-SHA, C-SHAN, C-TAO).
//
// These three cards carry most of the engine's reactive machinery, so this file
// also establishes the sha -> respondShan -> damage and dying-window scripts
// that the trick / equipment / general files reuse.
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, withTargets, choose, useSkill,
  runTo, expectDecision, expectAtomicReject, expectHp, expectAlive, expectZone,
  expectHandSize, expectUsage, expectLog, expectNoLog, expectDiscarded,
  nextTurnOf, asLord, C, findCard, findCards,
} from "../_contract";
import { equip, setHp, setHand, killOff, topOfDeck } from "../_contract/rig";

const SHA = C.sha.spade!;          // a black สังหาร
const SHA_RED = C.sha.heart!;      // a red สังหาร (renwang does not stop it)
const SHA2 = findCard({ typeKey: "sha", suit: "club" });
const SHAN = C.shan.heart!;
const SHAN2 = findCard({ typeKey: "shan", suit: "diamond" });
const TAO = C.tao.heart!;
const TAO2 = findCard({ typeKey: "tao", suit: "diamond", exclude: [TAO] });

describe("C-SHA — สังหาร", () => {
  it("[C-SHA-01a] hits a living opponent inside attack range", () => {
    const g = contractGame({ seed: SEED(101), hands: { p0: [SHA], p1: [] } });
    step(g, { kind: "mainAction", playerId: "p0" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHA, "discardPile");
    expectLog(g.state, { eventType: "damage", actorId: "p1", amount: 1 }, 1);
  });

  it("[C-SHA-01b] cannot target its own player", () => {
    const g = contractGame({ seed: SEED(102), hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA], ["p0"]));
  });

  it("[C-SHA-01c] cannot target a dead player", () => {
    const g = contractGame({
      seed: SEED(103), playerCount: 4,
      hands: { p0: [SHA] },
      after: (s) => killOff(s, "p1"),
    });
    expectAtomicReject(g, play([SHA], ["p1"]));
  });

  it("[C-SHA-01d] cannot reach a target beyond attack range", () => {
    // 5 seats: p0 -> p2 is distance 2, base attack range is 1.
    const g = contractGame({ seed: SEED(104), playerCount: 5, hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA], ["p2"]), /out of range/);
  });

  it("[C-SHA-02a] a second สังหาร in the same turn is refused", () => {
    const g = contractGame({ seed: SEED(105), hands: { p0: [SHA, SHA2], p1: [] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 1 });
    expectAtomicReject(g, play([SHA2], ["p1"]), /usage limit/);
  });

  it("[C-SHA-02b] the usage counter resets on the owner's next turn", () => {
    const g = contractGame({ seed: SEED(106), hands: { p0: [SHA], p1: [] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectUsage(g.state, "p0", { sha: 1 });
    nextTurnOf(g, "p0");
    expectUsage(g.state, "p0", { sha: 0 });
  });

  it("[C-SHA-02c] a rejected สังหาร does not burn the once-per-turn usage", () => {
    const g = contractGame({ seed: SEED(107), playerCount: 5, hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA], ["p2"]));
    expectUsage(g.state, "p0", { sha: 0 });
  });

  it("[C-SHA-03a] a หลบ from the target prevents the damage and is spent", () => {
    const g = contractGame({ seed: SEED(108), hands: { p0: [SHA], p1: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHAN, "discardPile");
    expectLog(g.state, { eventType: "dodge", actorId: "p1" }, 1);
    expectNoLog(g.state, { eventType: "damage", actorId: "p1" });
  });

  it("[C-SHA-03b] passing the dodge costs 1 HP", () => {
    const g = contractGame({ seed: SEED(109), hands: { p0: [SHA], p1: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1"); // passing spends nothing
  });

  it("[C-SHA-03c] a target with no หลบ takes the hit", () => {
    const g = contractGame({ seed: SEED(110), hands: { p0: [SHA], p1: [] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectHandSize(g.state, "p1", 0);
  });

  it("[C-SHA-04a] a card id that is not in hand is refused", () => {
    const g = contractGame({ seed: SEED(111), hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA2], ["p1"]), /not in hand/);
  });

  it("[C-SHA-04b] an unknown card id is refused", () => {
    const g = contractGame({ seed: SEED(112), hands: { p0: [SHA] } });
    expectAtomicReject(g, play(["not_a_real_card"], ["p1"]));
  });

  it("[C-SHA-04c] สังหาร with no target at all is refused", () => {
    const g = contractGame({ seed: SEED(113), hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA], []), /target/);
  });

  it("[C-SHA-04d] two targets without ฟางเทียน is refused", () => {
    const g = contractGame({ seed: SEED(114), playerCount: 4, hands: { p0: [SHA] } });
    expectAtomicReject(g, play([SHA], ["p1", "p3"]), /target/);
  });

  it("[C-SHA-04e] a stale decision id is refused", () => {
    const g = contractGame({ seed: SEED(115), hands: { p0: [SHA] } });
    expectAtomicReject(
      g,
      (pd) => ({ decisionId: `${pd.id}_stale`, playerId: pd.playerId, choice: "playCard", cardIds: [SHA], targetIds: ["p1"] }),
      /stale decision id/,
    );
  });

  it("[C-SHA-04f] answering someone else's dodge decision is refused", () => {
    const g = contractGame({ seed: SEED(116), hands: { p0: [SHA], p1: [], p2: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectDecision(g, { kind: "respondShan", playerId: "p1" });
    // p2 is not the target; their หลบ must not be able to answer p1's decision.
    expectAtomicReject(g, (pd) => ({ decisionId: pd.id, playerId: "p2", cardIds: [SHAN] }));
  });

  it("[C-SHA-05a] โล่ราชันย์ negates a black สังหาร but not a red one", () => {
    const black = contractGame({
      seed: SEED(117), hands: { p0: [SHA], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(black, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectHp(black.state, "p1", 4); // immunity, no dodge decision at all
    expectLog(black.state, { eventType: "renwangNegate", actorId: "p1" }, 1);

    const red = contractGame({
      seed: SEED(118), hands: { p0: [SHA_RED], p1: [] },
      after: (s) => equip(s, "p1", C.renwang.any),
    });
    step(red, { kind: "mainAction" }, play([SHA_RED], ["p1"]));
    step(red, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(red.state, "p1", 3);
  });

  it("[C-SHA-05b] ค่ายกลแปดทิศ auto-dodges on a red judgment", () => {
    const g = contractGame({
      seed: SEED(119), hands: { p0: [SHA], p1: [] },
      after: (s) => {
        equip(s, "p1", C.bagua.any);
        topOfDeck(s, [findCard({ typeKey: "shan", suit: "heart", exclude: [SHAN] })]); // red
      },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // bagua is a locked skill: it judges without asking, and a red result means
    // the target is never asked for a หลบ at all.
    expectHp(g.state, "p1", 4);
  });

  it("[C-SHA-05c] a conversion skill lets a red card serve as สังหาร", () => {
    const g = contractGame({
      seed: SEED(120), assigns: [["p0", "guanyu"]],
      hands: { p0: [TAO], p1: [] },
    });
    step(g, { kind: "mainAction" }, play([TAO], ["p1"], "sha"));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    expectHp(g.state, "p1", 3);
    expectUsage(g.state, "p0", { sha: 1 });
    expectZone(g.state, TAO, "discardPile");
  });

  it("[C-SHA-05d] ไต้เกี้ยว's แพรพลิ้วเบี่ยงคม redirects the สังหาร to another player", () => {
    const g = contractGame({
      seed: SEED(121), playerCount: 3,
      assigns: [["p1", "daiqiao"]],
      hands: { p0: [SHA], p1: [SHAN], p2: [] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // huibi is locked -> it prompts for the redirect directly, no activateSkill.
    step(g, { kind: "huibiRedirect", playerId: "p1" }, (pd) => ({
      decisionId: pd.id, playerId: "p1", cardIds: [SHAN], targetIds: ["p2"],
    }));
    step(g, { kind: "respondShan", playerId: "p2" }, pass);
    expectHp(g.state, "p1", 3); // untouched (daiqiao maxHp 3)
    expectHp(g.state, "p2", 3);
  });

  it("[C-SHA-05e] ลิโป้'s หอกฟางเทียน demands two หลบ in one all-or-nothing answer", () => {
    const g = contractGame({
      seed: SEED(122), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN2] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    const pd = expectDecision(g, { kind: "respondShan", playerId: "p1" });
    expect(pd.data.needed).toBe(2);
    step(g, { kind: "respondShan" }, withCards(SHAN, SHAN2));
    expectHp(g.state, "p1", 4);
    expectDiscarded(g.state, SHAN, SHAN2);
  });

  it("[C-SHA-05f] a lethal สังหาร runs the dying window and kills on no rescue", () => {
    const g = contractGame({
      seed: SEED(123), hands: { p0: [SHA], p1: [], p2: [] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    // dying window: the dying player is polled first, then seat order.
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p2" }, pass);
    step(g, { kind: "respondTao", playerId: "p0" }, pass);
    expectAlive(g.state, "p1", false);
    expectLog(g.state, { eventType: "death", actorId: "p1" }, 1);
  });
});

describe("C-SHAN — หลบ", () => {
  it("[C-SHAN-01] cannot be played as a main action", () => {
    const g = contractGame({ seed: SEED(131), hands: { p0: [SHAN] } });
    expectAtomicReject(g, play([SHAN], ["p1"]), /ตอบโต้เท่านั้น/);
  });

  it("[C-SHAN-02] is accepted at a dodge decision and the physical card goes to discard", () => {
    const g = contractGame({ seed: SEED(132), hands: { p0: [SHA], p1: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN));
    expectZone(g.state, SHAN, "discardPile");
    expectHandSize(g.state, "p1", 0);
  });

  it("[C-SHAN-03a] a non-หลบ card offered as a dodge is refused", () => {
    const g = contractGame({ seed: SEED(133), hands: { p0: [SHA], p1: [TAO] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectAtomicReject(g, withCards(TAO), /does not count as shan/);
  });

  it("[C-SHAN-03b] a หลบ the target does not hold is refused", () => {
    const g = contractGame({ seed: SEED(134), hands: { p0: [SHA], p1: [], p2: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectAtomicReject(g, withCards(SHAN));
  });

  it("[C-SHAN-03c] a stale dodge answer is refused", () => {
    const g = contractGame({ seed: SEED(135), hands: { p0: [SHA], p1: [SHAN] } });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectAtomicReject(g, (pd) => ({ decisionId: "dec_stale", playerId: pd.playerId, cardIds: [SHAN] }));
  });

  it("[C-SHAN-04a] a conversion skill supplies the หลบ (จูล่ง plays a สังหาร as one)", () => {
    const g = contractGame({
      seed: SEED(136), assigns: [["p1", "zhaoyun"]],
      hands: { p0: [SHA], p1: [SHA2] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHA2));
    expectHp(g.state, "p1", 4);
    expectZone(g.state, SHA2, "discardPile");
  });

  it("[C-SHAN-04b] คุ้มกันราชา lets a วุย ally supply the หลบ for the lord", () => {
    const g = contractGame({
      seed: SEED(137), playerCount: 3,
      assigns: [["p1", "caocao", true], ["p2", "simayi"]],
      currentSeat: 0,
      hands: { p0: [SHA], p1: [], p2: [SHAN] },
      after: (s) => { s.players.find((p) => p.id === "p1")!.role = "lord"; },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    // hujia is optional -> caocao is asked whether to invoke it first.
    step(g, { kind: "activateSkill", skillId: "caocao_hujia" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    step(g, { kind: "hujiaVolunteer", playerId: "p2" }, withCards(SHAN));
    expectHp(g.state, "p1", 5); // caocao lord maxHp 5, untouched
    expectZone(g.state, SHAN, "discardPile");
  });

  it("[C-SHAN-04c] a partial multi-dodge spends nothing and the hit lands", () => {
    const g = contractGame({
      seed: SEED(138), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, withCards(SHAN)); // only 1 of 2
    expectHp(g.state, "p1", 3);
    expectZone(g.state, SHAN, "hand", "p1"); // a doomed partial dodge costs nothing
  });

  it("[C-SHAN-04d] a duplicated card id in a multi-dodge is refused", () => {
    const g = contractGame({
      seed: SEED(139), assigns: [["p0", "lubu"]],
      hands: { p0: [SHA], p1: [SHAN, SHAN2] },
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    expectAtomicReject(g, withCards(SHAN, SHAN), /duplicate/);
  });
});

describe("C-TAO — ท้อคืนชีพ", () => {
  it("[C-TAO-01] heals its own player by 1 on their turn", () => {
    const g = contractGame({
      seed: SEED(141), hands: { p0: [TAO] },
      after: (s) => setHp(s, "p0", 2),
    });
    step(g, { kind: "mainAction" }, play([TAO], []));
    expectHp(g.state, "p0", 3);
    expectZone(g.state, TAO, "discardPile");
    expectLog(g.state, { eventType: "heal", actorId: "p0", amount: 1 }, 1);
  });

  it("[C-TAO-02] rescues a dying player, polled in seat order from the dying player", () => {
    const g = contractGame({
      seed: SEED(142), playerCount: 3,
      hands: { p0: [SHA], p1: [], p2: [TAO] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);  // dying player first
    step(g, { kind: "respondTao", playerId: "p2" }, withCards(TAO)); // then seat order
    expectAlive(g.state, "p1", true);
    expectHp(g.state, "p1", 1);
    expectZone(g.state, TAO, "discardPile");
  });

  it("[C-TAO-03a] cannot be played on a full-HP player", () => {
    const g = contractGame({ seed: SEED(143), hands: { p0: [TAO] } });
    expectAtomicReject(g, play([TAO], []), /full-hp/);
  });

  it("[C-TAO-03b] cannot be played on a dead player outside a dying window", () => {
    const g = contractGame({
      seed: SEED(144), playerCount: 4, hands: { p0: [TAO] },
      after: (s) => { setHp(s, "p1", 2); killOff(s, "p1"); },
    });
    expectAtomicReject(g, play([TAO], ["p1"]), /alive/);
  });

  it("[C-TAO-03c] cannot name more than one target", () => {
    const g = contractGame({
      seed: SEED(145), hands: { p0: [TAO] },
      after: (s) => { setHp(s, "p1", 2); setHp(s, "p2", 2); },
    });
    expectAtomicReject(g, play([TAO], ["p1", "p2"]), /at most 1 target/);
  });

  it("[C-TAO-03d] a non-ท้อ card is refused in a dying window", () => {
    const g = contractGame({
      seed: SEED(146), hands: { p0: [SHA], p1: [], p2: [SHAN] },
      after: (s) => setHp(s, "p1", 1),
    });
    step(g, { kind: "mainAction" }, play([SHA], ["p1"]));
    step(g, { kind: "respondShan", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    expectAtomicReject(g, withCards(SHAN), /does not count as tao/);
  });

  it("[C-TAO-04a] healing never exceeds max HP", () => {
    const g = contractGame({
      seed: SEED(147), hands: { p0: [TAO, TAO2] },
      after: (s) => setHp(s, "p0", 3),
    });
    step(g, { kind: "mainAction" }, play([TAO], []));
    expectHp(g.state, "p0", 4);
    // a second ท้อ at full HP is refused rather than silently overhealing
    expectAtomicReject(g, play([TAO2], []), /full-hp/);
  });

  it("[C-TAO-04b] the ง่อ lord bonus adds 1 and still respects max HP", () => {
    const g = contractGame({
      seed: SEED(148), playerCount: 3,
      assigns: [["p0", "sunquan", true], ["p1", "zhouyu"]],
      currentSeat: 1,
      hands: { p1: [TAO], p0: [] },
      after: (s) => {
        s.players.find((p) => p.id === "p0")!.role = "lord";
        setHp(s, "p0", 2); // sunquan lord maxHp 5
      },
    });
    step(g, { kind: "mainAction", playerId: "p1" }, play([TAO], ["p0"]));
    // 1 from the ท้อ + 1 from แคว้นง่อค้ำชู
    expectHp(g.state, "p0", 4);
    expectLog(g.state, { eventType: "heal", actorId: "p0" }, 2);
  });
});
