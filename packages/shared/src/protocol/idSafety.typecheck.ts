import type { CardId, ClientActionId, DecisionId, MatchId, PlayerId } from "./ids";

declare const cardId: CardId;
declare const clientActionId: ClientActionId;
declare const decisionId: DecisionId;
declare const matchId: MatchId;
declare const playerId: PlayerId;

// Branded IDs still pass through existing string-based engine APIs.
const strings: string[] = [cardId, clientActionId, decisionId, matchId, playerId];
void strings;

// Each package seam rejects a different opaque ID even though all IDs remain
// plain strings at runtime.
// @ts-expect-error CardId must not be accepted as PlayerId.
const wrongPlayer: PlayerId = cardId;
// @ts-expect-error MatchId must not be accepted as DecisionId.
const wrongDecision: DecisionId = matchId;
// @ts-expect-error DecisionId must not be accepted as ClientActionId.
const wrongAction: ClientActionId = decisionId;

void wrongPlayer;
void wrongDecision;
void wrongAction;
