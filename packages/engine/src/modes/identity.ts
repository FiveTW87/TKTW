// SPEC section 2 (roles), 3 (setup), and P3's TODO items 3.1-3.6.
// Everything mode-specific lives here — engine/core/ only exposes the two
// pluggable slots (checkGameEnd, onDeath) this file fills in, exactly the
// seam agreed on before P2 started.
//
// Side-effect imports: identity mode's whole premise is "pick from the 25
// generals", so createIdentityGame must be self-sufficient — a caller who
// forgets to import generals/index.ts elsewhere would otherwise see an
// empty pool and nothing to offer anyone.
import "../generals/index";
import "../equipment/index";
import type { Role, EquipSlot } from "../types";
import type { EngineGenerator } from "../core/decisions";
import type { Ctx, GameConfig } from "../core/ctx";
import { createRng } from "../core/rng";
import { createInitialState, type SetupOptions } from "../core/setup";
import { makeCtx } from "../core/ctx";
import { runGame } from "../core/turnLoop";
import { createSession, replaySession, type GameSession } from "../core/decisions";
import type { DecisionLogEntry } from "../types";
import type { PlayerAnswer } from "../types";
import type { Rng } from "../core/rng";
import { getPlayer, drawCards, log } from "../core/state";
import { assignGeneral } from "../core/generalAssign";
import { GENERALS } from "../generals/registry";

// SPEC section 2 — role proportions by player count.
const ROLE_TABLE: Record<number, Role[]> = {
  3: ["lord", "rebel", "traitor"],
  4: ["lord", "loyalist", "rebel", "traitor"],
  5: ["lord", "loyalist", "rebel", "rebel", "traitor"],
  6: ["lord", "loyalist", "rebel", "rebel", "rebel", "traitor"],
  7: ["lord", "loyalist", "loyalist", "rebel", "rebel", "rebel", "traitor"],
  8: ["lord", "loyalist", "loyalist", "rebel", "rebel", "rebel", "rebel", "traitor"],
  9: ["lord", "loyalist", "loyalist", "loyalist", "rebel", "rebel", "rebel", "rebel", "traitor"],
  10: [
    "lord",
    "loyalist",
    "loyalist",
    "loyalist",
    "rebel",
    "rebel",
    "rebel",
    "rebel",
    "traitor",
    "traitor",
  ],
};

export function roleTableFor(playerCount: number): Role[] {
  const roles = ROLE_TABLE[playerCount];
  if (!roles) throw new Error(`no identity-mode role table for ${playerCount} players`);
  return roles;
}

// Generals with a lord-only skill (currently โจโฉ, เล่าปี่, ซุนกวน) — derived
// from the registry, not hardcoded, so adding a 4th later needs no edit here.
function lordSkillGeneralIds(): string[] {
  return Object.values(GENERALS)
    .filter((g) => g.skills.some((s) => s.lordOnly))
    .map((g) => g.id);
}

// A player may deliberately pick from `offered`, or send no valid choice
// (omitted, `pass: true`, or an id not in `offered`) to mean "just
// randomize it for me" — the engine-level equivalent of a UI's "random
// pick" button, so nobody is forced to wait on a decision that's already
// been made in their head as "whatever, surprise me".
function resolvePick(offered: readonly string[], answer: PlayerAnswer, rng: Rng): string {
  if (answer.choice && offered.includes(answer.choice)) return answer.choice;
  return offered[rng.nextInt(offered.length)]!;
}

// SPEC 3.1-3.3: assign roles (lord = seat 0, always), then run the general
// selection flow. Card dealing is already done by createInitialState —
// nothing here should draw the initial 4.
//
// Selection is a queue, one player at a time (lord first, then seat order).
// The lord's 5 are the 3 lord-skill generals (so the lord always has the
// option to make their unique skill matter) plus 2 random from the rest of
// the pool. Everyone else is offered 3. Whatever isn't picked in a round —
// including any of the 3 lord-skill generals the lord passed on — goes back
// into the shared pool and gets reshuffled, not queued in order — so the
// next player isn't guaranteed to see specifically the previous player's
// leftovers, just a random draw from everything still unclaimed. That's
// what keeps generals from repeating across players and gives the 3
// lord-skill generals more chances to actually get played by someone, not
// just buried in a 25-general pool that might never resurface them.
function* setupIdentityGame(ctx: Ctx): EngineGenerator {
  const { state, rng } = ctx;
  const players = [...state.players].sort((a, b) => a.seat - b.seat);
  const roles = roleTableFor(players.length);

  const lord = players.find((p) => p.seat === 0)!;
  lord.role = "lord";
  lord.roleRevealed = true;
  log(state, `${lord.id} คือเจ้าเมือง`);

  const others = players.filter((p) => p.id !== lord.id);
  const shuffledRoles = rng.shuffle(roles.filter((r) => r !== "lord"));
  others.forEach((p, i) => {
    p.role = shuffledRoles[i]!;
  });

  const lordSkillIds = rng.shuffle(lordSkillGeneralIds());
  let pool = rng.shuffle(
    Object.keys(GENERALS).filter((id) => id !== "none" && !lordSkillIds.includes(id)),
  );

  const pickOrder = [lord, ...others];
  for (const p of pickOrder) {
    let offered: string[];
    if (p.id === lord.id) {
      offered = [...lordSkillIds, ...pool.slice(0, 2)];
      pool = pool.slice(2);
    } else {
      offered = pool.slice(0, Math.min(3, pool.length));
      pool = pool.slice(offered.length);
    }
    if (offered.length === 0) throw new Error(`no generals left to offer ${p.id}`);

    const answer = yield { kind: "pickGeneral", playerId: p.id, data: { options: offered } };
    const chosen = resolvePick(offered, answer, rng);
    assignGeneral(state, p.id, chosen, p.role === "lord");
    // leftovers go back into the pool and get reshuffled — not queued in
    // order, so the next player isn't guaranteed to see them specifically.
    pool = rng.shuffle([...offered.filter((g) => g !== chosen), ...pool]);
    log(state, `${p.id} เลือกนายพล ${chosen}`);
  }
}

// SPEC 2's win table + P3.4/P3.6: called from core/damage.ts:killPlayer
// after every death.
export function identityCheckGameEnd(state: import("../types").GameState): void {
  const alive = state.players.filter((p) => p.alive);
  const lord = state.players.find((p) => p.role === "lord");

  if (!lord?.alive) {
    // Traitor's win is narrower than everyone else's: sole survivor only.
    if (alive.length === 1 && alive[0]!.role === "traitor") {
      state.finished = true;
      state.winners = ["traitor"];
      return;
    }
    state.finished = true;
    state.winners = ["rebel"]; // rebels win as a team, even ones already dead
    return;
  }

  const opposition = alive.filter((p) => p.role === "rebel" || p.role === "traitor");
  if (opposition.length === 0) {
    state.finished = true;
    state.winners = ["lord", "loyalist"];
  }
}

// SPEC 2's kill reward/penalty table (P3.5). Mode-level, not general-level
// — this is exactly what Ctx.onDeath exists for.
export function* identityOnDeath(
  ctx: Ctx,
  deadId: string,
  killerId: string | undefined,
): EngineGenerator {
  if (!killerId || killerId === deadId) return;
  const { state } = ctx;
  const dead = getPlayer(state, deadId);
  const killer = getPlayer(state, killerId);
  if (!killer.alive) return;

  if (dead.role === "rebel") {
    drawCards(state, ctx.rng, killerId, 3);
    log(state, `${killerId} สังหารกบฏสำเร็จ จั่ว 3 ใบ`);
  }

  if (killer.role === "lord" && dead.role === "loyalist") {
    state.discardPile.push(...killer.hand.splice(0));
    for (const slot of Object.keys(killer.equipment) as EquipSlot[]) {
      const c = killer.equipment[slot];
      if (c) state.discardPile.push(c);
    }
    killer.equipment = {};
    log(state, `${killerId} (เจ้าเมือง) สังหารขุนนางภักดี ทิ้งการ์ดในมือและอุปกรณ์ทั้งหมด`);
  }
}

export interface IdentityGameOptions extends SetupOptions {}

export function createIdentityGame(opts: IdentityGameOptions): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng); // shuffles deck, deals 4 each
  const config: GameConfig = { checkGameEnd: identityCheckGameEnd, onDeath: identityOnDeath };
  const ctx = makeCtx(state, rng, config);

  const session = createSession(identityRootGen(ctx), state, rng);
  // Resurrect the generator from the log if a rejected answer kills it.
  session.rebuild = () => recoverIdentityGame(opts, session.decisionLog);
  return session;
}

function* identityRootGen(ctx: Ctx): EngineGenerator {
  yield* setupIdentityGame(ctx);
  yield* runGame(ctx);
}

/** Event-sourced replay for identity-mode sessions — same resolution as
 *  index.ts:recoverGame, just re-running setupIdentityGame (not just
 *  runGame) from a fresh state so role/general assignment replays too. */
export function recoverIdentityGame(
  opts: IdentityGameOptions,
  log: readonly DecisionLogEntry[],
): GameSession {
  const rng = createRng(opts.seed);
  const state = createInitialState(opts, rng);
  const config: GameConfig = { checkGameEnd: identityCheckGameEnd, onDeath: identityOnDeath };
  const ctx = makeCtx(state, rng, config);
  return replaySession(() => identityRootGen(ctx), state, rng, log);
}
