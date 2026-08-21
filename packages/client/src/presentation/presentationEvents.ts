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

export type PresentationEvent =
  | DrawPresentationEvent
  | SkillPresentationEvent
  | DamagePresentationEvent
  | HpLossPresentationEvent
  | DodgePresentationEvent
  | HealPresentationEvent
  | DeathPresentationEvent;

function optionalAmount(amount: number | undefined): { amount?: number } {
  return amount === undefined ? {} : { amount };
}

function optionalSourceId(entry: GameLogView): { sourceId?: string } {
  const sourceId = entry.data?.sourceId;
  return typeof sourceId === "string" && sourceId.length > 0 ? { sourceId } : {};
}

/** Maps one wire log into presentation semantics only. Localized labels,
 * artwork, coordinates, durations, and playback policy belong to adapters. */
export function mapGameLogToPresentationEvents(matchId: string, entry: GameLogView): PresentationEvent[] {
  if (!entry.actorId) return [];
  const base = { logId: entry.id };

  switch (entry.eventType) {
    case "draw":
      return [{ ...base, id: `${matchId}:${entry.id}:draw`, kind: "draw", actorId: entry.actorId, ...optionalAmount(entry.amount) }];
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
