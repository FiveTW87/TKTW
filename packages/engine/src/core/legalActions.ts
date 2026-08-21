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
import type { DecisionKind, GameEvent, PendingDecision } from "../types";

export type ResponseDecisionKind = Exclude<
  DecisionKind,
  "mainAction" | "drawCard" | "discardTo" | "discardChosenBy"
>;

export type LegalActionView =
  // LEGAL-002 and LEGAL-003 add the fine-grained card/skill candidates. These
  // marker variants already let consumers route the action exhaustively.
  | { kind: "playCard" }
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

  const selectableCardIds = stringArrayField(data, "selectableCardIds");
  const targetIds = stringArrayField(data, "targetIds");
  const options = stringArrayField(data, "options");
  const minCards = numberField(data, "minCards");
  const maxCards = numberField(data, "maxCards");
  const exactCards = numberField(data, "exactCards");

  switch (pd.kind) {
    case "mainAction":
      return [{ kind: "playCard" }, { kind: "useSkill" }, { kind: "endPhase" }];
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
