// SPEC section 3. P0/P1 run without real generals/roles (that's P2/P3) —
// every player gets the "none" placeholder general and a dummy role so the
// Player type stays fully populated without touching engine/core/ later.
import type { GameState, Player } from "../types";
import type { Rng } from "./rng";
import { ALL_CARDS } from "./cardData";

export interface SetupOptions {
  playerCount: number;
  seed: number;
  names?: string[];
}

export function createInitialState(opts: SetupOptions, rng: Rng): GameState {
  const { playerCount, seed, names } = opts;
  if (playerCount < 3 || playerCount > 10) {
    throw new Error("playerCount must be between 3 and 10");
  }

  const drawPile = rng.shuffle(ALL_CARDS);
  const players: Player[] = [];
  for (let seat = 0; seat < playerCount; seat++) {
    players.push({
      id: `p${seat}`,
      seat,
      name: names?.[seat] ?? `ผู้เล่น ${seat + 1}`,
      role: "rebel", // placeholder; modes/identity.ts assigns real roles for P3
      roleRevealed: false,
      generalId: "none",
      generalRevealed: false,
      faction: "qun",
      gender: "male",
      hp: 4,
      maxHp: 4,
      alive: true,
      hand: [],
      equipment: {},
      judgmentZone: [],
      shaUsedThisTurn: 0,
      skillUsedThisTurn: {},
    });
  }

  const state: GameState = {
    seed,
    seq: 0,
    players,
    currentSeat: 0,
    turnNumber: 0,
    phase: "prepare",
    drawPile,
    discardPile: [],
    eventStack: [],
    finished: false,
    log: [],
  };

  for (const p of state.players) {
    for (let i = 0; i < 4; i++) {
      const c = state.drawPile.pop();
      if (c) p.hand.push(c);
    }
  }

  return state;
}
