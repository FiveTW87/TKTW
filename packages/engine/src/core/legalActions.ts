// Phase 5 (SPEC §9.2/§9.3) — decision-scoped legal actions and in-flight
// card views, derived from data the engine already computes/tracks. This is
// deliberately NOT a full server-authoritative enumeration of every legal
// card/target combination for an open mainAction — the client's existing
// legality modules (cardMeta/distance/conversions/skillInteraction) already
// do that from projected state, and the server re-validates every answer
// atomically regardless. What this DOES give the client: the legal shape of
// an answer to whatever decision is actually pending right now (how many
// cards, which ids, which targets, which high-level choices) — real,
// server-authoritative info without reimplementing the ruleset here.
import type { GameEvent, PendingDecision } from "../types";

export interface LegalActionView {
  /** Mirrors PendingDecision.kind — which decision this describes the legal
   *  answer shape for. */
  kind: string;
  selectableCardIds?: string[];
  minCards?: number;
  maxCards?: number;
  exactCards?: number;
  /** Valid target ids, when the decision has a fixed candidate set (not
   *  applicable to open-ended mainAction targeting, which stays client-derived). */
  targetIds?: string[];
  /** High-level named choices (e.g. mainAction's ["playCard","useSkill","endPhase"],
   *  or a fixed option list like pickGeneral's/guandouOrder's candidates). */
  choices?: string[];
}

// mainAction is the one open-ended decision — the fine-grained "which card as
// which type, targeting whom" affordance is intentionally left to the
// client's own legality modules (see the file header comment).
const MAIN_ACTION_CHOICES = ["playCard", "useSkill", "endPhase"];

function numberField(data: Record<string, unknown>, key: string): number | undefined {
  const v = data[key];
  return typeof v === "number" ? v : undefined;
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
export function legalActionsFor(pd: PendingDecision | undefined, viewerId: string): LegalActionView[] {
  if (!pd || pd.playerId !== viewerId) return [];
  const data = pd.data as Record<string, unknown>;

  if (pd.kind === "mainAction") {
    return [{ kind: pd.kind, choices: MAIN_ACTION_CHOICES }];
  }

  const selectableCardIds = stringArrayField(data, "selectableCardIds");
  const options = stringArrayField(data, "options");
  const minCards = numberField(data, "minCards");
  const maxCards = numberField(data, "maxCards");
  const exactCards = numberField(data, "exactCards");

  const view: LegalActionView = { kind: pd.kind };
  if (selectableCardIds) view.selectableCardIds = selectableCardIds;
  if (minCards !== undefined) view.minCards = minCards;
  if (maxCards !== undefined) view.maxCards = maxCards;
  if (exactCards !== undefined) view.exactCards = exactCards;
  if (options) view.choices = options;
  return [view];
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
