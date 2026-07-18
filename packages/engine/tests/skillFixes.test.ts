import { describe, it, expect } from "vitest";
import "../src/generals/index";
import "../src/equipment/index";
import { createRng } from "../src/core/rng";
import { createInitialState } from "../src/core/setup";
import { makeCtx, lastAliveWins } from "../src/core/ctx";
import { runGame } from "../src/core/turnLoop";
import { createSession, respond } from "../src/core/decisions";
import { assignGeneral } from "../src/core/generalAssign";
import { getPlayer } from "../src/core/state";
import { countsAsType } from "../src/core/cardChecks";
import { forceIntoHand } from "./_testUtils";

// ── ลิโป้ / wushuang: สังหาร needs 2 หลบ, ดวล needs 2 สังหาร ──────────────
describe("Lu Bu wushuang (คู่ควรไร้เทียมทาน)", () => {
  function setup(seed: number) {
    const rng = createRng(seed);
    const state = createInitialState({ playerCount: 3, seed }, rng);
    assignGeneral(state, "p0", "lubu", true);
    assignGeneral(state, "p1", "sunquan"); // neutral: no card conversion
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);
    return { state, session };
  }

  it("his สังหาร is NOT dodged by a single หลบ", () => {
    const { state, session } = setup(41);
    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");

    forceIntoHand(state, "p0", "spade_1_2"); // a สังหาร
    const p1 = getPlayer(state, "p1");
    p1.hand = [];
    forceIntoHand(state, "p1", "heart_1_2"); // exactly ONE หลบ
    const before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });

    const shan1 = session.state.pendingDecision!;
    expect(shan1.kind).toBe("respondShan");
    expect((shan1.data as { needed: number }).needed).toBe(2); // ← wushuang
    respond(session, { decisionId: shan1.id, playerId: "p1", cardIds: ["heart_1_2"] });

    const shan2 = session.state.pendingDecision!;
    expect(shan2.kind).toBe("respondShan"); // asked a SECOND time
    respond(session, { decisionId: shan2.id, playerId: "p1", pass: true });

    expect(p1.hp).toBe(before - 1); // one หลบ wasn't enough → hit
  });

  it("his สังหาร IS dodged by two หลบ", () => {
    const { state, session } = setup(42);
    const main = session.state.pendingDecision!;
    forceIntoHand(state, "p0", "spade_1_2");
    const p1 = getPlayer(state, "p1");
    p1.hand = [];
    forceIntoHand(state, "p1", "heart_1_2");
    forceIntoHand(state, "p1", "heart_2_2"); // TWO หลบ
    const before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });
    const s1 = session.state.pendingDecision!;
    respond(session, { decisionId: s1.id, playerId: "p1", cardIds: ["heart_1_2"] });
    const s2 = session.state.pendingDecision!;
    respond(session, { decisionId: s2.id, playerId: "p1", cardIds: ["heart_2_2"] });

    expect(p1.hp).toBe(before); // dodged
  });

  it("in a ดวล against Lu Bu, the opponent must play 2 สังหาร per exchange", () => {
    const { state, session } = setup(43);
    const main = session.state.pendingDecision!;
    forceIntoHand(state, "p0", "club_6_1"); // a ดวล

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["club_6_1"], targetIds: ["p1"] });
    // ดวล is a trick → pass everyone's ไร้ช่องโหว่ window first
    for (let i = 0; i < 6; i++) {
      const d = session.state.pendingDecision!;
      if (d.kind !== "askWuxie") break;
      respond(session, { decisionId: d.id, playerId: d.playerId, pass: true });
    }
    const resp = session.state.pendingDecision!;
    expect(resp.kind).toBe("respondSha");
    expect((resp.data as { needed: number }).needed).toBe(2); // ← wushuang duel
  });
});

// ── แฮหัวตุ้น / ganglie: the penalty hits the ATTACKER, not Xiahoudun ─────
describe("Xiahoudun ganglie (พลังเดือด)", () => {
  it("makes the attacker pay (lose 1 HP), not Xiahoudun himself", () => {
    const rng = createRng(51);
    const state = createInitialState({ playerCount: 3, seed: 51 }, rng);
    assignGeneral(state, "p0", "sunquan", true); // neutral attacker
    assignGeneral(state, "p1", "xiahoudun");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const main = session.state.pendingDecision!;
    forceIntoHand(state, "p0", "spade_1_2"); // สังหาร
    const p1 = getPlayer(state, "p1");
    p1.hand = []; // no หลบ → the สังหาร lands

    // Rig the ganglie judgment to a non-heart so the retaliation fires.
    const blackIdx = state.drawPile.findIndex((c) => c.suit === "spade" || c.suit === "club");
    const [black] = state.drawPile.splice(blackIdx, 1);
    state.drawPile.push(black!);

    const p0 = getPlayer(state, "p0");
    const p0Before = p0.hp;
    const p1Before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });
    // p1 has no หลบ → auto-asked then hit
    const shan = session.state.pendingDecision!;
    expect(shan.kind).toBe("respondShan");
    respond(session, { decisionId: shan.id, playerId: "p1", pass: true });

    // ganglie is optional → accept its activateSkill opt-in
    const activate = session.state.pendingDecision!;
    expect(activate.kind).toBe("activateSkill");
    expect(activate.playerId).toBe("p1");
    respond(session, { decisionId: activate.id, playerId: "p1" });

    // interactive judgment reveal
    const reveal = session.state.pendingDecision!;
    expect(reveal.kind).toBe("judgmentReveal");
    respond(session, { decisionId: reveal.id, playerId: "p1", choice: "reveal" });

    // the ATTACKER (p0) is prompted to discard 2 or take the hit
    const choice = session.state.pendingDecision!;
    expect(choice.kind).toBe("ganglieChoice");
    expect(choice.playerId).toBe("p0"); // ← goes to the attacker
    respond(session, { decisionId: choice.id, playerId: "p0", pass: true }); // take the hit

    expect(p0.hp).toBe(p0Before - 1); // attacker paid
    expect(p1.hp).toBe(p1Before - 1); // Xiahoudun only lost the สังหาร's 1, no extra
  });
});

// ── กวนอู / wusheng: red card counts as สังหาร (main + reactive) ──────────
describe("Guan Yu wusheng (เทพศาสตรา)", () => {
  it("plays a red หลบ as a main-action สังหาร when the client sends asType", () => {
    const rng = createRng(81);
    const state = createInitialState({ playerCount: 3, seed: 81 }, rng);
    assignGeneral(state, "p0", "guanyu", true);
    assignGeneral(state, "p1", "sunquan");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const main = session.state.pendingDecision!;
    forceIntoHand(state, "p0", "heart_1_2"); // a red หลบ
    const p1 = getPlayer(state, "p1");
    p1.hand = []; // no หลบ to dodge with
    const before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["heart_1_2"], targetIds: ["p1"], asType: "sha" });
    const shan = session.state.pendingDecision!;
    expect(shan.kind).toBe("respondShan"); // it resolved AS a สังหาร
    respond(session, { decisionId: shan.id, playerId: "p1", pass: true });

    expect(p1.hp).toBe(before - 1);
  });

  it("countsAsType accepts a red card as สังหาร for Guan Yu (reactive path)", () => {
    const rng = createRng(82);
    const state = createInitialState({ playerCount: 3, seed: 82 }, rng);
    assignGeneral(state, "p0", "guanyu");
    // heart_1_2 is a red หลบ — not literally สังหาร, but Guan Yu may use it as one.
    expect(countsAsType(state, "p0", "heart_1_2", "sha")).toBe(true);
    // a black card cannot.
    expect(countsAsType(state, "p0", "spade_1_2", "sha")).toBe(true); // spade_1_2 is literally สังหาร
    expect(countsAsType(state, "p0", "club_6_1", "sha")).toBe(false); // black non-sha (a ดวล)
  });
});

// ── หัวโต๋ / jiuxing: red→ท้อ only when it's NOT his turn ─────────────────
describe("Huatuo jiuxing (ปฐมพยาบาล)", () => {
  it("allows red→ท้อ off his own turn, and forbids it on his own turn", () => {
    const rng = createRng(61);
    const state = createInitialState({ playerCount: 3, seed: 61 }, rng);
    assignGeneral(state, "p1", "huatuo"); // huatuo sits at seat 1
    const redCard = "heart_1_2"; // a red (heart) card that isn't tao

    state.currentSeat = 0; // someone else's turn
    expect(countsAsType(state, "p1", redCard, "tao")).toBe(true);

    state.currentSeat = 1; // Hua Tuo's own turn
    expect(countsAsType(state, "p1", redCard, "tao")).toBe(false);
  });
});

// ── เตียวเลี้ยว / tuxi: player chooses whom to rob ────────────────────────
describe("Zhang Liao tuxi (จู่โจมสายฟ้าแลบ)", () => {
  it("lets him pick a target, steals 1 card, and skips the normal draw", () => {
    const rng = createRng(71);
    const state = createInitialState({ playerCount: 3, seed: 71 }, rng);
    assignGeneral(state, "p0", "zhangliao", true);
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const activate = session.state.pendingDecision!;
    expect(activate.kind).toBe("activateSkill");
    expect((activate.data as { skillId: string }).skillId).toBe("zhangliao_tuxi");

    const p0 = getPlayer(state, "p0");
    const p1 = getPlayer(state, "p1");
    const p0Before = p0.hand.length;
    const p1Before = p1.hand.length;

    respond(session, { decisionId: activate.id, playerId: "p0" }); // accept

    const pick = session.state.pendingDecision!;
    expect(pick.kind).toBe("tuxiTargets");
    const eligible = (pick.data as { eligible: { id: string }[] }).eligible;
    expect(eligible.some((e) => e.id === "p1")).toBe(true);
    respond(session, { decisionId: pick.id, playerId: "p0", targetIds: ["p1"] });

    const grab = session.state.pendingDecision!;
    expect(grab.kind).toBe("pickCardFromPlayer");
    respond(session, { decisionId: grab.id, playerId: "p0" }); // random from hand

    // stole exactly 1 and drew 0 (draw skipped) → net +1; victim −1
    expect(p0.hand.length).toBe(p0Before + 1);
    expect(p1.hand.length).toBe(p1Before - 1);
  });
});

// ── เตียวเสี้ยน / lijian: two males duel ─────────────────────────────────
describe("Diaochan lijian (ยุแยง)", () => {
  it("makes the two chosen males duel — first target responds, takes 1 damage with no สังหาร", () => {
    const rng = createRng(91);
    const state = createInitialState({ playerCount: 3, seed: 91 }, rng);
    assignGeneral(state, "p0", "diaochan", true);
    assignGeneral(state, "p1", "guanyu"); // male
    assignGeneral(state, "p2", "zhaoyun"); // male
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const main = session.state.pendingDecision!;
    expect(main.kind).toBe("mainAction");
    forceIntoHand(state, "p0", "heart_1_2"); // a card to discard
    const p1 = getPlayer(state, "p1");
    p1.hand = []; // no สังหาร to answer the duel
    const before = p1.hp;

    respond(session, { decisionId: main.id, playerId: "p0", choice: "useSkill", skillId: "diaochan_lijian", cardIds: ["heart_1_2"], targetIds: ["p1", "p2"] });

    const duel = session.state.pendingDecision!;
    expect(duel.kind).toBe("respondSha");
    expect(duel.playerId).toBe("p1"); // the first-picked target answers first
    respond(session, { decisionId: duel.id, playerId: "p1", pass: true });

    expect(p1.hp).toBe(before - 1);
    expect(getPlayer(state, "p0").hand.some((c) => c.id === "heart_1_2")).toBe(false); // spent
  });

  it("does nothing (no duel, card not spent) if a target is female", () => {
    const rng = createRng(92);
    const state = createInitialState({ playerCount: 3, seed: 92 }, rng);
    assignGeneral(state, "p0", "diaochan", true);
    assignGeneral(state, "p1", "zhenji"); // female
    assignGeneral(state, "p2", "zhaoyun"); // male
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const main = session.state.pendingDecision!;
    forceIntoHand(state, "p0", "heart_1_2");
    respond(session, { decisionId: main.id, playerId: "p0", choice: "useSkill", skillId: "diaochan_lijian", cardIds: ["heart_1_2"], targetIds: ["p1", "p2"] });

    expect(session.state.pendingDecision!.kind).toBe("mainAction"); // no duel
    expect(getPlayer(state, "p0").hand.some((c) => c.id === "heart_1_2")).toBe(true); // not spent
  });
});

// ── โล่ราชันย์ / renwang ─────────────────────────────────────────────────
describe("renwang armor", () => {
  const RENWANG = { id: "ar1", typeKey: "renwang", suit: "spade", rank: 2 } as const;

  it("negates a black สังหาร (no damage, no dodge asked)", () => {
    const rng = createRng(101);
    const state = createInitialState({ playerCount: 3, seed: 101 }, rng);
    assignGeneral(state, "p0", "sunquan", true);
    assignGeneral(state, "p1", "sunquan");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const p1 = getPlayer(state, "p1");
    p1.equipment.armor = { ...RENWANG };
    p1.hand = [];
    forceIntoHand(state, "p0", "spade_1_2"); // a BLACK สังหาร
    const before = p1.hp;

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });

    expect(session.state.pendingDecision!.kind).toBe("mainAction"); // no respondShan
    expect(p1.hp).toBe(before);
  });

  it("still negates a black สังหาร even when machao's tieqi blocks dodging", () => {
    const rng = createRng(102);
    const state = createInitialState({ playerCount: 3, seed: 102 }, rng);
    assignGeneral(state, "p0", "machao", true);
    assignGeneral(state, "p1", "sunquan");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    const p1 = getPlayer(state, "p1");
    p1.equipment.armor = { ...RENWANG };
    p1.hand = [];
    forceIntoHand(state, "p0", "spade_1_2"); // black สังหาร
    // rig tieqi's judgment to RED so it sets blockedFromDodge
    const redIdx = state.drawPile.findIndex((c) => c.suit === "heart" || c.suit === "diamond");
    const [red] = state.drawPile.splice(redIdx, 1);
    state.drawPile.push(red!);
    const before = p1.hp;

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });
    // tieqi is locked now — straight to its judgment reveal (no activateSkill)
    const reveal = session.state.pendingDecision!;
    expect(reveal.kind).toBe("judgmentReveal");
    respond(session, { decisionId: reveal.id, playerId: "p0", choice: "reveal" });

    expect(p1.hp).toBe(before); // renwang immunity survived tieqi
  });
});

// ── ธนูกิเลน / qilin + กระบี่น้ำแข็ง / sword_ice ─────────────────────────
describe("weapon riders", () => {
  it("qilin lets the attacker choose which of two horses to destroy", () => {
    const rng = createRng(111);
    const state = createInitialState({ playerCount: 3, seed: 111 }, rng);
    assignGeneral(state, "p0", "sunquan", true);
    assignGeneral(state, "p1", "sunquan");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    getPlayer(state, "p0").equipment.weapon = { id: "w1", typeKey: "qilin", suit: "spade", rank: 1 };
    const p1 = getPlayer(state, "p1");
    p1.equipment.horseMinus = { id: "hm1", typeKey: "horse_chitu", suit: "heart", rank: 5 };
    p1.equipment.horsePlus = { id: "hp1", typeKey: "horse_jueying", suit: "spade", rank: 5 };
    p1.hand = [];
    forceIntoHand(state, "p0", "spade_1_2");

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });
    const shan = session.state.pendingDecision!;
    expect(shan.kind).toBe("respondShan");
    respond(session, { decisionId: shan.id, playerId: "p1", pass: true });

    const q = session.state.pendingDecision!;
    expect(q.kind).toBe("qilinDestroyHorse");
    expect(q.playerId).toBe("p0");
    respond(session, { decisionId: q.id, playerId: "p0", choice: "horsePlus" });

    expect(p1.equipment.horsePlus).toBeUndefined();
    expect(p1.equipment.horseMinus).toBeDefined(); // only the chosen one destroyed
  });

  it("sword_ice offers no discard-2 (deals damage) when the target holds <2 cards", () => {
    const rng = createRng(112);
    const state = createInitialState({ playerCount: 3, seed: 112 }, rng);
    assignGeneral(state, "p0", "sunquan", true);
    assignGeneral(state, "p1", "sunquan");
    assignGeneral(state, "p2", "sunquan");
    const ctx = makeCtx(state, rng, { checkGameEnd: lastAliveWins });
    const session = createSession(runGame(ctx), state, rng);

    getPlayer(state, "p0").equipment.weapon = { id: "w2", typeKey: "sword_ice", suit: "spade", rank: 2 };
    const p1 = getPlayer(state, "p1");
    p1.hand = [{ id: "x1", typeKey: "tao", suit: "heart", rank: 3 }]; // 1 card, no หลบ
    forceIntoHand(state, "p0", "spade_1_2");
    const before = p1.hp;

    const main = session.state.pendingDecision!;
    respond(session, { decisionId: main.id, playerId: "p0", choice: "playCard", cardIds: ["spade_1_2"], targetIds: ["p1"] });
    const shan = session.state.pendingDecision!;
    expect(shan.kind).toBe("respondShan");
    respond(session, { decisionId: shan.id, playerId: "p1", pass: true });

    // no swordIceChoice — straight to damage
    expect(session.state.pendingDecision!.kind).toBe("mainAction");
    expect(p1.hp).toBe(before - 1);
  });
});
