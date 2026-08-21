import { describe, expect, it } from "vitest";
import { cardPlayOptionsFor, type CardPlayOptionView } from "../src/core/legalActions";
import { contractGame, play, step } from "./_contract/harness";
import { C, findCard } from "./_contract/cards";
import { equip } from "./_contract/rig";

function findOption(
  options: CardPlayOptionView[],
  want: Pick<CardPlayOptionView, "source" | "typeKey"> & { cardId?: string },
): CardPlayOptionView {
  const option = options.find(
    (candidate) =>
      candidate.source === want.source &&
      candidate.typeKey === want.typeKey &&
      (want.cardId === undefined || candidate.selectableCardIds.includes(want.cardId)),
  );
  if (!option) throw new Error(`missing option ${JSON.stringify(want)} in ${JSON.stringify(options)}`);
  return option;
}

describe("LEGAL-002 card play options", () => {
  it("advertises literal basic/trick/equipment plays and marks response-only cards stably", () => {
    const g = contractGame({
      seed: 2101,
      hands: { p0: [C.sha.any, C.wuzhong.any, C.crossbow.any, C.shan.any, C.wuxie.any] },
    });
    const options = cardPlayOptionsFor(g.state, "p0");

    for (const [id, typeKey] of [
      [C.sha.any, "sha"],
      [C.wuzhong.any, "wuzhong"],
      [C.crossbow.any, "crossbow"],
    ] as const) {
      expect(findOption(options, { source: "literal", typeKey, cardId: id })).toMatchObject({
        available: true,
        exactCards: 1,
      });
    }
    expect(findOption(options, { source: "literal", typeKey: "shan", cardId: C.shan.any })).toMatchObject({
      available: false,
      unavailableReason: "response_only",
    });
    expect(findOption(options, { source: "literal", typeKey: "wuxie", cardId: C.wuxie.any })).toMatchObject({
      available: false,
      unavailableReason: "response_only",
    });
  });

  it("an advertised literal equipment play is accepted by engine validation", () => {
    const g = contractGame({ seed: 2102, hands: { p0: [C.crossbow.any] } });
    const option = findOption(cardPlayOptionsFor(g.state, "p0"), {
      source: "literal",
      typeKey: "crossbow",
      cardId: C.crossbow.any,
    });
    expect(option.available).toBe(true);

    step(g, { kind: "mainAction", playerId: "p0" }, play([C.crossbow.any]));
    expect(g.p("p0").equipment.weapon?.typeKey).toBe("crossbow");
  });

  it("advertises Guan Yu's red conversion and the submitted play is accepted", () => {
    const redCard = C.shan.heart!;
    const g = contractGame({
      seed: 2103,
      assigns: [["p0", "guanyu"]],
      hands: { p0: [redCard] },
    });
    const option = findOption(cardPlayOptionsFor(g.state, "p0"), {
      source: "conversion",
      typeKey: "sha",
      cardId: redCard,
    });
    expect(option).toMatchObject({ available: true, asType: "sha", exactCards: 1 });

    step(g, { kind: "mainAction", playerId: "p0" }, play([redCard], ["p1"], "sha"));
    expect(g.p("p0").hand.some((card) => card.id === redCard)).toBe(false);
  });

  it("reports reactive-only conversions with a stable wrong-context reason", () => {
    const redCard = C.shan.heart!;
    const g = contractGame({
      seed: 2104,
      assigns: [["p0", "huatuo"]],
      hands: { p0: [redCard] },
    });
    expect(
      findOption(cardPlayOptionsFor(g.state, "p0"), {
        source: "conversion",
        typeKey: "tao",
        cardId: redCard,
      }),
    ).toMatchObject({ available: false, unavailableReason: "conversion_wrong_context" });
  });

  it.each([
    { generalId: "zhaoyun", cardId: C.shan.any, typeKey: "sha", available: true },
    { generalId: "zhaoyun", cardId: C.sha.any, typeKey: "shan", available: false, reason: "response_only" },
    {
      generalId: "zhenji",
      cardId: findCard({ typeKey: "sha", color: "black" }),
      typeKey: "shan",
      available: false,
      reason: "response_only",
    },
    {
      generalId: "ganning",
      cardId: findCard({ typeKey: "juedou", color: "black" }),
      typeKey: "guohe",
      available: true,
    },
    {
      generalId: "daiqiao",
      cardId: findCard({ typeKey: "shan", suit: "diamond" }),
      typeKey: "lebusishu",
      available: true,
    },
  ])("reports $generalId's $typeKey conversion with its current availability", ({
    generalId,
    cardId,
    typeKey,
    available,
    reason,
  }) => {
    const g = contractGame({ seed: 2111, assigns: [["p0", generalId]], hands: { p0: [cardId] } });
    const option = findOption(cardPlayOptionsFor(g.state, "p0"), {
      source: "conversion",
      typeKey,
      cardId,
    });
    expect(option.available).toBe(available);
    if (!available) expect(option).toMatchObject({ unavailableReason: reason });
  });

  it("uses the same Sha quota as validation for normal, crossbow, and Zhang Fei states", () => {
    const normal = contractGame({ seed: 2105, hands: { p0: [C.sha.any] } });
    normal.p("p0").shaUsedThisTurn = 1;
    expect(findOption(cardPlayOptionsFor(normal.state, "p0"), { source: "literal", typeKey: "sha" })).toMatchObject({
      available: false,
      unavailableReason: "sha_usage_limit",
    });

    const crossbow = contractGame({ seed: 2106, hands: { p0: [C.sha.any] } });
    equip(crossbow.state, "p0", C.crossbow.any);
    crossbow.p("p0").shaUsedThisTurn = 1;
    expect(findOption(cardPlayOptionsFor(crossbow.state, "p0"), { source: "literal", typeKey: "sha" })).toMatchObject({
      available: true,
    });

    const zhangfei = contractGame({
      seed: 2107,
      assigns: [["p0", "zhangfei"]],
      hands: { p0: [C.sha.any] },
    });
    zhangfei.p("p0").shaUsedThisTurn = 1;
    expect(findOption(cardPlayOptionsFor(zhangfei.state, "p0"), { source: "literal", typeKey: "sha" })).toMatchObject({
      available: true,
    });
  });

  it("reports Zhangba's exact two-card substitute and insufficient-card state", () => {
    const enough = contractGame({ seed: 2108, hands: { p0: [C.shan.any, C.tao.any] } });
    equip(enough.state, "p0", C.zhangba.any);
    expect(findOption(cardPlayOptionsFor(enough.state, "p0"), { source: "zhangba", typeKey: "sha" })).toMatchObject({
      available: true,
      selectableCardIds: [C.shan.any, C.tao.any],
      minCards: 2,
      maxCards: 2,
      exactCards: 2,
    });

    const short = contractGame({ seed: 2109, hands: { p0: [C.shan.any] } });
    equip(short.state, "p0", C.zhangba.any);
    expect(findOption(cardPlayOptionsFor(short.state, "p0"), { source: "zhangba", typeKey: "sha" })).toMatchObject({
      available: false,
      unavailableReason: "insufficient_cards",
    });
  });

  it("keeps a last-card Fangtian Sha advertised; target expansion remains LEGAL-003", () => {
    const g = contractGame({ seed: 2110, hands: { p0: [C.sha.any] } });
    equip(g.state, "p0", C.fangtian.any);
    expect(findOption(cardPlayOptionsFor(g.state, "p0"), { source: "literal", typeKey: "sha" })).toMatchObject({
      available: true,
      exactCards: 1,
    });
  });
});
