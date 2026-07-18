// Client-side mirror of the engine's `canConvertCard` skills (guanyu/zhaoyun/
// zhenji/ganning/daiqiao/huatuo). This is ONLY used to shape the UI — decide
// which cards to offer/enable and what `asType` to send. The engine stays the
// single source of truth (`countsAsType`); a wrong guess here just means the
// server rejects the play and re-prompts, never a desync.
import type { Card } from "@tktw/shared";
import { playableAsMainAction } from "./cardMeta";

const RED = new Set(["heart", "diamond"]);
const isRed = (suit: string) => RED.has(suit);
const isBlack = (suit: string) => !RED.has(suit);

export interface ConversionRule {
  asType: string;
  matches: (card: Card, isOwnTurn: boolean) => boolean;
}

const CONVERSIONS: Record<string, ConversionRule[]> = {
  guanyu: [{ asType: "sha", matches: (c) => isRed(c.suit) }], // เทพศาสตรา
  zhaoyun: [
    { asType: "sha", matches: (c) => c.typeKey === "shan" },
    { asType: "shan", matches: (c) => c.typeKey === "sha" },
  ], // ใจมังกร (สองทาง)
  zhenji: [{ asType: "shan", matches: (c) => isBlack(c.suit) }], // ล่มเมือง
  ganning: [{ asType: "guohe", matches: (c) => isBlack(c.suit) }], // จู่โจมโจรสลัด
  daiqiao: [{ asType: "lebusishu", matches: (c) => c.suit === "diamond" }], // ล่มเมือง
  huatuo: [{ asType: "tao", matches: (c, isOwnTurn) => isRed(c.suit) && !isOwnTurn }], // ปฐมพยาบาล (นอกเทิร์นตัวเอง)
};

export function conversionsFor(generalId: string): ConversionRule[] {
  return CONVERSIONS[generalId] ?? [];
}

/** Mirror of engine countsAsType, for gating the UI: can `card` be submitted as
 *  `wanted` by this general right now? (Literal match, or an applicable rule.) */
export function clientCountsAs(card: Card, wanted: string, generalId: string, isOwnTurn: boolean): boolean {
  if (card.typeKey === wanted) return true;
  return conversionsFor(generalId).some((r) => r.asType === wanted && r.matches(card, isOwnTurn));
}

export interface MainActionPlay {
  /** The type to actually resolve as. */
  typeKey: string;
  /** Present only when this is a conversion (send as `answer.asType`). */
  asType?: string;
}

/** The distinct ways `card` can be played as a MAIN ACTION for this general:
 *  its literal type (if playable) plus any conversion whose target type is
 *  itself main-action-playable. Deduped by resulting type. On your own turn
 *  `isOwnTurn` is always true here. */
export function mainActionPlays(card: Card, generalId: string): MainActionPlay[] {
  const out: MainActionPlay[] = [];
  const seen = new Set<string>();
  if (playableAsMainAction(card.typeKey)) {
    out.push({ typeKey: card.typeKey });
    seen.add(card.typeKey);
  }
  for (const rule of conversionsFor(generalId)) {
    if (seen.has(rule.asType)) continue;
    if (!playableAsMainAction(rule.asType)) continue; // e.g. converting TO shan is never a main play
    if (!rule.matches(card, true)) continue;
    out.push({ typeKey: rule.asType, asType: rule.asType });
    seen.add(rule.asType);
  }
  return out;
}
