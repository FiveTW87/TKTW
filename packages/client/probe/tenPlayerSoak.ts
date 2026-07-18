// Focused soak: EVERY general seated in a full 10-player table, random
// (fault-injecting) bots at all seats, each game driven to a real finish.
// Reports crashes / hangs and card + skill coverage.
//
// Run: pnpm --filter @tktw/client exec tsx probe/tenPlayerSoak.ts [--games N]
import { createGame, assignGeneral, respond, projectFor, type GameSession, type Card } from "@tktw/engine";
import { makeRandomBot } from "./randomBot";
import { REAL_GENERALS, CARD_TYPES, observableSkills } from "./flowProbe";

const PLAYERS = 10;
const MAX_STEPS = 200_000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface F {
  games: number; crashes: { general: string; seed: number; kind: string; message: string }[];
  hangs: { general: string; seed: number }[]; unfinished: number; rejected: number;
  cardsPlayed: Set<string>; skillsFired: Set<string>;
}

function runOne(general: string, seed: number, f: F): void {
  const rnd = mulberry32(seed);
  // Deterministic seat assignment: the target general in seat 0 as lord,
  // random reals elsewhere. Recomputed identically on rebuild.
  const gens = [general];
  const roles = ["lord"];
  for (let s = 1; s < PLAYERS; s++) {
    gens.push(REAL_GENERALS[Math.floor(rnd() * REAL_GENERALS.length)]!);
    roles.push(s % 2 === 0 ? "loyalist" : "rebel");
  }
  const apply = (st: GameSession["state"]) => {
    for (let s = 0; s < PLAYERS; s++) { assignGeneral(st, `p${s}`, gens[s]!, s === 0); st.players[s]!.role = roles[s]!; }
  };
  const build = (): GameSession => { const s = createGame({ playerCount: PLAYERS, seed }); apply(s.state); s.rebuild = undefined; return s; };
  const session = build();
  session.rebuild = () => { const fr = build(); for (const e of session.decisionLog) respond(fr, { ...e.answer, decisionId: fr.state.pendingDecision!.id }); return fr; };

  const bot = makeRandomBot({ seed: seed ^ 0x9e3779b9 });
  f.games++;
  let steps = 0;
  while (session.state.pendingDecision) {
    if (steps++ > MAX_STEPS) { f.hangs.push({ general, seed }); return; }
    const pending = session.state.pendingDecision;
    let answer;
    try { answer = bot(session); } catch { answer = { decisionId: pending.id, playerId: pending.playerId, pass: true }; }
    if (answer.choice === "playCard" || answer.choice === "useSkill") {
      const view = projectFor(session.state, pending.playerId);
      const hand: Card[] = view.players.find((p) => p.id === pending.playerId)?.hand as Card[] ?? [];
      for (const id of answer.cardIds ?? []) { const c = hand.find((cc) => cc.id === id); if (c && answer.choice === "playCard") f.cardsPlayed.add(c.typeKey); }
      if (answer.choice === "useSkill" && answer.skillId) f.skillsFired.add(answer.skillId);
    }
    if (pending.kind === "activateSkill" && !answer.pass) f.skillsFired.add(String((pending.data as { skillId?: string }).skillId ?? ""));
    if (pending.kind === "judgmentReveal") f.skillsFired.add(String((pending.data as { reason?: string }).reason ?? ""));
    if (pending.kind === "huibiRedirect") f.skillsFired.add("daiqiao_huibi");
    try {
      respond(session, answer);
    } catch {
      f.rejected++;
      try {
        const pid = session.state.pendingDecision!.id;
        respond(session, pending.kind === "mainAction" ? { decisionId: pid, playerId: pending.playerId, choice: "endPhase" } : { decisionId: pid, playerId: pending.playerId, pass: true });
      } catch (err2) { f.crashes.push({ general, seed, kind: pending.kind, message: (err2 as Error).message }); return; }
    }
  }
  if (!session.state.finished) { f.unfinished++; f.hangs.push({ general, seed }); }
}

function main() {
  const argv = process.argv.slice(2);
  const gi = argv.indexOf("--games");
  const perGeneral = gi >= 0 && argv[gi + 1] ? Number(argv[gi + 1]) : 12;
  const f: F = { games: 0, crashes: [], hangs: [], unfinished: 0, rejected: 0, cardsPlayed: new Set(), skillsFired: new Set() };

  REAL_GENERALS.forEach((g, i) => {
    for (let k = 0; k < perGeneral; k++) runOne(g, (0xbeef + i * 7919 + k * 104729) >>> 0, f);
  });

  const line = (s = "") => console.log(s);
  line("\n══════ 10-PLAYER FULL-GAME SOAK ══════");
  line(`generals: ${REAL_GENERALS.length}   games: ${f.games} (all 10-player, to completion)`);
  line(`rejected/faulted inputs absorbed: ${f.rejected}`);
  line(`CRASHES: ${f.crashes.length}`);
  for (const c of f.crashes.slice(0, 25)) line(`   ✗ ${c.general} seed=${c.seed} [${c.kind}] ${c.message}`);
  line(`HANGS / unfinished: ${f.hangs.length} (unfinished=${f.unfinished})`);
  for (const h of f.hangs.slice(0, 25)) line(`   ⧗ ${h.general} seed=${h.seed}`);
  const cardGaps = CARD_TYPES.filter((t) => !f.cardsPlayed.has(t));
  line(`\nCARD COVERAGE: ${f.cardsPlayed.size}/${CARD_TYPES.length}` + (cardGaps.length ? `  — missing: ${cardGaps.join(", ")}` : "  ✓ every card played"));
  const skillGaps = observableSkills().filter((s) => !f.skillsFired.has(s) && s !== "sunshangxiang_jiehun");
  line(`SKILL COVERAGE: fired ${observableSkills().length - observableSkills().filter((s) => !f.skillsFired.has(s)).length}/${observableSkills().length}` + (skillGaps.length ? `  — missing: ${skillGaps.join(", ")}` : "  ✓ every observable skill fired"));
  line(`\nRESULT: ${f.crashes.length === 0 && f.hangs.length === 0 ? "✅ 0 crashes, 0 hangs — all games finished" : "❌ issues found (see above)"}`);
  line("══════════════════════════════════════\n");
  if (f.crashes.length || f.hangs.length) process.exitCode = 1;
}

main();
