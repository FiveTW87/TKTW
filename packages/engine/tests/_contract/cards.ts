// Deterministic card selection for the contract suite.
//
// The catalog demands a conversion matrix for 11 skills ("ทุก conversion ต้อง
// ตรวจเจ้าของสกิล, ผู้เล่นอื่น, สี/ดอกที่ถูก และสี/ดอกที่ผิด") plus per-suit
// coverage for every counts-as rule. Hard-coding ids for that is unreadable and
// breaks the moment cards.json is rebalanced, so everything is looked up by
// (typeKey, suit/color/rank) against the real deck at module load.
import type { Card, Color, Suit } from "../../src/types";
import { colorOf } from "../../src/types";
import { ALL_CARDS, CARD_TYPES } from "../../src/core/cardData";
import type { CardTypeKey } from "../../src/core/cardData";

export { CID } from "../generals/_gh";

export interface CardQuery {
  typeKey?: string;
  suit?: Suit;
  color?: Color;
  rank?: number;
  category?: string;
  /** ids already spoken for elsewhere in the same test */
  exclude?: readonly string[];
}

function matches(c: Card, q: CardQuery): boolean {
  if (q.typeKey !== undefined && c.typeKey !== q.typeKey) return false;
  if (q.suit !== undefined && c.suit !== q.suit) return false;
  if (q.color !== undefined && colorOf(c.suit) !== q.color) return false;
  if (q.rank !== undefined && c.rank !== q.rank) return false;
  if (q.category !== undefined && CARD_TYPES[c.typeKey]?.category !== q.category) return false;
  if (q.exclude?.includes(c.id)) return false;
  return true;
}

function describe(q: CardQuery): string {
  return JSON.stringify(q);
}

/** All matching deck ids, in cards.json order (stable across runs). */
export function allCards(q: CardQuery): string[] {
  return ALL_CARDS.filter((c) => matches(c, q)).map((c) => c.id);
}

/** The first deck card matching `q`. Throws rather than returning undefined —
 *  a test that silently rigged nothing is worse than one that fails loudly. */
export function findCard(q: CardQuery): string {
  const hit = allCards(q)[0];
  if (!hit) throw new Error(`no card in the deck matches ${describe(q)}`);
  return hit;
}

/** `n` distinct deck cards matching `q`. */
export function findCards(n: number, q: CardQuery = {}): string[] {
  const hits = allCards(q).slice(0, n);
  if (hits.length < n) {
    throw new Error(`deck has only ${hits.length} card(s) matching ${describe(q)}, needed ${n}`);
  }
  return hits;
}

/** Every id of a given type — used by the deck-composition cases. */
export function cardsOfType(typeKey: string): string[] {
  return allCards({ typeKey });
}

const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];

type SuitTable = Partial<Record<Suit, string>> & { any: string; all: string[] };

function suitTable(typeKey: string): SuitTable {
  const t: Partial<Record<Suit, string>> = {};
  for (const s of SUITS) {
    const hit = allCards({ typeKey, suit: s })[0];
    if (hit) t[s] = hit;
  }
  const all = cardsOfType(typeKey);
  return { ...t, any: all[0]!, all };
}

/**
 * Named lookup: `C.sha.spade`, `C.guohe.diamond`, `C.juedou.any`, `C.shan.all`.
 * A suit key is absent when the deck genuinely has no copy of that card in that
 * suit (e.g. there is exactly one wanjian) — tests must use `findCard` with a
 * different type in that case rather than asserting on undefined.
 */
export const C = Object.fromEntries(
  Object.keys(CARD_TYPES).map((k) => [k, suitTable(k)]),
) as Record<CardTypeKey, SuitTable>;
