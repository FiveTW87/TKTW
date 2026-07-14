import cardsData from "../data/cards.json" assert { type: "json" };
import type { Card, CardCategory, EquipSlot } from "../types";

export interface CardTypeDef {
  nameKey: string;
  category: CardCategory;
  targetRule?: string;
  usageLimitPerTurn?: number;
  range?: number;
  slot?: EquipSlot;
  attackRange?: number;
  canTargetSameType?: boolean;
  playableAnytime?: boolean;
}

export const ALL_CARDS: Card[] = cardsData.cards as Card[];
export const CARD_TYPES: Record<string, CardTypeDef> = cardsData.cardTypes as Record<
  string,
  CardTypeDef
>;
export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(
  ALL_CARDS.map((c) => [c.id, c]),
);

export function cardDef(typeKey: string): CardTypeDef {
  const d = CARD_TYPES[typeKey];
  if (!d) throw new Error(`unknown card typeKey: ${typeKey}`);
  return d;
}

/** Only trick / delayedTrick cards can be countered by wuxie (SPEC 8.2/8.3). */
export function isCancelable(typeKey: string): boolean {
  const c = cardDef(typeKey).category;
  return c === "trick" || c === "delayedTrick";
}
