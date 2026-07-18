// A genuinely-random bot for the flow probe: each decision it makes is
// chosen from a seeded RNG, so soak runs sweep a wide slice of the
// possibility space instead of the one deterministic line simpleBotAnswer
// walks. It deliberately (at a configurable rate) submits *illegal* input —
// too many targets, wrong card type, dead targets — to hunt the "game hangs
// on a bad move" class of bug the user hit.
//
// It is not required to be legal: the probe's runner wraps respond() in
// try/catch and falls back to a guaranteed-terminating answer, and the
// engine's atomicity contract guarantees a rejected move leaves state intact.
import {
  simpleBotAnswer,
  projectFor,
  type GameSession,
  type PlayerAnswer,
  type PlayerView,
  type Card,
} from "@tktw/engine";
import { cardMeta } from "../src/data/cardMeta";
import { generalSkills } from "../src/data/generalSkills";

// mulberry32 — a tiny self-contained deterministic RNG so the bot needs no
// engine internals and every run is reproducible from its seed.
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

export interface RandomBotOptions {
  seed: number;
  /** Probability (0..1) a decision deliberately submits illegal input. */
  faultRate?: number;
}

const SUITS = ["spade", "heart", "club", "diamond"];

export function makeRandomBot(opts: RandomBotOptions) {
  const rnd = mulberry32(opts.seed);
  const faultRate = opts.faultRate ?? 0.12;

  const pick = <T>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(rnd() * arr.length)] : undefined);
  const chance = (p: number) => rnd() < p;
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  return function randomBotAnswer(session: GameSession): PlayerAnswer {
    const pending = session.state.pendingDecision;
    if (!pending) throw new Error("randomBotAnswer: no pending decision");
    const view = projectFor(session.state, pending.playerId);
    const me = view.players.find((p) => p.id === pending.playerId)!;
    const hand: Card[] = Array.isArray(me.hand) ? me.hand : [];
    const base = { decisionId: pending.id, playerId: me.id };
    const data = pending.data as Record<string, unknown>;
    const aliveOthers = view.players.filter((p) => p.alive && p.id !== me.id);
    const allOthers = view.players.filter((p) => p.id !== me.id);
    const firstCardOf = (typeKey: string) => hand.find((c) => c.typeKey === typeKey);

    switch (pending.kind) {
      case "mainAction": {
        // Roll among: end phase, the smart heuristic play (keeps games
        // progressing + covers cards), a random play, an active skill, or a
        // deliberate fault.
        const roll = rnd();
        if (roll < 0.14) return { ...base, choice: "endPhase" };
        if (roll < 0.4) return simpleBotAnswer(session); // legal progress + coverage

        // active skill?
        const activeSkills = generalSkills(me.generalId).filter((s) => s.active);
        if (activeSkills.length && chance(0.4)) {
          const sk = pick(activeSkills)!;
          const cardIds = shuffle(hand).slice(0, Math.min(hand.length, 1 + Math.floor(rnd() * 2))).map((c) => c.id);
          const targetIds = chance(0.7) && aliveOthers.length ? [pick(aliveOthers)!.id] : [];
          return { ...base, choice: "useSkill", skillId: sk.id, cardIds, targetIds };
        }

        const card = pick(hand);
        if (!card) return { ...base, choice: "endPhase" };
        const meta = cardMeta(card.typeKey);
        let targetIds: string[] = [];
        if (["single", "singleInRange", "singleArmed", "shunshouRange"].includes(meta.targetRule)) {
          // Card-removal tricks prefer an equipped victim (realistic, and it's
          // the only way to exercise "lose-equipment" triggers like jiehun).
          const equipped = aliveOthers.filter((p) => Object.keys(p.equipment).length > 0);
          const pool = (card.typeKey === "guohe" || card.typeKey === "shunshou") && equipped.length && chance(0.7) ? equipped : aliveOthers;
          const t = pick(pool);
          targetIds = t ? [t.id] : [];
          // FAULT: two targets for a one-target card (the reported hang).
          if (chance(faultRate) && aliveOthers.length >= 2) targetIds = shuffle(aliveOthers).slice(0, 2).map((p) => p.id);
        }
        // FAULT: sometimes aim at a dead player.
        if (chance(faultRate) && allOthers.length) {
          const dead = allOthers.filter((p) => !p.alive);
          if (dead.length) targetIds = [pick(dead)!.id];
        }
        return { ...base, choice: "playCard", cardIds: [card.id], targetIds };
      }

      case "respondShan":
      case "respondSha":
      case "jiedaoForceSha":
      case "respondTao": {
        const wanted = pending.kind === "respondShan" ? "shan" : pending.kind === "respondTao" ? "tao" : "sha";
        const good = firstCardOf(wanted);
        // FAULT: respond with a wrong-type card.
        if (good && chance(faultRate)) {
          const wrong = hand.find((c) => c.typeKey !== wanted);
          if (wrong) return { ...base, cardIds: [wrong.id] };
        }
        if (good && chance(0.6)) return { ...base, cardIds: [good.id] };
        return { ...base, pass: true };
      }

      case "askWuxie": {
        const wx = firstCardOf("wuxie");
        return wx && chance(0.5) ? { ...base, cardIds: [wx.id] } : { ...base, pass: true };
      }

      case "activateSkill":
        // accept is always a valid answer; passing is too.
        return chance(0.6) ? { ...base } : { ...base, pass: true };

      case "fankuiPick":
        return chance(0.7) ? { ...base } : { ...base, pass: true };

      case "discardTo": {
        const need = Number((data as { mustDiscard?: number }).mustDiscard ?? 0);
        return { ...base, cardIds: shuffle(hand).slice(0, need).map((c) => c.id) };
      }
      case "discardChosenBy": {
        const need = Number((data as { count?: number }).count ?? 0);
        return { ...base, cardIds: shuffle(hand).slice(0, need).map((c) => c.id) };
      }

      case "pickCardFromPlayer": {
        // data.visibleIds = the target's equipment/judgment cards (public).
        // Picking one strips it — the only way to fire lose-equipment triggers
        // (jiehun/sturdy). Passing makes the engine take a random hand card.
        const visibleIds = (data.visibleIds as string[] | undefined) ?? [];
        if (visibleIds.length && chance(0.6)) return { ...base, cardIds: [pick(visibleIds)!] };
        return { ...base, pass: true };
      }

      case "guandouOrder": {
        const options = (data.options as string[] | undefined) ?? [];
        return chance(0.5) ? { ...base, cardIds: shuffle(options) } : { ...base, pass: true };
      }
      case "wuguPick": {
        // options are now full card faces, not bare ids.
        const options = (data.options as { id: string }[] | undefined) ?? [];
        const o = pick(options);
        return { ...base, cardIds: o ? [o.id] : [] };
      }
      case "judgmentReveal":
        // A judgment can't be declined — any answer flips the card.
        return { ...base, choice: "reveal" };
      case "qilinDestroyHorse":
        return { ...base, choice: chance(0.5) ? "horseMinus" : "horsePlus" };
      case "tuxiTargets": {
        const eligible = (data.eligible as { id: string }[] | undefined) ?? [];
        // sometimes steal from 1, sometimes 2 — exercise both.
        const n = chance(0.5) ? 1 : 2;
        return { ...base, targetIds: shuffle(eligible).slice(0, n).map((e) => e.id) };
      }

      case "pickGeneral": {
        const options = (data.options as string[] | undefined) ?? [];
        const o = pick(options);
        return o ? { ...base, choice: o } : { ...base, pass: true };
      }

      case "yijiGive": {
        const t = pick(view.players.filter((p) => p.alive));
        return t ? { ...base, targetIds: [t.id] } : { ...base, pass: true };
      }

      case "swordIceChoice":
        return { ...base, choice: chance(0.5) ? "damage" : "discard2" };
      case "swordYyChoice":
        return hand.length && chance(0.5) ? { ...base, choice: "discard", cardIds: [pick(hand)!.id] } : { ...base, choice: "draw" };
      case "qinglongReplay":
        return chance(0.4) ? { ...base, choice: "replay" } : { ...base, pass: true };
      case "guanshiForce": {
        const two = shuffle(hand).slice(0, 2);
        return two.length === 2 && chance(0.4) ? { ...base, choice: "force", cardIds: two.map((c) => c.id) } : { ...base, pass: true };
      }
      case "ganglieChoice":
        return chance(0.5) && hand.length >= 2 ? { ...base, choice: "discard2" } : { ...base, pass: true };
      case "fanjianGuess":
        return { ...base, choice: pick(SUITS)! };
      case "guicaiReplace":
        return hand.length && chance(0.4) ? { ...base, cardIds: [pick(hand)!.id] } : { ...base, pass: true };
      case "hujiaVolunteer": {
        const wanted = firstCardOf("shan") ?? firstCardOf("sha");
        return wanted && chance(0.4) ? { ...base, cardIds: [wanted.id] } : { ...base, pass: true };
      }
      case "huibiRedirect": {
        const c = pick(hand);
        const t = pick(aliveOthers);
        return c && t && chance(0.4) ? { ...base, cardIds: [c.id], targetIds: [t.id] } : { ...base, pass: true };
      }
      case "guessCard":
      default:
        // Unknown: fall back to the deterministic bot (which itself defaults
        // to pass), guaranteeing a legal, progressing answer.
        try {
          return simpleBotAnswer(session);
        } catch {
          return { ...base, pass: true };
        }
    }
  };
}

export type { PlayerView };
