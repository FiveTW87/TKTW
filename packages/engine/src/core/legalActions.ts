// Phase 5 (SPEC §9.2/§9.3) — decision-scoped legal actions and in-flight
// card views, derived from data the engine already computes/tracks. This is
// LEGAL-002 adds server-authoritative card and conversion candidates for an
// open mainAction. LEGAL-003 will add their target candidates; until then the
// server still re-validates every submitted target atomically.
import type { DecisionKind, GameEvent, GameState, PendingDecision } from "../types";
import { CARD_TYPES } from "./cardData";
import {
  countsAsType,
  hasCardConversion,
  mainActionUnavailableReason,
  type CardPlayUnavailableReason,
} from "./cardChecks";
import {
  cardTargetingFor,
  hasLegalTargetSelection,
  type CardTargetingView,
} from "./cardTargets";

export type ResponseDecisionKind = Exclude<
  DecisionKind,
  "mainAction" | "drawCard" | "discardTo" | "discardChosenBy"
>;

type CardPlayAvailability =
  | { available: true }
  | { available: false; unavailableReason: CardPlayUnavailableReason };

export type CardPlayOptionView = {
  source: "literal" | "conversion" | "zhangba";
  typeKey: string;
  selectableCardIds: string[];
  minCards: number;
  maxCards: number;
  exactCards: number;
  asType?: string;
  targeting: CardTargetingView;
} & CardPlayAvailability;

export type LegalActionView =
  | { kind: "playCard"; options: CardPlayOptionView[] }
  | { kind: "useSkill" }
  | { kind: "endPhase" }
  | { kind: "draw" }
  | {
      kind: "discard";
      decisionKind: "discardTo" | "discardChosenBy";
      selectableCardIds: string[];
      minCards: number;
      maxCards: number;
      exactCards?: number;
    }
  | {
      kind: "response";
      decisionKind: ResponseDecisionKind;
      selectableCardIds?: string[];
      targetIds?: string[];
      choices?: string[];
      minCards?: number;
      maxCards?: number;
      exactCards?: number;
    };

// mainAction is the one open-ended decision — the fine-grained "which card as
// which type, targeting whom" affordance is intentionally left to the
// client's own legality modules (see the file header comment).
function numberField(data: Record<string, unknown>, key: string): number | undefined {
  const v = data[key];
  return typeof v === "number" ? v : undefined;
}

function assertNever(value: never): never {
  throw new Error(`legalActionsFor: unhandled decision kind ${String(value)}`);
}

function withAvailability(
  option: Omit<CardPlayOptionView, "available" | "unavailableReason">,
  reason: CardPlayUnavailableReason | undefined,
): CardPlayOptionView {
  const unavailableReason = reason ?? (!hasLegalTargetSelection(option.targeting) ? "no_legal_target" : undefined);
  return unavailableReason
    ? { ...option, available: false, unavailableReason }
    : { ...option, available: true };
}

/** Main-action card candidates with their viewer-safe target contract. Every
 * available option has at least one legal target selection; the server still
 * validates the submitted answer against the live state. */
export function cardPlayOptionsFor(state: GameState, playerId: string): CardPlayOptionView[] {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return [];
  const options: CardPlayOptionView[] = [];
  const typeKeys = Object.keys(CARD_TYPES);

  for (const card of player.hand) {
    options.push(
      withAvailability(
        {
          source: "literal",
          typeKey: card.typeKey,
          selectableCardIds: [card.id],
          minCards: 1,
          maxCards: 1,
          exactCards: 1,
          targeting: cardTargetingFor(state, playerId, card.typeKey, 1),
        },
        mainActionUnavailableReason(state, playerId, card.typeKey),
      ),
    );

    for (const typeKey of typeKeys) {
      if (typeKey === card.typeKey) continue;
      const allowedNow = countsAsType(state, playerId, card.id, typeKey, "mainAction");
      const belongsToPlayer = allowedNow || hasCardConversion(state, playerId, card.id, typeKey);
      if (!belongsToPlayer) continue;
      const reason = allowedNow
        ? mainActionUnavailableReason(state, playerId, typeKey)
        : "conversion_wrong_context";
      options.push(
        withAvailability(
          {
            source: "conversion",
            typeKey,
            asType: typeKey,
            selectableCardIds: [card.id],
            minCards: 1,
            maxCards: 1,
            exactCards: 1,
            targeting: cardTargetingFor(state, playerId, typeKey, 1),
          },
          reason,
        ),
      );
    }
  }

  if (player.equipment.weapon?.typeKey === "zhangba") {
    const selectableCardIds = player.hand.filter((card) => card.typeKey !== "sha").map((card) => card.id);
    const reason =
      selectableCardIds.length < 2
        ? "insufficient_cards"
        : mainActionUnavailableReason(state, playerId, "sha");
    options.push(
      withAvailability(
        {
          source: "zhangba",
          typeKey: "sha",
          selectableCardIds,
          minCards: 2,
          maxCards: 2,
          exactCards: 2,
          targeting: cardTargetingFor(state, playerId, "sha", 2),
        },
        reason,
      ),
    );
  }

  return options;
}

function stringArrayField(data: Record<string, unknown>, key: string): string[] | undefined {
  const v = data[key];
  return Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : undefined;
}

/** Builds the LegalActionView(s) for whatever decision is currently pending —
 *  but ONLY for the player who actually owns it. Pass the raw (unredacted)
 *  state.pendingDecision plus the viewer's own id; a non-owner always gets
 *  an empty array, by construction — legalActions describes "what can I,
 *  the viewer, legally do right now", and if it isn't the viewer's decision
 *  the answer is "nothing". This matters beyond the obvious (someone else's
 *  turn isn't yours to answer): view.ts's own projectDecision only redacts
 *  `data` for a couple of decision kinds (pickGeneral/guandouOrder) — a
 *  decision like discardTo carries the actor's own hand as
 *  `selectableCardIds`, which must never surface in anyone else's
 *  legalActions regardless of what projectDecision does with `data` itself. */
export function legalActionsFor(
  pd: PendingDecision | undefined,
  viewerId: string,
  state?: GameState,
): LegalActionView[] {
  if (!pd || pd.playerId !== viewerId) return [];
  const data = pd.data as Record<string, unknown>;

  const selectableCardIds = stringArrayField(data, "selectableCardIds");
  const targetIds = stringArrayField(data, "targetIds");
  const options = stringArrayField(data, "options");
  const minCards = numberField(data, "minCards");
  const maxCards = numberField(data, "maxCards");
  const exactCards = numberField(data, "exactCards");

  switch (pd.kind) {
    case "mainAction":
      return [
        { kind: "playCard", options: state ? cardPlayOptionsFor(state, viewerId) : [] },
        { kind: "useSkill" },
        { kind: "endPhase" },
      ];
    case "drawCard":
      return [{ kind: "draw" }];
    case "discardTo":
    case "discardChosenBy":
      return [
        {
          kind: "discard",
          decisionKind: pd.kind,
          selectableCardIds: selectableCardIds ?? [],
          minCards: minCards ?? 0,
          maxCards: maxCards ?? 0,
          ...(exactCards !== undefined ? { exactCards } : {}),
        },
      ];
    case "respondShan":
    case "respondSha":
    case "respondTao":
    case "askWuxie":
    case "activateSkill":
    case "pickCardFromPlayer":
    case "wuguPick":
    case "judgmentReveal":
    case "pickGeneral":
    case "tuxiTargets":
    case "swordIceChoice":
    case "qilinDestroyHorse":
    case "guanshiForce":
    case "qinglongReplay":
    case "swordYyChoice":
    case "jiedaoForceSha":
    case "jiedaoWeaponSwap":
    case "hujiaVolunteer":
    case "huibiRedirect":
    case "yijiGive":
    case "fankuiPick":
    case "guicaiReplace":
    case "ganglieChoice":
    case "fanjianGuess":
    case "guandouOrder":
      return [
        {
          kind: "response",
          decisionKind: pd.kind,
          ...(selectableCardIds ? { selectableCardIds } : {}),
          ...(targetIds ? { targetIds } : {}),
          ...(options ? { choices: options } : {}),
          ...(minCards !== undefined ? { minCards } : {}),
          ...(maxCards !== undefined ? { maxCards } : {}),
          ...(exactCards !== undefined ? { exactCards } : {}),
        },
      ];
    default:
      return assertNever(pd.kind);
  }
}

export interface PlayedCardEventView {
  eventId: string;
  type: string;
  sourceId?: string;
  cardId?: string;
  targetIds?: string[];
  cancelled: boolean;
}

function toPlayedCardView(e: GameEvent): PlayedCardEventView {
  return {
    eventId: e.id,
    type: e.type,
    ...(e.source ? { sourceId: e.source } : {}),
    ...(e.cards?.[0] ? { cardId: e.cards[0] } : {}),
    ...(e.targets?.length ? { targetIds: e.targets } : {}),
    cancelled: e.cancelled,
  };
}

/** SPEC §9.2's latestPlayedCard/resolvingCard: eventStack only ever holds a
 *  wuxie-response chain (see core/wuxieWindow.ts) — the OUTERMOST entry is
 *  the card that opened the current window (latestPlayedCard), the
 *  INNERMOST is whatever's actively being contested right now (resolvingCard,
 *  same as latestPlayedCard when there's no nested wuxie chain). Both are
 *  absent outside an active wuxie window. */
export function deriveLatestAndResolvingCard(eventStack: readonly GameEvent[]): {
  latestPlayedCard?: PlayedCardEventView;
  resolvingCard?: PlayedCardEventView;
} {
  if (eventStack.length === 0) return {};
  return {
    latestPlayedCard: toPlayedCardView(eventStack[0]!),
    resolvingCard: toPlayedCardView(eventStack.at(-1)!),
  };
}
