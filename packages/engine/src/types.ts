// Core types — engine/ is pure TypeScript, no framework, no network, no DOM.
// See SPEC.md section 13.1 for the source of truth this file implements.

export type Suit = "spade" | "heart" | "club" | "diamond";
export type Color = "red" | "black";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; // 1=A, 11=J, 12=Q, 13=K

export type Faction = "wei" | "shu" | "wu" | "qun";
export type Role = "lord" | "loyalist" | "rebel" | "traitor";
export type Gender = "male" | "female";

export type CardCategory = "basic" | "trick" | "delayedTrick" | "equipment";
export type EquipSlot = "weapon" | "armor" | "horseMinus" | "horsePlus";

export interface Card {
  id: string; // "spade_1_1" = {suit}_{rank}_{copy}
  typeKey: string; // "sha" | "shan" | "tao" | "crossbow" | ...
  suit: Suit;
  rank: Rank;
}

export const colorOf = (suit: Suit): Color =>
  suit === "heart" || suit === "diamond" ? "red" : "black";

export type Zone = "hand" | "equipment" | "judgment" | "drawPile" | "discardPile";

export interface Player {
  id: string;
  seat: number;
  name: string;

  role: Role;
  roleRevealed: boolean;

  generalId: string;
  faction: Faction;
  gender: Gender;

  hp: number;
  maxHp: number;
  alive: boolean;

  hand: Card[];
  equipment: Partial<Record<EquipSlot, Card>>;
  judgmentZone: Card[]; // index 0 = oldest; LIFO processing reads from the end

  shaUsedThisTurn: number;
  skillUsedThisTurn: Record<string, number>;
}

export type Phase =
  | "prepare"
  | "judge"
  | "draw"
  | "play"
  | "discard"
  | "end";

export interface GameEvent {
  id: string;
  type: string;
  source?: string;
  targets?: string[];
  cards?: string[];
  cancelled: boolean; // wuxie flips this
  data: Record<string, unknown>;
}

/**
 * A decision the engine is waiting on. Not time-aware — deadline/timeout
 * handling belongs to the server (P4), never to the engine.
 */
export interface PendingDecision {
  id: string;
  kind: string; // "askForCard" | "askYesNo" | "chooseTarget" | ...
  playerId: string;
  data: Record<string, unknown>;
}

export interface LogEntry {
  turn: number;
  text: string;
  data?: Record<string, unknown>;
}

export interface GameState {
  seed: number;
  /** Monotonic counter for event/decision ids. Lives on state (not a module
   *  global) so two independently-created sessions with the same seed and
   *  the same replayed answers produce byte-identical ids — required for
   *  TC-6 determinism (`expect(g1.state).toEqual(g2.state)`). */
  seq: number;
  players: Player[];
  currentSeat: number;
  turnNumber: number;
  phase: Phase;
  drawPile: Card[];
  discardPile: Card[];
  eventStack: GameEvent[];
  pendingDecision?: PendingDecision;
  finished: boolean;
  winners?: Role[];
  log: LogEntry[];
  /** Set by เพลินจนลืมแคว้นสู่'s judge handler, consumed and cleared by
   *  runTurn before entering the play phase. */
  skipPlayPhase?: boolean;
}

/** Answer fed back into a suspended decision generator via gen.next(answer). */
export interface PlayerAnswer {
  decisionId: string;
  playerId: string;
  cardIds?: string[];
  targetIds?: string[];
  choice?: string;
  skillId?: string; // choice === "useSkill": which active skill to invoke
  pass?: boolean;
}

/** One entry in the append-only decision log used to recover a Game after a
 *  process restart (see engine/src/core/decisions.ts for the replay driver). */
export interface DecisionLogEntry {
  decisionId: string;
  answer: PlayerAnswer;
}
