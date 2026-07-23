// Hidden-information filter. SPEC 14.2 + design-review resolution: this
// lives in engine/, not server/, so it is a single source of truth used by
// both the M1 headless bot fuzz-test AND the real server later — a bot that
// only sees this view can never accidentally "cheat" by reading GameState
// directly, which is exactly what makes the fuzz test meaningful.
import type {
  Card,
  Faction,
  Gender,
  GameEvent,
  GameState,
  LogEntry,
  PendingDecision,
  Phase,
  Player,
  Role,
} from "../types";

export interface HiddenCount {
  count: number;
}

export interface PlayerView {
  id: string;
  seat: number;
  name: string;
  role: Role | undefined; // undefined unless self / lord / dead
  roleRevealed: boolean;
  generalId: string; // "" unless self / generalRevealed
  generalRevealed: boolean;
  faction: Faction;
  gender: Gender;
  hp: number;
  maxHp: number;
  alive: boolean;
  hand: Card[] | HiddenCount;
  equipment: Player["equipment"];
  judgmentZone: Card[];
  shaUsedThisTurn: number;
  skillUsedThisTurn: Record<string, number>;
}

export interface GameView {
  viewerId: string;
  players: PlayerView[];
  currentSeat: number;
  turnNumber: number;
  phase: Phase;
  drawPile: HiddenCount;
  discardPile: Card[];
  eventStack: GameEvent[];
  pendingDecision?: PendingDecision;
  finished: boolean;
  winners?: Role[];
  log: LogEntry[];
  // Deliberately absent: `seed`. Sending it would let a client precompute
  // the entire remaining deck order.
}

// SPEC 7.1/7.3: a player's general (and anything derived from it — faction,
// gender, HP) must stay hidden from everyone but its owner until the reveal.
// The lord's general is public the instant the lord confirms; everyone
// else's reveals together once the last non-lord has picked — both tracked
// by `generalRevealed` (set in modes/identity.ts). Neutral placeholders are
// sent instead of the real values so nothing leaks early.
function projectPlayer(p: Player, viewerId: string): PlayerView {
  const roleVisible = p.id === viewerId || p.role === "lord" || !p.alive;
  const genVisible = p.id === viewerId || p.generalRevealed;
  return {
    id: p.id,
    seat: p.seat,
    name: p.name,
    role: roleVisible ? p.role : undefined,
    roleRevealed: p.roleRevealed,
    generalId: genVisible ? p.generalId : "",
    generalRevealed: p.generalRevealed,
    faction: genVisible ? p.faction : "qun",
    gender: genVisible ? p.gender : "male",
    hp: genVisible ? p.hp : 0,
    maxHp: genVisible ? p.maxHp : 0,
    alive: p.alive,
    hand: p.id === viewerId ? p.hand.slice() : { count: p.hand.length },
    equipment: { ...p.equipment },
    judgmentZone: p.judgmentZone.slice(),
    shaUsedThisTurn: p.shaUsedThisTurn,
    skillUsedThisTurn: { ...p.skillUsedThisTurn },
  };
}

// ENG-007: decisions whose `data` carries information only the responder is
// allowed to see (ขงเบ้ง's peeked card ids, a player's private general options).
// For everyone else the data is redacted so the card ids never leave the wire
// to non-responders. Public decisions (respondShan's sourceId, etc.) stay.
const PRIVATE_DECISION_KINDS = new Set<string>(["guandouOrder", "pickGeneral"]);

function projectDecision(pd: NonNullable<GameState["pendingDecision"]>, viewerId: string) {
  if (pd.playerId !== viewerId && PRIVATE_DECISION_KINDS.has(pd.kind)) {
    return { ...pd, data: {} };
  }
  return { ...pd };
}

export function projectFor(state: GameState, viewerId: string): GameView {
  return {
    viewerId,
    players: state.players.map((p) => projectPlayer(p, viewerId)),
    currentSeat: state.currentSeat,
    turnNumber: state.turnNumber,
    phase: state.phase,
    drawPile: { count: state.drawPile.length },
    discardPile: state.discardPile.slice(),
    eventStack: state.eventStack.map((e) => ({ ...e })),
    ...(state.pendingDecision ? { pendingDecision: projectDecision(state.pendingDecision, viewerId) } : {}),
    finished: state.finished,
    ...(state.winners ? { winners: [...state.winners] } : {}),
    // ENG-009: private log entries are only visible to their actor.
    log: state.log.filter((e) => e.visibility === "public" || e.actorId === viewerId),
  };
}
