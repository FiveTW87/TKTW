// Game construction + decision driving for the catalog contract suite.
//
// Two things here are load-bearing and easy to get wrong by hand, which is why
// every contract test must go through this module rather than rolling its own:
//
//  1. `before` runs AFTER generals are assigned but BEFORE the turn-loop
//     generator starts. Skills that fire at TurnStart/DrawPhaseStart (luoshen,
//     guandou, tuoyi, tuxi) and anything seated in a judgment zone are already
//     resolving by the time a test would otherwise get control, so rigging the
//     deck/hands later is simply too late.
//  2. A non-retryable session has no `rebuild`, so an answer that throws kills
//     the generator permanently (see core/decisions.ts). Any respond() after
//     that silently clears pendingDecision and every later assertion passes for
//     no reason. `g.dead` makes that misuse loud instead of invisible.
import { expect } from "vitest";
import type { GameState, PendingDecision, Player, PlayerAnswer, Role } from "../../src/types";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { runGame } from "../../src/core/turnLoop";
import { createSession, respond, type GameSession } from "../../src/core/decisions";
import { assignGeneral } from "../../src/core/generalAssign";
import { getPlayer } from "../../src/core/state";
import { clearHands, setHand } from "./rig";
import "../../src/generals/index";
import "../../src/equipment/index";

/** Offsets every seed in the suite so the whole catalog can be re-run against a
 *  second seed set (`TKTW_SEED_OFFSET=10000 vitest run`). A properly rigged
 *  contract test is seed-insensitive; anything that breaks under the offset was
 *  secretly depending on shuffle order. */
export const SEED = (n: number): number => n + Number(process.env.TKTW_SEED_OFFSET ?? 0);

export interface ContractGame {
  state: GameState;
  session: GameSession;
  /** Live player record. */
  p(id: string): Player;
  /** The pending decision, or a readable throw if the game is over/idle. */
  pd(): PendingDecision;
  /** Set once an answer has been rejected on a non-retryable session. */
  dead: boolean;
}

export interface ContractGameOpts {
  seed: number;
  playerCount?: number;
  /** [playerId, generalId, isLord?] — applied before the generator starts. */
  assigns?: Array<[string, string, boolean?]>;
  /** Seat whose turn the game opens on (default 0). */
  currentSeat?: number;
  /** Rig hands / deck / equipment / hp here. Runs after generals are assigned,
   *  before the first decision is produced. */
  before?: (state: GameState) => void;
  /** Rig state AFTER the turn's draw has happened. Most cases want this, not
   *  `before`: the draw phase deals 2 more cards into the active player's hand,
   *  so a hand rigged in `before` is no longer the hand under test by the time
   *  the main action comes up. Use `before` only for things the opening of the
   *  turn consumes — judgment zones, TurnStart/DrawPhaseStart deck rigging. */
  after?: (state: GameState) => void;
  /** Shorthand for the overwhelmingly common `after`: empty every hand, then
   *  deal exactly these cards. Applied before `after` runs. */
  hands?: Record<string, string[]>;
  /** Keep session.rebuild, so a rejected answer can be retried on the same
   *  decision id (createGame semantics). Default false: without rebuild, the
   *  generator's own validate-before-mutate discipline is what's under test,
   *  not a replay reconstruction that would mask a premature mutation. */
  retryable?: boolean;
  /** Skip the automatic draw-gate answer (for cases that assert on the
   *  drawCard decision itself). */
  keepDrawGate?: boolean;
}

/** Every state a contract test built, so the global afterEach can check the
 *  no-duplicate-card invariant on all of them. Drained by _contract/setup.ts. */
const LIVE_STATES: GameState[] = [];

export function takeLiveStates(): GameState[] {
  return LIVE_STATES.splice(0);
}

export function contractGame(o: ContractGameOpts): ContractGame {
  const seed = SEED(o.seed);
  const playerCount = o.playerCount ?? 3;
  const build = (): GameSession => {
    const rng = createRng(seed);
    const state = createInitialState({ playerCount, seed }, rng);
    for (const [pid, gid, lord] of o.assigns ?? []) assignGeneral(state, pid, gid, lord ?? false);
    if (o.currentSeat !== undefined) state.currentSeat = o.currentSeat;
    o.before?.(state);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    return createSession(runGame(ctx), state, rng);
  };

  const session = build();
  if (o.retryable) session.rebuild = build;
  LIVE_STATES.push(session.state);

  const g: ContractGame = {
    state: session.state,
    session,
    dead: false,
    p: (id) => getPlayer(session.state, id),
    pd: () => {
      if (g.dead) {
        throw new Error(
          "this ContractGame was retired by expectAtomicReject — build a fresh one for the next scenario",
        );
      }
      const pd = g.session.state.pendingDecision;
      if (!pd) {
        throw new Error(
          `no pending decision (finished=${g.session.state.finished}, phase=${g.session.state.phase}, turn=${g.session.state.turnNumber})`,
        );
      }
      return pd;
    },
  };

  if (!o.keepDrawGate && session.state.pendingDecision?.kind === "drawCard") {
    const pd = session.state.pendingDecision;
    respond(session, { decisionId: pd.id, playerId: pd.playerId, choice: "draw" });
  }
  if (o.hands) {
    clearHands(session.state);
    for (const [pid, ids] of Object.entries(o.hands)) setHand(session.state, pid, ids);
  }
  o.after?.(session.state);
  return g;
}

// ── answer factories ─────────────────────────────────────────────────────────
// All take the LIVE decision, so a stale id can never be built by accident.

type Make = (pd: PendingDecision) => PlayerAnswer;

const base = (pd: PendingDecision) => ({ decisionId: pd.id, playerId: pd.playerId });

export const pass: Make = (pd) => ({ ...base(pd), pass: true });
/** The "yes" to an activateSkill prompt — anything not `pass` accepts. */
export const accept: Make = (pd) => ({ ...base(pd), pass: false });
export const endPhase: Make = (pd) => ({ ...base(pd), choice: "endPhase" });
export const choose =
  (choice: string, extra: Partial<PlayerAnswer> = {}): Make =>
  (pd) => ({ ...base(pd), choice, ...extra });
export const withCards =
  (...cardIds: string[]): Make =>
  (pd) => ({ ...base(pd), cardIds });
export const withTargets =
  (...targetIds: string[]): Make =>
  (pd) => ({ ...base(pd), targetIds });
export const play =
  (cardIds: string[], targetIds: string[] = [], asType?: string): Make =>
  (pd) => ({
    ...base(pd),
    choice: "playCard",
    cardIds,
    targetIds,
    ...(asType ? { asType } : {}),
  });
export const useSkill =
  (skillId: string, cardIds: string[] = [], targetIds: string[] = []): Make =>
  (pd) => ({ ...base(pd), choice: "useSkill", skillId, cardIds, targetIds });
/** Answer on behalf of someone other than the decision's owner (for the
 *  "wrong owner is rejected" cases). */
export const asPlayer =
  (playerId: string, rest: Partial<PlayerAnswer> = {}): Make =>
  (pd) => ({ decisionId: pd.id, playerId, ...rest });

// ── expectations on the pending decision ─────────────────────────────────────

export interface Expect {
  kind?: string;
  playerId?: string;
  /** Matches `data.skillId` — the activateSkill prompt's subject. */
  skillId?: string;
}

function describePd(pd: PendingDecision): string {
  return `${pd.kind}@${pd.playerId} ${JSON.stringify(pd.data)}`;
}

function pdMatches(pd: PendingDecision, want: Expect): boolean {
  if (want.kind !== undefined && pd.kind !== want.kind) return false;
  if (want.playerId !== undefined && pd.playerId !== want.playerId) return false;
  if (want.skillId !== undefined && pd.data.skillId !== want.skillId) return false;
  return true;
}

/** Assert the shape of the pending decision without answering it. */
export function expectDecision(g: ContractGame, want: Expect = {}): PendingDecision {
  const pd = g.pd();
  if (!pdMatches(pd, want)) {
    throw new Error(`expected decision ${JSON.stringify(want)}, got ${describePd(pd)}`);
  }
  return pd;
}

/** Assert the pending decision's shape, then answer it. The workhorse. */
export function step(g: ContractGame, want: Expect, make: Make): void {
  const pd = expectDecision(g, want);
  respond(g.session, make(pd));
}

export type Script = Array<Expect & { answer: Make }>;

/** Run a fixed sequence of expect-then-answer steps. */
export function drive(g: ContractGame, script: Script): void {
  for (const { answer, ...want } of script) step(g, want, answer);
}

// ── autopilot ────────────────────────────────────────────────────────────────

function firstSelectable(pd: PendingDecision, n: number): string[] {
  const ids = (pd.data.selectableCardIds as string[] | undefined) ?? [];
  return ids.slice(0, n);
}

/**
 * A "boring" answer for every decision kind the engine can produce, so a test
 * can skip past machinery it isn't asserting on. Deliberately passive: decline
 * every optional skill, never counter, never pay an optional cost — so nothing
 * the autopilot does can quietly satisfy the thing under test.
 */
export const DEFAULT_ANSWERS: Record<string, Make> = {
  mainAction: endPhase,
  drawCard: choose("draw"),
  discardTo: (pd) => ({
    ...base(pd),
    cardIds: firstSelectable(pd, Number(pd.data.mustDiscard ?? pd.data.count ?? 0)),
  }),
  discardChosenBy: (pd) => ({
    ...base(pd),
    cardIds: firstSelectable(pd, Number(pd.data.count ?? pd.data.mustDiscard ?? 0)),
  }),
  judgmentReveal: choose("reveal"),
  wuguPick: (pd) => {
    const options = (pd.data.options as Array<{ id: string }> | undefined) ?? [];
    return { ...base(pd), cardIds: options[0] ? [options[0].id] : [] };
  },
  pickGeneral: (pd) => {
    const options = (pd.data.options as string[] | undefined) ?? [];
    return options[0] ? { ...base(pd), choice: options[0] } : { ...base(pd), pass: true };
  },
  swordIceChoice: choose("damage"),
  qilinDestroyHorse: choose("horseMinus"),
  swordYyChoice: choose("draw"),
  // everything else (activateSkill, askWuxie, respondShan/Sha/Tao, guanshiForce,
  // qinglongReplay, pickCardFromPlayer, hujiaVolunteer, fankuiPick, guicaiReplace,
  // ganglieChoice, tuxiTargets, yijiGive, huibiRedirect, fanjianGuess,
  // guandouOrder, jiedao*, …) declines via `pass`.
};

export type Until = Expect | ((pd: PendingDecision) => boolean);

function untilMatches(pd: PendingDecision, until: Until): boolean {
  return typeof until === "function" ? until(pd) : pdMatches(pd, until);
}

export interface RunToOpts {
  /** Hard cap on autopilot steps. runGame loops `while (!finished)`, so a
   *  mis-scripted answer would otherwise spin forever and hang the whole
   *  vitest run — never remove this. */
  max?: number;
  /** Per-kind overrides layered on top of DEFAULT_ANSWERS. */
  defaults?: Record<string, Make>;
}

/** Answer decisions with defaults until one satisfies `until`; returns it. */
export function runTo(g: ContractGame, until: Until, opts: RunToOpts = {}): PendingDecision {
  const max = opts.max ?? 200;
  const table = { ...DEFAULT_ANSWERS, ...(opts.defaults ?? {}) };
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    const pd = g.pd();
    if (untilMatches(pd, until)) return pd;
    seen.push(describePd(pd));
    respond(g.session, (table[pd.kind] ?? pass)(pd));
  }
  throw new Error(
    `runTo: ${max} steps without reaching ${typeof until === "function" ? "<predicate>" : JSON.stringify(until)}.\nSaw:\n  ${seen.slice(-20).join("\n  ")}`,
  );
}

// ── skill sugar ──────────────────────────────────────────────────────────────

/** Assert an activateSkill prompt for `skillId` is pending, and accept it. */
export function acceptSkill(g: ContractGame, skillId: string): PendingDecision {
  const pd = expectDecision(g, { kind: "activateSkill", skillId });
  respond(g.session, accept(pd));
  return pd;
}

/** Assert an activateSkill prompt for `skillId` is pending, and decline it. */
export function declineSkill(g: ContractGame, skillId: string): void {
  step(g, { kind: "activateSkill", skillId }, pass);
}

/**
 * Walk forward to `stopAt`, asserting `skillId` is never offered on the way.
 *
 * This SCANS rather than inspecting the current decision, and that is the whole
 * point: several generals carry two skills that prompt at the same instant
 * (caocao hujia + jianxiong, guojia yidu + yiji). A "must not trigger" case
 * written as `expect(pd.kind).not.toBe("activateSkill")` goes green whenever the
 * sibling skill happens to prompt first — the single largest false-green risk in
 * this suite. Every "ไม่ trigger" checkbox must use this.
 */
export function expectNoSkillPrompt(
  g: ContractGame,
  skillId: string,
  stopAt: Until,
  opts: RunToOpts = {},
): PendingDecision {
  const offered: string[] = [];
  const seenAt = (pd: PendingDecision): boolean => {
    if (pd.kind === "activateSkill" && pd.data.skillId === skillId) offered.push(describePd(pd));
    return untilMatches(pd, stopAt);
  };
  const landed = runTo(g, seenAt, opts);
  expect(offered, `${skillId} was offered but must not trigger here`).toEqual([]);
  return landed;
}

/** Decline the whole ไร้ช่องโหว่ window that every instant trick opens before it
 *  resolves. Returns how many players were polled — a case that cares about the
 *  polling order can assert on that instead of calling this. */
export function passWuxie(g: ContractGame): number {
  let n = 0;
  while (g.session.state.pendingDecision?.kind === "askWuxie") {
    if (n++ > 50) throw new Error("the ไร้ช่องโหว่ window never closed");
    const pd = g.session.state.pendingDecision;
    respond(g.session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
  }
  return n;
}

/** Play a card and decline the ไร้ช่องโหว่ window it opens, landing on the first
 *  decision of the card's actual resolution. */
export function playTrick(
  g: ContractGame,
  cardIds: string[],
  targetIds: string[] = [],
  asType?: string,
): void {
  step(g, { kind: "mainAction" }, play(cardIds, targetIds, asType));
  passWuxie(g);
}

/** Answer the ENG-004 draw gate if it is pending (no-op otherwise). */
export function passDrawGate(g: ContractGame): void {
  const pd = g.session.state.pendingDecision;
  if (pd?.kind === "drawCard") respond(g.session, { ...base(pd), choice: "draw" });
}

/** Autopilot to `pid`'s main action in the CURRENT turn. */
export function toMainAction(g: ContractGame, pid?: string): PendingDecision {
  return runTo(g, pid ? { kind: "mainAction", playerId: pid } : { kind: "mainAction" });
}

/** Autopilot until `pid` reaches a main action in a LATER turn than the one in
 *  progress — the workhorse for every "counter resets next turn" checkbox. */
export function nextTurnOf(g: ContractGame, pid: string, opts: RunToOpts = {}): PendingDecision {
  const from = g.state.turnNumber;
  return runTo(
    g,
    (pd) => pd.kind === "mainAction" && pd.playerId === pid && g.state.turnNumber > from,
    { max: 400, ...opts },
  );
}

/** End the turn in progress and stop at the next player's main action. */
export function endTurn(g: ContractGame): PendingDecision {
  const from = g.state.turnNumber;
  return runTo(g, (pd) => pd.kind === "mainAction" && g.state.turnNumber > from, { max: 400 });
}

export function asLord(g: ContractGame, pid: string): void {
  g.p(pid).role = "lord";
}

export function asRole(g: ContractGame, pid: string, role: Role): void {
  g.p(pid).role = role;
}

export { respond };
