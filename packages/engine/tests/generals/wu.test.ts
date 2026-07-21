import { describe, it, expect } from "vitest";
import { gameWith, respond, getPlayer, countsAsType, forceIntoHand, passWuxie, cardById, CID } from "./_gh";
import { createRng } from "../../src/core/rng";
import { createInitialState } from "../../src/core/setup";
import { makeCtx, lastAliveWins } from "../../src/core/ctx";
import { assignGeneral } from "../../src/core/generalAssign";
import { dealDamage } from "../../src/core/damage";
import { runGame } from "../../src/core/turnLoop";
import { createSession } from "../../src/core/decisions";

describe("Wu generals", () => {
  it("ซุนกวน ถ่วงดุลอำนาจ (zhiheng): discard N, draw N", () => {
    const { state, session } = gameWith(301, 3, [["p0", "sunquan", true]]);
    getPlayer(state, "p0").hand = [];
    forceIntoHand(state, "p0", CID.blackSha);
    forceIntoHand(state, "p0", CID.redShan);
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "useSkill", skillId: "sunquan_zhiheng", cardIds: [CID.blackSha, CID.redShan], targetIds: [] });

    const hand = getPlayer(state, "p0").hand;
    expect(hand.length).toBe(2); // discarded 2, drew 2
    expect(hand.some((c) => c.id === CID.blackSha || c.id === CID.redShan)).toBe(false);
    expect(state.discardPile.some((c) => c.id === CID.blackSha)).toBe(true);
  });

  it("ซุนกวน กอบกู้ (jiujia): a Wu ally's ท้อ heals the lord 1 extra", () => {
    const rng = createRng(302);
    const state = createInitialState({ playerCount: 3, seed: 302 }, rng);
    assignGeneral(state, "p0", "sunquan"); // attacker (neutral seat)
    assignGeneral(state, "p1", "sunquan", true); // the Wu LORD being rescued
    assignGeneral(state, "p2", "sunquan"); // Wu rescuer
    getPlayer(state, "p1").role = "lord";
    getPlayer(state, "p1").hp = 1;
    getPlayer(state, "p2").hand = [];
    forceIntoHand(state, "p2", CID.tao);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });

    const gen = dealDamage(ctx, "p0", "p1", 1); // p1 → 0 → dying
    let r = gen.next();
    while (!r.done) {
      const dec = r.value as { kind: string; playerId: string };
      if (dec.kind === "respondTao" && dec.playerId === "p2") {
        r = gen.next({ decisionId: "x", playerId: "p2", cardIds: [CID.tao] });
      } else {
        r = gen.next({ decisionId: "x", playerId: dec.playerId, pass: true });
      }
    }
    // tao heals 1 (0→1); jiujia (Wu lord healed by a Wu ally) heals 1 more → 2
    expect(getPlayer(state, "p1").hp).toBe(2);
  });

  it("จิวยี่ สง่างามผงาด (yingzi): mandatory +1 folded into the single draw, with a banner signal", () => {
    // Build raw (no passDraw) so we can inspect the draw gate itself.
    const rng = createRng(303);
    const state = createInitialState({ playerCount: 3, seed: 303 }, rng);
    assignGeneral(state, "p0", "zhouyu", true);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const draw = session.state.pendingDecision!;
    expect(draw.kind).toBe("drawCard"); // no prompt — yingzi is mandatory
    const data = draw.data as { count: number; base: number; modifier: number; skills: string[] };
    expect(data.count).toBe(3); // 2 base + 1 yingzi, in ONE transaction
    expect(data.skills).toContain("zhouyu_yingzi"); // banner signal
    const start = getPlayer(state, "p0").hand.length;
    respond(session, { decisionId: draw.id, playerId: "p0", choice: "draw" });
    expect(getPlayer(state, "p0").hand.length).toBe(start + 3);
    expect(session.state.pendingDecision!.kind).toBe("mainAction");
  });

  it("กำเหลง ยิงธนู (qixi): a black card counts as ข้ามสะพานแล้วรื้อทิ้ง", () => {
    const { state } = gameWith(304, 3, [["p0", "ganning", true]]);
    expect(countsAsType(state, "p0", CID.blackDuel, "guohe")).toBe(true); // black
    expect(countsAsType(state, "p0", CID.redShan, "guohe")).toBe(false); // red
  });

  it("ลิบอง ขยันหมั่นเพียร (qinxue): skips the discard phase if no สังหาร was used", () => {
    const { state, session } = gameWith(305, 3, [["p0", "lumeng", true]]);
    const p0 = getPlayer(state, "p0");
    // Over the hand limit — normally forces a discard.
    while (p0.hand.length <= p0.hp) forceIntoHand(state, "p0", CID.wuzhong);
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "endPhase" }); // used no สังหาร

    // qinxue set skipDiscardPhase → the turn skipped straight past discard.
    expect(session.state.pendingDecision!.playerId).not.toBe("p0");
    expect(state.log.some((e) => e.eventType === "skipDiscard")).toBe(true);
  });

  it("ลกซุน ถ่อมตน (qianxun): cannot be targeted by ฉวยโอกาสลักแกะ", () => {
    const { state, session } = gameWith(306, 3, [["p0", "sunquan", true], ["p1", "luxun"]]);
    forceIntoHand(state, "p0", CID.shunshou);
    const main = session.state.pendingDecision!;
    expect(() =>
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.shunshou], targetIds: ["p1"] }),
    ).toThrow(/cannot be targeted/);
  });

  it("ลกซุน ค่ายเรียงราย (lianying): draws 1 when his hand becomes empty", () => {
    const { state, session } = gameWith(307, 3, [["p0", "luxun", true]]);
    getPlayer(state, "p0").hand = [];
    forceIntoHand(state, "p0", CID.blackSha); // his only card
    getPlayer(state, "p1").hand = [];
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });
    // playing his last card empties the hand → lianying opt-in
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("luxun_lianying");
    respond(session, { decisionId: act.id, playerId: "p0" }); // accept
    expect(getPlayer(state, "p0").hand.length).toBe(1); // drew 1
  });

  it("ไต้เกี้ยว หลบลี้ภัย (huibi): redirects an incoming สังหาร to another player", () => {
    const { state, session } = gameWith(308, 3, [["p0", "sunquan", true], ["p1", "daiqiao"], ["p2", "sunquan"]]);
    forceIntoHand(state, "p0", CID.blackSha);
    const p1 = getPlayer(state, "p1");
    p1.hand = [];
    forceIntoHand(state, "p1", CID.redShan); // a card to discard for the redirect
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] });

    const redirect = session.state.pendingDecision!;
    expect(redirect.kind).toBe("huibiRedirect");
    expect(redirect.playerId).toBe("p1");
    respond(session, { decisionId: redirect.id, playerId: "p1", cardIds: [CID.redShan], targetIds: ["p2"] });

    // the สังหาร now points at p2 instead
    const shan = session.state.pendingDecision!;
    expect(shan.kind).toBe("respondShan");
    expect(shan.playerId).toBe("p2");
  });

  it("ไต้เกี้ยว โฉมงาม (guose): a diamond card counts as เพลินจนลืมแคว้นสู่", () => {
    const { state } = gameWith(309, 3, [["p0", "daiqiao", true]]);
    expect(countsAsType(state, "p0", CID.diamond, "lebusishu")).toBe(true); // diamond
    expect(countsAsType(state, "p0", CID.blackDuel, "lebusishu")).toBe(false); // club
  });

  it("ซุนซางเซียง ผูกสัมพันธ์ (jieyuan): discard 2, both players heal 1", () => {
    const { state, session } = gameWith(310, 3, [["p0", "sunshangxiang", true]]);
    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    p0.hp = p0.maxHp - 1;
    p1.hp = p1.maxHp - 1;
    p0.hand = [];
    forceIntoHand(state, "p0", CID.blackSha);
    forceIntoHand(state, "p0", CID.redShan);
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "useSkill", skillId: "sunshangxiang_jieyuan", cardIds: [CID.blackSha, CID.redShan], targetIds: ["p1"] });

    expect(p0.hp).toBe(p0.maxHp);
    expect(p1.hp).toBe(p1.maxHp);
  });

  it("ซุนซางเซียง สตรีอาจหาญ (jiehun): draws 2 when she loses an equipment", () => {
    // p1's turn: p1 uses ข้ามสะพาน to strip Sun Shang Xiang's (p0) weapon.
    const { state, session } = gameWith(311, 3, [["p0", "sunshangxiang"], ["p1", "ganning", true]], 1);
    getPlayer(state, "p0").equipment.weapon = cardById(CID.crossbow);
    const before = getPlayer(state, "p0").hand.length;
    forceIntoHand(state, "p1", CID.guohe);
    const main = session.state.pendingDecision!;
    expect(main.playerId).toBe("p1");
    respond(session, { decisionId: main.id, playerId: "p1", choice: "playCard", cardIds: [CID.guohe], targetIds: ["p0"] });
    passWuxie(session);
    const pick = session.state.pendingDecision!;
    expect(pick.kind).toBe("pickCardFromPlayer");
    respond(session, { decisionId: pick.id, playerId: "p1", cardIds: [CID.crossbow] }); // take her weapon

    // losing the weapon fires jiehun (opt-in) → accept → draw 2
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("sunshangxiang_jiehun");
    respond(session, { decisionId: act.id, playerId: "p0" });
    expect(getPlayer(state, "p0").hand.length).toBe(before + 2);
  });
});
