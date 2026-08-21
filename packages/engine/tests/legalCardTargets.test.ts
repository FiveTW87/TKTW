import { describe, expect, it } from "vitest";
import { cardPlayOptionsFor, type CardPlayOptionView } from "../src/core/legalActions";
import { contractGame, play } from "./_contract/harness";
import { C } from "./_contract/cards";
import { equip, killOff, putInJudgmentZone, setHand, setHp } from "./_contract/rig";
import { expectAtomicReject } from "./_contract/assert";

function optionFor(options: CardPlayOptionView[], cardId: string, typeKey?: string): CardPlayOptionView {
  const option = options.find(
    (candidate) =>
      candidate.selectableCardIds.includes(cardId) &&
      (typeKey === undefined || candidate.typeKey === typeKey),
  );
  if (!option) throw new Error(`missing ${cardId}/${typeKey ?? "literal"}`);
  return option;
}

describe("LEGAL-003 card target legality", () => {
  it("distinguishes no-selection equipment from fixed self/table effects", () => {
    const g = contractGame({
      seed: 2201,
      hands: { p0: [C.crossbow.any, C.wuzhong.any, C.nanman.any] },
    });
    const options = cardPlayOptionsFor(g.state, "p0");

    expect(optionFor(options, C.crossbow.any).targeting).toEqual({
      kind: "none",
      minTargets: 0,
      maxTargets: 0,
    });
    expect(optionFor(options, C.wuzhong.any).targeting).toEqual({
      kind: "fixed",
      minTargets: 0,
      maxTargets: 0,
      targetIds: ["p0"],
    });
    expect(optionFor(options, C.nanman.any).targeting).toEqual({
      kind: "fixed",
      minTargets: 0,
      maxTargets: 0,
      targetIds: ["p1", "p2"],
    });
  });

  it("derives Sha targets from live seats, range, horses, and Ma Chao", () => {
    const normal = contractGame({ seed: 2202, playerCount: 5, hands: { p0: [C.sha.any] } });
    expect(optionFor(cardPlayOptionsFor(normal.state, "p0"), C.sha.any).targeting).toMatchObject({
      kind: "independent",
      eligibleTargetIds: ["p1", "p4"],
      minTargets: 1,
      maxTargets: 1,
    });

    equip(normal.state, "p1", C.horse_jueying.any);
    killOff(normal.state, "p2");
    killOff(normal.state, "p3");
    killOff(normal.state, "p4");
    expect(optionFor(cardPlayOptionsFor(normal.state, "p0"), C.sha.any)).toMatchObject({
      available: false,
      unavailableReason: "no_legal_target",
      targeting: { eligibleTargetIds: [] },
    });

    const machao = contractGame({
      seed: 2203,
      playerCount: 5,
      assigns: [["p0", "machao"]],
      hands: { p0: [C.sha.any] },
    });
    expect(optionFor(cardPlayOptionsFor(machao.state, "p0"), C.sha.any).targeting).toMatchObject({
      eligibleTargetIds: ["p1", "p2", "p3", "p4"],
    });
  });

  it("raises Fangtian's target cap only when Sha spends the final hand card", () => {
    const last = contractGame({ seed: 2204, playerCount: 5, hands: { p0: [C.sha.any] } });
    equip(last.state, "p0", C.fangtian.any);
    expect(optionFor(cardPlayOptionsFor(last.state, "p0"), C.sha.any).targeting).toMatchObject({
      kind: "independent",
      minTargets: 1,
      maxTargets: 3,
    });

    setHand(last.state, "p0", [C.sha.any, C.shan.any]);
    expect(optionFor(cardPlayOptionsFor(last.state, "p0"), C.sha.any).targeting).toMatchObject({
      maxTargets: 1,
    });

    const zhangba = contractGame({ seed: 2209, hands: { p0: [C.shan.any, C.tao.any] } });
    equip(zhangba.state, "p0", C.zhangba.any);
    const substitute = cardPlayOptionsFor(zhangba.state, "p0").find((option) => option.source === "zhangba");
    expect(substitute?.targeting).toMatchObject({ kind: "independent", maxTargets: 1 });
  });

  it("models Tao's implicit self target only while self is injured", () => {
    const g = contractGame({ seed: 2205, hands: { p0: [C.tao.any] } });
    setHp(g.state, "p0", 2);
    setHp(g.state, "p1", 2);
    expect(optionFor(cardPlayOptionsFor(g.state, "p0"), C.tao.any).targeting).toEqual({
      kind: "independent",
      minTargets: 0,
      maxTargets: 1,
      eligibleTargetIds: ["p0", "p1"],
      implicitTargetId: "p0",
    });

    setHp(g.state, "p0", g.p("p0").maxHp);
    expect(optionFor(cardPlayOptionsFor(g.state, "p0"), C.tao.any).targeting).toEqual({
      kind: "independent",
      minTargets: 1,
      maxTargets: 1,
      eligibleTargetIds: ["p1"],
    });
  });

  it("filters empty, out-of-range, immune, dead, and duplicate delayed-trick targets", () => {
    const g = contractGame({
      seed: 2206,
      playerCount: 5,
      assigns: [["p1", "luxun"]],
      hands: { p0: [C.guohe.any, C.shunshou.any, C.lebusishu.heart!] },
    });
    setHand(g.state, "p2", [C.sha.any]);
    setHand(g.state, "p3", [C.shan.any]);
    equip(g.state, "p3", C.horse_jueying.any);
    putInJudgmentZone(g.state, "p2", C.lebusishu.spade!);
    killOff(g.state, "p4");

    const options = cardPlayOptionsFor(g.state, "p0");
    expect(optionFor(options, C.guohe.any).targeting).toMatchObject({ eligibleTargetIds: ["p2", "p3"] });
    expect(optionFor(options, C.shunshou.any).targeting).toMatchObject({ eligibleTargetIds: [] });
    expect(optionFor(options, C.lebusishu.heart!).targeting).toMatchObject({ eligibleTargetIds: ["p0", "p3"] });
  });

  it("reports Jiedao as two dependent steps and only exposes reachable victims", () => {
    const g = contractGame({ seed: 2207, playerCount: 5, hands: { p0: [C.jiedao.any] } });
    equip(g.state, "p1", C.crossbow.any);
    equip(g.state, "p3", C.qinglong.any);

    expect(optionFor(cardPlayOptionsFor(g.state, "p0"), C.jiedao.any).targeting).toEqual({
      kind: "dependent",
      minTargets: 2,
      maxTargets: 2,
      firstTargetIds: ["p1", "p3"],
      secondTargetIdsByFirst: {
        p1: ["p2"],
        p3: ["p1", "p2", "p4"],
      },
    });
  });

  it("rejects a Jiedao victim outside the coerced player's attack range atomically", () => {
    const g = contractGame({
      seed: 2208,
      playerCount: 5,
      hands: { p0: [C.jiedao.any] },
      after: (state) => equip(state, "p1", C.crossbow.any),
    });

    expectAtomicReject(g, play([C.jiedao.any], ["p1", "p3"]), /out of range/);
  });

  it("does not advertise or accept the caster as Juedou's target", () => {
    const g = contractGame({ seed: 2210, hands: { p0: [C.juedou.any] } });
    expect(optionFor(cardPlayOptionsFor(g.state, "p0"), C.juedou.any).targeting).toMatchObject({
      kind: "independent",
      eligibleTargetIds: ["p1", "p2"],
    });
    expectAtomicReject(g, play([C.juedou.any], ["p0"]), /cannot target themselves/);
  });
});
