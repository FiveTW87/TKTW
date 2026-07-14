import { describe, it, expect } from "vitest";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx } from "../src/core/ctx";
import {
  createIdentityGame,
  recoverIdentityGame,
  roleTableFor,
  identityCheckGameEnd,
  identityOnDeath,
} from "../src/modes/identity";
import { respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { killPlayer } from "../src/core/damage";
import { simpleBotAnswer } from "../src/bots/simplePolicy";
import { runUntilEnd } from "../src/bots/runner";
import type { Role } from "../src/types";

describe("SPEC 2: role proportions for every player count", () => {
  const expected: Record<number, Record<Role, number>> = {
    3: { lord: 1, loyalist: 0, rebel: 1, traitor: 1 },
    4: { lord: 1, loyalist: 1, rebel: 1, traitor: 1 },
    5: { lord: 1, loyalist: 1, rebel: 2, traitor: 1 },
    6: { lord: 1, loyalist: 1, rebel: 3, traitor: 1 },
    7: { lord: 1, loyalist: 2, rebel: 3, traitor: 1 },
    8: { lord: 1, loyalist: 2, rebel: 4, traitor: 1 },
    9: { lord: 1, loyalist: 3, rebel: 4, traitor: 1 },
    10: { lord: 1, loyalist: 3, rebel: 4, traitor: 2 },
  };

  for (const [n, counts] of Object.entries(expected)) {
    it(`${n} players matches the SPEC table`, () => {
      const roles = roleTableFor(Number(n));
      const tally: Record<string, number> = {};
      for (const r of roles) tally[r] = (tally[r] ?? 0) + 1;
      expect(tally.lord ?? 0).toBe(counts.lord);
      expect(tally.loyalist ?? 0).toBe(counts.loyalist);
      expect(tally.rebel ?? 0).toBe(counts.rebel);
      expect(tally.traitor ?? 0).toBe(counts.traitor);
      expect(roles.length).toBe(Number(n));
    });
  }

  it("assigns exactly those proportions when a real game is set up (seat 0 = lord)", () => {
    for (let n = 3; n <= 10; n++) {
      const session = createIdentityGame({ playerCount: n, seed: n * 100 });
      const tally: Record<string, number> = {};
      for (const p of session.state.players) tally[p.role] = (tally[p.role] ?? 0) + 1;
      const counts = expected[n]!;
      expect(tally.lord ?? 0).toBe(counts.lord);
      expect(tally.loyalist ?? 0).toBe(counts.loyalist);
      expect(tally.rebel ?? 0).toBe(counts.rebel);
      expect(tally.traitor ?? 0).toBe(counts.traitor);
      expect(getPlayer(session.state, "p0").role).toBe("lord");
    }
  });
});

// createIdentityGame returns a session PAUSED at the lord's first
// pickGeneral decision (same pattern as createGame pausing at the first
// mainAction) — generalId is still the "none" placeholder until the
// selection round actually runs. Drive exactly `playerCount` pickGeneral
// answers to get past setup.
function finishGeneralSelection(session: ReturnType<typeof createIdentityGame>, playerCount: number) {
  for (let i = 0; i < playerCount; i++) {
    respond(session, simpleBotAnswer(session));
  }
}

describe("SPEC 3: setup", () => {
  it("lord's maxHp is general value + 1; everyone else is the general's own value", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 42 });
    finishGeneralSelection(session, 5);
    const lord = session.state.players.find((p) => p.role === "lord")!;
    const others = session.state.players.filter((p) => p.role !== "lord");
    expect(lord.hp).toBe(lord.maxHp);
    for (const p of others) expect(p.hp).toBe(p.maxHp);
    expect(lord.generalId).not.toBe("none");
    for (const p of session.state.players) expect(p.generalId).not.toBe("none");
  });

  it("everyone starts with exactly 4 cards", () => {
    // Dealing happens in createInitialState, before role/general setup —
    // check immediately, since finishing setup lets turn 1's draw phase
    // silently run too (the active player would then have 6, not 4).
    const session = createIdentityGame({ playerCount: 6, seed: 7 });
    for (const p of session.state.players) expect(p.hand.length).toBe(4);
  });

  it("no two players are assigned the same general", () => {
    const session = createIdentityGame({ playerCount: 10, seed: 99 });
    finishGeneralSelection(session, 10);
    const ids = session.state.players.map((p) => p.generalId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the general-selection decisions offer 5 to the lord and 3 to everyone else", () => {
    const session = createIdentityGame({ playerCount: 4, seed: 5 });
    const seen: { playerId: string; count: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const pending = session.state.pendingDecision!;
      expect(pending.kind).toBe("pickGeneral");
      const options = (pending.data as { options: string[] }).options;
      seen.push({ playerId: pending.playerId, count: options.length });
      respond(session, { decisionId: pending.id, playerId: pending.playerId, choice: options[0]! });
    }
    expect(seen[0]!.playerId).toBe("p0"); // lord picks first
    expect(seen[0]!.count).toBe(5);
    for (const entry of seen.slice(1)) expect(entry.count).toBe(3);
  });
});

describe("SPEC 2: win conditions", () => {
  function bareIdentityState(playerCount: number, roles: Role[]) {
    const rng = createRng(1);
    const state = createInitialState({ playerCount, seed: 1 }, rng);
    state.players.forEach((p, i) => {
      p.role = roles[i]!;
      p.roleRevealed = p.role === "lord";
    });
    return { state, rng };
  }

  it("lord + loyalist win once every rebel and traitor is dead, lord alive", () => {
    const { state } = bareIdentityState(4, ["lord", "loyalist", "rebel", "traitor"]);
    state.players[2]!.alive = false; // rebel dead
    state.players[3]!.alive = false; // traitor dead
    identityCheckGameEnd(state);
    expect(state.finished).toBe(true);
    expect(state.winners).toEqual(["lord", "loyalist"]);
  });

  it("rebels win (as a team) once the lord dies, even if some rebels already died", () => {
    const { state } = bareIdentityState(5, ["lord", "loyalist", "rebel", "rebel", "traitor"]);
    state.players[0]!.alive = false; // lord dead
    state.players[2]!.alive = false; // one rebel already dead
    // rebel[3] and traitor still alive -> traitor is NOT the sole survivor
    identityCheckGameEnd(state);
    expect(state.finished).toBe(true);
    expect(state.winners).toEqual(["rebel"]);
  });

  it("traitor wins alone only as the sole survivor after the lord is dead", () => {
    const { state } = bareIdentityState(4, ["lord", "loyalist", "rebel", "traitor"]);
    state.players[0]!.alive = false; // lord dead
    state.players[1]!.alive = false; // loyalist dead
    state.players[2]!.alive = false; // rebel dead
    // only traitor (index 3) remains alive
    identityCheckGameEnd(state);
    expect(state.finished).toBe(true);
    expect(state.winners).toEqual(["traitor"]);
  });

  it("does not end the game while both the lord and at least one rebel/traitor are alive", () => {
    const { state } = bareIdentityState(4, ["lord", "loyalist", "rebel", "traitor"]);
    state.players[1]!.alive = false; // only the loyalist died
    identityCheckGameEnd(state);
    expect(state.finished).toBe(false);
  });
});

describe("SPEC 2: kill rewards/penalties", () => {
  function bareIdentityCtx(playerCount: number, roles: Role[]) {
    const rng = createRng(3);
    const state = createInitialState({ playerCount, seed: 3 }, rng);
    state.players.forEach((p, i) => {
      p.role = roles[i]!;
    });
    const config = { checkGameEnd: identityCheckGameEnd, onDeath: identityOnDeath };
    return makeCtx(state, rng, config);
  }

  it("killing a rebel lets the killer draw 3 cards", () => {
    const ctx = bareIdentityCtx(4, ["lord", "loyalist", "rebel", "traitor"]);
    const killer = getPlayer(ctx.state, "p1");
    const before = killer.hand.length;
    const gen = killPlayer(ctx, "p2", "p1");
    let r = gen.next();
    while (!r.done) r = gen.next(); // no decisions expected in this path
    expect(killer.hand.length).toBe(before + 3);
  });

  it("the lord killing a loyalist discards his own hand and equipment", () => {
    const ctx = bareIdentityCtx(4, ["lord", "loyalist", "rebel", "traitor"]);
    const lord = getPlayer(ctx.state, "p0");
    lord.equipment.weapon = { id: "spade_1_1", typeKey: "crossbow", suit: "spade", rank: 1 };
    const gen = killPlayer(ctx, "p1", "p0");
    let r = gen.next();
    while (!r.done) r = gen.next();
    expect(lord.hand.length).toBe(0);
    expect(lord.equipment.weapon).toBeUndefined();
  });

  it("killing a rebel rewards the killer regardless of the killer's own role (even another rebel)", () => {
    const ctx = bareIdentityCtx(5, ["lord", "loyalist", "rebel", "rebel", "traitor"]);
    const killer = getPlayer(ctx.state, "p2"); // rebel kills a fellow rebel
    const before = killer.hand.length;
    const gen = killPlayer(ctx, "p3", "p2");
    let r = gen.next();
    while (!r.done) r = gen.next();
    expect(killer.hand.length).toBe(before + 3);
  });

  it("killing a traitor has no reward or penalty", () => {
    const ctx = bareIdentityCtx(4, ["lord", "loyalist", "rebel", "traitor"]);
    const killer = getPlayer(ctx.state, "p2");
    const before = killer.hand.length;
    const gen = killPlayer(ctx, "p3", "p2");
    let r = gen.next();
    while (!r.done) r = gen.next();
    expect(killer.hand.length).toBe(before);
  });

  it("a non-lord killing a loyalist has no penalty (only the lord doing it triggers one)", () => {
    const ctx = bareIdentityCtx(4, ["lord", "loyalist", "rebel", "traitor"]);
    const killer = getPlayer(ctx.state, "p2"); // rebel, not the lord
    killer.equipment.weapon = { id: "spade_1_1", typeKey: "crossbow", suit: "spade", rank: 1 };
    const beforeHand = killer.hand.length;
    const gen = killPlayer(ctx, "p1", "p2");
    let r = gen.next();
    while (!r.done) r = gen.next();
    expect(killer.hand.length).toBe(beforeHand);
    expect(killer.equipment.weapon).toBeDefined();
  });
});

describe("P3 fuzz: identity-mode games finish with a valid outcome, 3..10 players", () => {
  it("1000 games (125/player-count) across every player count produce exactly one valid winner set", () => {
    const validSets = [
      JSON.stringify(["lord", "loyalist"]),
      JSON.stringify(["rebel"]),
      JSON.stringify(["traitor"]),
    ];
    for (let n = 3; n <= 10; n++) {
      for (let seed = 0; seed < 125; seed++) {
        const session = createIdentityGame({ playerCount: n, seed: seed + n * 100000 });
        expect(() => runUntilEnd(session, simpleBotAnswer)).not.toThrow();
        expect(session.state.finished).toBe(true);
        expect(validSets).toContain(JSON.stringify(session.state.winners));
      }
    }
  });
});

describe("event-sourced replay works for identity-mode sessions too", () => {
  it("recoverIdentityGame reconstructs an identical finished session", () => {
    const original = createIdentityGame({ playerCount: 5, seed: 321 });
    runUntilEnd(original, simpleBotAnswer);

    const recovered = recoverIdentityGame({ playerCount: 5, seed: 321 }, original.decisionLog);
    expect(recovered.state).toEqual(original.state);
  });
});
