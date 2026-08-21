import type { GameState } from "../types";
import { cardDef } from "./cardData";
import { canAttack, distanceNet } from "./distance";
import { getPlayer } from "./state";
import { queryHook } from "./triggers";

export type CardTargetingView =
  | { kind: "none"; minTargets: 0; maxTargets: 0 }
  | { kind: "fixed"; minTargets: 0; maxTargets: 0; targetIds: string[] }
  | {
      kind: "independent";
      minTargets: number;
      maxTargets: number;
      eligibleTargetIds: string[];
      implicitTargetId?: string;
    }
  | {
      kind: "dependent";
      minTargets: 2;
      maxTargets: 2;
      firstTargetIds: string[];
      secondTargetIdsByFirst: Record<string, string[]>;
    };

const NO_SELF_TARGET = new Set(["sha", "guohe", "shunshou", "juedou"]);
const NEEDS_A_TAKEABLE_CARD = new Set(["guohe", "shunshou"]);

export function forbidsSelfTarget(typeKey: string): boolean {
  return NO_SELF_TARGET.has(typeKey);
}

export function requiresTakeableCard(typeKey: string): boolean {
  return NEEDS_A_TAKEABLE_CARD.has(typeKey);
}

export function holdsATakeableCard(state: GameState, id: string): boolean {
  const player = getPlayer(state, id);
  return player.hand.length > 0 || Object.values(player.equipment).some(Boolean);
}

export function canBeTargetedByCard(
  state: GameState,
  cardTypeKey: string,
  sourceId: string,
  targetId: string,
): boolean {
  return queryHook<boolean>(
    state,
    "canBeTargetedBy",
    { cardTypeKey, sourceId, targetId },
    (results) => results.every(Boolean),
    true,
  );
}

export function eligibleShaTargetIds(state: GameState, sourceId: string): string[] {
  return state.players
    .filter(
      (target) =>
        target.alive &&
        target.id !== sourceId &&
        canAttack(state, sourceId, target.id) &&
        canBeTargetedByCard(state, "sha", sourceId, target.id),
    )
    .map((target) => target.id);
}

export function assertShaTargets(
  state: GameState,
  playerId: string,
  typeKey: string,
  targetIds: string[],
): void {
  if (new Set(targetIds).size !== targetIds.length) {
    throw new Error(`${playerId}: duplicate target id for ${typeKey}`);
  }
  for (const targetId of targetIds) {
    if (targetId === playerId) throw new Error(`${playerId}: cannot target themselves with ${typeKey}`);
    if (!getPlayer(state, targetId).alive) throw new Error(`${playerId}: target ${targetId} is not alive`);
    if (!canAttack(state, playerId, targetId)) {
      throw new Error(`${playerId}: target ${targetId} is out of range for ${typeKey}`);
    }
    if (!canBeTargetedByCard(state, typeKey, playerId, targetId)) {
      throw new Error(`${playerId}: ${targetId} cannot be targeted by ${typeKey}`);
    }
  }
}

function eligibleSingleTargetIds(state: GameState, sourceId: string, typeKey: string): string[] {
  const def = cardDef(typeKey);
  const ignoresRange =
    typeof def.range === "number" &&
    queryHook<boolean>(
      state,
      "ignoresCardRange",
      { playerId: sourceId },
      (results) => results.some(Boolean),
      false,
    );

  return state.players
    .filter((target) => {
      if (!target.alive) return false;
      if (forbidsSelfTarget(typeKey) && target.id === sourceId) return false;
      if (requiresTakeableCard(typeKey) && !holdsATakeableCard(state, target.id)) return false;
      if (!canBeTargetedByCard(state, typeKey, sourceId, target.id)) return false;
      if (typeof def.range === "number" && !ignoresRange && distanceNet(state, sourceId, target.id) > def.range) {
        return false;
      }
      if (
        def.category === "delayedTrick" &&
        target.judgmentZone.some((card) => card.typeKey === typeKey)
      ) {
        return false;
      }
      return true;
    })
    .map((target) => target.id);
}

export function jiedaoVictimsByArmed(
  state: GameState,
  sourceId: string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const armed of state.players) {
    if (!armed.alive || armed.id === sourceId || !armed.equipment.weapon) continue;
    if (!canBeTargetedByCard(state, "jiedao", sourceId, armed.id)) continue;
    const victims = state.players
      .filter(
        (victim) =>
          victim.alive &&
          victim.id !== sourceId &&
          victim.id !== armed.id &&
          canAttack(state, armed.id, victim.id) &&
          canBeTargetedByCard(state, "sha", armed.id, victim.id),
      )
      .map((victim) => victim.id);
    if (victims.length > 0) result[armed.id] = victims;
  }
  return result;
}

export function cardTargetingFor(
  state: GameState,
  playerId: string,
  typeKey: string,
  spentCardCount: number,
): CardTargetingView {
  const def = cardDef(typeKey);
  const aliveIds = state.players.filter((player) => player.alive).map((player) => player.id);

  if (def.category === "equipment" || def.targetRule === "respondOnly" || def.targetRule === "targetTrick") {
    return { kind: "none", minTargets: 0, maxTargets: 0 };
  }
  if (def.targetRule === "self") {
    return { kind: "fixed", minTargets: 0, maxTargets: 0, targetIds: [playerId] };
  }
  if (def.targetRule === "allOthers") {
    return {
      kind: "fixed",
      minTargets: 0,
      maxTargets: 0,
      targetIds: aliveIds.filter((id) => id !== playerId),
    };
  }
  if (def.targetRule === "allIncludingSelf") {
    return { kind: "fixed", minTargets: 0, maxTargets: 0, targetIds: aliveIds };
  }
  if (def.targetRule === "selfOrDying") {
    const eligibleTargetIds = state.players
      .filter((player) => player.alive && player.hp < player.maxHp)
      .map((player) => player.id);
    const selfIsEligible = eligibleTargetIds.includes(playerId);
    return {
      kind: "independent",
      minTargets: selfIsEligible ? 0 : 1,
      maxTargets: 1,
      eligibleTargetIds,
      ...(selfIsEligible ? { implicitTargetId: playerId } : {}),
    };
  }
  if (def.targetRule === "singleInRange") {
    const player = getPlayer(state, playerId);
    const fangtianLastCard =
      typeKey === "sha" &&
      player.equipment.weapon?.typeKey === "fangtian" &&
      player.hand.length === spentCardCount;
    return {
      kind: "independent",
      minTargets: 1,
      maxTargets: fangtianLastCard ? 3 : 1,
      eligibleTargetIds: eligibleShaTargetIds(state, playerId),
    };
  }
  if (def.targetRule === "singleArmed") {
    const secondTargetIdsByFirst = jiedaoVictimsByArmed(state, playerId);
    return {
      kind: "dependent",
      minTargets: 2,
      maxTargets: 2,
      firstTargetIds: Object.keys(secondTargetIdsByFirst),
      secondTargetIdsByFirst,
    };
  }
  if (def.targetRule === "single") {
    return {
      kind: "independent",
      minTargets: 1,
      maxTargets: 1,
      eligibleTargetIds: eligibleSingleTargetIds(state, playerId, typeKey),
    };
  }

  return { kind: "none", minTargets: 0, maxTargets: 0 };
}

export function hasLegalTargetSelection(targeting: CardTargetingView): boolean {
  switch (targeting.kind) {
    case "none":
    case "fixed":
      return true;
    case "independent":
      return targeting.minTargets === 0 || targeting.eligibleTargetIds.length >= targeting.minTargets;
    case "dependent":
      return targeting.firstTargetIds.length > 0;
  }
}
