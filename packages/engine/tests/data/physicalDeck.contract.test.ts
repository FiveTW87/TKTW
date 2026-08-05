// TKTW_TEST_CASE_CATALOG.md → "Physical deck 104 ใบ: data-driven tests" (D-DECK).
//
// The deck is the one part of the game with no behaviour to drive: every claim
// is checkable straight off cards.json, plus a few that need one real game to
// prove the data survives contact with the engine.
import { describe, it, expect } from "vitest";
import deck from "../../src/data/cards.json" assert { type: "json" };
import type { Card, CardCategory, EquipSlot, Suit } from "../../src/types";
import { colorOf } from "../../src/types";
import { ALL_CARDS, CARD_TYPES } from "../../src/core/cardData";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { contractGame, SEED, runTo, DEFAULT_ANSWERS, respond } from "../_contract";
import { assertCardConservation, locationsOf } from "../_contract/rig";

const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];
const cards = deck.cards as Card[];

/** Every zone-holding container in a state, flattened. */
function everyCard(state: ReturnType<typeof createInitialState>): Card[] {
  const out: Card[] = [];
  for (const p of state.players) {
    out.push(...p.hand, ...p.judgmentZone);
    for (const c of Object.values(p.equipment)) if (c) out.push(c);
  }
  return [...out, ...state.drawPile, ...state.discardPile];
}

describe("D-DECK — physical deck contract", () => {
  it("[D-DECK-01] the deck is exactly 104 cards and totalCards agrees", () => {
    expect(cards).toHaveLength(104);
    expect(deck.totalCards).toBe(104);
    expect(cards.length).toBe(deck.totalCards);
    expect(ALL_CARDS).toHaveLength(104);
  });

  it("[D-DECK-02a] every card id is unique", () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(104);
  });

  it.each(cards)("[D-DECK-02b] $id follows the {suit}_{rank}_{copy} id format", (card) => {
    const m = /^(spade|heart|club|diamond)_(\d{1,2})_([12])$/.exec(card.id);
    expect(m, `${card.id} is not a well-formed physical card id`).not.toBeNull();
    expect(m![1]).toBe(card.suit);
    expect(Number(m![2])).toBe(card.rank);
  });

  it("[D-DECK-03a] every suit is one of the four", () => {
    for (const c of cards) expect(SUITS).toContain(c.suit);
  });

  it.each(SUITS)("[D-DECK-03b] %s holds exactly 26 cards", (suit) => {
    expect(cards.filter((c) => c.suit === suit)).toHaveLength(26);
  });

  it.each(cards)("[D-DECK-04a] $id has an integer rank in 1..13", (card) => {
    expect(Number.isInteger(card.rank)).toBe(true);
    expect(card.rank).toBeGreaterThanOrEqual(1);
    expect(card.rank).toBeLessThanOrEqual(13);
  });

  it("[D-DECK-04b] every (suit, rank) pair exists as exactly two physical cards", () => {
    const short: string[] = [];
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        const copies = cards.filter((c) => c.suit === suit && c.rank === rank);
        if (copies.length !== 2) short.push(`${suit}_${rank}: ${copies.length}`);
        else expect(copies.map((c) => c.id).sort()).toEqual([`${suit}_${rank}_1`, `${suit}_${rank}_2`]);
      }
    }
    expect(short).toEqual([]);
  });

  it.each(cards)("[D-DECK-05] $id's typeKey is defined in cardTypes", (card) => {
    expect(CARD_TYPES).toHaveProperty(card.typeKey);
    expect(CARD_TYPES[card.typeKey]!.nameKey).toBeTruthy();
  });

  const typeKeys = Object.keys(CARD_TYPES);
  const CATEGORIES: CardCategory[] = ["basic", "trick", "delayedTrick", "equipment"];
  const SLOTS: EquipSlot[] = ["weapon", "armor", "horseMinus", "horsePlus"];

  it.each(typeKeys)("[D-DECK-06] cardTypes.%s has a shape valid for its category", (key) => {
    const def = CARD_TYPES[key]!;
    expect(CATEGORIES).toContain(def.category);

    if (def.category === "equipment") {
      // Equipment is defined by its slot and never by a target rule.
      expect(SLOTS, `${key}.slot`).toContain(def.slot);
      expect(def.targetRule, `${key} must not carry a targetRule`).toBeUndefined();
      // Only weapons carry an attack range, and it must be a positive integer.
      if (def.slot === "weapon") {
        expect(Number.isInteger(def.attackRange), `${key}.attackRange`).toBe(true);
        expect(def.attackRange!).toBeGreaterThanOrEqual(1);
      } else {
        expect(def.attackRange, `${key} is not a weapon and must have no attackRange`).toBeUndefined();
      }
    } else {
      // Playable cards are defined by their target rule and never by a slot.
      expect(typeof def.targetRule, `${key}.targetRule`).toBe("string");
      expect(def.slot, `${key} must not carry an equipment slot`).toBeUndefined();
      expect(def.attackRange, `${key} must not carry an attackRange`).toBeUndefined();
    }

    // `range` is the card's own fixed distance rule (shunshou) — optional, but
    // a positive integer whenever present.
    if (def.range !== undefined) {
      expect(Number.isInteger(def.range), `${key}.range`).toBe(true);
      expect(def.range).toBeGreaterThanOrEqual(1);
    }
    if (def.usageLimitPerTurn !== undefined) {
      expect(def.usageLimitPerTurn).toBeGreaterThanOrEqual(1);
    }
  });

  it("[D-DECK-07] a fresh game contains each of the 104 physical cards exactly once", () => {
    const rng = createRng(SEED(9001));
    const state = createInitialState({ playerCount: 5, seed: SEED(9001) }, rng);
    const ids = everyCard(state).map((c) => c.id);
    expect(ids).toHaveLength(104);
    expect(new Set(ids).size).toBe(104);
    expect(ids.slice().sort()).toEqual(cards.map((c) => c.id).sort());
    // and dealt, not conjured: 4 per player out of the same 104
    expect(state.players.every((p) => p.hand.length === 4)).toBe(true);
    expect(state.drawPile).toHaveLength(104 - 5 * 4);
  });

  it("[D-DECK-08a] the same seed shuffles to the same order", () => {
    const a = createRng(4242).shuffle(ALL_CARDS).map((c) => c.id);
    const b = createRng(4242).shuffle(ALL_CARDS).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it("[D-DECK-08b] a different seed permutes the very same set of cards", () => {
    const a = createRng(4242).shuffle(ALL_CARDS).map((c) => c.id);
    const b = createRng(777).shuffle(ALL_CARDS).map((c) => c.id);
    expect(b).not.toEqual(a); // a genuine permutation, not the identity
    expect(b.slice().sort()).toEqual(a.slice().sort());
    expect(new Set(b).size).toBe(104);
  });

  it("[D-DECK-09a] no physical id ever occupies two zones at once during real play", () => {
    const g = contractGame({ seed: SEED(9002), playerCount: 4, keepDrawGate: true });
    for (let i = 0; i < 300 && g.session.state.pendingDecision; i++) {
      const pd = g.session.state.pendingDecision;
      // Check the invariant at every single decision point, not just at the end.
      for (const id of cards.map((c) => c.id)) {
        expect(locationsOf(g.session.state, id).length, `${id} at ${pd.kind}`).toBeLessThanOrEqual(1);
      }
      respond(g.session, (DEFAULT_ANSWERS[pd.kind] ?? ((d) => ({ decisionId: d.id, playerId: d.playerId, pass: true })))(pd));
      if (g.session.state.finished) break;
    }
  });

  it("[D-DECK-09b] draw / discard / equip move cards without cloning or losing them", () => {
    const g = contractGame({ seed: SEED(9003), playerCount: 4 });
    // Drive real turns so cards flow hand -> discard -> reshuffled draw pile.
    runTo(g, (pd) => pd.kind === "mainAction" && g.state.turnNumber >= 4, { max: 400 });
    assertCardConservation(g.state);
    const ids = everyCard(g.state).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("[D-DECK-10] balance snapshot: per-typeKey, per-colour and per-category counts", () => {
    const byType: Record<string, number> = {};
    for (const c of cards) byType[c.typeKey] = (byType[c.typeKey] ?? 0) + 1;
    // Any intentional rebalance must update this snapshot deliberately.
    expect(byType).toEqual({
      sha: 30, shan: 15, tao: 8,
      wuzhong: 4, guohe: 4, shunshou: 4, juedou: 3, jiedao: 2,
      nanman: 3, wanjian: 1, taoyuan: 1, wugu: 2, wuxie: 4,
      lebusishu: 3, shandian: 1,
      crossbow: 2, sword_yy: 1, sword_ice: 1, sword_qinggang: 1,
      qinglong: 1, zhangba: 1, guanshi: 1, fangtian: 1, qilin: 1,
      bagua: 2, renwang: 1,
      horse_chitu: 1, horse_dilu: 1, horse_zhaohuang: 1,
      horse_jueying: 1, horse_dawan: 1, horse_zixing: 1,
    });
    expect(Object.values(byType).reduce((a, b) => a + b, 0)).toBe(104);

    const byColor = { red: 0, black: 0 };
    for (const c of cards) byColor[colorOf(c.suit)]++;
    expect(byColor).toEqual({ red: 52, black: 52 });

    const byCategory: Record<string, number> = {};
    for (const c of cards) {
      const cat = CARD_TYPES[c.typeKey]!.category;
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }
    expect(byCategory).toEqual({ basic: 53, trick: 28, delayedTrick: 4, equipment: 19 });
  });
});
