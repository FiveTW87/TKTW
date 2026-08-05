// Assertions for the catalog's universal rules.
//
// "ทุก invalid answer ต้อง throw/reject และ state ต้อง byte-identical กับก่อนตอบ"
// and "ตรวจทั้งผลลัพธ์, ตำแหน่งการ์ด, HP, usage counter, pending decision และ
// log/trigger" are catalog-wide requirements, not per-case ones. Encoding them
// here means a case can't accidentally check only half of the contract.
import { expect } from "vitest";
import type { GameState, LogEntry, PendingDecision, PlayerAnswer, Zone } from "../../src/types";
import { respond } from "../../src/core/decisions";
import { getPlayer } from "../../src/core/state";
import { locationsOf, type CardLocation } from "./rig";
import type { ContractGame } from "./harness";

type Make = (pd: PendingDecision) => PlayerAnswer;

/**
 * The catalog's atomicity rule, end to end: the answer must throw, and state,
 * pendingDecision and decisionLog must all be byte-identical afterwards.
 *
 * Retires the game (`g.dead = true`). On a non-retryable session the throw
 * completes the generator permanently — a further respond() would silently
 * clear pendingDecision and make every later assertion vacuous — so each reject
 * scenario gets its own fresh game. That is also why the catalog's bundled
 * reject lines ("reject ตัวเอง, ผู้ตาย, ...") become one `it()` each.
 */
export function expectAtomicReject(g: ContractGame, make: Make, msg?: string | RegExp): void {
  if (g.session.rebuild) {
    throw new Error(
      "expectAtomicReject needs a non-retryable game (omit `retryable`), otherwise the replay rebuild reconstructs a clean state and hides a premature mutation",
    );
  }
  const pd = g.pd();
  const beforeState = structuredClone(g.session.state);
  const beforePd = structuredClone(pd);
  const beforeLogLen = g.session.decisionLog.length;

  let thrown: unknown;
  try {
    respond(g.session, make(pd));
  } catch (err) {
    thrown = err;
  }
  g.dead = true;

  expect(thrown, `expected this answer to be rejected, but it was accepted`).toBeDefined();
  if (msg !== undefined) expect(String((thrown as Error).message)).toMatch(msg);
  expect(g.session.state, "a rejected answer must leave state byte-identical").toEqual(beforeState);
  expect(g.session.state.pendingDecision, "the decision must survive a rejected answer").toEqual(
    beforePd,
  );
  expect(g.session.decisionLog, "a rejected answer must not be logged").toHaveLength(beforeLogLen);
}

/** Retry-safety twin (needs `retryable: true`): a bad answer throws, then a good
 *  answer succeeds on the very same decision id. */
export function expectRejectThenRetry(g: ContractGame, bad: Make, good: Make): void {
  if (!g.session.rebuild) {
    throw new Error("expectRejectThenRetry needs a game built with `retryable: true`");
  }
  const pd = g.pd();
  const id = pd.id;
  const beforeLogLen = g.session.decisionLog.length;
  expect(() => respond(g.session, bad(pd))).toThrow();
  const retryPd = g.session.state.pendingDecision;
  expect(retryPd?.id, "the rejected answer must not consume the decision").toBe(id);
  respond(g.session, good(retryPd!));
  expect(g.session.decisionLog, "only the successful retry is logged").toHaveLength(
    beforeLogLen + 1,
  );
}

// ── card location ────────────────────────────────────────────────────────────

/** The single zone a card occupies, or undefined when it is in flight (held in
 *  a judgment box / reveal pool mid-resolution). Throws on duplication. */
export function whereIs(state: GameState, cardId: string): CardLocation | undefined {
  const hits = locationsOf(state, cardId);
  if (hits.length > 1) {
    throw new Error(`${cardId} is in ${hits.length} zones at once: ${JSON.stringify(hits)}`);
  }
  return hits[0];
}

export function expectZone(
  state: GameState,
  cardId: string,
  zone: Zone,
  ownerId?: string,
): void {
  const at = whereIs(state, cardId);
  expect(at, `${cardId} is in no zone at all`).toBeDefined();
  expect({ zone: at!.zone, ...(ownerId !== undefined ? { ownerId: at!.ownerId } : {}) }).toEqual({
    zone,
    ...(ownerId !== undefined ? { ownerId } : {}),
  });
}

export function expectInHand(state: GameState, pid: string, ...cardIds: string[]): void {
  for (const id of cardIds) expectZone(state, id, "hand", pid);
}

export function expectNotInHand(state: GameState, pid: string, ...cardIds: string[]): void {
  const hand = getPlayer(state, pid).hand.map((c) => c.id);
  for (const id of cardIds) expect(hand, `${id} should have left ${pid}'s hand`).not.toContain(id);
}

export function expectDiscarded(state: GameState, ...cardIds: string[]): void {
  for (const id of cardIds) expectZone(state, id, "discardPile");
}

export function expectHandIds(state: GameState, pid: string, ids: string[]): void {
  expect(getPlayer(state, pid).hand.map((c) => c.id).sort()).toEqual([...ids].sort());
}

export function expectHandSize(state: GameState, pid: string, n: number): void {
  expect(getPlayer(state, pid).hand.length, `${pid} hand size`).toBe(n);
}

export function expectEquipped(
  state: GameState,
  pid: string,
  slot: "weapon" | "armor" | "horseMinus" | "horsePlus",
  cardId: string | undefined,
): void {
  expect(getPlayer(state, pid).equipment[slot]?.id, `${pid}.${slot}`).toBe(cardId);
}

// ── hp / life ────────────────────────────────────────────────────────────────

export function expectHp(state: GameState, pid: string, hp: number): void {
  expect(getPlayer(state, pid).hp, `${pid} hp`).toBe(hp);
}

export function expectAlive(state: GameState, pid: string, alive = true): void {
  expect(getPlayer(state, pid).alive, `${pid} alive`).toBe(alive);
}

// ── usage counters ───────────────────────────────────────────────────────────

export function expectUsage(
  state: GameState,
  pid: string,
  want: { sha?: number; skills?: Record<string, number> },
): void {
  const p = getPlayer(state, pid);
  if (want.sha !== undefined) expect(p.shaUsedThisTurn, `${pid} shaUsedThisTurn`).toBe(want.sha);
  for (const [skillId, n] of Object.entries(want.skills ?? {})) {
    expect(p.skillUsedThisTurn[skillId] ?? 0, `${pid} used ${skillId}`).toBe(n);
  }
}

// ── log / trigger evidence ───────────────────────────────────────────────────

function logMatches(e: LogEntry, want: Partial<LogEntry>): boolean {
  return Object.entries(want).every(([k, v]) => {
    const actual = (e as unknown as Record<string, unknown>)[k];
    return JSON.stringify(actual) === JSON.stringify(v);
  });
}

export function logEntries(state: GameState, want: Partial<LogEntry>): LogEntry[] {
  return state.log.filter((e) => logMatches(e, want));
}

/** Assert the structured log recorded the effect. `times` pins the exact count
 *  — the catalog's "trigger ครั้งเดียว ไม่ใช่ต่อเป้าหมาย" cases need that. */
export function expectLog(state: GameState, want: Partial<LogEntry>, times?: number): void {
  const hits = logEntries(state, want);
  if (times === undefined) {
    expect(hits.length, `expected a log entry matching ${JSON.stringify(want)}`).toBeGreaterThan(0);
  } else {
    expect(hits.length, `log entries matching ${JSON.stringify(want)}`).toBe(times);
  }
}

export function expectNoLog(state: GameState, want: Partial<LogEntry>): void {
  expect(
    logEntries(state, want).map((e) => e.eventType),
    `expected NO log entry matching ${JSON.stringify(want)}`,
  ).toEqual([]);
}

export function expectSkillUsed(state: GameState, skillId: string, times?: number): void {
  expectLog(state, { eventType: "skillUse", skillId }, times);
}

// ── snapshots ────────────────────────────────────────────────────────────────

/** Capture state now; the returned function asserts nothing changed since. */
export function snapshot(g: ContractGame): () => void {
  const before = structuredClone(g.session.state);
  return () => expect(g.session.state).toEqual(before);
}
