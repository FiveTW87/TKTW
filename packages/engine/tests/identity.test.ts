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
  applyIdentityForfeit,
  forfeitIdentityPlayer,
} from "../src/modes/identity";
import { respond } from "../src/core/decisions";
import { getPlayer } from "../src/core/state";
import { killPlayer } from "../src/core/damage";
import { simpleBotAnswer } from "../src/bots/simplePolicy";
import { runUntilEnd } from "../src/bots/runner";
import { projectFor } from "../src/core/view";
import type { GameState, PlayerAnswer, Role } from "../src/types";

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

  it("assigns exactly those proportions when a real game is set up (lord randomized onto any seat)", () => {
    for (let n = 3; n <= 10; n++) {
      const session = createIdentityGame({ playerCount: n, seed: n * 100 });
      const tally: Record<string, number> = {};
      for (const p of session.state.players) tally[p.role] = (tally[p.role] ?? 0) + 1;
      const counts = expected[n]!;
      expect(tally.lord ?? 0).toBe(counts.lord);
      expect(tally.loyalist ?? 0).toBe(counts.loyalist);
      expect(tally.rebel ?? 0).toBe(counts.rebel);
      expect(tally.traitor ?? 0).toBe(counts.traitor);
      // SPEC 8.2: the lord is not pinned to seat 0 — find whoever it landed
      // on and confirm turn 1 (currentSeat) starts there.
      const lord = session.state.players.find((p) => p.role === "lord")!;
      expect(session.state.currentSeat).toBe(lord.seat);
    }
  });

  it("the lord lands on more than one seat across seeds (not pinned to seat 0)", () => {
    const lordSeats = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const session = createIdentityGame({ playerCount: 5, seed });
      const lord = session.state.players.find((p) => p.role === "lord")!;
      lordSeats.add(lord.seat);
    }
    expect(lordSeats.size).toBeGreaterThan(1);
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
    const lord = session.state.players.find((p) => p.role === "lord")!;
    const seen: { playerId: string; count: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const pending = session.state.pendingDecision!;
      expect(pending.kind).toBe("pickGeneral");
      const options = (pending.data as { options: string[] }).options;
      seen.push({ playerId: pending.playerId, count: options.length });
      respond(session, { decisionId: pending.id, playerId: pending.playerId, choice: options[0]! });
    }
    expect(seen[0]!.playerId).toBe(lord.id); // lord picks first, wherever they landed
    expect(seen[0]!.count).toBe(5);
    for (const entry of seen.slice(1)) expect(entry.count).toBe(3);
  });

  it("the lord's 5 always include exactly the 3 lord-skill generals (โจโฉ/เล่าปี่/ซุนกวน) plus 2 random", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 17 });
    const pending = session.state.pendingDecision!;
    const options = (pending.data as { options: string[] }).options;
    expect(options).toHaveLength(5);
    const lordSkillInOffer = options.filter((g) =>
      ["caocao", "liubei", "sunquan"].includes(g),
    );
    expect(lordSkillInOffer.sort()).toEqual(["caocao", "liubei", "sunquan"]);
  });

  it("a missing/invalid choice picks randomly from what was offered instead of always the first option", () => {
    // Same seed, same offer every time (nothing upstream depends on the
    // answer yet) — only vary how the lord answers, and confirm "no choice"
    // doesn't deterministically collapse to options[0] every run.
    const picks = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const session = createIdentityGame({ playerCount: 4, seed });
      const pending = session.state.pendingDecision!;
      respond(session, { decisionId: pending.id, playerId: pending.playerId, pass: true });
      // Check whoever actually answered (not always "p0" — the lord can land
      // on any seat, SPEC 8.2), otherwise this just measures an arbitrary
      // uninvolved player's untouched "none" placeholder.
      picks.add(getPlayer(session.state, pending.playerId).generalId);
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("generals left unpicked in a round go back into the pool and get reshuffled, not queued in order", () => {
    // Leftovers must stay in circulation (available for later rounds), but
    // aren't pinned to a fixed position — across many seeds, the very next
    // offer should sometimes contain a leftover and sometimes not.
    let sawLeftoverReturn = false;
    let sawNoLeftoverReturn = false;
    for (let seed = 0; seed < 60 && !(sawLeftoverReturn && sawNoLeftoverReturn); seed++) {
      const session = createIdentityGame({ playerCount: 3, seed });
      const lordPending = session.state.pendingDecision!;
      const lordOffer = (lordPending.data as { options: string[] }).options;
      const lordChoice = lordOffer[0]!;
      respond(session, { decisionId: lordPending.id, playerId: lordPending.playerId, choice: lordChoice });
      const lordLeftovers = new Set(lordOffer.filter((g) => g !== lordChoice));

      const nextOffer = (session.state.pendingDecision!.data as { options: string[] }).options;
      if (nextOffer.some((g) => lordLeftovers.has(g))) sawLeftoverReturn = true;
      else sawNoLeftoverReturn = true;
    }
    expect(sawLeftoverReturn).toBe(true);
    expect(sawNoLeftoverReturn).toBe(true);
  });

  it("a general never vanishes: everyone ends up with a unique pick even across many small pools", () => {
    for (let seed = 0; seed < 20; seed++) {
      const session = createIdentityGame({ playerCount: 3, seed: seed + 500 });
      finishGeneralSelection(session, 3);
      const ids = session.state.players.map((p) => p.generalId);
      expect(new Set(ids).size).toBe(3);
      expect(ids.every((id) => id !== "none")).toBe(true);
    }
  });
});

// SPEC 7.1/7.3: a player's chosen general (and anything derived from it —
// faction, gender, HP) must not leak to opponents before the reveal. The
// lord's general is public the instant the lord confirms; everyone else's
// reveals together, only once the last non-lord has picked.
describe("SPEC 7.1/7.3: hidden information — general reveal", () => {
  it("an opponent's general is hidden (neutral placeholders) until generalRevealed flips", () => {
    const session = createIdentityGame({ playerCount: 4, seed: 12 });
    const lord = session.state.players.find((p) => p.role === "lord")!;
    // Before anyone has picked: nobody's generalRevealed is set yet.
    for (const p of session.state.players) expect(p.generalRevealed).toBe(false);

    const opponent = session.state.players.find((p) => p.id !== lord.id)!;
    const viewBefore = projectFor(session.state, opponent.id);
    const lordViewBefore = viewBefore.players.find((p) => p.id === lord.id)!;
    // Lord hasn't picked yet either, so still hidden to everyone but self.
    expect(lordViewBefore.generalId).toBe("");
    expect(lordViewBefore.hp).toBe(0);
    expect(lordViewBefore.maxHp).toBe(0);

    // Lord picks — their general is public to everyone immediately.
    const lordPending = session.state.pendingDecision!;
    respond(session, {
      decisionId: lordPending.id,
      playerId: lordPending.playerId,
      choice: (lordPending.data as { options: string[] }).options[0]!,
    });
    expect(lord.generalRevealed).toBe(true);
    const viewAfterLordPick = projectFor(session.state, opponent.id);
    const lordViewAfter = viewAfterLordPick.players.find((p) => p.id === lord.id)!;
    expect(lordViewAfter.generalId).toBe(lord.generalId);
    expect(lordViewAfter.generalId).not.toBe("");

    // Non-lords are still hidden from each other mid-selection.
    const others = session.state.players.filter((p) => p.id !== lord.id);
    const stillPicking = others[0]!;
    const viewer = others[1]!;
    const midView = projectFor(session.state, viewer.id);
    const stillPickingView = midView.players.find((p) => p.id === stillPicking.id)!;
    expect(stillPickingView.generalId).toBe("");
    expect(stillPickingView.faction).toBe("qun");
    expect(stillPickingView.hp).toBe(0);

    // Drive the rest of selection to completion.
    while (session.state.pendingDecision?.kind === "pickGeneral") {
      const pending = session.state.pendingDecision;
      respond(session, {
        decisionId: pending.id,
        playerId: pending.playerId,
        choice: (pending.data as { options: string[] }).options[0]!,
      });
    }

    // Now everyone's general is revealed to everyone.
    for (const p of session.state.players) expect(p.generalRevealed).toBe(true);
    const finalView = projectFor(session.state, viewer.id);
    for (const p of session.state.players) {
      const pv = finalView.players.find((v) => v.id === p.id)!;
      expect(pv.generalId).toBe(p.generalId);
      expect(pv.generalId).not.toBe("");
    }
  });

  it("pickGeneral candidate options never reach a non-responder", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 55 });
    const pending = session.state.pendingDecision!;
    const others = session.state.players.filter((p) => p.id !== pending.playerId);
    for (const p of others) {
      const view = projectFor(session.state, p.id);
      const projectedDecision = view.pendingDecision;
      expect(projectedDecision?.data).toEqual({});
    }
    // The responder itself still sees the real options.
    const ownView = projectFor(session.state, pending.playerId);
    expect((ownView.pendingDecision?.data as { options?: string[] }).options?.length).toBeGreaterThan(0);
  });

  // Phase 3 close-out — SPEC §7.1 audit: role projection. A non-lord's role
  // is hidden from everyone but themselves until they die (or they're the
  // lord, who's always public); the viewer's own role is always visible.
  it("audit: an alive non-lord/non-self role is hidden; lord and self and the dead are visible", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 33 });
    finishGeneralSelection(session, 5);
    const lord = session.state.players.find((p) => p.role === "lord")!;
    const alive = session.state.players.find((p) => p.id !== lord.id && p.alive)!;
    const viewer = session.state.players.find((p) => p.id !== lord.id && p.id !== alive.id)!;

    const view = projectFor(session.state, viewer.id);
    // Own role: visible.
    expect(view.players.find((p) => p.id === viewer.id)!.role).toBe(viewer.role);
    // Lord's role: always public.
    expect(view.players.find((p) => p.id === lord.id)!.role).toBe("lord");
    // A different alive non-lord's role: hidden.
    expect(view.players.find((p) => p.id === alive.id)!.role).toBeUndefined();

    // Once that player dies, their role becomes visible to everyone (death
    // reveal — killPlayer sets roleRevealed, and view.ts's roleVisible
    // includes !p.alive).
    alive.alive = false;
    const viewAfterDeath = projectFor(session.state, viewer.id);
    expect(viewAfterDeath.players.find((p) => p.id === alive.id)!.role).toBe(alive.role);
  });

  // Phase 3 close-out — SPEC §7.1 audit: hand projection. Nobody but the
  // owner ever receives another player's actual hand — only its count.
  it("audit: an opponent's hand is a {count}, never the real cards; own hand is the real array", () => {
    const session = createIdentityGame({ playerCount: 4, seed: 44 });
    finishGeneralSelection(session, 4);
    const [me, opponent] = session.state.players;
    const realOpponentHandLength = opponent!.hand.length;

    const view = projectFor(session.state, me!.id);
    const ownProjected = view.players.find((p) => p.id === me!.id)!.hand;
    const opponentProjected = view.players.find((p) => p.id === opponent!.id)!.hand;

    expect(Array.isArray(ownProjected)).toBe(true);
    expect(ownProjected).toEqual(me!.hand);

    expect(Array.isArray(opponentProjected)).toBe(false);
    expect(opponentProjected).toEqual({ count: realOpponentHandLength });
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

// SPEC 6.5/6.6 — forfeit (disconnect grace expiry / leave-mid-match death).
describe("SPEC 6.5: forfeit (a clean, killer-less death)", () => {
  // Every card in the game, wherever it currently sits — must stay constant
  // (forfeit only MOVES a dead player's cards to discard, never creates or
  // destroys any). A rebuild that lost the forfeit would duplicate them.
  function totalCards(state: GameState): number {
    let n = state.drawPile.length + state.discardPile.length;
    for (const p of state.players) {
      n += p.hand.length + p.judgmentZone.length;
      n += Object.values(p.equipment).filter(Boolean).length;
    }
    return n;
  }

  // The server's forfeit-drive answer for whatever the dead player still owns.
  function forfeitSkip(session: ReturnType<typeof createIdentityGame>): PlayerAnswer {
    const pd = session.state.pendingDecision!;
    const base = { decisionId: pd.id, playerId: pd.playerId };
    if (pd.kind === "mainAction") return { ...base, choice: "endPhase" };
    if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") return { ...base, cardIds: [] };
    if (pd.kind === "drawCard") return { ...base, choice: "draw" };
    if (pd.kind === "pickGeneral") return base;
    return { ...base, pass: true };
  }

  function driveDeadOwner(session: ReturnType<typeof createIdentityGame>): void {
    let guard = 0;
    while (
      session.state.pendingDecision &&
      !session.state.finished &&
      !getPlayer(session.state, session.state.pendingDecision.playerId).alive
    ) {
      respond(session, forfeitSkip(session));
      if (++guard > 60) throw new Error("forfeit drive did not terminate");
    }
  }

  it("dumps hand, equipment, and judgment zone to discard, reveals the role, kills cleanly", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 88 });
    finishGeneralSelection(session, 5);
    const state = session.state;
    const victim = getPlayer(state, "p3"); // a non-lord
    // Seed each zone so we can watch all three drain into the discard pile.
    victim.equipment.weapon = { id: "spade_1_1", typeKey: "crossbow", suit: "spade", rank: 1 };
    victim.judgmentZone.push({ id: "heart_2_2", typeKey: "lebusishu", suit: "heart", rank: 2 });
    const total = totalCards(state);
    const discardBefore = state.discardPile.length;
    const zoneCount = victim.hand.length + 1 /*equip*/ + 1 /*judgment*/;

    applyIdentityForfeit(state, "p3");

    expect(victim.alive).toBe(false);
    expect(victim.roleRevealed).toBe(true);
    expect(victim.hand).toHaveLength(0);
    expect(victim.equipment.weapon).toBeUndefined();
    expect(victim.judgmentZone).toHaveLength(0);
    expect(state.discardPile.length).toBe(discardBefore + zoneCount);
    expect(totalCards(state)).toBe(total); // nothing created/destroyed
  });

  it("a lord who forfeits ends the game with NO winner (never hands the rebels a win)", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 91 });
    finishGeneralSelection(session, 5);
    const lord = session.state.players.find((p) => p.role === "lord")!;
    applyIdentityForfeit(session.state, lord.id);
    expect(session.state.finished).toBe(true);
    expect(session.state.winners).toEqual([]);
  });

  it("a non-lord forfeit runs the ordinary win check (last opposition gone → lord side wins)", () => {
    const rng = createRng(1);
    const state = createInitialState({ playerCount: 4, seed: 1 }, rng);
    const roles: Role[] = ["lord", "loyalist", "rebel", "traitor"];
    state.players.forEach((p, i) => {
      p.role = roles[i]!;
      p.roleRevealed = p.role === "lord";
    });
    state.players[2]!.alive = false; // rebel already dead by normal play
    applyIdentityForfeit(state, "p3"); // the traitor forfeits — no opposition left
    expect(state.finished).toBe(true);
    expect(state.winners).toEqual(["lord", "loyalist"]);
  });

  it("CRITICAL: a forfeit survives rebuild() — a later rejected answer must not revive the dead or duplicate cards", () => {
    const session = createIdentityGame({ playerCount: 5, seed: 4242 });
    finishGeneralSelection(session, 5);
    // Drive to the lord's mainAction (past the draw prompt / any opening skills).
    while (session.state.pendingDecision && session.state.pendingDecision.kind !== "mainAction") {
      respond(session, simpleBotAnswer(session));
    }
    const total = totalCards(session.state);

    // A bystander (not the current decision owner) forfeits mid-turn.
    forfeitIdentityPlayer(session, "p2");
    expect(getPlayer(session.state, "p2").alive).toBe(false);
    expect(session.state.finished).toBe(false); // one non-lord out of 5 ≠ game over

    // Now feed an ILLEGAL answer to the live owner → respond() throws and,
    // internally, rebuild()s the session by replaying the decision log (which
    // now contains the forfeit entry). If the forfeit weren't logged, this
    // rebuild would bring p2 back to life with a full hand.
    const pending = session.state.pendingDecision!;
    expect(() =>
      respond(session, {
        decisionId: pending.id,
        playerId: pending.playerId,
        choice: "playCard",
        cardIds: ["definitely_not_a_real_card"],
        targetIds: [],
      }),
    ).toThrow();

    expect(getPlayer(session.state, "p2").alive).toBe(false); // stayed dead
    expect(getPlayer(session.state, "p2").hand).toHaveLength(0);
    expect(totalCards(session.state)).toBe(total); // no duplication
    // And the game is still playable from the same decision.
    expect(session.state.pendingDecision).toBeDefined();
  });

  it("recoverIdentityGame replays a forfeit entry to the exact same state", () => {
    const original = createIdentityGame({ playerCount: 5, seed: 555 });
    finishGeneralSelection(original, 5);
    while (original.state.pendingDecision && original.state.pendingDecision.kind !== "mainAction") {
      respond(original, simpleBotAnswer(original));
    }
    forfeitIdentityPlayer(original, "p2");
    // play a few more legal bot moves after the forfeit
    for (let i = 0; i < 8 && original.state.pendingDecision && !original.state.finished; i++) {
      driveDeadOwner(original);
      if (!original.state.pendingDecision || original.state.finished) break;
      respond(original, simpleBotAnswer(original));
    }

    const recovered = recoverIdentityGame({ playerCount: 5, seed: 555 }, original.decisionLog);
    expect(recovered.state).toEqual(original.state);
  });

  it("forfeiting the ACTIVE player never hangs the game — the driver skips their draw/discard/mainAction", () => {
    for (let seed = 0; seed < 60; seed++) {
      const session = createIdentityGame({ playerCount: 5, seed: seed + 7000 });
      finishGeneralSelection(session, 5);
      const total = totalCards(session.state);

      // Advance a varying number of steps, then forfeit whoever currently owns
      // the decision (often the active player, mid draw/play/discard).
      let steps = seed % 14;
      while (steps-- > 0 && session.state.pendingDecision && !session.state.finished) {
        respond(session, simpleBotAnswer(session));
      }
      if (!session.state.pendingDecision || session.state.finished) continue;

      const victim = session.state.pendingDecision.playerId;
      forfeitIdentityPlayer(session, victim);
      driveDeadOwner(session);

      expect(getPlayer(session.state, victim).alive).toBe(false);
      expect(getPlayer(session.state, victim).hand).toHaveLength(0);
      // NOT checked here: totalCards() right after driveDeadOwner. A
      // multi-step effect (e.g. wugu's "everyone picks one of N revealed
      // cards") can be genuinely mid-resolution at this exact point — its
      // still-unassigned cards live only in that generator's local closure,
      // not yet in any zone, so a snapshot here can look transiently short
      // without anything actually being lost. Card conservation is instead
      // checked below, once the game has fully settled.

      // The rest of the game must still terminate with the bots.
      expect(() => runUntilEnd(session, simpleBotAnswer)).not.toThrow();
      expect(session.state.finished).toBe(true);
      expect(totalCards(session.state)).toBe(total);
    }
  });
});
