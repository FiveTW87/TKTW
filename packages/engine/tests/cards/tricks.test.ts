import { describe, it, expect } from "vitest";
import "../../src/equipment/index";
import "../../src/generals/index";
import type { GameState, PlayerAnswer } from "../../src/types";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { runGame } from "../../src/core/turnLoop";
import { createGame } from "../../src/index";
import { createSession, respond, type GameSession } from "../../src/core/decisions";
import { getPlayer, cardById } from "../../src/core/state";
import { forceIntoHand, passDraw } from "../_testUtils";

// One deck copy of each trick.
const ID = {
  wuzhong: "heart_2_1",
  guohe: "spade_11_2",
  shunshou: "spade_11_1",
  nanman: "spade_8_2",
  wanjian: "diamond_1_1",
  taoyuan: "heart_1_1",
  wugu: "heart_10_1",
  juedou: "spade_4_1",
  jiedao: "club_12_2",
  crossbow: "spade_1_1",
};

/** A lastAliveWins game paused at p0's mainAction. Rebuild is disabled so the
 *  out-of-band forceIntoHand/equip setup below isn't wiped by a replay. */
function atP0MainAction(playerCount: number, seed: number): { session: GameSession; state: GameState } {
  const session = createGame({ playerCount, seed });
  passDraw(session); // advance past the ENG-004 draw gate
  delete session.rebuild;
  const pd = session.state.pendingDecision!;
  expect(pd.kind).toBe("mainAction");
  expect(pd.playerId).toBe("p0");
  return { session, state: session.state };
}

function play(session: GameSession, cardId: string, targetIds: string[] = []): void {
  const pd = session.state.pendingDecision!;
  respond(session, { decisionId: pd.id, playerId: "p0", choice: "playCard", cardIds: [cardId], targetIds });
}

/** Every trick opens a ไร้ช่องโหว่ window before it resolves — pass through it
 *  (nobody counters) so the card's own effect/decision surfaces. */
function settleWuxie(session: GameSession): void {
  let n = 0;
  while (session.state.pendingDecision?.kind === "askWuxie") {
    if (n++ > 50) throw new Error("wuxie window did not close");
    const pd = session.state.pendingDecision;
    respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
  }
}

/** Answer decisions with `answerFor` until `stop` holds (or we run out). */
function drive(session: GameSession, answerFor: (pd: NonNullable<GameState["pendingDecision"]>, s: GameState) => PlayerAnswer, stop: (s: GameState) => boolean, max = 300): void {
  let n = 0;
  while (session.state.pendingDecision && !stop(session.state)) {
    if (n++ > max) throw new Error("trick test did not settle");
    respond(session, answerFor(session.state.pendingDecision, session.state));
  }
}

describe("กลอุบาย (trick cards)", () => {
  it('เนรมิตจากความว่างเปล่า (wuzhong): draw 2 net +1', () => {
    const { session, state } = atP0MainAction(3, 11);
    forceIntoHand(state, "p0", ID.wuzhong);
    const before = getPlayer(state, "p0").hand.length;
    play(session, ID.wuzhong);
    settleWuxie(session);
    expect(getPlayer(state, "p0").hand.length).toBe(before + 1); // -1 played, +2 drawn
    expect(getPlayer(state, "p0").hand.some((c) => c.id === ID.wuzhong)).toBe(false);
  });

  it("ข้ามสะพานแล้วรื้อทิ้ง (guohe): discards one of the target's cards", () => {
    const { session, state } = atP0MainAction(3, 12);
    forceIntoHand(state, "p0", ID.guohe);
    const before = getPlayer(state, "p1").hand.length;
    play(session, ID.guohe, ["p1"]);
    settleWuxie(session);
    // caster picks — pass = a random hand card of p1's is discarded
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("pickCardFromPlayer");
    respond(session, { decisionId: pd.id, playerId: "p0", pass: true });
    expect(getPlayer(state, "p1").hand.length).toBe(before - 1);
  });

  it("ฉวยโอกาสลักแกะ (shunshou): steals a card from a range-1 target", () => {
    const { session, state } = atP0MainAction(3, 13);
    forceIntoHand(state, "p0", ID.shunshou);
    const p1Before = getPlayer(state, "p1").hand.length;
    const p0Before = getPlayer(state, "p0").hand.length;
    play(session, ID.shunshou, ["p1"]);
    settleWuxie(session);
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("pickCardFromPlayer");
    respond(session, { decisionId: pd.id, playerId: "p0", pass: true });
    expect(getPlayer(state, "p1").hand.length).toBe(p1Before - 1);
    // p0 spent shunshou (-1) and gained the stolen card (+1) → net unchanged
    expect(getPlayer(state, "p0").hand.length).toBe(p0Before);
  });

  it("ศึกชนเผ่าใต้ (nanman): every other player must lง สังหาร or take 1", () => {
    const { session, state } = atP0MainAction(3, 14);
    for (const id of ["p1", "p2"]) getPlayer(state, id).hp = getPlayer(state, id).maxHp;
    forceIntoHand(state, "p0", ID.nanman);
    play(session, ID.nanman);
    // everyone declines → each takes 1
    drive(session, (pd) => ({ decisionId: pd.id, playerId: pd.playerId, pass: true }), (s) => s.pendingDecision!.kind === "mainAction");
    expect(getPlayer(state, "p1").hp).toBe(getPlayer(state, "p1").maxHp - 1);
    expect(getPlayer(state, "p2").hp).toBe(getPlayer(state, "p2").maxHp - 1);
  });

  it("ห่าธนู (wanjian): every other player must lง หลบ or take 1", () => {
    const { session, state } = atP0MainAction(3, 15);
    for (const id of ["p1", "p2"]) getPlayer(state, id).hp = getPlayer(state, id).maxHp;
    forceIntoHand(state, "p0", ID.wanjian);
    play(session, ID.wanjian);
    drive(session, (pd) => ({ decisionId: pd.id, playerId: pd.playerId, pass: true }), (s) => s.pendingDecision!.kind === "mainAction");
    expect(getPlayer(state, "p1").hp).toBe(getPlayer(state, "p1").maxHp - 1);
    expect(getPlayer(state, "p2").hp).toBe(getPlayer(state, "p2").maxHp - 1);
  });

  it("สาบานสวนท้อ (taoyuan): every injured living player heals 1 (capped)", () => {
    const { session, state } = atP0MainAction(3, 16);
    getPlayer(state, "p0").hp = getPlayer(state, "p0").maxHp - 1;
    getPlayer(state, "p1").hp = getPlayer(state, "p1").maxHp - 1;
    getPlayer(state, "p2").hp = getPlayer(state, "p2").maxHp; // full — stays capped
    forceIntoHand(state, "p0", ID.taoyuan);
    play(session, ID.taoyuan);
    settleWuxie(session);
    expect(getPlayer(state, "p0").hp).toBe(getPlayer(state, "p0").maxHp);
    expect(getPlayer(state, "p1").hp).toBe(getPlayer(state, "p1").maxHp);
    expect(getPlayer(state, "p2").hp).toBe(getPlayer(state, "p2").maxHp);
  });

  it("ธัญญาหารบริบูรณ์ (wugu): each living player picks 1 revealed card", () => {
    const { session, state } = atP0MainAction(3, 17);
    forceIntoHand(state, "p0", ID.wugu);
    const before = ["p1", "p2"].map((id) => getPlayer(state, id).hand.length);
    play(session, ID.wugu);
    drive(session, (pd) => ({ decisionId: pd.id, playerId: pd.playerId, cardIds: [] }), (s) => s.pendingDecision!.kind === "mainAction");
    // p1 and p2 each gained a card (p0 spent wugu then took one → net 0)
    expect(getPlayer(state, "p1").hand.length).toBe(before[0]! + 1);
    expect(getPlayer(state, "p2").hand.length).toBe(before[1]! + 1);
  });

  it("ดวล (juedou): target answers first — declining takes 1 damage", () => {
    const { session, state } = atP0MainAction(3, 18);
    getPlayer(state, "p1").hp = getPlayer(state, "p1").maxHp;
    forceIntoHand(state, "p0", ID.juedou);
    play(session, ID.juedou, ["p1"]);
    settleWuxie(session);
    // p1 (target) is asked first; declining ends the duel with p1 taking 1.
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("respondSha");
    expect(pd.playerId).toBe("p1");
    respond(session, { decisionId: pd.id, playerId: "p1", pass: true });
    expect(getPlayer(state, "p1").hp).toBe(getPlayer(state, "p1").maxHp - 1);
  });

  it("ยืมดาบฆ่าคน (jiedao): a coerced armed player who refuses forfeits their weapon", () => {
    const { session, state } = atP0MainAction(3, 19);
    getPlayer(state, "p1").equipment.weapon = cardById(ID.crossbow);
    forceIntoHand(state, "p0", ID.jiedao);
    play(session, ID.jiedao, ["p1", "p2"]); // coerce p1 to shoot p2
    settleWuxie(session);
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("jiedaoForceSha");
    expect(pd.playerId).toBe("p1");
    respond(session, { decisionId: pd.id, playerId: "p1", pass: true }); // refuse
    expect(getPlayer(state, "p1").equipment.weapon).toBeUndefined();
    expect(getPlayer(state, "p0").equipment.weapon?.id).toBe(ID.crossbow);
  });
});

describe("เพลินจนลืมแคว้นสู่ (lebusishu) delayed trick", () => {
  it("a non-heart judgment skips the owner's play phase", () => {
    const rng = createRng(55);
    const state = createInitialState({ playerCount: 3, seed: 55 }, rng);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    // Place lebusishu on p0 and rig the judgment to a non-heart (spade) card.
    const LEBU = "spade_12_2";
    for (const p of state.players) {
      p.hand = p.hand.filter((c) => c.id !== LEBU);
      p.judgmentZone = p.judgmentZone.filter((c) => c.id !== LEBU);
    }
    state.drawPile = state.drawPile.filter((c) => c.id !== LEBU && c.id !== "spade_7_1");
    getPlayer(state, "p0").judgmentZone.push(cardById(LEBU));
    state.drawPile.push(cardById("spade_7_1")); // popped first as the judgment → spade → skip

    const session = createSession(runGame(ctx), state, rng);
    let sawP0MainAction = false;
    drive(
      session,
      (pd) => {
        if (pd.kind === "mainAction") return { decisionId: pd.id, playerId: pd.playerId, choice: "endPhase" };
        if (pd.kind === "discardTo" || pd.kind === "discardChosenBy") {
          const need = Number((pd.data as { mustDiscard?: number; count?: number }).mustDiscard ?? (pd.data as { count?: number }).count ?? 0);
          const p = getPlayer(session.state, pd.playerId);
          return { decisionId: pd.id, playerId: pd.playerId, cardIds: p.hand.slice(0, need).map((c) => c.id) };
        }
        return { decisionId: pd.id, playerId: pd.playerId, pass: true };
      },
      (s) => {
        if (s.pendingDecision?.kind === "mainAction" && s.pendingDecision.playerId === "p0") sawP0MainAction = true;
        return s.turnNumber > 1 || s.finished;
      },
    );

    expect(state.log.some((e) => e.eventType === "judgment" && e.cardType === "lebusishu" && e.data?.outcome === "skipPlay")).toBe(true);
    expect(sawP0MainAction).toBe(false); // p0's play phase never opened
  });
});
