import { describe, it, expect } from "vitest";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { summarizeMatch } from "../src/core/matchResult";
import type { GameState, LogEntry, Role } from "../src/types";

function bareState(playerCount: number, roles: Role[]): GameState {
  const rng = createRng(1);
  const state = createInitialState({ playerCount, seed: 1 }, rng);
  state.players.forEach((p, i) => {
    p.role = roles[i]!;
  });
  return state;
}

let logSeq = 0;
function pushLog(state: GameState, entry: Partial<LogEntry> & { eventType: string }): void {
  logSeq++;
  state.log.push({
    id: `log_${logSeq}`,
    turn: state.turnNumber,
    visibility: "public",
    ...entry,
  } as LogEntry);
}

describe("SPEC 8.4: summarizeMatch", () => {
  it("victory: winners populated -> endReason 'victory'", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    state.winners = ["lord", "loyalist"];
    const summary = summarizeMatch(state);
    expect(summary.endReason).toBe("victory");
    expect(summary.winners).toEqual(["lord", "loyalist"]);
  });

  it("no_winner: empty winners array (lord forfeit) -> endReason 'no_winner'", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    state.winners = [];
    const summary = summarizeMatch(state);
    expect(summary.endReason).toBe("no_winner");
  });

  it("every player's role and general are revealed regardless of in-game flags", () => {
    const state = bareState(3, ["lord", "rebel", "traitor"]);
    state.players[0]!.generalId = "caocao";
    state.players[0]!.roleRevealed = false; // in-game hidden; result must reveal anyway
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    expect(summary.players[0]!.role).toBe("lord");
    expect(summary.players[0]!.generalId).toBe("caocao");
  });

  it("dead players still appear and remain eligible for stat rankings", () => {
    const state = bareState(3, ["lord", "rebel", "traitor"]);
    state.players[1]!.alive = false;
    pushLog(state, { eventType: "death", actorId: "p1", data: { killerId: "p0" } });
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    expect(summary.players.find((p) => p.id === "p1")!.alive).toBe(false);
    expect(summary.mostKills).toEqual(["p0"]);
  });

  it("kills are counted from death events' killerId; a killer-less death counts toward nobody", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    pushLog(state, { eventType: "death", actorId: "p2", data: { killerId: "p0" } });
    pushLog(state, { eventType: "death", actorId: "p3" }); // no killerId (e.g. duel loss with no source)
    state.winners = ["lord", "loyalist"];
    const summary = summarizeMatch(state);
    expect(summary.mostKills).toEqual(["p0"]);
  });

  it("SPEC 6.5/8.4: a forfeit death has no killer and is never counted as a kill", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    pushLog(state, { eventType: "forfeit", actorId: "p2", data: { role: "rebel" } });
    state.winners = ["lord", "loyalist"];
    const summary = summarizeMatch(state);
    expect(summary.mostKills).toEqual([]);
    expect(summary.deathOrder).toEqual(["p2"]);
  });

  it("damage taken sums only 'damage' events, excluding 'hpLoss' (skill HP costs)", () => {
    const state = bareState(3, ["lord", "rebel", "traitor"]);
    pushLog(state, { eventType: "damage", actorId: "p1", amount: 2, data: { sourceId: "p0", hp: 2 } });
    pushLog(state, { eventType: "hpLoss", actorId: "p0", amount: 1, data: { hp: 3 } }); // e.g. โบยกายลวงศึก
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    const p0 = summary.players.find((p) => p.id === "p0")!;
    const p1 = summary.players.find((p) => p.id === "p1")!;
    expect(p1.damageTaken).toBe(2);
    expect(p0.damageTaken).toBe(0); // hpLoss must not count
    expect(summary.mostDamageTaken).toEqual(["p1"]);
  });

  it("ties: all leaders are listed for both most-kills and most-damage-taken", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    pushLog(state, { eventType: "death", actorId: "p2", data: { killerId: "p0" } });
    pushLog(state, { eventType: "death", actorId: "p3", data: { killerId: "p1" } });
    pushLog(state, { eventType: "damage", actorId: "p0", amount: 3, data: { sourceId: "p2", hp: 1 } });
    pushLog(state, { eventType: "damage", actorId: "p1", amount: 3, data: { sourceId: "p3", hp: 1 } });
    state.winners = ["lord", "loyalist"];
    const summary = summarizeMatch(state);
    expect(summary.mostKills.sort()).toEqual(["p0", "p1"]);
    expect(summary.mostDamageTaken.sort()).toEqual(["p0", "p1"]);
  });

  it("nobody has taken damage or scored a kill -> both leader lists are empty, not everyone at 0", () => {
    const state = bareState(3, ["lord", "rebel", "traitor"]);
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    expect(summary.mostKills).toEqual([]);
    expect(summary.mostDamageTaken).toEqual([]);
  });

  it("deathOrder reflects the order deaths/forfeits were logged", () => {
    const state = bareState(4, ["lord", "loyalist", "rebel", "traitor"]);
    pushLog(state, { eventType: "death", actorId: "p3", data: { killerId: "p0" } });
    pushLog(state, { eventType: "forfeit", actorId: "p2", data: { role: "rebel" } });
    pushLog(state, { eventType: "death", actorId: "p1", data: { killerId: "p0" } });
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    expect(summary.deathOrder).toEqual(["p3", "p2", "p1"]);
  });

  it("carries turnNumber and the full log through unmodified", () => {
    const state = bareState(3, ["lord", "rebel", "traitor"]);
    state.turnNumber = 7;
    pushLog(state, { eventType: "damage", actorId: "p1", amount: 1, data: { sourceId: "p0", hp: 3 } });
    state.winners = ["lord"];
    const summary = summarizeMatch(state);
    expect(summary.turnNumber).toBe(7);
    expect(summary.log).toBe(state.log);
  });
});
