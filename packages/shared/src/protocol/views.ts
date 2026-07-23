// Phase 5 (SPEC §9.2/§9.3) — the unified, Zod-typed view-model the server
// assembles per-viewer and the client renders from exclusively (it never
// imports @tktw/engine or touches private GameState — see §9.5's gate).
//
// These are Zod schemas (not hand-written interfaces) so there's ONE source
// of truth for the shape: the TS types are `z.infer`'d from them, and the
// same schemas validate a server-assembled view at the dev/test boundary
// (see server/rooms/gameFlow.ts and the projection snapshot tests) — no
// separate "does the object I built actually match the type I claimed"
// drift is possible. This does NOT run on the client's hot path (every
// broadcast) — only at assembly/test time, per the locked scope.
import { z } from "zod";

export const suitSchema = z.enum(["spade", "heart", "club", "diamond"]);
export const rankSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7),
  z.literal(8), z.literal(9), z.literal(10), z.literal(11), z.literal(12), z.literal(13),
]);
export const cardViewSchema = z.object({
  id: z.string(),
  typeKey: z.string(),
  suit: suitSchema,
  rank: rankSchema,
});

export const hiddenCountSchema = z.object({ count: z.number().int().min(0) });

export const roleSchema = z.enum(["lord", "loyalist", "rebel", "traitor"]);
export const factionSchema = z.enum(["wei", "shu", "wu", "qun"]);
export const genderSchema = z.enum(["male", "female"]);
export const gamePhaseSchema = z.enum(["prepare", "judge", "draw", "play", "discard", "end"]);
export const matchStatusSchema = z.enum(["active", "finished", "abandoned"]);
export const connectionStatusSchema = z.enum(["connected", "reconnecting", "gone"]);

const equipSlotSchema = z.enum(["weapon", "armor", "horseMinus", "horsePlus"]);

// SPEC §9.3 — connectionStatus lives HERE now (server-injected via the
// match's seatAssignment), not cross-referenced from a separate room-state
// payload the way the pre-Phase-5 client had to.
export const playerViewSchema = z.object({
  id: z.string(),
  seat: z.number().int(),
  name: z.string(),
  connectionStatus: connectionStatusSchema,
  role: roleSchema.optional(), // absent unless self / lord / dead
  roleRevealed: z.boolean(),
  generalId: z.string(), // "" unless self / generalRevealed
  generalRevealed: z.boolean(),
  faction: factionSchema,
  gender: genderSchema,
  hp: z.number().int(),
  maxHp: z.number().int(),
  alive: z.boolean(),
  hand: z.union([z.array(cardViewSchema), hiddenCountSchema]),
  equipment: z.partialRecord(equipSlotSchema, cardViewSchema),
  // "Delayed Tricks" per §9.3 — the judgment zone IS where a player's
  // pending delayed tricks (e.g. lebusishu/shandian) sit until judged.
  judgmentZone: z.array(cardViewSchema),
  shaUsedThisTurn: z.number().int(),
  skillUsedThisTurn: z.record(z.string(), z.number().int()),
});

export const decisionViewSchema = z.object({
  id: z.string(),
  kind: z.string(),
  playerId: z.string(),
  data: z.record(z.string(), z.unknown()),
  // §9.4 timer — absent for a decision that isn't independently timed
  // (e.g. one resolved instantly server-side); present whenever the server
  // has armed a real deadline for it.
  startedAt: z.number().optional(),
  expiresAt: z.number().optional(),
});

export const legalActionViewSchema = z.object({
  kind: z.string(),
  selectableCardIds: z.array(z.string()).optional(),
  minCards: z.number().int().optional(),
  maxCards: z.number().int().optional(),
  exactCards: z.number().int().optional(),
  targetIds: z.array(z.string()).optional(),
  choices: z.array(z.string()).optional(),
});

export const playedCardViewSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  sourceId: z.string().optional(),
  cardId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  cancelled: z.boolean(),
});

export const gameLogViewSchema = z.object({
  id: z.string(),
  turn: z.number().int(),
  eventType: z.string(),
  actorId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  cardId: z.string().optional(),
  cardType: z.string().optional(),
  skillId: z.string().optional(),
  amount: z.number().optional(),
  visibility: z.enum(["public", "private"]),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const matchPlayerSummaryViewSchema = z.object({
  id: z.string(),
  seat: z.number().int(),
  name: z.string(),
  role: roleSchema,
  generalId: z.string(),
  alive: z.boolean(),
  kills: z.number().int(),
  damageTaken: z.number().int(),
});

// SPEC §8.4's MatchResult, wrapped for the view-model (matchId/durationMs
// are the server-only bits summarizeMatch() itself can't compute).
export const matchResultViewSchema = z.object({
  matchId: z.string(),
  durationMs: z.number(),
  winners: z.array(roleSchema),
  endReason: z.enum(["victory", "no_winner"]),
  turnNumber: z.number().int(),
  deathOrder: z.array(z.string()),
  mostKills: z.array(z.string()),
  mostDamageTaken: z.array(z.string()),
  players: z.array(matchPlayerSummaryViewSchema),
  log: z.array(gameLogViewSchema),
});

// SPEC §9.2 — the single unified view-model. Assembled server-side from the
// engine's projectFor(state, viewerId) (the game slice) plus room meta
// (roomCode/matchId/matchStatus/serverNow/connectionStatus/legalActions).
export const gameViewSchema = z.object({
  roomCode: z.string(),
  matchId: z.string(),
  matchStatus: matchStatusSchema,

  viewerPlayerId: z.string(),
  viewerSeatIndex: z.number().int(),
  players: z.array(playerViewSchema),

  turnNumber: z.number().int(),
  currentTurnPlayerId: z.string().optional(),
  currentPhase: gamePhaseSchema.optional(),

  pendingDecision: decisionViewSchema.optional(),
  legalActions: z.array(legalActionViewSchema),

  drawPileCount: z.number().int(),
  discardPileCount: z.number().int(),
  discardPileTop: cardViewSchema.optional(),
  // Beyond §9.2's literal shape (discardPileCount/discardPileTop): the
  // discard pile is a PUBLIC zone by the game's own rules (unlike the draw
  // pile, whose order must stay hidden) — the engine's projectFor already
  // sends the full pile to every viewer, and the client's existing discard
  // browser (SPEC P6) needs the whole array, not just the top card.
  discardPile: z.array(cardViewSchema),
  latestPlayedCard: playedCardViewSchema.optional(),
  resolvingCard: playedCardViewSchema.optional(),

  gameLogs: z.array(gameLogViewSchema),
  result: matchResultViewSchema.optional(),

  finished: z.boolean(),

  serverNow: z.number(),
});

export type CardView = z.infer<typeof cardViewSchema>;
export type HiddenCountView = z.infer<typeof hiddenCountSchema>;
export type PlayerView = z.infer<typeof playerViewSchema>;
export type DecisionView = z.infer<typeof decisionViewSchema>;
export type LegalActionView = z.infer<typeof legalActionViewSchema>;
export type PlayedCardView = z.infer<typeof playedCardViewSchema>;
export type GameLogView = z.infer<typeof gameLogViewSchema>;
export type MatchResultView = z.infer<typeof matchResultViewSchema>;
export type GameView = z.infer<typeof gameViewSchema>;
