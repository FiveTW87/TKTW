import { describe, expect, it } from "vitest";
import { activeSkillOptionsFor, legalActionsFor, type ActiveSkillOptionView } from "../src/core/legalActions";
import { contractGame, step, useSkill } from "./_contract/harness";
import { C } from "./_contract/cards";
import { expectAtomicReject } from "./_contract/assert";
import { setHp } from "./_contract/rig";

function onlyOption(generalId: string, cards: string[], prepare?: (game: ReturnType<typeof contractGame>) => void) {
  const game = contractGame({ seed: 2301, assigns: [["p0", generalId]], hands: { p0: cards } });
  prepare?.(game);
  const options = activeSkillOptionsFor(game.state, "p0");
  expect(options).toHaveLength(1);
  return { game, option: options[0]! };
}

function expectTargeting(option: ActiveSkillOptionView, ids: string[], count: number): void {
  expect(option.targeting).toEqual(
    count === 0
      ? { kind: "none", minTargets: 0, maxTargets: 0 }
      : { kind: "independent", minTargets: count, maxTargets: count, eligibleTargetIds: ids },
  );
}

describe("LEGAL-004 active-skill options", () => {
  it("reports authoritative card and target counts for all seven active skills", () => {
    const rende = onlyOption("liubei", [C.sha.any]);
    expect(rende.option).toMatchObject({ skillId: "liubei_rende", minCards: 1, maxCards: 1, exactCards: 1, available: true });
    expectTargeting(rende.option, ["p1", "p2"], 1);

    const zhiheng = onlyOption("sunquan", [C.sha.any, C.shan.any]);
    expect(zhiheng.option).toMatchObject({ skillId: "sunquan_zhiheng", minCards: 1, maxCards: 2, available: true });
    expectTargeting(zhiheng.option, [], 0);

    const fanjian = onlyOption("zhouyu", [C.sha.any]);
    expect(fanjian.option).toMatchObject({ skillId: "zhouyu_fanjian", exactCards: 1, available: true });
    expectTargeting(fanjian.option, ["p1", "p2"], 1);

    const kurou = onlyOption("huanggai", []);
    expect(kurou.option).toMatchObject({ skillId: "huanggai_kurou", exactCards: 0, available: true });
    expectTargeting(kurou.option, [], 0);

    const jieyuan = onlyOption("sunshangxiang", [C.sha.any, C.shan.any], ({ state }) => setHp(state, "p1", 2));
    expect(jieyuan.option).toMatchObject({ skillId: "sunshangxiang_jieyuan", exactCards: 2, available: true });
    expectTargeting(jieyuan.option, ["p1"], 1);

    const lijian = onlyOption("diaochan", [C.sha.any]);
    expect(lijian.option).toMatchObject({ skillId: "diaochan_lijian", exactCards: 1, available: true });
    expectTargeting(lijian.option, ["p1", "p2"], 2);

    const qingnang = onlyOption("huatuo", [C.sha.any], ({ state }) => {
      setHp(state, "p0", 2);
      setHp(state, "p1", 2);
    });
    expect(qingnang.option).toMatchObject({ skillId: "huatuo_qingnang", exactCards: 1, available: true });
    expectTargeting(qingnang.option, ["p0", "p1"], 1);
  });

  it("reports stable usage, card-count, and target availability reasons", () => {
    const spent = onlyOption("zhouyu", [C.sha.any]);
    spent.game.p("p0").skillUsedThisTurn.zhouyu_fanjian = 1;
    expect(activeSkillOptionsFor(spent.game.state, "p0")[0]).toMatchObject({
      available: false,
      unavailableReason: "usage_limit",
      usesThisTurn: 1,
      maxUsesPerTurn: 1,
    });

    const short = onlyOption("sunshangxiang", [C.sha.any], ({ state }) => setHp(state, "p1", 2));
    expect(short.option).toMatchObject({ available: false, unavailableReason: "insufficient_cards" });

    const noTarget = onlyOption("huatuo", [C.sha.any]);
    expect(noTarget.option).toMatchObject({ available: false, unavailableReason: "no_legal_target" });
  });

  it("projects skill options only to the pending decision owner", () => {
    const { game, option } = onlyOption("liubei", [C.sha.any]);
    expect(legalActionsFor(game.state.pendingDecision, "p0", game.state)).toContainEqual({
      kind: "useSkill",
      options: [option],
    });
    expect(legalActionsFor(game.state.pendingDecision, "p1", game.state)).toEqual([]);
  });

  it("accepts an advertised skill selection and commits its quota", () => {
    const { game, option } = onlyOption("sunquan", [C.sha.any, C.shan.any]);
    expect(option.available).toBe(true);
    step(game, { kind: "mainAction", playerId: "p0" }, useSkill(option.skillId, [C.sha.any], []));
    expect(game.p("p0").skillUsedThisTurn.sunquan_zhiheng).toBe(1);
  });

  it("rejects selections outside the same card-count contract atomically", () => {
    const emptyZhiheng = contractGame({ seed: 2302, assigns: [["p0", "sunquan"]], hands: { p0: [] } });
    expectAtomicReject(emptyZhiheng, useSkill("sunquan_zhiheng", [], []), /needs 1-0 card/);

    const tooManyJieyuan = contractGame({
      seed: 2303,
      assigns: [["p0", "sunshangxiang"]],
      hands: { p0: [C.sha.any, C.shan.any, C.tao.any] },
      after: (state) => setHp(state, "p1", 2),
    });
    expectAtomicReject(
      tooManyJieyuan,
      useSkill("sunshangxiang_jieyuan", [C.sha.any, C.shan.any, C.tao.any], ["p1"]),
      /needs 2-2 card/,
    );
  });
});
