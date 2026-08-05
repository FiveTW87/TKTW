// TKTW_TEST_CASE_CATALOG.md → "การ์ด 32 ชนิด / Delayed tricks"
// (C-LEBUSISHU, C-SHANDIAN).
//
// A delayed trick opens NO ไร้ช่องโหว่ window when it is placed (SPEC 8.3) —
// the window opens at the owner's judge phase, right before it resolves. Most
// scripts here therefore seat the card with `before` and let the turn open on
// its owner, so the very first decision is the window.
import { describe, it, expect } from "vitest";
import {
  contractGame, SEED, step, play, pass, withCards, choose, passWuxie,
  runTo, expectDecision, expectAtomicReject, expectHp, expectAlive, expectZone,
  expectHandSize, expectLog, expectNoLog, C, findCard, allCards,
} from "../_contract";
import { putInJudgmentZone, setHp, killOff, topOfDeck, setDrawPile, setHand, clearHands } from "../_contract/rig";

const LEBU = C.lebusishu.any;
const LEBU_B = findCard({ typeKey: "lebusishu", exclude: [LEBU] });
const SHANDIAN = C.shandian.any;
const WUXIE = C.wuxie.any;
const HEART = findCard({ typeKey: "shan", suit: "heart" });         // judgment: heart
const SPADE = findCard({ typeKey: "sha", suit: "spade", rank: 7 }); // judgment: spade 7
const CLUB = findCard({ typeKey: "sha", suit: "club" });            // judgment: black, not spade
const DIAMOND_LEBU = findCard({ suit: "diamond", typeKey: "sha" });

/** Reveal the judgment card after the window closes. */
function reveal(g: ReturnType<typeof contractGame>): void {
  step(g, { kind: "judgmentReveal" }, choose("reveal"));
}

describe("C-LEBUSISHU — เพลินจนลืมแคว้นสู่", () => {
  it("[C-LEBUSISHU-01a] placing it puts the card in the target's judgment zone", () => {
    const g = contractGame({ seed: SEED(401), hands: { p0: [LEBU] } });
    step(g, { kind: "mainAction" }, play([LEBU], ["p1"]));
    expect(g.p("p1").judgmentZone.map((c) => c.id)).toEqual([LEBU]);
    expectZone(g.state, LEBU, "judgment", "p1");
    expectLog(g.state, { eventType: "placeDelayed", actorId: "p0", targetIds: ["p1"] }, 1);
    // and no ไร้ช่องโหว่ window opened at placement time
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[C-LEBUSISHU-01b] a second copy on the same target is refused", () => {
    const g = contractGame({
      seed: SEED(402), hands: { p0: [LEBU, LEBU_B] },
      after: (s) => putInJudgmentZone(s, "p1", LEBU_B),
    });
    expectAtomicReject(g, play([LEBU], ["p1"]), /already has a lebusishu/);
  });

  it("[C-LEBUSISHU-02a] a heart judgment lets the play phase happen and discards the card", () => {
    const g = contractGame({
      seed: SEED(403),
      before: (s) => { putInJudgmentZone(s, "p0", LEBU); topOfDeck(s, [HEART]); },
    });
    passWuxie(g);
    reveal(g);
    expectLog(g.state, { eventType: "judgment", cardType: "lebusishu" }, 1);
    expectZone(g.state, LEBU, "discardPile");
    expect(g.state.skipPlayPhase).toBeUndefined();
    step(g, { kind: "drawCard", playerId: "p0" }, choose("draw"));
    expectDecision(g, { kind: "mainAction", playerId: "p0" }); // play phase happened
  });

  it("[C-LEBUSISHU-02b] a non-heart judgment skips the play phase and discards the card", () => {
    const g = contractGame({
      seed: SEED(404),
      before: (s) => { putInJudgmentZone(s, "p0", LEBU); topOfDeck(s, [SPADE]); },
      // keep p0 under the hand limit so the skipped play phase is followed
      // straight by p1's turn, with no over-limit discard in between
      after: (s) => clearHands(s),
    });
    passWuxie(g);
    reveal(g);
    expectZone(g.state, LEBU, "discardPile");
    step(g, { kind: "drawCard", playerId: "p0" }, choose("draw"));
    // p0's main action never comes up — the next decision belongs to p1.
    expectDecision(g, { kind: "drawCard", playerId: "p1" });
    expectLog(g.state, { eventType: "skipPlay", actorId: "p0" }, 1);
  });

  it("[C-LEBUSISHU-03a] a ไร้ช่องโหว่ cancels it: card discarded, play phase intact", () => {
    const g = contractGame({
      seed: SEED(405),
      before: (s) => { putInJudgmentZone(s, "p0", LEBU); topOfDeck(s, [SPADE]); },
      after: (s) => { clearHands(s); setHand(s, "p1", [WUXIE]); },
    });
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectZone(g.state, LEBU, "discardPile");
    expect(g.state.skipPlayPhase).toBeUndefined();
    step(g, { kind: "drawCard", playerId: "p0" }, choose("draw"));
    expectDecision(g, { kind: "mainAction", playerId: "p0" });
  });

  it("[C-LEBUSISHU-03b] สุมาอี้'s พลิกชะตา swaps the judgment card before it counts", () => {
    const g = contractGame({
      seed: SEED(406), assigns: [["p1", "simayi"]],
      before: (s) => { putInJudgmentZone(s, "p0", LEBU); topOfDeck(s, [SPADE]); },
      after: (s) => { clearHands(s); setHand(s, "p1", [HEART]); },
    });
    passWuxie(g);
    reveal(g);
    // guicai is locked -> its own prompt is the only one.
    step(g, { kind: "guicaiReplace", playerId: "p1" }, withCards(HEART));
    // the heart now decides the outcome: the play phase survives
    expect(g.state.skipPlayPhase).toBeUndefined();
    expectZone(g.state, SPADE, "discardPile"); // the replaced card
    expectLog(g.state, { eventType: "skillUse", skillId: "simayi_guicai" }, 1);
  });

  it("[C-LEBUSISHU-03c] กุยแก's เก็บลิขิตฟ้า takes his own judgment card into hand", () => {
    const g = contractGame({
      seed: SEED(407), assigns: [["p0", "guojia"]],
      before: (s) => { putInJudgmentZone(s, "p0", LEBU); topOfDeck(s, [HEART]); },
    });
    passWuxie(g);
    reveal(g);
    step(g, { kind: "activateSkill", skillId: "guojia_yidu" }, (pd) => ({ decisionId: pd.id, playerId: pd.playerId }));
    expectZone(g.state, HEART, "hand", "p0");
    expectLog(g.state, { eventType: "skillUse", skillId: "guojia_yidu" }, 1);
  });

  it("[C-LEBUSISHU-03d] ลกซุน's ถ่อมตนซ่อนคม makes him an illegal target", () => {
    const g = contractGame({
      seed: SEED(408), assigns: [["p1", "luxun"]], hands: { p0: [LEBU] },
    });
    expectAtomicReject(g, play([LEBU], ["p1"]), /cannot be targeted/);
  });

  it("[C-LEBUSISHU-03e] ไต้เกี้ยว plays a diamond card as เพลินจนลืมแคว้นสู่", () => {
    const g = contractGame({
      seed: SEED(409), assigns: [["p0", "daiqiao"]], hands: { p0: [DIAMOND_LEBU] },
    });
    step(g, { kind: "mainAction" }, play([DIAMOND_LEBU], ["p1"], "lebusishu"));
    expectZone(g.state, DIAMOND_LEBU, "judgment", "p1");
    expect(g.p("p1").judgmentZone[0]!.typeKey).toBe("lebusishu");
  });

  it("[C-LEBUSISHU-04] a target who dies first has the card cleaned up, not left dangling", () => {
    const g = contractGame({
      seed: SEED(410), playerCount: 4, hands: { p0: [LEBU] },
      after: (s) => putInJudgmentZone(s, "p1", LEBU),
    });
    killOff(g.state, "p1");
    expectZone(g.state, LEBU, "discardPile");
    expect(g.p("p1").judgmentZone).toEqual([]);
  });
});

describe("C-SHANDIAN — สายฟ้า", () => {
  const misses = allCards({ suit: "heart" });
  const filler = allCards({ suit: "club" });

  /** A draw pile laid out so each successive turn judges a miss:
   *  turn N judges plan[3N], then draws plan[3N+1], plan[3N+2]. */
  function missPlan(n: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(misses[i]!, filler[2 * i]!, filler[2 * i + 1]!);
    return out;
  }

  it("[C-SHANDIAN-01a] is always placed on its own caster, never a named target", () => {
    const g = contractGame({ seed: SEED(421), hands: { p0: [SHANDIAN] } });
    step(g, { kind: "mainAction" }, play([SHANDIAN], ["p1"]));
    expectZone(g.state, SHANDIAN, "judgment", "p0");
    expect(g.p("p1").judgmentZone).toEqual([]);
  });

  it("[C-SHANDIAN-01b] a spade 2–9 judgment deals 3 damage", () => {
    const g = contractGame({
      seed: SEED(422),
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); topOfDeck(s, [SPADE]); },
    });
    passWuxie(g);
    reveal(g);
    expectHp(g.state, "p0", 1);
    expectZone(g.state, SHANDIAN, "discardPile");
    expectLog(g.state, { eventType: "damage", actorId: "p0", amount: 3 }, 1);
  });

  it("[C-SHANDIAN-02] a miss forwards it to the next living player instead", () => {
    const g = contractGame({
      seed: SEED(423),
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); topOfDeck(s, [CLUB]); },
    });
    passWuxie(g);
    reveal(g);
    expectHp(g.state, "p0", 4);
    expectZone(g.state, SHANDIAN, "judgment", "p1");
    expectLog(g.state, { eventType: "forwardShandian", targetIds: ["p1"] }, 1);
  });

  it("[C-SHANDIAN-03a] forwarding skips a dead player", () => {
    const g = contractGame({
      seed: SEED(424), playerCount: 4,
      before: (s) => {
        putInJudgmentZone(s, "p0", SHANDIAN);
        topOfDeck(s, [CLUB]);
        killOff(s, "p1");
      },
    });
    passWuxie(g);
    reveal(g);
    expectZone(g.state, SHANDIAN, "judgment", "p2");
  });

  it("[C-SHANDIAN-03b] the single physical สายฟ้า is never in two judgment zones", () => {
    expect(allCards({ typeKey: "shandian" })).toHaveLength(1);
    const g = contractGame({
      seed: SEED(425),
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); setDrawPile(s, missPlan(4)); },
    });
    for (let turn = 0; turn < 3; turn++) {
      passWuxie(g);
      reveal(g);
      const holders = g.state.players.filter((p) => p.judgmentZone.some((c) => c.id === SHANDIAN));
      expect(holders.map((p) => p.id)).toHaveLength(1);
      runTo(g, (pd) => pd.kind === "askWuxie" || pd.kind === "judgmentReveal", { max: 60 });
    }
  });

  it("[C-SHANDIAN-03c] it travels the whole table and comes back around safely", () => {
    const g = contractGame({
      seed: SEED(426),
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); setDrawPile(s, missPlan(5)); },
    });
    const visited: string[] = [];
    for (let turn = 0; turn < 4; turn++) {
      passWuxie(g);
      reveal(g);
      const holder = g.state.players.find((p) => p.judgmentZone.some((c) => c.id === SHANDIAN));
      visited.push(holder!.id);
      runTo(g, (pd) => pd.kind === "askWuxie" || pd.kind === "judgmentReveal", { max: 60 });
    }
    expect(visited).toEqual(["p1", "p2", "p0", "p1"]); // full lap, no crash, no loss
  });

  it("[C-SHANDIAN-04a] a ไร้ช่องโหว่ forwards it rather than destroying it", () => {
    const g = contractGame({
      seed: SEED(427),
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); topOfDeck(s, [SPADE]); },
      after: (s) => { clearHands(s); setHand(s, "p1", [WUXIE]); },
    });
    step(g, { kind: "askWuxie", playerId: "p1" }, withCards(WUXIE));
    passWuxie(g);
    expectHp(g.state, "p0", 4);
    expectZone(g.state, SHANDIAN, "judgment", "p1");
    expectLog(g.state, { eventType: "shandianCancelForward" }, 1);
  });

  it("[C-SHANDIAN-04b] พลิกชะตา can turn a miss into a hit", () => {
    const g = contractGame({
      seed: SEED(428), assigns: [["p1", "simayi"]],
      before: (s) => { putInJudgmentZone(s, "p0", SHANDIAN); topOfDeck(s, [CLUB]); },
      after: (s) => { clearHands(s); setHand(s, "p1", [SPADE]); },
    });
    passWuxie(g);
    reveal(g);
    step(g, { kind: "guicaiReplace", playerId: "p1" }, withCards(SPADE));
    expectHp(g.state, "p0", 1);
    expectZone(g.state, SHANDIAN, "discardPile");
  });

  it("[C-SHANDIAN-04c] a lethal สายฟ้า runs the dying window", () => {
    const g = contractGame({
      seed: SEED(429),
      before: (s) => {
        putInJudgmentZone(s, "p0", SHANDIAN);
        topOfDeck(s, [SPADE]);
        setHp(s, "p0", 3);
      },
    });
    passWuxie(g);
    reveal(g);
    step(g, { kind: "respondTao", playerId: "p0" }, pass);
    step(g, { kind: "respondTao", playerId: "p1" }, pass);
    step(g, { kind: "respondTao", playerId: "p2" }, pass);
    expectAlive(g.state, "p0", false);
  });
});
