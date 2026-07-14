import type { Card } from "../types";
import type { EngineGenerator } from "./decisions";
import type { Ctx } from "./ctx";

export interface PlayContext extends Ctx {
  playerId: string;
  cardIds: string[]; // cards being spent (>1 only for skills that substitute, e.g. zhangba)
  targetIds: string[];
}
export type CardPlayEffect = (ctx: PlayContext) => EngineGenerator;

/** Delayed tricks (lebusishu/shandian) don't resolve when played — they
 *  resolve later, popped LIFO from the judgment zone during JudgePhase. */
export interface JudgeEffectContext extends Ctx {
  ownerId: string; // whose judgment zone this card sat in
  card: Card;
}
export type CardJudgeEffect = (ctx: JudgeEffectContext) => EngineGenerator;

export interface CardDef {
  play?: CardPlayEffect;
  judge?: CardJudgeEffect;
}
