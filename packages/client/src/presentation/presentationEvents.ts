import type { GameLogView } from "@tktw/shared";

interface PresentationEventBase {
  id: string;
  logId: string;
}

export interface DrawPresentationEvent extends PresentationEventBase {
  kind: "draw";
  actorId: string;
  amount?: number;
}

export interface SkillPresentationEvent extends PresentationEventBase {
  kind: "skill";
  actorId: string;
  skillId?: string;
}

export interface DamagePresentationEvent extends PresentationEventBase {
  kind: "damage";
  targetId: string;
  sourceId?: string;
  amount?: number;
}

export interface HpLossPresentationEvent extends PresentationEventBase {
  kind: "hpLoss";
  targetId: string;
  amount?: number;
}

export interface DodgePresentationEvent extends PresentationEventBase {
  kind: "dodge";
  targetId: string;
  sourceId?: string;
}

export interface HealPresentationEvent extends PresentationEventBase {
  kind: "heal";
  targetId: string;
  sourceId?: string;
  amount?: number;
}

export interface DeathPresentationEvent extends PresentationEventBase {
  kind: "death";
  targetId: string;
}

export interface JudgmentRevealPresentationEvent extends PresentationEventBase {
  kind: "judgmentReveal";
  playerId: string;
  cardId?: string;
  cardType?: string;
  suit?: string;
  rank?: number;
  reason?: string;
}

export interface JudgmentReplacePresentationEvent extends PresentationEventBase {
  kind: "judgmentReplace";
  actorId: string;
  playerId: string;
  cardId?: string;
  cardType?: string;
  previousCardId?: string;
  previousCardType?: string;
  previousSuit?: string;
  previousRank?: number;
  suit?: string;
  rank?: number;
}

export interface JudgmentResultPresentationEvent extends PresentationEventBase {
  kind: "judgmentResult";
  playerId: string;
  cardType?: string;
  suit?: string;
  rank?: number;
  outcome?: string;
  amount?: number;
}

export interface WuxieCounterPresentationEvent extends PresentationEventBase {
  kind: "wuxieCounter";
  actorId: string;
  targetType?: string;
  depth: number;
}

export interface WuxieResultPresentationEvent extends PresentationEventBase {
  kind: "wuxieResult";
  actorId: string;
  targetType?: string;
  effective: boolean;
}

export type CardMotionZone =
  | { kind: "player"; playerId: string; zone: "hand" | "equipment" | "judgment" }
  | { kind: "pile"; zone: "draw" | "discard" | "table" | "wugu" };

export type CardMotionKind = "draw" | "play" | "discard" | "steal" | "equip" | "equipmentLoss" | "delayed" | "wuguReveal" | "wuguPick";

export interface CardMotionPresentationEvent extends PresentationEventBase {
  kind: "cardMotion";
  motion: CardMotionKind;
  source: CardMotionZone;
  destination: CardMotionZone;
  cardId?: string;
  cardType?: string;
  amount?: number;
  anonymous?: true;
}

export type PresentationEvent =
  | DrawPresentationEvent
  | SkillPresentationEvent
  | DamagePresentationEvent
  | HpLossPresentationEvent
  | DodgePresentationEvent
  | HealPresentationEvent
  | DeathPresentationEvent
  | JudgmentRevealPresentationEvent
  | JudgmentReplacePresentationEvent
  | JudgmentResultPresentationEvent
  | WuxieCounterPresentationEvent
  | WuxieResultPresentationEvent
  | CardMotionPresentationEvent;

function optionalString(value: unknown, key: string): Record<string, string> {
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function optionalNumber(value: unknown, key: string): Record<string, number> {
  return typeof value === "number" && Number.isFinite(value) ? { [key]: value } : {};
}

function optionalAmount(amount: number | undefined): { amount?: number } {
  return amount === undefined ? {} : { amount };
}

function optionalSourceId(entry: GameLogView): { sourceId?: string } {
  const sourceId = entry.data?.sourceId;
  return typeof sourceId === "string" && sourceId.length > 0 ? { sourceId } : {};
}

const pile = (zone: Extract<CardMotionZone, { kind: "pile" }>['zone']): CardMotionZone => ({ kind: "pile", zone });
const player = (playerId: string, zone: Extract<CardMotionZone, { kind: "player" }>['zone']): CardMotionZone => ({ kind: "player", playerId, zone });

function publicCard(entry: GameLogView): Pick<CardMotionPresentationEvent, "cardId" | "cardType"> {
  return {
    ...(entry.cardId ? { cardId: entry.cardId } : {}),
    ...(entry.cardType ? { cardType: entry.cardType } : {}),
  };
}

function movement(
  matchId: string,
  entry: GameLogView,
  suffix: string,
  motion: CardMotionKind,
  source: CardMotionZone,
  destination: CardMotionZone,
  detail: Pick<CardMotionPresentationEvent, "cardId" | "cardType" | "amount" | "anonymous"> = {},
): CardMotionPresentationEvent {
  return { id: `${matchId}:${entry.id}:motion:${suffix}`, logId: entry.id, kind: "cardMotion", motion, source, destination, ...detail };
}

/** Maps one wire log into presentation semantics only. Localized labels,
 * artwork, coordinates, durations, and playback policy belong to adapters. */
export function mapGameLogToPresentationEvents(matchId: string, entry: GameLogView): PresentationEvent[] {
  if (!entry.actorId) return [];
  const base = { logId: entry.id };

  switch (entry.eventType) {
    case "draw":
    case "swordYyDraw":
      return [
        { ...base, id: `${matchId}:${entry.id}:draw`, kind: "draw", actorId: entry.actorId, ...optionalAmount(entry.amount) },
        movement(matchId, entry, "draw", "draw", pile("draw"), player(entry.actorId, "hand"), { amount: entry.amount ?? 1, anonymous: true }),
      ];
    case "skillUse":
      return [{
        ...base,
        id: `${matchId}:${entry.id}:skill`,
        kind: "skill",
        actorId: entry.actorId,
        ...(entry.skillId ? { skillId: entry.skillId } : {}),
      }];
    case "damage":
      return [{
        ...base,
        id: `${matchId}:${entry.id}:damage`,
        kind: "damage",
        targetId: entry.actorId,
        ...optionalSourceId(entry),
        ...optionalAmount(entry.amount),
      }];
    case "hpLoss":
      return [{ ...base, id: `${matchId}:${entry.id}:hpLoss`, kind: "hpLoss", targetId: entry.actorId, ...optionalAmount(entry.amount) }];
    case "dodge":
      return [{ ...base, id: `${matchId}:${entry.id}:dodge`, kind: "dodge", targetId: entry.actorId, ...optionalSourceId(entry) }];
    case "heal":
      return [{
        ...base,
        id: `${matchId}:${entry.id}:heal`,
        kind: "heal",
        targetId: entry.actorId,
        ...optionalSourceId(entry),
        ...optionalAmount(entry.amount),
      }];
    case "death":
      return [{ ...base, id: `${matchId}:${entry.id}:death`, kind: "death", targetId: entry.actorId }];
    case "judgmentReveal":
      return [{
        ...base, id: `${matchId}:${entry.id}:judgmentReveal`, kind: "judgmentReveal", playerId: entry.actorId,
        ...publicCard(entry), ...optionalString(entry.data?.suit, "suit"), ...optionalNumber(entry.data?.rank, "rank"),
        ...optionalString(entry.data?.reason, "reason"),
      }];
    case "judgmentReplace": {
      const playerId = entry.targetIds?.[0];
      if (!playerId) return [];
      return [{
        ...base, id: `${matchId}:${entry.id}:judgmentReplace`, kind: "judgmentReplace", actorId: entry.actorId, playerId,
        ...publicCard(entry), ...optionalString(entry.data?.previousCardId, "previousCardId"),
        ...optionalString(entry.data?.previousCardType, "previousCardType"), ...optionalString(entry.data?.previousSuit, "previousSuit"),
        ...optionalNumber(entry.data?.previousRank, "previousRank"), ...optionalString(entry.data?.suit, "suit"),
        ...optionalNumber(entry.data?.rank, "rank"),
      }];
    }
    case "judgment":
      return [{
        ...base, id: `${matchId}:${entry.id}:judgmentResult`, kind: "judgmentResult", playerId: entry.actorId,
        ...(entry.cardType ? { cardType: entry.cardType } : {}), ...optionalString(entry.data?.suit, "suit"),
        ...optionalNumber(entry.data?.rank, "rank"), ...optionalString(entry.data?.outcome, "outcome"), ...optionalAmount(entry.amount),
      }];
    case "wuxie":
      return [{
        ...base, id: `${matchId}:${entry.id}:wuxieCounter`, kind: "wuxieCounter", actorId: entry.actorId,
        ...optionalString(entry.data?.targetType, "targetType"), depth: typeof entry.data?.depth === "number" ? entry.data.depth : 1,
      }];
    case "wuxieResult":
      return [{
        ...base, id: `${matchId}:${entry.id}:wuxieResult`, kind: "wuxieResult", actorId: entry.actorId,
        ...optionalString(entry.data?.targetType, "targetType"), effective: entry.data?.effective === true,
      }];
    case "cardPlay":
      return [movement(matchId, entry, "play", "play", player(entry.actorId, "hand"), pile("table"), publicCard(entry))];
    case "discard":
      return [movement(matchId, entry, "discard", "discard", player(entry.actorId, "hand"), pile("discard"), { amount: entry.amount ?? 1, anonymous: true })];
    case "swordIceDiscard":
    case "swordYyDiscard":
    case "guanshiForce":
    case "zhangbaSha":
      return [movement(matchId, entry, "discard", "discard", player(entry.actorId, "hand"), pile("discard"), { amount: entry.amount ?? (entry.eventType === "swordYyDiscard" ? 1 : 2), anonymous: true })];
    case "shunshouSteal": {
      const sourceId = entry.targetIds?.[0];
      if (!sourceId) return [];
      const sourceZone = entry.data?.sourceZone === "equipment" ? "equipment" : "hand";
      return [movement(matchId, entry, "steal", "steal", player(sourceId, sourceZone), player(entry.actorId, "hand"), { amount: 1, anonymous: true })];
    }
    case "equip": {
      const events = [movement(matchId, entry, "equip", "equip", player(entry.actorId, "hand"), player(entry.actorId, "equipment"), publicCard(entry))];
      const replacedCardId = entry.data?.replacedCardId;
      const replacedCardType = entry.data?.replacedCardType;
      if (typeof replacedCardId === "string" || typeof replacedCardType === "string") {
        events.push(movement(matchId, entry, "equipmentLoss", "equipmentLoss", player(entry.actorId, "equipment"), pile("discard"), {
          ...(typeof replacedCardId === "string" ? { cardId: replacedCardId } : {}),
          ...(typeof replacedCardType === "string" ? { cardType: replacedCardType } : {}),
        }));
      }
      return events;
    }
    case "placeDelayed": {
      const targetId = entry.targetIds?.[0];
      return targetId ? [movement(matchId, entry, "delayed", "delayed", player(entry.actorId, "hand"), player(targetId, "judgment"), publicCard(entry))] : [];
    }
    case "forwardShandian": {
      const targetId = entry.targetIds?.[0];
      return targetId ? [movement(matchId, entry, "delayedForward", "delayed", player(entry.actorId, "judgment"), player(targetId, "judgment"), publicCard(entry))] : [];
    }
    case "guoheDiscard": {
      const targetId = entry.targetIds?.[0];
      if (!targetId) return [];
      const sourceZone = entry.data?.sourceZone === "hand" ? "hand" : "equipment";
      return [movement(matchId, entry, sourceZone === "equipment" ? "equipmentLoss" : "discard", sourceZone === "equipment" ? "equipmentLoss" : "discard", player(targetId, sourceZone), pile("discard"), publicCard(entry))];
    }
    case "jiedaoTakeWeapon": {
      const sourceId = entry.targetIds?.[0];
      return sourceId ? [movement(matchId, entry, "stealEquipment", "steal", player(sourceId, "equipment"), player(entry.actorId, "equipment"), publicCard(entry))] : [];
    }
    case "jiedaoWeaponDeclined": {
      const sourceId = entry.targetIds?.[0];
      return sourceId ? [movement(matchId, entry, "equipmentLoss", "equipmentLoss", player(sourceId, "equipment"), pile("discard"), publicCard(entry))] : [];
    }
    case "qilinDestroyHorse":
      return [movement(matchId, entry, "equipmentLoss", "equipmentLoss", player(entry.actorId, "equipment"), pile("discard"), publicCard(entry))];
    case "wuguReveal":
      return [movement(matchId, entry, "wuguReveal", "wuguReveal", pile("draw"), pile("wugu"), { amount: entry.amount ?? 1, anonymous: true })];
    case "wuguPick":
      return [movement(matchId, entry, "wuguPick", "wuguPick", pile("wugu"), player(entry.actorId, "hand"), publicCard(entry))];
    default:
      return [];
  }
}

/** Received array order is authoritative. Never sort engine log IDs because
 * lexical ordering would put log_10 before log_9. */
export function mapGameLogsToPresentationEvents(
  matchId: string,
  entries: readonly GameLogView[],
): PresentationEvent[] {
  return entries.flatMap((entry) => mapGameLogToPresentationEvents(matchId, entry));
}
