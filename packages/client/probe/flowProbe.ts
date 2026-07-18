// Flow probe: play the whole game, over and over, with every general sitting
// in seat 0 (= "the human"), random player counts 3-10, random bots at every
// seat, and measure — through the *real* client routing (skillInteraction /
// cardMeta / decisionCopy + the wuxie auto-pass rule) — how many dialogs /
// clicks the seat-0 human actually faces, which decision kinds have no good
// UI copy, which cards/skills never get exercised, and where the engine
// crashes or hangs on the messy inputs the random bot throws at it.
//
// Run: pnpm --filter @tktw/client exec tsx probe/flowProbe.ts [--games N] [--seed S]
import {
  createGame,
  assignGeneral,
  respond,
  projectFor,
  GENERALS,
  type GameSession,
  type GameView,
  type PendingDecision,
  type Card,
} from "@tktw/engine";
import { makeRandomBot } from "./randomBot";
import { CARD_META } from "../src/data/cardMeta";
import { GENERAL_SKILLS } from "../src/data/generalSkills";
import { skillInteraction, sameFactionTeammateAlive } from "../src/data/skillInteraction";
import { describeDecision } from "../src/data/decisionCopy";

export const REAL_GENERALS = Object.keys(GENERALS).filter((id) => id !== "none");
export const CARD_TYPES = Object.keys(CARD_META);
const MAX_STEPS = 120_000;

export interface Findings {
  crashes: { general: string; seed: number; kind: string; message: string }[];
  hangs: { general: string; seed: number }[];
  // seat-0 prompt channels
  channelCounts: Record<string, number>; // auto | inline | dialog | dialog-fallback | turn | setup
  clicksTotal: number;
  promptsTotal: number; // dialogs the human actually sees
  gamesRun: number;
  copyDefaultKinds: Record<string, number>; // decision kinds falling to decisionCopy default
  rejectedInputs: number; // engine rejected a (fault) move — good, means no hang
  // coverage
  cardsPlayed: Set<string>;
  skillsFired: Set<string>; // active + triggered (accepted activateSkill / useSkill)
  // per-general prompt tally (avg dialogs the seat-0 human faces per game)
  perGeneralPrompts: Record<string, { games: number; dialogs: number; clicks: number }>;
}

function classifySeat0(pending: PendingDecision, view: GameView, me: GameView["players"][number]) {
  const hand: Card[] = Array.isArray(me.hand) ? me.hand : [];
  const data = pending.data as Record<string, unknown>;
  switch (pending.kind) {
    case "mainAction":
      return { channel: "turn", clicks: 0, prompt: false, flag: undefined as string | undefined };
    case "discardTo":
      // Handled by the dedicated discard bar in Table.tsx (not a modal dialog).
      return { channel: "discard-bar", clicks: 1, prompt: false, flag: undefined };
    case "pickGeneral":
      return { channel: "setup", clicks: 1, prompt: false, flag: undefined };
    case "fankuiPick":
      return { channel: "auto", clicks: 0, prompt: false, flag: undefined };
    case "askWuxie": {
      const hasWuxie = hand.some((c) => c.typeKey === "wuxie");
      return hasWuxie
        ? { channel: "dialog", clicks: 2, prompt: true, flag: undefined }
        : { channel: "auto", clicks: 0, prompt: false, flag: undefined };
    }
    case "activateSkill": {
      const sid = String(data.skillId ?? "");
      const mode = skillInteraction(sid);
      if (mode === "autoToast" || mode === "autoSilent") return { channel: "auto", clicks: 0, prompt: false, flag: undefined };
      if (mode === "inline") return { channel: "inline", clicks: 1, prompt: false, flag: undefined };
      if (mode === "hujia") {
        return sameFactionTeammateAlive(view, me)
          ? { channel: "dialog", clicks: 2, prompt: true, flag: undefined }
          : { channel: "auto", clicks: 0, prompt: false, flag: undefined };
      }
      // Unrouted (e.g. equipment skills): OK as long as decisionCopy gives it
      // real text — the modal shows describeDecision. Flag only a raw default.
      const copy = describeDecision(pending, view);
      const isDefault = copy.title.startsWith("ตัดสินใจ:");
      return isDefault
        ? { channel: "dialog-fallback", clicks: 2, prompt: true, flag: `activateSkill-unrouted:${sid}` }
        : { channel: "dialog", clicks: 2, prompt: true, flag: undefined };
    }
    default: {
      const copy = describeDecision(pending, view);
      const isDefault = copy.title.startsWith("ตัดสินใจ:");
      return {
        channel: isDefault ? "dialog-fallback" : "dialog",
        clicks: 2,
        prompt: true,
        flag: isDefault ? `copy-default:${pending.kind}` : undefined,
      };
    }
  }
}

function runOneGame(general: string, seed: number, f: Findings): void {
  const rnd = mulberry32(seed);
  const playerCount = 3 + Math.floor(rnd() * 8); // 3..10
  const session: GameSession = createGame({ playerCount, seed });
  const state = session.state;

  // Force the target general into seat 0 as lord (so lordOnly skills fire),
  // random real generals elsewhere.
  assignGeneral(state, "p0", general, true);
  state.players[0]!.role = "lord";
  for (let s = 1; s < playerCount; s++) {
    const g = REAL_GENERALS[Math.floor(rnd() * REAL_GENERALS.length)]!;
    assignGeneral(state, `p${s}`, g, false);
    state.players[s]!.role = s % 2 === 0 ? "loyalist" : "rebel";
  }

  const bot = makeRandomBot({ seed: seed ^ 0x9e3779b9 });
  const pg = (f.perGeneralPrompts[general] ??= { games: 0, dialogs: 0, clicks: 0 });
  pg.games += 1;
  f.gamesRun += 1;

  let steps = 0;
  while (state.pendingDecision) {
    if (steps++ > MAX_STEPS) {
      f.hangs.push({ general, seed });
      return;
    }
    const pending = state.pendingDecision;

    // Record card-type coverage: peek the responder's hand before they answer.
    // Record seat-0 flow classification.
    if (pending.playerId === "p0") {
      const view = projectFor(state, "p0");
      const me = view.players.find((p) => p.id === "p0")!;
      const c = classifySeat0(pending, view, me);
      f.channelCounts[c.channel] = (f.channelCounts[c.channel] ?? 0) + 1;
      f.clicksTotal += c.clicks;
      pg.clicks += c.clicks;
      if (c.prompt) {
        f.promptsTotal += 1;
        pg.dialogs += 1;
      }
      if (c.flag) f.copyDefaultKinds[c.flag] = (f.copyDefaultKinds[c.flag] ?? 0) + 1;
    }

    // Compute the answer, note card-play coverage, then respond safely.
    let answer;
    try {
      answer = bot(session);
    } catch (err) {
      answer = { decisionId: pending.id, playerId: pending.playerId, pass: true };
      void err;
    }

    // coverage: a playCard / useSkill answer that names a card in hand
    if (answer.choice === "playCard" || answer.choice === "useSkill") {
      const view = projectFor(state, pending.playerId);
      const p = view.players.find((pp) => pp.id === pending.playerId);
      const hand: Card[] = p && Array.isArray(p.hand) ? p.hand : [];
      for (const id of answer.cardIds ?? []) {
        const card = hand.find((cc) => cc.id === id);
        if (card && answer.choice === "playCard") f.cardsPlayed.add(card.typeKey);
      }
      if (answer.choice === "useSkill" && answer.skillId) f.skillsFired.add(answer.skillId);
    }
    if (pending.kind === "activateSkill" && !answer.pass) {
      f.skillsFired.add(String((pending.data as { skillId?: string }).skillId ?? ""));
    }
    // Locked-trigger skills never emit activateSkill — detect them from their
    // own decision signals: machao_tieqi / xiahoudun_ganglie via judgmentReveal's
    // reason, daiqiao_huibi via its redirect prompt.
    if (pending.kind === "judgmentReveal") {
      f.skillsFired.add(String((pending.data as { reason?: string }).reason ?? ""));
    }
    if (pending.kind === "huibiRedirect") f.skillsFired.add("daiqiao_huibi");

    try {
      respond(session, answer);
    } catch (err) {
      // A rejected move (often a deliberate fault) — atomicity guarantees the
      // state is intact, so recover with a guaranteed-terminating answer.
      f.rejectedInputs += 1;
      void err;
      try {
        const recover =
          pending.kind === "mainAction"
            ? { decisionId: pending.id, playerId: pending.playerId, choice: "endPhase" }
            : { decisionId: pending.id, playerId: pending.playerId, pass: true };
        respond(session, recover);
      } catch (err2) {
        // Even the safe fallback threw — that IS a real engine bug.
        f.crashes.push({
          general,
          seed,
          kind: pending.kind,
          message: (err2 as Error).message ?? String(err2),
        });
        return;
      }
    }
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── observable-skill catalogue (active + trigger skills that yield a
// decision). Pure-query/locked passives never surface a decision and are
// covered by engine unit tests, not here — list them so the gap report is
// honest. ────────────────────────────────────────────────────────────────
const OBSERVABLE_SKILLS = new Set<string>();
for (const skills of Object.values(GENERAL_SKILLS)) for (const s of skills) OBSERVABLE_SKILLS.add(s.id);
// Prune the pure-passive ones (no decision, no useSkill) — identified by not
// being active and being a known locked/query skill.
const PASSIVE_SKILLS = new Set([
  "guanyu_wusheng", "zhaoyun_longdan", "zhangfei_paoxiao", "machao_qima", "pangtong_qicai",
  "lubu_wushuang", "luxun_qianxun", "zhugeliang_kongcheng", "ganning_qixi", "zhenji_guose",
  "daiqiao_guose", "huatuo_jiuxing", "lumeng_qinxue", "simayi_guicai", "sunquan_jiujia",
  "caoren_tuoyi", "zhangliao_tuxi", // these DO fire via activateSkill (inline) — keep observable
]);
// keep tuoyi/tuxi observable:
PASSIVE_SKILLS.delete("caoren_tuoyi");
PASSIVE_SKILLS.delete("zhangliao_tuxi");

function report(f: Findings): void {
  const line = (s = "") => console.log(s);
  line("\n══════════════════════════════════════════════════════════════");
  line("  TKTW FLOW PROBE — report");
  line("══════════════════════════════════════════════════════════════");
  line(`games run: ${f.gamesRun}   generals: ${REAL_GENERALS.length}`);
  line("");

  line("── Robustness ─────────────────────────────────────────────");
  line(`rejected inputs (faults handled cleanly, no hang): ${f.rejectedInputs}`);
  line(`crashes (safe fallback also threw = real bug):      ${f.crashes.length}`);
  for (const c of f.crashes.slice(0, 20)) line(`   ✗ ${c.general} seed=${c.seed} [${c.kind}] ${c.message}`);
  line(`hangs (exceeded ${MAX_STEPS} steps):                ${f.hangs.length}`);
  for (const h of f.hangs.slice(0, 20)) line(`   ⧗ ${h.general} seed=${h.seed}`);
  line("");

  line("── Seat-0 flow (what the human faces) ─────────────────────");
  const chans = Object.entries(f.channelCounts).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of chans) line(`   ${k.padEnd(16)} ${v}`);
  line(`   ── dialogs (prompts human sees): ${f.promptsTotal}`);
  line(`   ── total clicks:                 ${f.clicksTotal}`);
  line(`   ── dialogs / game:               ${(f.promptsTotal / Math.max(1, f.gamesRun)).toFixed(2)}`);
  line("");

  line("── Friction flags (UI copy/routing gaps) ──────────────────");
  const flags = Object.entries(f.copyDefaultKinds).sort((a, b) => b[1] - a[1]);
  if (flags.length === 0) line("   (none) ✓  every seat-0 decision has real UI copy/routing");
  for (const [k, v] of flags) line(`   ⚑ ${k}   ×${v}`);
  line("");

  line("── Card coverage ──────────────────────────────────────────");
  const cardGaps = CARD_TYPES.filter((t) => !f.cardsPlayed.has(t));
  line(`   played ${f.cardsPlayed.size}/${CARD_TYPES.length} card types`);
  if (cardGaps.length) line(`   never played: ${cardGaps.join(", ")}`);
  else line("   ✓ every card type was played");
  line("");

  line("── Skill coverage (active + trigger skills) ───────────────");
  const observable = [...OBSERVABLE_SKILLS].filter((s) => !PASSIVE_SKILLS.has(s));
  const skillGaps = observable.filter((s) => !f.skillsFired.has(s));
  line(`   fired ${observable.length - skillGaps.length}/${observable.length} observable skills`);
  if (skillGaps.length) line(`   never fired: ${skillGaps.join(", ")}`);
  else line("   ✓ every observable skill fired");
  line(`   (passive/query skills not decision-observable: ${PASSIVE_SKILLS.size} — see engine tests)`);
  line("");

  line("── Per-general dialogs/game (highest friction first) ──────");
  const rows = Object.entries(f.perGeneralPrompts)
    .map(([g, s]) => ({ g, perGame: s.dialogs / Math.max(1, s.games), clicks: s.clicks / Math.max(1, s.games) }))
    .sort((a, b) => b.perGame - a.perGame);
  for (const r of rows) line(`   ${r.g.padEnd(14)} ${r.perGame.toFixed(2)} dialogs  ${r.clicks.toFixed(2)} clicks /game`);
  line("══════════════════════════════════════════════════════════════\n");
}

/** The observable (decision-surfacing) skills the probe can verify fire —
 *  excludes pure passive/query skills that never produce a decision. */
export function observableSkills(): string[] {
  return [...OBSERVABLE_SKILLS].filter((s) => !PASSIVE_SKILLS.has(s));
}

/** Run the soak and return raw findings — importable by the regression test. */
export function runProbe(gamesPerGeneral: number, baseSeed: number): Findings {
  const f: Findings = {
    crashes: [], hangs: [], channelCounts: {}, clicksTotal: 0, promptsTotal: 0, gamesRun: 0,
    copyDefaultKinds: {}, rejectedInputs: 0, cardsPlayed: new Set(), skillsFired: new Set(),
    perGeneralPrompts: {},
  };
  REAL_GENERALS.forEach((general, gi) => {
    for (let i = 0; i < gamesPerGeneral; i++) {
      const seed = (baseSeed + gi * 7919 + i * 104729) >>> 0;
      runOneGame(general, seed, f);
    }
  });
  return f;
}

function main() {
  const argv = process.argv.slice(2);
  const getNum = (flag: string, dflt: number) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : dflt;
  };
  const f = runProbe(getNum("--games", 40), getNum("--seed", 20260716));
  report(f);
  if (f.crashes.length || f.hangs.length) process.exitCode = 1;
}

// Run as a CLI only when invoked directly (not when imported by a test).
if (/flowProbe\.(ts|tsx|js|mjs)$/.test(process.argv[1] ?? "")) main();
