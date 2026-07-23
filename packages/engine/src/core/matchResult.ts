// SPEC 8.4 — post-game result & statistics, computed purely from GameState +
// the structured log (ENG-009) so it's deterministic and testable without a
// socket, same rationale as core/view.ts. The log already carries everything
// this needs: "damage" events (actorId = target, data.sourceId = who dealt
// it) are Damage Taken; "hpLoss" is a separate eventType (skill HP costs),
// so it's excluded from Damage Taken for free. "death" events carry
// data.killerId (absent for a natural/no-source death); "forfeit" events
// have no killerId at all, so neither ever counts as a kill — matching
// SPEC 8.4's "disconnect death has no killer, no kill count".
import type { GameState, LogEntry, Role } from "../types";

export interface MatchPlayerSummary {
  id: string;
  seat: number;
  name: string;
  role: Role;
  generalId: string;
  alive: boolean;
  kills: number;
  damageTaken: number;
}

export interface MatchSummary {
  winners: Role[];
  /** "no_winner" only when the lord left/expired mid-match (SPEC 6.5/8.4) —
   *  identity.ts's applyIdentityForfeit sets state.winners = [] for exactly
   *  that case, so an empty winners array is the sole no_winner signal. */
  endReason: "victory" | "no_winner";
  turnNumber: number;
  /** Player ids in the order they died or forfeited. */
  deathOrder: string[];
  /** Empty when nobody has any kills yet; multiple ids on a tie. */
  mostKills: string[];
  /** Empty when nobody has taken any damage yet; multiple ids on a tie. */
  mostDamageTaken: string[];
  players: MatchPlayerSummary[];
  log: LogEntry[];
}

function leadersOf(values: Record<string, number>): string[] {
  const max = Math.max(0, ...Object.values(values));
  if (max <= 0) return [];
  return Object.entries(values)
    .filter(([, v]) => v === max)
    .map(([id]) => id);
}

export function summarizeMatch(state: GameState): MatchSummary {
  const kills: Record<string, number> = {};
  const damageTaken: Record<string, number> = {};
  const deathOrder: string[] = [];

  for (const entry of state.log) {
    if (entry.eventType === "damage" && entry.actorId) {
      damageTaken[entry.actorId] = (damageTaken[entry.actorId] ?? 0) + (entry.amount ?? 0);
    }
    if (entry.eventType === "death" || entry.eventType === "forfeit") {
      if (entry.actorId) deathOrder.push(entry.actorId);
    }
    if (entry.eventType === "death") {
      const killerId = entry.data?.killerId as string | undefined;
      if (killerId) kills[killerId] = (kills[killerId] ?? 0) + 1;
    }
  }

  // SPEC 8.4: players who died earlier still count in the rankings, so this
  // reads every player, alive or not — and reveals role/general for everyone
  // regardless of in-game roleRevealed/generalRevealed (OD-007: the result
  // screen opens every Role).
  const players: MatchPlayerSummary[] = state.players.map((p) => ({
    id: p.id,
    seat: p.seat,
    name: p.name,
    role: p.role,
    generalId: p.generalId,
    alive: p.alive,
    kills: kills[p.id] ?? 0,
    damageTaken: damageTaken[p.id] ?? 0,
  }));

  const winners = state.winners ?? [];

  return {
    winners,
    endReason: winners.length === 0 ? "no_winner" : "victory",
    turnNumber: state.turnNumber,
    deathOrder,
    mostKills: leadersOf(kills),
    mostDamageTaken: leadersOf(damageTaken),
    players,
    log: state.log,
  };
}
