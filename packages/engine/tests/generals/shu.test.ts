import { describe, it, expect } from "vitest";
import { gameWith, respond, getPlayer, countsAsType, forceIntoHand, passWuxie, CID } from "./_gh";

describe("Shu generals", () => {
  it("เล่าปี่ เมตตาธรรม (rende): giving 2 cards in a turn heals 1", () => {
    const { state, session } = gameWith(201, 3, [["p0", "liubei", true]]);
    const p0 = getPlayer(state, "p0");
    p0.hp = p0.maxHp - 1; // injured, so the heal is observable
    p0.hand = [];
    forceIntoHand(state, "p0", CID.tao);
    forceIntoHand(state, "p0", CID.wuzhong);
    const p1Before = getPlayer(state, "p1").hand.length;

    let pd = session.state.pendingDecision!;
    respond(session, { decisionId: pd.id, playerId: "p0", choice: "useSkill", skillId: "liubei_rende", cardIds: [CID.tao], targetIds: ["p1"] });
    pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("mainAction"); // rende has no per-turn cap
    respond(session, { decisionId: pd.id, playerId: "p0", choice: "useSkill", skillId: "liubei_rende", cardIds: [CID.wuzhong], targetIds: ["p1"] });

    expect(getPlayer(state, "p1").hand.length).toBe(p1Before + 2);
    expect(p0.hp).toBe(p0.maxHp); // second gift healed 1
  });

  it("เล่าปี่ ปลุกใจนักรบ (hujia): a Shu ally plays สังหาร for the lord facing ศึกชนเผ่า", () => {
    const { state, session } = gameWith(209, 3, [["p0", "sunquan", true], ["p1", "liubei"], ["p2", "guanyu"]]);
    const p1 = getPlayer(state, "p1");
    p1.role = "lord";
    p1.hand = []; // liubei has no สังหาร of his own
    p1.hp = p1.maxHp;
    getPlayer(state, "p2").hand = [];
    forceIntoHand(state, "p2", CID.blackSha); // the Shu ally does
    forceIntoHand(state, "p0", "spade_8_2"); // a ศึกชนเผ่า (nanman)

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_8_2"], targetIds: [] });
    passWuxie(session);

    let guard = 0;
    while (guard++ < 14) {
      const pd = session.state.pendingDecision;
      if (!pd || pd.kind === "mainAction") break;
      const sid = (pd.data as { skillId?: string }).skillId;
      if (pd.kind === "activateSkill" && sid === "liubei_hujia") {
        respond(session, { decisionId: pd.id, playerId: pd.playerId }); // accept
      } else if (pd.kind === "hujiaVolunteer") {
        respond(session, { decisionId: pd.id, playerId: "p2", cardIds: [CID.blackSha] });
      } else {
        respond(session, { decisionId: pd.id, playerId: pd.playerId, pass: true });
      }
    }
    expect(p1.hp).toBe(p1.maxHp); // the ally's สังหาร covered him → no damage
  });

  it("เตียวหุย คำรามพยัคฆ์ (paoxiao): may play สังหาร more than once a turn", () => {
    const { state, session } = gameWith(202, 3, [["p0", "zhangfei", true]]);
    getPlayer(state, "p0").hand = [];
    forceIntoHand(state, "p0", CID.blackSha);
    forceIntoHand(state, "p0", CID.blackSha2);
    const p1 = getPlayer(state, "p1");
    p1.hand = [];
    const before = p1.hp;

    for (const sha of [CID.blackSha, CID.blackSha2]) {
      const main = session.state.pendingDecision!;
      expect(main.kind).toBe("mainAction");
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [sha], targetIds: ["p1"] });
      const shan = session.state.pendingDecision!;
      expect(shan.kind).toBe("respondShan");
      respond(session, { decisionId: shan.id, playerId: "p1", pass: true });
    }
    expect(p1.hp).toBe(before - 2); // both landed — no 1/turn limit
  });

  it("จูล่ง ใจมังกร (longdan): สังหาร ⇄ หลบ are interchangeable", () => {
    const { state } = gameWith(203, 3, [["p0", "zhaoyun", true]]);
    expect(countsAsType(state, "p0", CID.blackSha, "shan")).toBe(true); // สังหาร→หลบ
    expect(countsAsType(state, "p0", CID.redShan, "sha")).toBe(true); // หลบ→สังหาร
    expect(countsAsType(state, "p0", CID.tao, "sha")).toBe(false); // ท้อ can't
  });

  it("ม้าเฉียว วิชาขี่ม้า (qima): reaches a distance-2 target with a plain สังหาร", () => {
    const { state, session } = gameWith(204, 5, [["p0", "machao", true]]);
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p2").hand = []; // p2 is 2 seats away
    const main = session.state.pendingDecision!;
    // -1 attacking distance makes p2 (seat distance 2) reachable — no throw.
    // (machao's tieqi also fires here, so resolution starts at its judgment.)
    expect(() =>
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p2"] }),
    ).not.toThrow();
    expect(["judgmentReveal", "respondShan"]).toContain(session.state.pendingDecision!.kind);
  });

  it("หองหยิม รวบรวมปัญญา (juhui): drawing 1 extra when using an unconverted trick", () => {
    const { state, session } = gameWith(205, 3, [["p0", "pangtong", true]]);
    forceIntoHand(state, "p0", CID.wuzhong);
    const before = getPlayer(state, "p0").hand.length;
    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.wuzhong], targetIds: [] });
    passWuxie(session);
    // juhui is an optional OnUseTrick trigger → accept its activateSkill opt-in
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("pangtong_juhui");
    respond(session, { decisionId: act.id, playerId: "p0" });
    // -1 wuzhong, +2 its draw, +1 juhui = +2 net
    expect(getPlayer(state, "p0").hand.length).toBe(before + 2);
  });

  it("หองหยิม อัจฉริยะพิสดาร (qicai): ignores the range on a targeted trick", () => {
    const { state, session } = gameWith(206, 5, [["p0", "pangtong", true]]);
    forceIntoHand(state, "p0", CID.shunshou); // range 1
    const main = session.state.pendingDecision!;
    // p2 is distance 2 — normally out of shunshou range, but qicai ignores it.
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.shunshou], targetIds: ["p2"] });
    passWuxie(session);
    expect(session.state.pendingDecision!.kind).toBe("pickCardFromPlayer");
  });

  it("ขงเบ้ง จิตว่างเปล่า (kongcheng): with no hand cards, immune to สังหาร", () => {
    const { state, session } = gameWith(207, 3, [["p0", "sunquan", true], ["p1", "zhugeliang"]]);
    forceIntoHand(state, "p0", CID.blackSha);
    getPlayer(state, "p1").hand = []; // empty → immune
    const main = session.state.pendingDecision!;
    expect(() =>
      respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: [CID.blackSha], targetIds: ["p1"] }),
    ).toThrow(/cannot be targeted/);
  });

  it("ขงเบ้ง ดูดาว (guandou): reorders the top of the deck at turn start", () => {
    const { state, session } = gameWith(208, 3, [["p0", "zhugeliang", true]]);
    // guandou is an optional trigger → accept its activateSkill opt-in first.
    const act = session.state.pendingDecision!;
    expect(act.kind).toBe("activateSkill");
    expect((act.data as { skillId: string }).skillId).toBe("zhugeliang_guandou");
    respond(session, { decisionId: act.id, playerId: "p0" });
    const pd = session.state.pendingDecision!;
    expect(pd.kind).toBe("guandouOrder");
    const options = (pd.data as { options: string[] }).options;
    const wantTop = options[0]!;
    respond(session, { decisionId: pd.id, playerId: "p0", cardIds: [wantTop] }); // put it on top
    // guandou reorders, then the draw phase draws it first → it lands in hand.
    expect(getPlayer(state, "p0").hand.some((c) => c.id === wantTop)).toBe(true);
  });
});
