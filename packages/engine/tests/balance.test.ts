import { describe, it, expect } from "vitest";
import cardsData from "../src/data/cards.json" assert { type: "json" };
import { colorOf, type Card, type Suit } from "../src/types";

const deck = cardsData.cards as Card[];
const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];

const countSuit = (d: Card[], s: Suit) => d.filter((c) => c.suit === s).length;
const countRank = (d: Card[], s: Suit, r: number) =>
  d.filter((c) => c.suit === s && c.rank === r).length;
const countColor = (d: Card[], color: "red" | "black") =>
  d.filter((c) => colorOf(c.suit) === color).length;
const countType = (d: Card[], typeKey: string) =>
  d.filter((c) => c.typeKey === typeKey).length;
const countTypeBySuit = (d: Card[], typeKey: string, s: Suit) =>
  d.filter((c) => c.typeKey === typeKey && c.suit === s).length;

describe("deck structure (SPEC 10.1)", () => {
  it("has exactly 104 cards", () => {
    expect(deck.length).toBe(104);
  });

  it("has 26 cards per suit", () => {
    for (const suit of SUITS) expect(countSuit(deck, suit)).toBe(26);
  });

  it("has exactly 2 cards per (suit, rank)", () => {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        expect(countRank(deck, suit, rank)).toBe(2);
      }
    }
  });

  it("is 50/50 red/black", () => {
    expect(countColor(deck, "red")).toBe(52);
    expect(countColor(deck, "black")).toBe(52);
  });

  it("has unique card ids", () => {
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  it("every card's typeKey is declared in cardTypes", () => {
    const declared = new Set(Object.keys(cardsData.cardTypes));
    for (const c of deck) expect(declared.has(c.typeKey)).toBe(true);
  });
});

describe("card type totals (SPEC 9.2 table)", () => {
  const expected: Record<string, number> = {
    sha: 30,
    shan: 15,
    tao: 8,
    wuzhong: 4,
    guohe: 4,
    shunshou: 4,
    wuxie: 4,
    juedou: 3,
    nanman: 3,
    lebusishu: 3,
    jiedao: 2,
    wugu: 2,
    wanjian: 1,
    taoyuan: 1,
    shandian: 1,
    crossbow: 2,
    sword_yy: 1,
    sword_ice: 1,
    sword_qinggang: 1,
    qinglong: 1,
    zhangba: 1,
    guanshi: 1,
    fangtian: 1,
    qilin: 1,
    bagua: 2,
    renwang: 1,
  };

  for (const [typeKey, total] of Object.entries(expected)) {
    it(`${typeKey} appears ${total} times`, () => {
      expect(countType(deck, typeKey)).toBe(total);
    });
  }

  it("horseMinus types total 3, horsePlus types total 3", () => {
    const minus = ["horse_chitu", "horse_dilu", "horse_zhaohuang"];
    const plus = ["horse_jueying", "horse_dawan", "horse_zixing"];
    expect(minus.reduce((n, k) => n + countType(deck, k), 0)).toBe(3);
    expect(plus.reduce((n, k) => n + countType(deck, k), 0)).toBe(3);
  });

  it("sums to 104", () => {
    const horseTotal = 6;
    const sum = Object.values(expected).reduce((a, b) => a + b, 0) + horseTotal;
    expect(sum).toBe(104);
  });
});

describe("judgment probabilities (SPEC 10.2)", () => {
  it("bagua (red = auto-dodge) is exactly 50%", () => {
    expect(countColor(deck, "red") / deck.length).toBeCloseTo(0.5, 5);
  });

  it("lebusishu (survive on heart) is exactly 25%", () => {
    expect(countSuit(deck, "heart") / deck.length).toBeCloseTo(0.25, 5);
  });

  it("shandian (spade 2-9 triggers) is 16/104", () => {
    const hits = deck.filter(
      (c) => c.suit === "spade" && c.rank >= 2 && c.rank <= 9,
    ).length;
    expect(hits).toBe(16);
    expect(hits / deck.length).toBeCloseTo(0.1538, 3);
  });
});

describe("basic card ratios (SPEC 10.3)", () => {
  it("sha:shan is 2:1", () => {
    expect(countType(deck, "sha") / countType(deck, "shan")).toBeCloseTo(2, 5);
  });

  it("sha black:red is 2:1 (renwang blocks black sha ~67%)", () => {
    const black = countTypeBySuit(deck, "sha", "spade") + countTypeBySuit(deck, "sha", "club");
    const red = countTypeBySuit(deck, "sha", "heart") + countTypeBySuit(deck, "sha", "diamond");
    expect(black).toBe(20);
    expect(red).toBe(10);
    expect(black / red).toBeCloseTo(2, 5);
  });

  it("shan and tao are red-only (23 cards)", () => {
    const shan = deck.filter((c) => c.typeKey === "shan");
    const tao = deck.filter((c) => c.typeKey === "tao");
    for (const c of [...shan, ...tao]) expect(colorOf(c.suit)).toBe("red");
    expect(shan.length + tao.length).toBe(23);
  });
});
